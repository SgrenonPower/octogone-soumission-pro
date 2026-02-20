
# Toggle « Frais d'intégration offerts » (projet pilote)

## Contexte et état actuel

Le calculateur calcule toujours `fraisIntegration = etablissements.length × fraisParEtab` et le passe directement dans `coutTotalAn1`. Il n'existe aucun mécanisme pour offrir ces frais. Le toggle projet pilote existe déjà dans la section 4 (Rabais), ligne ~544.

La table `soumissions` contient déjà `frais_integration` et `cout_total_an1` mais pas encore `frais_integration_offerts`.

---

## Périmètre des changements

| Fichier | Nature |
|---|---|
| Base de données | Migration : `frais_integration_offerts BOOLEAN DEFAULT FALSE` |
| `src/pages/Calculateur.tsx` | État, calcul, UI toggle, récapitulatif, sauvegarde |
| `src/lib/supabase-queries.ts` | `sauvegarderSoumission` + `dupliquerSoumission` |
| `src/components/pdf/SoumissionPDF.tsx` | Ligne frais d'intégration conditionnelle |
| `src/pages/SoumissionPresentation.tsx` | Carte « Coût total 1re année » mise à jour |

---

## Détail technique par fichier

### 1. Migration base de données

```sql
ALTER TABLE soumissions
  ADD COLUMN frais_integration_offerts BOOLEAN DEFAULT FALSE;
```

Colonne nullable avec défaut FALSE — toutes les soumissions existantes conservent le comportement actuel.

### 2. `src/pages/Calculateur.tsx`

**Nouvel état :**
```ts
const [fraisOfferts, setFraisOfferts] = useState(false);
```

**Edge case pilote désactivé** — dans le `onCheckedChange` du toggle pilote existant :
```ts
onCheckedChange={v => {
  setRabaisState(prev => ({ ...prev, pilote: v }));
  if (!v) setFraisOfferts(false); // désactive automatiquement frais offerts
}}
```

**Calcul mis à jour** (ligne ~229-230) :
```ts
const fraisIntegration = etablissements.length * fraisParEtab; // valeur brute inchangée
const fraisIntegrationEffectifs = fraisOfferts ? 0 : fraisIntegration;
const coutTotalAn1 = totalAnnuel + fraisIntegrationEffectifs;
```

**Nouveau toggle** — inséré dans la section 4 (Rabais), **juste après le bloc du toggle pilote**, conditionnel sur `rabaisState.pilote` :

```text
{rabaisState.pilote && (
  <div className="flex items-center justify-between p-3 rounded-lg border border-dashed"
       style={{ borderColor: '#f59e0b', background: 'hsl(38 92% 50% / 0.05)' }}>
    <div>
      <p className="text-sm font-medium">Frais d'intégration offerts (projet pilote)</p>
      <p className="text-xs text-muted-foreground">
        Valeur : {formatMontant(fraisIntegration)} — offerts à 0 $
      </p>
    </div>
    <Switch
      checked={fraisOfferts}
      onCheckedChange={setFraisOfferts}
    />
  </div>
)}
```

**Récapitulatif sticky** — remplacer la ligne frais d'intégration (lignes ~860-868) :

```text
<div className="flex justify-between text-xs text-muted-foreground">
  <span>Frais d'intégration ({etablissements.length} étab.)</span>
  <span className={fraisOfferts ? 'line-through opacity-50' : ''}>
    {formatMontant(fraisIntegration)}
  </span>
</div>
{fraisOfferts && (
  <div className="flex justify-between text-xs">
    <span style={{ color: '#059669' }}>↳ Offerts (projet pilote)</span>
    <span style={{ color: '#059669' }}>0,00 $</span>
  </div>
)}
<div className="flex justify-between font-bold text-sm pt-1 border-t">
  <span>Coût total 1re année</span>
  <span style={{ color: 'hsl(var(--primary))' }}>{formatMontant(coutTotalAn1)}</span>
</div>
```

