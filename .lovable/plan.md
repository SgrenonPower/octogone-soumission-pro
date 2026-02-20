
# Rabais volume personnalisé / configurable

## Analyse de l'état actuel

### Architecture des rabais (ce qui existe)

Le système actuel fonctionne sur deux niveaux :

1. **Table `rabais`** (base de données) : stocke les rabais avec `slug`, `nom`, `pourcentage`, `type_ui` (`dropdown` ou `toggle`). Les rabais "multi-sites" et "volume" sont des entrées dans cette table avec `type_ui = 'dropdown'`.

2. **Table `soumission_rabais`** : table de liaison `soumission_id ↔ rabais_id`. Elle ne stocke **aucune personnalisation** — seulement quel rabais prédéfini est appliqué.

3. **`RabaisState` dans `Calculateur.tsx`** : `{ dropdownId: string | null, engagement: boolean, pilote: boolean }`. Le calcul lit `pourcentage` depuis la table `rabais` via `dropdownId`.

### Ce que le nouveau système requiert

Le vendeur doit pouvoir :
- Choisir un **type** (Multi-sites, Volume, Personnalisé, Aucun)
- **Modifier le pourcentage** par rapport à la valeur par défaut
- Ajouter une **description libre**

Ces données (pourcentage personnalisé + description) n'existent nulle part. La table `soumission_rabais` doit être enrichie.

---

## Décision d'architecture

Au lieu de passer par `rabais_id` (qui lie vers un rabais figé dans la table), on étend `soumission_rabais` avec :
- `pourcentage_applique NUMERIC` — la valeur réellement appliquée (peut différer du défaut)
- `description_rabais TEXT` — la description libre du vendeur
- `type_rabais TEXT` — le type sélectionné (`aucun`, `multi-sites`, `volume`, `personnalise`)

