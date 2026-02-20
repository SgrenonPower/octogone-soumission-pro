
# Section « Options supplémentaires » (add-ons)

## Analyse de l'état actuel

### Architecture existante

Le calculateur actuel (994 lignes) est organisé en sections numérotées :
- Section 1 : Segment de clientèle (dropdown global)
- Section 2 : Informations client
- Section 3 : Établissements
- Section 4 : Rabais (dropdown + toggles + frais offerts)
- Section 5 : Calculateur ROI (collapsible)
- Section 6 : Notes et conditions spéciales (collapsible)

La sauvegarde passe par `sauvegarderSoumission()` dans `supabase-queries.ts` qui insère dans `soumissions`, `soumission_etablissements`, `soumission_rabais`, et optionnellement `soumission_roi`.

La table `soumission_options` **n'existe pas**. Aucune entrée `config` pour les options pré-configurées.

### Ce que le nouveau système requiert

1. Une nouvelle table `soumission_options` avec `id`, `soumission_id`, `nom`, `prix_description`, `ordre`
2. Des entrées `config` pour les options pré-configurées (Thermomètres connectés, Formation)
3. Une nouvelle section collapsible dans le formulaire (entre Section 6 Notes et les boutons d'action)
4. Un affichage dans le récapitulatif sticky (discret, sous les totaux)
5. Une section dans le PDF (conditionnelle)
6. Un affichage dans `SoumissionPresentation.tsx`
7. Un affichage dans `SoumissionDetail.tsx`
8. La duplication doit copier les options

---

## Décision d'architecture

### Stockage des options pré-configurées

La table `config` existante (clé/valeur) stockera les suggestions comme un JSON dans une seule clé :
```
cle: 'options_supplementaires_defaut'
valeur: '[{"nom":"Thermomètres connectés","prix_description":"50 $ / unité / mois"},{"nom":"Banque d\'heures de formation","prix_description":"150 $ / heure"}]'
categorie: 'options'
```

Cela permet à l'admin de modifier les suggestions depuis `AdminConfigSoumissions` sans déploiement.

### Interface `OptionSupplementaire` dans `Calculateur.tsx`

```ts
interface OptionSupplementaire {
  id: string;        // UUID local temporaire
  nom: string;
  prixDescription: string;
}
```

### Position dans le formulaire

La section « Options supplémentaires » sera insérée **après la Section 6 (Notes)** et **avant les boutons d'action**, numérotée Section 7. Elle est collapsible par défaut (fermée) via `Collapsible` de shadcn/ui — même pattern que la Section 6.

---

## Périmètre des changements

| Fichier | Nature |
|---|---|
| Base de données | Créer `soumission_options` + INSERT config options défaut |
| `src/lib/supabase-queries.ts` | `sauvegarderSoumission` + `fetchSoumissionById` + `dupliquerSoumission` |
| `src/pages/Calculateur.tsx` | État `options[]`, UI Section 7, récapitulatif, `handleSauvegarder` |
| `src/components/pdf/SoumissionPDF.tsx` | Section conditionnelle « Options supplémentaires » |
| `src/pages/SoumissionPresentation.tsx` | Section conditionnelle « Options supplémentaires » |
| `src/pages/SoumissionDetail.tsx` | Card « Options supplémentaires » |

---

## Détail technique par fichier

### 1. Migration base de données

**Nouvelle table `soumission_options` :**
```sql
CREATE TABLE soumission_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soumission_id UUID NOT NULL REFERENCES soumissions(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  prix_description TEXT NOT NULL DEFAULT '',
  ordre INTEGER DEFAULT 0
);

ALTER TABLE soumission_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accès public soumission_options"
  ON soumission_options FOR ALL
  USING (true) WITH CHECK (true);
```

**Insert dans `config` pour les options pré-configurées :**
```sql
INSERT INTO config (cle, valeur, categorie, description)
VALUES (
  'options_supplementaires_defaut',
  '[{"nom":"Thermomètres connectés","prix_description":"50 $ / unité / mois"},{"nom":"Banque d''heures de formation","prix_description":"150 $ / heure"}]',
  'options',
  'Options supplémentaires pré-configurées (JSON array)'
);
```

### 2. `src/lib/supabase-queries.ts`

**Type export :**
```ts
export type SoumissionOption = Database['public']['Tables']['soumission_options']['Row'];
```

**Nouvelle fonction `fetchOptionsSoumission` :**
```ts
export const fetchOptionsSoumission = async (soumissionId: string): Promise<SoumissionOption[]> => {
  const { data, error } = await supabase
    .from('soumission_options')
    .select('*')
    .eq('soumission_id', soumissionId)
    .order('ordre');
  if (error) throw error;
  return data || [];
};
```

**Dans `fetchSoumissionById`** — ajouter une 5e requête parallèle :
```ts
const [soumissionRes, etablissementsRes, rabaisRes, roiRes, optionsRes] = await Promise.all([
  supabase.from('soumissions').select('*').eq('id', id).single(),
  supabase.from('soumission_etablissements').select('*, segments(*)').eq('soumission_id', id),
  supabase.from('soumission_rabais').select('*, rabais(*)').eq('soumission_id', id),
  supabase.from('soumission_roi').select('*').eq('soumission_id', id).maybeSingle(),
  supabase.from('soumission_options').select('*').eq('soumission_id', id).order('ordre'),
]);

// Dans le return :
return {
  soumission: soumissionRes.data,
  etablissements,
  rabais,
  roi: { soumission_roi: roiRes.data, modules: roiModules },
  options: optionsRes.data || [],  // NOUVEAU
};
```

**Dans `sauvegarderSoumission`** — ajouter `options` dans les params et l'insert :
```ts
// Paramètre ajouté :
options: Array<{
  nom: string;
  prixDescription: string;
  ordre: number;
}>;

// Insert après les rabais :
if (params.options.length > 0) {
  await supabase.from('soumission_options').insert(
    params.options.map(o => ({
      soumission_id: soumission.id,
      nom: o.nom,
      prix_description: o.prixDescription,
      ordre: o.ordre,
    }))
  );
}
```

**Dans `dupliquerSoumission`** — récupérer et copier les options :
```ts
// Ajouter dans fetchSoumissionById ou requête directe :
const { data: optionsOriginales } = await supabase
  .from('soumission_options')
  .select('*')
  .eq('soumission_id', id)
  .order('ordre');

if (optionsOriginales && optionsOriginales.length > 0) {
  await supabase.from('soumission_options').insert(
    optionsOriginales.map(o => ({
      soumission_id: nouvelle.id,
      nom: o.nom,
      prix_description: o.prix_description,
      ordre: o.ordre,
    }))
  );
}
```

### 3. `src/pages/Calculateur.tsx`

**Nouvel état :**
```ts
const [options, setOptions] = useState<OptionSupplementaire[]>([]);
```

**Parsing des options pré-configurées depuis `config` :**
```ts
const optionsDefaut: Array<{ nom: string; prixDescription: string }> = useMemo(() => {
  try {
    return JSON.parse(config.options_supplementaires_defaut || '[]');
  } catch {
    return [
      { nom: 'Thermomètres connectés', prixDescription: '50 $ / unité / mois' },
      { nom: "Banque d'heures de formation", prixDescription: '150 $ / heure' },
    ];
  }
}, [config.options_supplementaires_defaut]);
```

**Handlers :**
```ts
const ajouterOption = (suggestion?: { nom: string; prixDescription: string }) => {
  if (options.length >= 10) return;
  setOptions(prev => [
    ...prev,
    {
      id: Date.now().toString(),
      nom: suggestion?.nom || '',
      prixDescription: suggestion?.prixDescription || '',
    },
  ]);
};

const supprimerOption = (id: string) => {
  setOptions(prev => prev.filter(o => o.id !== id));
};

const majOption = (id: string, champ: 'nom' | 'prixDescription', valeur: string) => {
  setOptions(prev => prev.map(o => o.id === id ? { ...o, [champ]: valeur } : o));
};
```

**Validation dans `handleSauvegarder` :**
```ts
if (options.some(o => !o.nom.trim())) {
  toast({ title: 'Erreur', description: 'Le nom est requis pour chaque option.', variant: 'destructive' });
  return;
}
```

**Passage à `sauvegarderSoumission` :**
```ts
await sauvegarderSoumission({
  // ...existant...
  options: options.map((o, i) => ({
    nom: o.nom.trim(),
    prixDescription: o.prixDescription.trim() || 'Sur demande',
    ordre: i,
  })),
});
```

**UI — Section 7 (collapsible, entre Section 6 et les boutons) :**

```text
<Card>
  <Collapsible defaultOpen={false}>
    <CollapsibleTrigger asChild>
      <CardHeader className="cursor-pointer select-none pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">7. Options supplémentaires (au besoin)</CardTitle>
          <div className="flex items-center gap-1 text-muted-foreground">
            {options.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" ...>
                {options.length} option{options.length > 1 ? 's' : ''}
              </span>
            )}
            <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
          </div>
        </div>
      </CardHeader>
    </CollapsibleTrigger>

    <CollapsibleContent>
      <CardContent className="space-y-3 pt-0">
        {/* Suggestions rapides */}
        <div className="flex flex-wrap gap-2">
          {optionsDefaut.map(opt => (
            <Button
              key={opt.nom}
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={() => ajouterOption(opt)}
              disabled={options.length >= 10}>
              <Plus className="h-3 w-3" />{opt.nom}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 gap-1"
            onClick={() => ajouterOption()}
            disabled={options.length >= 10}>
            <Plus className="h-3 w-3" />Option personnalisée
          </Button>
        </div>

        {/* Maximum atteint */}
        {options.length >= 10 && (
          <p className="text-xs text-muted-foreground">Maximum 10 options atteint.</p>
        )}

        {/* Liste des options ajoutées */}
        {options.map((opt, idx) => (
          <div key={opt.id} className="flex gap-2 items-start p-3 rounded-lg border">
            <div className="flex-1 space-y-2">
              <Input
                placeholder="Nom de l'option *"
                value={opt.nom}
                onChange={e => majOption(opt.id, 'nom', e.target.value)}
                className="h-9 text-sm"
              />
              <Input
                placeholder="Prix / description (ex. : 50 $ / unité / mois)"
                value={opt.prixDescription}
                onChange={e => majOption(opt.id, 'prixDescription', e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-destructive mt-0"
              onClick={() => supprimerOption(opt.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </CollapsibleContent>
  </Collapsible>
</Card>
```

**Récapitulatif sticky — Encadré discret (sous le coût total) :**

```text
{options.length > 0 && (
  <div className="border-t pt-3">
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
      Options disponibles
    </p>
    <div className="space-y-1">
      {options.map(opt => (
        <div key={opt.id} className="flex justify-between text-xs">
          <span className="text-muted-foreground truncate max-w-[140px]">{opt.nom}</span>
          <span className="text-muted-foreground text-right ml-2">
            {opt.prixDescription || 'Sur demande'}
          </span>
        </div>
      ))}
    </div>
  </div>
)}
```

**Dépendances useEffect Ctrl+S :** ajouter `options` au tableau.

### 4. `src/components/pdf/SoumissionPDF.tsx`

Recevoir `options` comme prop :
```ts
interface SoumissionPDFProps {
  // ...existant...
  options: SoumissionOption[];
}
```

Section conditionnelle **après les Notes importantes et avant les Conditions** :
```ts
{options.length > 0 && (
  <div className="pdf-no-break" style={{ marginBottom: 24 }}>
    <div style={{ fontSize: '11pt', fontWeight: 700, marginBottom: 10, color: '#1e3a5f' }}>
      Options supplémentaires (au besoin)
    </div>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
      <thead>
        <tr style={{ background: '#f0f4f8' }}>
          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Option</th>
          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#6b7280' }}>Prix</th>
        </tr>
      </thead>
      <tbody>
        {options.map((opt, i) => (
          <tr key={opt.id} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#f9fafb' : 'white' }}>
            <td style={{ padding: '8px 12px' }}>{opt.nom}</td>
            <td style={{ padding: '8px 12px', textAlign: 'right', color: '#6b7280' }}>
              {opt.prix_description || 'Sur demande'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <p style={{ fontSize: '8.5pt', color: '#9ca3af', marginTop: 8, fontStyle: 'italic' }}>
      Ces options sont informatives et ne sont pas incluses dans le total de l'abonnement.
    </p>
  </div>
)}
```

**Dans les pages qui utilisent `SoumissionPDF`** (`SoumissionDetail.tsx`) : passer `options={options}`.

### 5. `src/pages/SoumissionPresentation.tsx`

La requête via `fetchSoumissionById` retournera maintenant `options`. Destructurer :
```ts
const { soumission, etablissements, rabais, roi, options } = data;
```

Section conditionnelle **après les Rabais et avant le ROI** :
```tsx
{options && options.length > 0 && (
  <div className="p-6 rounded-2xl" style={{ background: 'hsl(var(--sidebar-accent))' }}>
    <h3 className="font-semibold mb-4" style={{ color: 'hsl(var(--sidebar-foreground))' }}>
      Options supplémentaires (au besoin)
    </h3>
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: 'hsl(var(--sidebar-accent) / 0.5)' }}>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'hsl(var(--sidebar-foreground) / 0.6)' }}>Option</th>
            <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'hsl(var(--sidebar-foreground) / 0.6)' }}>Prix</th>
          </tr>
        </thead>
        <tbody>
          {options.map((opt: any) => (
            <tr key={opt.id} className="border-t" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
              <td className="px-4 py-3 font-medium" style={{ color: 'hsl(var(--sidebar-foreground))' }}>
                {opt.nom}
              </td>
              <td className="px-4 py-3 text-right" style={{ color: 'hsl(var(--sidebar-foreground) / 0.7)' }}>
                {opt.prix_description || 'Sur demande'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className="text-xs mt-3" style={{ color: 'hsl(var(--sidebar-foreground) / 0.4)', fontStyle: 'italic' }}>
      Ces options sont informatives et n'affectent pas les totaux ci-dessus.
    </p>
  </div>
)}
```

### 6. `src/pages/SoumissionDetail.tsx`

Le composant appelle `fetchSoumissionById(id)` — il recevra automatiquement `options`. Ajouter une `Card` après la card Rabais :
```tsx
{options && options.length > 0 && (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base">Options supplémentaires</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {options.map((opt: any, i: number) => (
          <div key={opt.id} className="flex justify-between text-sm py-2 border-b last:border-0">
            <span className="font-medium">{opt.nom}</span>
            <span className="text-muted-foreground">{opt.prix_description || 'Sur demande'}</span>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)}
```

---

## Ordre d'exécution

```text
Étape 1 → Migration DB :
           CREATE TABLE soumission_options (...)
           ALTER TABLE ... ENABLE ROW LEVEL SECURITY
           CREATE POLICY ...
           INSERT INTO config (options pré-configurées)

Étape 2 → supabase-queries.ts :
           a. Export type SoumissionOption
           b. fetchSoumissionById → 5e requête parallèle options + retour
           c. sauvegarderSoumission → param options + insert
           d. dupliquerSoumission → copie des options

Étape 3 → Calculateur.tsx :
           a. Type OptionSupplementaire
           b. État options[]
           c. Parsing optionsDefaut depuis config
           d. Handlers : ajouterOption, supprimerOption, majOption
           e. Validation dans handleSauvegarder
           f. Passage options à sauvegarderSoumission
           g. Section 7 (collapsible) dans le formulaire
           h. Encadré « Options disponibles » dans le récapitulatif sticky
           i. Ajout de options aux dépendances Ctrl+S

Étape 4 → SoumissionPDF.tsx :
           a. Prop options: SoumissionOption[]
           b. Section conditionnelle avant les conditions

Étape 5 → SoumissionDetail.tsx :
           a. Passer options={options || []} à SoumissionPDF
           b. Card « Options supplémentaires »

Étape 6 → SoumissionPresentation.tsx :
           a. Destructurer options depuis data
           b. Section conditionnelle après les rabais
```

---

## Edge cases couverts

- **Aucune option** : la section n'apparaît nulle part (PDF, présentation, récap, détail)
- **Nom vide → sauvegarde bloquée** : validation dans `handleSauvegarder`
- **Prix vide → "Sur demande"** : fallback dans l'affichage et à la sauvegarde
- **Maximum 10 options** : boutons "+ Ajouter" désactivés + message
- **Duplication** : `dupliquerSoumission` copie les lignes de `soumission_options`
- **Calcul non affecté** : les options ne participent à aucun calcul de total
- **Config admin** : les suggestions pré-configurées viennent de la table `config` (modifiable via AdminConfigSoumissions)
- **Soumissions existantes** : `ON DELETE CASCADE` sur `soumission_id` → pas d'orphelins si la soumission est supprimée
