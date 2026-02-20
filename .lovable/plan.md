
# Section "Portée" — Plan d'implémentation

## Analyse de l'état actuel

### Ce qui existe déjà (ne pas retoucher)
- La section "Vos pertes invisibles" — déjà implémentée dans PDF et Présentation
- La structure complète "Investissement → ROI → Verdict" — en place
- `notes_personnalisees` dans `soumissions` — déjà présente et sauvegardée
- `fetchConfig` / `updateConfig` dans `supabase-queries.ts` — prêts à être réutilisés

### Ce qui est NOUVEAU
1. **Colonne `texte_portee`** dans la table `soumissions` (nullable, text)
2. **Clé config `texte_portee_defaut`** dans la table `config`
3. **Champ textarea dans le Calculateur** — optionnel, dans la section Notes
4. **Bloc "Portée" dans le PDF** — entre le bloc CLIENT et la section "Vos pertes invisibles"
5. **Bloc "Portée" dans la Présentation** — entre le titre client et la section "Vos pertes invisibles"
6. **Champ textarea dans AdminConfigSoumissions** — pour modifier le texte par défaut

---

## Étapes d'implémentation

### Étape 1 — Migration base de données

**Deux opérations SQL :**

```sql
-- 1. Ajouter la colonne texte_portee à la table soumissions
ALTER TABLE public.soumissions ADD COLUMN texte_portee text;

-- 2. Insérer la clé de config texte_portee_defaut
INSERT INTO public.config (cle, valeur, categorie, description)
VALUES (
  'texte_portee_defaut',
  'Octogone est une solution intégrée de gestion alimentaire conçue pour optimiser vos opérations, réduire vos coûts et éliminer les pertes invisibles de votre service alimentaire.',
  'pdf',
  'Texte de portée par défaut affiché en introduction de chaque soumission'
);
```

La colonne `texte_portee` est nullable — si elle est NULL ou vide, on utilise le texte de config.

### Étape 2 — `src/lib/supabase-queries.ts`

**Ajouter `texte_portee` au paramètre de `sauvegarderSoumission` :**

```ts
// Dans l'interface params de sauvegarderSoumission :
textePortee?: string;  // nouveau champ optionnel

// Dans l'INSERT :
texte_portee: params.textePortee || null,
```

**Ajouter `texte_portee` dans la duplication de soumission (`dupliquerSoumission`) :**

```ts
texte_portee: soumission.texte_portee,  // copier le champ lors d'une duplication
```

### Étape 3 — `src/pages/Calculateur.tsx`

**Ajouter un état `textePortee` :**
```ts
const [textePortee, setTextePortee] = useState('');
```

**Ajouter le champ dans la section "6. Notes et conditions spéciales"**, juste au-dessus du textarea `notes-perso` existant :

```tsx
<div className="space-y-2">
  <Label htmlFor="texte-portee" className="text-sm">
    Texte de portée (introduction de la soumission){' '}
    <span className="text-muted-foreground font-normal">(optionnel)</span>
  </Label>
  <Textarea
    id="texte-portee"
    placeholder={config.texte_portee_defaut || 'Octogone est une solution intégrée…'}
    value={textePortee}
    onChange={e => setTextePortee(e.target.value)}
    className="min-h-[80px] resize-y text-sm"
  />
  <p className="text-xs text-muted-foreground">
    Si vide, le texte par défaut de la configuration sera utilisé.
  </p>
</div>
```

**Passer `textePortee` à `sauvegarderSoumission` :**
```ts
textePortee: textePortee.trim() || undefined,
```

### Étape 4 — `src/components/pdf/SoumissionPDF.tsx`

**Lire le texte de portée** en haut du composant :
```ts
const textePortee = (soumission as any).texte_portee?.trim() 
  || config?.texte_portee_defaut 
  || 'Octogone est une solution intégrée de gestion alimentaire conçue pour optimiser vos opérations, réduire vos coûts et éliminer les pertes invisibles de votre service alimentaire.';
```

**Insérer le bloc "Portée" entre le bloc CLIENT (ligne ~182) et la section "Vos pertes invisibles" (ligne ~183) :**

