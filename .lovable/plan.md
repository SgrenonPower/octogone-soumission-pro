
# Refonte de la grille de prix : Modules produit cumulatifs + Rabais volume par paliers

## Contexte et portée

Cette refonte transforme le modèle de tarification de l'application. Elle touche 5 fichiers de code et nécessite une migration de base de données. Les soumissions existantes ne sont pas cassées — les anciens segments restent en base avec `actif = false`.

---

## Partie 1 — Migration base de données

Une seule migration SQL qui fait tout :

**Segments :**
- Désactiver (`actif = false`) les 4 segments RPA existants (`rpa-cat-1`, `rpa-cat-2`, `rpa-cat-3`, `rpa-cat-4`)
- Insérer 4 nouveaux segments : Cat 1-2, Cat 3-4, CHSLD, Public/Hôpitaux
- Mettre à jour l'ordre des segments existants (CPE=5, Cafétéria=6, Traiteur=7, Restaurant=8)

**Nouvelles tables :**
- `modules_produit` — catalogue des 2 modules (Interface soins, IA) avec slug, ordre, actif
- `prix_modules_produit` — prix de chaque module par segment (clé unique `segment_id + module_produit_id`)
- `soumission_etablissement_modules` — quels modules sont actifs sur chaque établissement d'une soumission
- RLS permissive (`USING (true) WITH CHECK (true)`) sur les 3 nouvelles tables

**Données initiales :** Insertion de tous les prix modules par segment selon la grille fournie

**Autres changements :**
- `UPDATE rabais SET actif = false WHERE slug = 'volume-500'`
- `ALTER TABLE soumissions ADD COLUMN IF NOT EXISTS est_rqra boolean DEFAULT false`

---

## Partie 2 — `src/lib/supabase-queries.ts`

**Nouveaux types et fonctions à ajouter :**

```
ModuleProduit        → type depuis les nouveaux types DB
PrixModuleProduit    → type depuis les nouveaux types DB

fetchModulesProduit()          → SELECT * FROM modules_produit WHERE actif = true ORDER BY ordre
fetchPrixModulesProduit()      → SELECT * FROM prix_modules_produit (tous, pour filtrage côté client)
updatePrixModuleProduit(id, prix_unitaire) → UPDATE prix_modules_produit
```

**Modifier `sauvegarderSoumission` :**
- Ajouter `estRqra?: boolean` dans les params → `est_rqra: params.estRqra ?? false` dans l'insert soumissions
- Ajouter `modulesProduitsActifs?: Array<{ moduleId: string; prixUnitaire: number }>` par établissement
- Après l'insert des établissements, récupérer les IDs retournés et insérer dans `soumission_etablissement_modules`

**Modifier `fetchSoumissionById` :**
- Charger les modules produit de chaque établissement via join `soumission_etablissement_modules`

---

## Partie 3 — `src/pages/Calculateur.tsx`

### Nouvelle logique de calcul (remplace `calculerPrixEtablissement`)

```typescript
// Nouvelle fonction helper
const calculerRabaisVolume = (nbUnites: number): number => {
  if (nbUnites >= 1000) return 15;
  if (nbUnites >= 500)  return 10;
  if (nbUnites >= 300)  return 5;
  return 0;
};

// Signature modifiée de calculerPrixEtablissement :
// + modulesProduitActifs: ModuleProduit[]
// + prixModules: PrixModuleProduit[]
// + segment (pour chercher le prix module par segment_id)

// Ordre d'application des rabais (nouveau) :
// 1. Prix base (linéaire ou palier) + modules produit
// 2. Rabais volume automatique (par unité)
// 3. Rabais dropdown (multi-sites)
// 4. Engagement annuel
// 5. Pilote
```

### Nouveaux états React

```typescript
const [modulesProduitActifs, setModulesProduitActifs] = useState<Set<string>>(new Set());
const [estRqra, setEstRqra] = useState(false);
```

### Nouvelles queries TanStack

```typescript
useQuery({ queryKey: ['modules-produit'], queryFn: fetchModulesProduit })
useQuery({ queryKey: ['prix-modules-produit'], queryFn: fetchPrixModulesProduit })
```

