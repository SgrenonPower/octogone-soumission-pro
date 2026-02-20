
# Soumissions multi-segments

## Analyse de l'état actuel

### Problème central

Le calculateur gère actuellement `segmentId` comme un état **global** : un seul segment s'applique à tous les établissements. La fonction `calculerPrixEtablissement` reçoit ce segment unique et les paliers de ce segment.

L'interface `Etablissement` est :
```ts
{ id: string; nom: string; nombreUnites: number; estPilote: boolean }
```

Et `handleSauvegarder` envoie `segmentId` identique pour tous les établissements dans `soumission_etablissements`.

### Solution : Lignes de tarification + Nombre d'établissements séparé

Plutôt que de lier le nombre de lignes de tarification au nombre d'établissements physiques (pour les frais d'intégration), on sépare les deux concepts :

- **Lignes de tarification** (`LigneTarification`) : chaque ligne a son propre segment, quantité et prix calculé
- **Nombre d'établissements** : champ numérique séparé, utilisé uniquement pour le calcul des frais d'intégration

La table `soumission_etablissements` peut déjà stocker N lignes par soumission avec chacune son propre `segment_id` — aucun changement structurel n'est requis ici.

### Migration DB requise

Une seule migration : ajouter `nombre_etablissements INTEGER DEFAULT 1` à la table `soumissions`, pour stocker le compte physique d'établissements (pour les frais d'intégration) indépendamment du nombre de lignes.

---

## Périmètre des changements

| Fichier | Nature |
|---|---|
| Base de données | `nombre_etablissements INTEGER DEFAULT 1` sur `soumissions` |
| `src/pages/Calculateur.tsx` | Remplacer `segmentId` global par `LigneTarification[]`, ajouter champ `nombreEtablissements`, calcul multi-segments, UI |
| `src/lib/supabase-queries.ts` | `sauvegarderSoumission` + `dupliquerSoumission` + `fetchSoumissionById` |
| `src/components/pdf/SoumissionPDF.tsx` | Nouveau tableau multi-segments |
| `src/pages/SoumissionPresentation.tsx` | Tableau multi-segments |
| `src/pages/SoumissionDetail.tsx` | Afficher le segment de chaque ligne dans le tableau |

---

## Détail technique par fichier

### 1. Migration base de données

```sql
ALTER TABLE soumissions
  ADD COLUMN nombre_etablissements INTEGER DEFAULT 1;
```