```tsx
{/* ── PORTÉE ── */}
<div className="pdf-no-break" style={{ marginBottom: 20 }}>
  <div style={{
    fontSize: '9pt',
    fontWeight: 700,
    color: '#1e3a5f',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 6,
  }}>
    Portée
  </div>
  <div style={{ fontSize: '10pt', color: '#374151', lineHeight: 1.6 }}>
    {textePortee}
  </div>
</div>
```

Style : titre "PORTÉE" en petites majuscules bleu marine, texte en 10pt gris foncé, sans fond ni bordure — sobre et professionnel.

### Étape 5 — `src/pages/SoumissionPresentation.tsx`

**Lire le texte de portée** :
```ts
const textePortee = (soumission as any).texte_portee?.trim() 
  || config.texte_portee_defaut 
  || 'Octogone est une solution intégrée…';
```

**Insérer le bloc "Portée" entre le bloc "Titre client" (ligne ~160-171) et la section "Vos pertes invisibles" (ligne ~173) :**

```tsx
{/* Portée */}
<div className="text-center max-w-2xl mx-auto">
  <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: C.fgFaint }}>
    Portée
  </p>
  <p className="text-sm leading-relaxed italic" style={{ color: C.fgMuted }}>
    {textePortee}
  </p>
</div>
```

Style : centré, italique, sobre — sert d'introduction contextuelle visuelle avant les sections de persuasion.

### Étape 6 — `src/pages/admin/ConfigSoumissions.tsx`

**Ajouter un état `textePortee` :**
```ts
const [textePortee, setTextePortee] = useState('');
```

**Ajouter la clé dans `handleSave` :**
```ts
if (textePortee) updates.push({ cle: 'texte_portee_defaut', valeur: textePortee });
```

**Ajouter un champ textarea dans l'interface**, au début de la Card (avant la durée de validité) :

```tsx
<div className="space-y-2">
  <label className="text-sm font-medium">
    Texte de portée par défaut (affiché en introduction de chaque soumission)
  </label>
  <textarea
    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y ..."
    value={textePortee}
    onChange={e => setTextePortee(e.target.value)}
    placeholder={config.texte_portee_defaut || 'Octogone est une solution intégrée…'}
  />
  {config.texte_portee_defaut && (
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer">Voir la valeur actuelle</summary>
      <p className="mt-1 whitespace-pre-wrap">{config.texte_portee_defaut}</p>
    </details>
  )}
</div>
```

**Mettre à jour la condition `disabled` du bouton Sauvegarder** pour inclure `textePortee` :
```tsx
disabled={saving || (!validite && !conditions && !entreprise && !textePortee)}
```

---

## Fichiers modifiés — résumé

| Fichier | Action | Détails |
|---|---|---|
| Migration SQL | Créer | `ALTER TABLE soumissions ADD COLUMN texte_portee text` + `INSERT INTO config` |
| `src/lib/supabase-queries.ts` | Modifier | Ajouter `textePortee` dans `sauvegarderSoumission` et `dupliquerSoumission` |
| `src/pages/Calculateur.tsx` | Modifier | Nouvel état `textePortee` + textarea dans Section 6 + passer à la sauvegarde |
| `src/components/pdf/SoumissionPDF.tsx` | Modifier | Lire `texte_portee` + insérer bloc "Portée" entre CLIENT et Pertes invisibles |
| `src/pages/SoumissionPresentation.tsx` | Modifier | Lire `texte_portee` + insérer bloc centré entre Titre client et Pertes invisibles |
| `src/pages/admin/ConfigSoumissions.tsx` | Modifier | Nouvel état + textarea + clé dans handleSave |

---

## Ce qui ne change pas

- La logique de calcul ROI (`roi-calc.ts`)
- La section "Vos pertes invisibles" (déjà en place)
- La section "Votre investissement" et ses cartes
- La section "Ce que vous gagnez" et le tableau ROI
- La section "Le verdict"
- Les pages Admin (sauf ConfigSoumissions)
- Aucune nouvelle table Supabase — juste 1 colonne + 1 ligne de config

---

## Condition d'affichage

Le bloc "Portée" s'affiche **toujours** (même sans ROI), car c'est une introduction générale au document. Il utilise en priorité :
1. `soumission.texte_portee` si non vide
2. `config.texte_portee_defaut` si disponible
3. Le texte littéral de fallback en dernier recours

Le champ dans le Calculateur est optionnel et collapsible (dans la section Notes existante).