**Bandeau mobile** — `coutTotalAn1` est déjà calculé avec `fraisIntegrationEffectifs`, donc se met à jour automatiquement.

**Dans `handleSauvegarder`** :
- Passer `fraisIntegration: fraisIntegrationEffectifs` (0 si offerts)
- Passer `fraisIntegrationOfferts: fraisOfferts`
- Ajouter `fraisOfferts` aux dépendances du `useEffect` Ctrl+S

### 3. `src/lib/supabase-queries.ts`

**Dans `sauvegarderSoumission`** — ajout dans le type des params et dans l'insert :
```ts
fraisIntegrationOfferts: boolean;
// dans l'insert :
frais_integration_offerts: params.fraisIntegrationOfferts,
```

**Dans `dupliquerSoumission`** — copier le champ :
```ts
frais_integration_offerts: (soumission as any).frais_integration_offerts ?? false,
```

### 4. `src/components/pdf/SoumissionPDF.tsx`

Remplacer la ligne statique frais d'intégration dans le tableau des totaux (ligne ~158-161) par une version conditionnelle :

```text
{fraisOfferts ? (
  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
    <td style={{ padding: '8px 12px', color: '#6b7280' }}>
      Frais d'intégration
      <span style={{ fontSize: '9pt', marginLeft: 8, color: '#6b7280' }}>
        (valeur {formatMontant(fraisInt)})
      </span>
    </td>
    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
      <span style={{ textDecoration: 'line-through', color: '#9ca3af', marginRight: 8 }}>
        {formatMontant(fraisInt)}
      </span>
      <span style={{ color: '#059669', fontWeight: 700 }}>0,00 $ (gratuit – projet pilote)</span>
    </td>
  </tr>
) : (
  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
    <td>Frais d'intégration ({etablissements.length} étab. × 3 000 $)</td>
    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMontant(fraisInt)}</td>
  </tr>
)}
```

`fraisOfferts` est lu depuis `(soumission as any).frais_integration_offerts ?? false` en haut du composant, avec `fraisInt` qui représente la valeur brute sauvegardée.

### 5. `src/pages/SoumissionPresentation.tsx`

La carte « Coût total 1re année » affiche `soumission.cout_total_an1` qui sera déjà à 0 + annuel si offerts (puisque sauvegardé correctement). Pas de changement structurel, mais ajouter un badge discret sous la carte si `frais_integration_offerts` est true :

```text
{(soumission as any).frais_integration_offerts && (
  <p className="text-xs text-center mt-1" style={{ color: '#059669', fontStyle: 'italic' }}>
    Frais d'intégration offerts — projet pilote
  </p>
)}
```

---

## Ordre d'exécution

```text
Étape 1 → Migration DB (colonne frais_integration_offerts)
Étape 2 → supabase-queries.ts (sauvegarder + dupliquer)
Étape 3 → Calculateur.tsx :
           a. État fraisOfferts
           b. Edge case désactivation automatique
           c. Calcul fraisIntegrationEffectifs / coutTotalAn1
           d. Toggle UI dans section Rabais
           e. Récapitulatif sticky mis à jour
           f. handleSauvegarder + dépendances Ctrl+S
Étape 4 → SoumissionPDF.tsx (ligne frais conditionnelle)
Étape 5 → SoumissionPresentation.tsx (badge discret)
```

---

## Edge cases couverts

- **Pilote désactivé → fraisOfferts reset** : `onCheckedChange` du toggle pilote appelle `setFraisOfferts(false)` si `v === false`
- **0 établissements** : `fraisIntegration = 0`, toggle visible mais sans effet visible
- **Soumissions existantes** : `frais_integration_offerts DEFAULT FALSE` → comportement identique
- **Duplication** : champ copié dans la nouvelle soumission
- **PDF** : `fraisInt` conserve la valeur brute pour l'affichage barré, même si `cout_total_an1` sauvegardé est sans frais
- **ROI non affecté** : le calcul ROI utilise `cout_octogone_annuel` (abonnement annuel uniquement), pas `cout_total_an1`