### Nouveaux éléments UI dans le formulaire

**Section 1.5 — Modules produit (entre segment et client) :**
- Titre : "Modules produit (cumulatifs)"
- Checkboxes pour chaque module actif, avec le prix affiché selon le segment sélectionné
- Ex : `☐ Interface soins (+7,00 $/lit/mois)` | `☐ IA (+9,00 $/lit/mois)`
- Si aucun segment sélectionné → message "Sélectionnez d'abord un segment"
- Pour le segment restaurant (paliers) → afficher le montant forfaitaire fixe

**Section 3 — Par établissement :**
- Badge vert automatique si `calculerRabaisVolume(etab.nombreUnites) > 0`
- Ex : `Rabais volume : −5 %` (en vert sous le champ unités)

**Section 4 — Rabais :**
- Retirer "Volume (volume-500)" du dropdown — ne garder que : Aucun | Multi-sites | Personnalisé
- Ajouter toggle RQRA :
  ```
  ☐ Client RQRA (frais d'intégration offerts)
  ```
  Quand coché → `fraisOfferts = true` (comportement identique au toggle pilote existant)

**Panneau récapitulatif (droite) :**
- Si modules actifs → afficher sous "Sous-total" la liste des modules avec leur contribution totale
- Si rabais volume → afficher par établissement le % appliqué
- Si RQRA → badge "RQRA" à côté des frais offerts

### Sauvegarde

Dans `handleSauvegarder`, passer aux `etablissements` les modules produit actifs avec leur prix pour le segment.

---

## Partie 4 — `src/pages/admin/Tarification.tsx`

Ajouter une nouvelle section **"Prix des modules produit par segment"** sous la section Segments existante :

```
Tableau :
Segment          | Base (v3) | Interface soins | IA
────────────────────────────────────────────────────
Cat 1-2          | 5,00 $    | [input éditable] | [input éditable]
Cat 3-4          | 5,00 $    | [input éditable] | [input éditable]
CHSLD            | 5,00 $    | [input éditable] | [input éditable]
...
```

- Charger `fetchModulesProduit()` et `fetchPrixModulesProduit()` via useQuery
- Pour chaque segment actif, afficher une ligne avec ses prix de modules en inputs
- Bouton Sauvegarder par ligne (ou par cellule) qui appelle `updatePrixModuleProduit`
- Utiliser le même pattern `editing` state déjà en place

---

## Partie 5 — `src/lib/format.ts` et `src/lib/roi-calc.ts`

Aucune modification nécessaire.

---

## Séquence d'implémentation

```text
1. Migration SQL (bloquant — les types DB doivent être régénérés avant le code)
   ↓
2. supabase-queries.ts — nouveaux types + fetch + update + sauvegarde
   ↓
3. Calculateur.tsx — nouvelle logique calcul + UI modules + RQRA + rabais volume
   ↓
4. admin/Tarification.tsx — tableau prix modules éditable
```

---

## Points techniques importants

**Type-safety :** Les nouvelles tables n'existent pas encore dans `types.ts`. Le code utilisera des casts `as any` ciblés (comme déjà fait dans le code existant pour `soumission_options`) uniquement là où nécessaire, jusqu'à ce que les types soient régénérés automatiquement après la migration.

**Rétrocompatibilité :** Les soumissions existantes qui référencent des segments `actif = false` continueront à s'afficher correctement dans les pages Détail et Présentation — le fetch des soumissions charge les données telles qu'elles étaient au moment de la création.

**Suppression "volume" du dropdown :** La constante `defautsRabaisDropdown` et le `RabaisDropdownState.type` seront mis à jour pour retirer l'option `'volume'`. Le type union devient `'aucun' | 'multi-sites' | 'personnalise'`.

**Ordre des rabais :** Le rabais volume automatique s'applique en premier (avant dropdown multi-sites), ce qui est cohérent avec la définition métier "rabais automatique par palier".

**Toggle RQRA vs pilote :** RQRA offre les frais d'intégration indépendamment du toggle pilote. Les deux peuvent coexister. L'état `fraisOfferts` est mis à `true` si l'un OU l'autre est activé.