Cette colonne stocke le nombre de **sites physiques** (pour les frais d'intégration = `nombre_etablissements × fraisParEtab`), indépendant du nombre de lignes de tarification.

### 2. Nouveau type `LigneTarification` dans `Calculateur.tsx`

```ts
interface LigneTarification {
  id: string;
  segmentId: string;
  nombreUnites: number;
  estPilote: boolean;
  // prixUnitaire modifiable (override du prix segment)
  prixUnitaireOverride: number | null; // null = utiliser le prix du segment
}
```

**États remplacés/ajoutés :**
```ts
// Remplace : const [segmentId, setSegmentId] = useState<string>('');
// Remplace : const [etablissements, setEtablissements] = useState<Etablissement[]>([...])
const [lignes, setLignes] = useState<LigneTarification[]>([
  { id: '1', segmentId: '', nombreUnites: 0, estPilote: false, prixUnitaireOverride: null }
]);
const [nombreEtablissements, setNombreEtablissements] = useState(1);
```

### 3. Calcul par ligne dans `Calculateur.tsx`

Remplacer la fonction `calculerPrixEtablissement` (qui prenait un seul `segment`) par une version qui recherche dynamiquement le segment :

```ts
const calculerPrixLigne = (
  ligne: LigneTarification,
  tousSegments: Segment[],
  tousLesPaliers: Palier[],
  tousLesRabais: Rabais[],
  rabaisState: RabaisState,
  rabaisDropdown: RabaisDropdownState,
): { prixBrut: number; prixFinal: number; segment: Segment | null } => {
  const segment = tousSegments.find(s => s.id === ligne.segmentId) || null;
  if (!segment) return { prixBrut: 0, prixFinal: 0, segment: null };

  const paliersSegment = tousLesPaliers.filter(p => p.segment_id === segment.id);
  let prixBase: number;

  if (segment.type_tarification === 'paliers') {
    const palier = paliersSegment.find(p =>
      ligne.nombreUnites >= p.capacite_min &&
      (p.capacite_max === null || ligne.nombreUnites <= p.capacite_max)
    );
    prixBase = palier ? Number(palier.tarif_mensuel) : 0;
  } else {
    const prixUnitaire = ligne.prixUnitaireOverride ?? Number(segment.prix_unitaire || 0);
    const prixBrutCalc = ligne.nombreUnites * prixUnitaire;
    prixBase = Math.max(prixBrutCalc, Number(segment.minimum_mensuel || 0));
  }

  const prixBrut = prixBase;
  let prixFinal = prixBase;

  // Couche 1 : rabais dropdown
  if (rabaisDropdown.type !== 'aucun' && rabaisDropdown.pourcentage > 0) {
    prixFinal = prixFinal * (1 - rabaisDropdown.pourcentage / 100);
  }
  // Couche 2 : engagement
  if (rabaisState.engagement) {
    const r = tousLesRabais.find(r => r.slug === 'engagement-annuel');
    if (r) prixFinal = prixFinal * (1 - Number(r.pourcentage) / 100);
  }
  // Couche 3 : pilote
  if (rabaisState.pilote && ligne.estPilote) {
    const r = tousLesRabais.find(r => r.slug === 'projet-pilote');
    if (r) prixFinal = prixFinal * (1 - Number(r.pourcentage) / 100);
  }

  return {
    prixBrut: Math.round(prixBrut * 100) / 100,
    prixFinal: Math.round(prixFinal * 100) / 100,
    segment,
  };
};
```

**Calcul des totaux :**
```ts
const calculs = lignes.map(ligne => ({
  ligne,
  ...calculerPrixLigne(ligne, segments, tousLesPaliers, tousLesRabais, rabaisState, rabaisDropdown),
}));

const sousTotalMensuel = calculs.reduce((acc, c) => acc + c.prixBrut, 0);
const totalMensuel = calculs.reduce((acc, c) => acc + c.prixFinal, 0);
const totalAnnuel = totalMensuel * 12;
const fraisIntegration = nombreEtablissements * fraisParEtab; // SÉPARÉ des lignes
const fraisIntegrationEffectifs = fraisOfferts ? 0 : fraisIntegration;
const coutTotalAn1 = totalAnnuel + fraisIntegrationEffectifs;
```

### 4. Nouvelle UI — Section 1 : Segment global supprimé

La section 1 « Segment de clientèle » (dropdown global) est **supprimée**. Le segment est maintenant choisi par ligne.

### 5. Nouvelle UI — Section 2 : Informations client + Nombre d'établissements

```text
Section 2 — Informations client
  - Nom du client *
  - Nombre d'établissements (pour les frais d'intégration) [Input numérique, min=1]
    → label explicatif : "Utilisé pour le calcul des frais d'intégration uniquement"
```

### 6. Nouvelle UI — Section 3 (remplace Établissements) : Lignes de tarification

```text
Section 3 — Lignes de tarification
  [Pour chaque ligne :]
  ┌─────────────────────────────────────────────────────────────┐
  │ Ligne 1                                          [✕ Suppr.] │
  │ Segment : [Select dropdown]                                 │
  │ Quantité : [Input num] × [prix unitaire segment]$ = [total] │
  │ Si pilote activé : [Switch] Ligne pilote                    │
  └─────────────────────────────────────────────────────────────┘
  [+ Ajouter une ligne de tarification]    (max 10)
```

**Logique du Select segment par ligne :**
- Affiche tous les segments actifs
- Quand le segment change → `prixUnitaireOverride` est remis à `null` (utilise le prix par défaut du segment)
- Le prix unitaire est affiché (non modifiable dans un premier temps — rester simple)

**Bouton "+ Ajouter une ligne de tarification" :**
- `variant="outline"`, icône `Plus`
- Désactivé si 10 lignes atteintes, avec message d'info affiché

**Validation à la sauvegarde :**
```ts
if (lignes.some(l => !l.segmentId)) → erreur "Choisissez un segment pour chaque ligne"
if (lignes.some(l => l.nombreUnites < 1)) → erreur "La quantité doit être d'au moins 1"
if (lignes.length > 10) → erreur "Maximum 10 lignes"
```

### 7. Récapitulatif sticky — Détail par ligne

Remplacer la section « Établissements » du panneau récap par une section « Abonnement mensuel » :

```text
ABONNEMENT MENSUEL
  Portes autonomes — 345 unités    1 725,00 $
  Lits catég. 3-4 — 28 lits         140,00 $
  ──────────────────────────────────────────
  Sous-total brut               1 865,00 $

  Rabais volume (20 %)           −373,00 $
  ──────────────────────────────────────────
  Total mensuel                 1 492,00 $
  Total annuel                 17 904,00 $
  
FRAIS D'INTÉGRATION
  3 établissements × 3 000 $    9 000,00 $
  ──────────────────────────────────────────
  Coût total 1re année         26 904,00 $
```

### 8. `handleSauvegarder` — Adaptations

```ts
// Validation
if (!nomClient.trim()) → erreur
if (lignes.some(l => !l.segmentId)) → erreur
if (lignes.some(l => l.nombreUnites < 1)) → erreur

// Passage à sauvegarderSoumission
await sauvegarderSoumission({
  // ...
  nombreEtablissements, // NOUVEAU
  etablissements: calculs.map(c => ({
    segmentId: c.ligne.segmentId,  // Par ligne (plus global)
    nomEtablissement: `${c.segment?.nom || 'Ligne'} — ${c.ligne.nombreUnites} unités`,
    nombreUnites: c.ligne.nombreUnites,
    estPilote: c.ligne.estPilote,
    prixBrut: c.prixBrut,
    prixFinal: c.prixFinal,
  })),
  // ...
});
```

### 9. `src/lib/supabase-queries.ts`

**`sauvegarderSoumission`** — ajouter `nombreEtablissements` :
```ts
// Dans params :
nombreEtablissements: number;

// Dans l'insert soumissions :
nombre_etablissements: params.nombreEtablissements,
```

**`dupliquerSoumission`** — copier `nombre_etablissements` :
```ts
nombre_etablissements: soumission.nombre_etablissements ?? 1,
```

**`fetchSoumissionById`** — aucun changement structurel requis. Chaque ligne dans `etablissements` a déjà son `segment_id` et `segment` joint.

### 10. `src/components/pdf/SoumissionPDF.tsx`

**Section « Détail par établissement » → « Détail de l'abonnement »**

Remplacer le tableau actuel par un tableau à 4 colonnes :

| Description | Quantité | Tarif/mois | Sous-total/mois |
|---|---|---|---|
| Portes autonomes | 345 | 5,00 $/unité | 1 725,00 $ |
| Lits – catég. 3-4 | 28 | 5,00 $/lit | 140,00 $ |
| **Total abonnement** | — | — | **1 865,00 $** |

La « Description » = nom du segment (via `e.segment?.nom` ou `e.nom_etablissement` comme fallback). La quantité = `e.nombre_unites`. Le tarif = `prix_brut / nombre_unites` (calculé). Le sous-total = `e.prix_brut`.

Pour les frais d'intégration, afficher `soumission.nombre_etablissements × 3 000 $` au lieu de `etablissements.length × 3 000 $`.

### 11. `src/pages/SoumissionPresentation.tsx`

Même logique que le PDF : tableau avec nom du segment, quantité, prix final par ligne.

Remplacer la colonne « Unités » par une colonne plus descriptive et utiliser `e.segment?.nom` comme label de ligne.

Pour la ligne « Frais d'intégration » : `soumission.nombre_etablissements × 3 000 $`.

### 12. `src/pages/SoumissionDetail.tsx`

Le tableau existant « Établissements » affiche déjà `nom_etablissement`, `nombre_unites`, `prix_brut`, `prix_final`. Avec le nouveau système, `nom_etablissement` sera auto-généré comme `"Portes autonomes — 345 unités"`. C'est déjà lisible — pas de refonte requise.

Ajouter optionnellement une colonne « Segment » qui affiche `e.segment?.nom`.

---

## Gestion du toggle pilote — Adaptation

La section 4 (Rabais) garde le toggle pilote. Le switch par ligne « Ligne pilote » est visible dans chaque ligne de tarification **seulement si le toggle pilote (section 4) est activé** — comportement identique au switch « Établissement pilote » précédent.

---

## Ordre d'exécution

```text
Étape 1 → Migration DB :
           ALTER TABLE soumissions ADD COLUMN nombre_etablissements INTEGER DEFAULT 1

Étape 2 → supabase-queries.ts :
           a. sauvegarderSoumission (+ nombreEtablissements dans params + insert)
           b. dupliquerSoumission (copier nombre_etablissements)
           Note : fetchSoumissionById ne change pas structurellement

Étape 3 → Calculateur.tsx :
           a. Supprimer état segmentId global + interface Etablissement
           b. Nouveau type LigneTarification + état lignes[] + nombreEtablissements
           c. Nouvelle fonction calculerPrixLigne (recherche segment par ligne)
           d. Mise à jour calculs[], fraisIntegration (basé sur nombreEtablissements)
           e. Section 1 (dropdown global) → supprimée
           f. Section 2 → ajouter champ nombre d'établissements
           g. Section 3 → UI lignes de tarification avec Select par ligne
           h. Validation handleSauvegarder mise à jour
           i. Récapitulatif sticky : liste par ligne
           j. useEffect Ctrl+S : dépendances mises à jour

Étape 4 → SoumissionPDF.tsx :
           a. Tableau « Détail de l'abonnement » avec colonnes Description/Quantité/Tarif/Sous-total
           b. Frais d'intégration → soumission.nombre_etablissements

Étape 5 → SoumissionPresentation.tsx :
           a. Tableau multi-segments avec nom du segment
           b. Frais d'intégration → soumission.nombre_etablissements

Étape 6 → SoumissionDetail.tsx :
           a. Colonne segment dans le tableau établissements
```

---

## Edge cases couverts

- **Même segment deux fois** : autorisé, chaque ligne est indépendante
- **Dernière ligne non supprimable** : `lignes.length > 1` pour afficher le bouton ✕
- **Maximum 10 lignes** : bouton désactivé + message d'info
- **Segment changé sur une ligne** : `prixUnitaireOverride` remis à null → prix par défaut du nouveau segment
- **Soumissions existantes** : `nombre_etablissements DEFAULT 1` → rétrocompatibles ; `nom_etablissement` était déjà stocké
- **Frais d'intégration** : basés sur `nombreEtablissements` (champ séparé), pas sur `lignes.length`
- **Toggle pilote** : le switch par ligne est désactivé si le toggle pilote (section 4) est off
- **ROI** : utilise toujours `etablissements.length` (nombre de lignes) pour `nbEtablissements` — comportement conservé
- **Duplication** : `nombre_etablissements` copié ; les lignes (`soumission_etablissements`) copiées comme avant
- **Validation** : chaque ligne doit avoir un `segmentId` non vide ET `nombreUnites ≥ 1`
- **PDF frais d'intégration** : affiche `soumission.nombre_etablissements × 3 000 $` (pas `etablissements.length`)