Le `rabais_id` devient **nullable** (pour le cas "Rabais personnalisé" qui n'a pas de rabais prédéfini correspondant).

Pour la rétrocompatibilité, les lignes existantes dans `soumission_rabais` pour les types toggle (engagement, pilote) continuent de fonctionner sans changement — seul le rabais dropdown est affecté.

---

## Périmètre des changements

| Fichier | Nature |
|---|---|
| Base de données | Migration : modification `soumission_rabais` (nullable `rabais_id`, colonnes `pourcentage_applique`, `description_rabais`, `type_rabais`) |
| `src/pages/Calculateur.tsx` | Remplacement UI dropdown + input %, description, calcul, sauvegarde |
| `src/lib/supabase-queries.ts` | `sauvegarderSoumission` + `fetchSoumissionById` + `dupliquerSoumission` |
| `src/components/pdf/SoumissionPDF.tsx` | Section Rabais avec pourcentage + description |
| `src/pages/SoumissionPresentation.tsx` | Badge rabais avec pourcentage + description |

---

## Détail technique par fichier

### 1. Migration base de données

```sql
-- Rendre rabais_id nullable (pour "Rabais personnalisé" sans entrée dans la table rabais)
ALTER TABLE soumission_rabais
  ALTER COLUMN rabais_id DROP NOT NULL;

-- Ajouter les nouvelles colonnes
ALTER TABLE soumission_rabais
  ADD COLUMN type_rabais TEXT DEFAULT NULL,
  ADD COLUMN pourcentage_applique NUMERIC DEFAULT NULL,
  ADD COLUMN description_rabais TEXT DEFAULT NULL;
```

La colonne `rabais_id` reste pour les toggle (engagement, pilote) qui continuent de fonctionner exactement comme avant.

### 2. `src/pages/Calculateur.tsx`

**Nouvel état :**
```ts
interface RabaisDropdownState {
  type: 'aucun' | 'multi-sites' | 'volume' | 'personnalise';
  pourcentage: number;        // valeur actuelle (modifiable)
  description: string;        // description libre
}

// Valeurs par défaut des types
const DEFAUTS_RABAIS: Record<string, number> = {
  'multi-sites': 15,
  'volume': 20,
  'personnalise': 0,
};
```

**Remplacer** `rabaisState.dropdownId` par `rabaisDropdown` (de type `RabaisDropdownState`).

**Interface `RabaisState` mise à jour :**
```ts
interface RabaisState {
  engagement: boolean;
  pilote: boolean;
  // dropdownId supprimé
}
```

**Nouvelle UI dans la section 4 — Rabais** (remplace le `<Select>` + sa `<Label>` actuels) :

```text
<Label>Rabais volumique</Label>

-- Ligne 1 : Type + Pourcentage côte à côte --
<div className="flex gap-2">
  <Select value={rabaisDropdown.type} onValueChange={handleChangerTypeRabais}>
    <SelectItem value="aucun">Aucun</SelectItem>
    <SelectItem value="multi-sites">Multi-sites</SelectItem>
    <SelectItem value="volume">Volume</SelectItem>
    <SelectItem value="personnalise">Rabais personnalisé</SelectItem>
  </Select>
  <div style={{ width: 120, flexShrink: 0 }}>
    <Input
      type="number"
      min={0} max={50} step={0.5}
      value={rabaisDropdown.pourcentage}
      disabled={rabaisDropdown.type === 'aucun'}
      onChange={e => handleChangerPourcentage(parseFloat(e.target.value))}
    />
    <span>%</span>  {/* Affiché comme suffixe */}
  </div>
</div>

-- Erreur si > 50 % --
{rabaisDropdown.pourcentage > 50 && (
  <p className="text-xs text-destructive">Le rabais ne peut pas dépasser 50 %</p>
)}

-- Ligne 2 : Description (visible si type ≠ aucun) --
{rabaisDropdown.type !== 'aucun' && (
  <Input
    placeholder="Description (ex. : si Marc-Aurèle et Humanitae participent)"
    value={rabaisDropdown.description}
    onChange={e => setRabaisDropdown(prev => ({ ...prev, description: e.target.value }))}
  />
)}
```

**Handler `handleChangerTypeRabais(type)`** :
```ts
const handleChangerTypeRabais = (type: RabaisDropdownState['type']) => {
  setRabaisDropdown(prev => ({
    ...prev,
    type,
    pourcentage: type === 'aucun' ? 0 : DEFAUTS_RABAIS[type] ?? prev.pourcentage,
    // description conservée si on change de type (edge case volontaire)
  }));
};
```

**Fonction de calcul** — remplacer les lignes 97-100 (`Couche 1`) :
```ts
// Couche 1 : rabais dropdown
if (rabaisDropdown.type !== 'aucun' && rabaisDropdown.pourcentage > 0) {
  prixFinal = prixFinal * (1 - rabaisDropdown.pourcentage / 100);
}
```

La signature de `calculerPrixEtablissement` reçoit `rabaisDropdown` au lieu de `rabaisState.dropdownId`.

**Récapitulatif sticky** — remplacer la section qui affichait le rabais dropdown (lignes 848-857) :
```text
{rabaisDropdown.type !== 'aucun' && (
  <div>
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">
        {nomTypeRabais(rabaisDropdown.type)} ({formatPourcentage(rabaisDropdown.pourcentage)})
      </span>
      <span style={{ color: 'hsl(var(--success))' }}>
        −{formatMontant(sousTotalMensuel * rabaisDropdown.pourcentage / 100)}
      </span>
    </div>
    {rabaisDropdown.description && (
      <p className="text-xs text-muted-foreground ml-2 mt-0.5 italic">
        {rabaisDropdown.description}
      </p>
    )}
  </div>
)}
```

**Dans `handleSauvegarder`** — le calcul de `rabaisIds` est remplacé par une nouvelle structure :

```ts
// Toggled rabais (engagement, pilote) → toujours via rabais_id
const toggleRabaisIds: string[] = [];
if (rabaisState.engagement && rabaisEngagement) toggleRabaisIds.push(rabaisEngagement.id);
if (rabaisState.pilote && rabaisPilote) toggleRabaisIds.push(rabaisPilote.id);

await sauvegarderSoumission({
  // ...
  rabaisToggleIds: toggleRabaisIds,
  rabaisDropdown: {
    type: rabaisDropdown.type,
    pourcentage: rabaisDropdown.pourcentage,
    description: rabaisDropdown.description,
  },
});
```

**Dépendances Ctrl+S** : ajouter `rabaisDropdown` au tableau.

### 3. `src/lib/supabase-queries.ts`

**Nouvelle interface pour `sauvegarderSoumission`** :

```ts
// Remplacer rabaisIds: string[] par :
rabaisToggleIds: string[];
rabaisDropdown: {
  type: string;
  pourcentage: number;
  description: string;
};
```

**Dans la logique d'insert de `soumission_rabais`** :

```ts
const rowsARabais = [];

// Les toggle (engagement, pilote) : lier au rabais_id + stocker type/pourcentage
for (const id of params.rabaisToggleIds) {
  const r = ... // trouver dans les rabais
  rowsARabais.push({
    soumission_id: soumission.id,
    rabais_id: id,
    type_rabais: null,
    pourcentage_applique: null,
    description_rabais: null,
  });
}

// Le rabais dropdown personnalisé
if (params.rabaisDropdown.type !== 'aucun') {
  rowsARabais.push({
    soumission_id: soumission.id,
    rabais_id: null,           // pas lié à un rabais prédéfini
    type_rabais: params.rabaisDropdown.type,
    pourcentage_applique: params.rabaisDropdown.pourcentage,
    description_rabais: params.rabaisDropdown.description || null,
  });
}

if (rowsARabais.length > 0) {
  await supabase.from('soumission_rabais').insert(rowsARabais);
}
```

**Dans `fetchSoumissionById`** — la requête est déjà :
```ts
supabase.from('soumission_rabais').select('*, rabais(*)').eq('soumission_id', id)
```

La query retournera maintenant aussi `type_rabais`, `pourcentage_applique`, `description_rabais` dans chaque ligne. Il faudra ajuster le mapping pour séparer les toggle (avec `rabais_id`) du dropdown personnalisé (sans `rabais_id`).

**Dans `dupliquerSoumission`** — adapter la duplication pour copier aussi `type_rabais`, `pourcentage_applique`, `description_rabais`.

### 4. `src/components/pdf/SoumissionPDF.tsx`

La section "Rabais appliqués" (lignes 132-144) affiche actuellement les badges depuis `rabais[]`. Ces badges viennent de `fetchSoumissionById` qui reconstruit les rabais depuis le join `rabais(*)`.

Il faudra passer les données du rabais dropdown personnalisé séparément, ou adapter `fetchSoumissionById` pour retourner aussi les lignes `soumission_rabais` enrichies.

**Proposition** : dans `SoumissionPDF.tsx`, recevoir un prop `rabaisDropdownInfo?: { type: string; pourcentage: number; description?: string }` et afficher un badge supplémentaire si présent.

Sinon — approche plus simple : adapter `fetchSoumissionById` pour que `rabais[]` retournée contienne aussi les rabais dropdown "synthétiques" avec `{ nom, pourcentage, description }`.

**La section Rabais dans le PDF** deviendra :
```text
{r.nom} ({r.pourcentage}%)
{r.description && <br/><span style={{ fontSize: '8pt' }}>{r.description}</span>}
```

### 5. `src/pages/SoumissionPresentation.tsx`

La section Rabais (lignes 159-171) affiche les badges depuis `rabais[]`. Même logique que le PDF — les badges incluront le pourcentage et la description.

Remplacer :
```text
{r.nom} — {r.pourcentage}%
```
par :
```text
{r.nom} ({r.pourcentage}%)
{r.description_rabais && <br/><small>{r.description_rabais}</small>}
```

---

## Stratégie pour `fetchSoumissionById` — retourner le rabais dropdown synthétique

Actuellement, `rabais` est construit depuis :
```ts
const rabais = (rabaisRes.data || []).map((r: any) => r.rabais).filter(Boolean);
```

Cette ligne filtre uniquement les lignes qui ont un `rabais` joint (c'est-à-dire celles avec `rabais_id`). Le rabais dropdown personnalisé (sans `rabais_id`) serait ignoré.

**Solution** : retourner les deux types de rabais fusionnés avec un format unifié :

```ts
const rabais = (rabaisRes.data || []).map((row: any) => {
  if (row.rabais) {
    // Toggle (engagement, pilote) → vient du join
    return row.rabais;
  } else if (row.type_rabais && row.type_rabais !== 'aucun') {
    // Dropdown personnalisé → reconstituer un objet compatible
    const nomMap: Record<string, string> = {
      'multi-sites': 'Multi-sites',
      'volume': 'Volume',
      'personnalise': 'Rabais personnalisé',
    };
    return {
      id: row.id,
      nom: nomMap[row.type_rabais] || row.type_rabais,
      pourcentage: row.pourcentage_applique,
      description_rabais: row.description_rabais,
      // champs requis par le type
      slug: row.type_rabais,
      type_ui: 'dropdown',
      actif: true,
      ordre: 0,
      groupe_exclusion: null,
      condition_description: row.description_rabais,
    };
  }
  return null;
}).filter(Boolean);
```

Ainsi, le PDF et la présentation fonctionnent sans modification de leur structure de données.

---

## Ordre d'exécution

```text
Étape 1 → Migration DB :
           ALTER TABLE soumission_rabais ALTER COLUMN rabais_id DROP NOT NULL
           ADD COLUMN type_rabais TEXT DEFAULT NULL
           ADD COLUMN pourcentage_applique NUMERIC DEFAULT NULL
           ADD COLUMN description_rabais TEXT DEFAULT NULL

Étape 2 → supabase-queries.ts :
           a. Modifier sauvegarderSoumission (params + logique d'insert)
           b. Modifier fetchSoumissionById (mapping retour rabais enrichi)
           c. Modifier dupliquerSoumission (copie colonnes additionnelles)

Étape 3 → Calculateur.tsx :
           a. Nouvel état RabaisDropdownState
           b. Mise à jour RabaisState (retirer dropdownId)
           c. Mise à jour calculerPrixEtablissement (signature + Couche 1)
           d. UI : Select + Input % + Input description
           e. Handler handleChangerTypeRabais
           f. Récapitulatif sticky mis à jour
           g. handleSauvegarder avec nouveau format
           h. Ctrl+S dépendances

Étape 4 → SoumissionPDF.tsx :
           Badges rabais : afficher nom + pourcentage + description si présente

Étape 5 → SoumissionPresentation.tsx :
           Badges rabais : afficher nom + pourcentage + description si présente
```

---

## Edge cases couverts

- **Type change → pré-remplissage** : `handleChangerTypeRabais` lit `DEFAUTS_RABAIS[type]` pour définir le pourcentage
- **Modification du % après choix type** : état local `rabaisDropdown.pourcentage` mis à jour sans réinitialisation du type
- **0 % affiché** : affiché dans le récapitulatif avec "0,00 $", pas supprimé
- **> 50 %** : message d'erreur sous le champ, sauvegarde bloquée si dépassement
- **Soumissions existantes** : colonnes nullable → comportement identique (`type_rabais = NULL` → ignoré dans le mapping retour)
- **Duplication** : `type_rabais`, `pourcentage_applique`, `description_rabais` copiés
- **Toggle engagement + pilote** : toujours via `rabais_id`, non affectés par ce changement
- **PDF** : `fetchSoumissionById` retourne un objet unifié avec `pourcentage` déjà personnalisé → le PDF affiche automatiquement la bonne valeur
