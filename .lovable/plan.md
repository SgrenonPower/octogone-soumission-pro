
# Audit anti-hardcoded — Rapport et plan de correction

## Inventaire complet des valeurs hardcodées

Après lecture exhaustive de tous les fichiers sources, voici les violations classées par sévérité.

### Sévérité CRITIQUE — Valeurs de calcul ou contenu PDF qui ignorent Supabase

| # | Fichier | Ligne | Valeur hardcodée | Ce qui doit la remplacer |
|---|---|---|---|---|
| 1 | `SoumissionPDF.tsx` | 303–306 | Texte complet des conditions générales | `config.conditions_generales` |
| 2 | `SoumissionPDF.tsx` | 68, 312 | `"Octogone 360"` (en-tête + pied) | `config.nom_entreprise` |
| 3 | `SoumissionPDF.tsx` | 69 | `"Plateforme de gestion alimentaire"` (sous-titre) | `config.sous_titre_entreprise` (nouvelle clé) |
| 4 | `SoumissionPresentation.tsx` | 44 | `"Octogone 360"` (barre header) | `config.nom_entreprise` |
| 5 | `SoumissionPresentation.tsx` | 243 | `"Octogone 360 — ... — Valide 30 jours"` | `config.nom_entreprise` + `config.validite_soumission_jours` |
| 6 | `Calculateur.tsx` | 72–76 | `DEFAUTS_RABAIS = { 'multi-sites': 15, 'volume': 20 }` | Lire depuis la table `rabais` (slugs `multi-sites`, `volume-500`) |
| 7 | `roi-calc.ts` | 65 | `donnees.coutGestionDechets * 0.15` | Paramètre `reduction_dechets` dans `parametres_roi` |

### Sévérité MOYENNE — Valeurs par défaut qui devraient venir de config

| # | Fichier | Ligne | Valeur hardcodée | Ce qui doit la remplacer |
|---|---|---|---|---|
| 8 | `Calculateur.tsx` | 201–203 | `tauxHoraireCuisine: 22, tauxHoraireAdmin: 35, tauxHoraireCompta: 27` | `config.taux_horaire_cuisine_defaut`, etc. |
| 9 | `SoumissionPDF.tsx` | 182 | `"... × 3 000 $"` dans le label des frais | Calculer depuis `fraisInt / etablissements.length` ou `config.frais_integration` |

### Sévérité FAIBLE — Fallbacks acceptables (documentés, non bloquants)

| # | Fichier | Description | Verdict |
|---|---|---|---|
| 10 | `Calculateur.tsx:217` | `config.frais_integration \|\| 3000` | Acceptable — valeur en DB (`3000`), fallback = même valeur |
| 11 | `Calculateur.tsx:218` | `config.validite_soumission_jours \|\| 30` | Acceptable — valeur en DB (`30`), fallback = même valeur |
| 12 | `admin/Tarification.tsx:159` | `config.frais_integration \|\| 3000` (affichage admin) | Acceptable |
| 13 | `roi-calc.ts` — tous les `getParam(..., defaut)` | Les valeurs par défaut sont des fallbacks de sécurité, les vraies valeurs viennent de DB | Acceptable |

### Discordances clés (paramètres ROI)

Le code `roi-calc.ts` utilise des clés comme `heures_rh` et `heures_economisees`, mais la DB a `heures_rh_an` et `heures_economisees_an`. Cela signifie que **le calcul ne trouve jamais ces paramètres en DB** et utilise toujours les valeurs codées en dur. C'est un bug silencieux.

| Clé dans le code | Clé en DB | Valeur en DB |
|---|---|---|
| `heures_rh` | `heures_rh_an` | 72 |
| `heures_compta_rh` | `heures_compta_rh_an` | 12 |
| `heures_economisees` | `heures_economisees_an` | 65 |
| `reduction_dechets` | manquante (0.15 hardcodé) | — |

---

## Décisions d'architecture

### 1. Nouvelles clés `config` à créer (INSERT)

```sql
INSERT INTO config (cle, valeur, categorie, description) VALUES
  ('sous_titre_entreprise', 'Plateforme de gestion alimentaire', 'pdf', 'Sous-titre affiché sous le nom sur le PDF'),
  ('taux_horaire_cuisine_defaut', '22', 'roi', 'Taux horaire cuisine par défaut ($/h)'),
  ('taux_horaire_admin_defaut', '35', 'roi', 'Taux horaire admin par défaut ($/h)'),
  ('taux_horaire_compta_defaut', '27', 'roi', 'Taux horaire comptabilité par défaut ($/h)');
```

### 2. Nouveau paramètre ROI pour le module Thermomètres

Ajouter dans `parametres_roi` la clé `reduction_dechets` (valeur `0.15`) pour le module thermomètres.

### 3. Correction des clés discordantes dans `roi-calc.ts`

Corriger les appels `getParam` pour qu'ils utilisent les clés exactes qui existent en DB :
- `'heures_rh'` → `'heures_rh_an'`  
- `'heures_compta_rh'` → `'heures_compta_rh_an'`
- `'heures_economisees'` → `'heures_economisees_an'`

### 4. Refactorer `DEFAUTS_RABAIS` dans `Calculateur.tsx`

Remplacer le dictionnaire hardcodé par une dérivation depuis `tousLesRabais` :
```ts
// Au lieu de : const DEFAUTS_RABAIS = { 'multi-sites': 15, 'volume': 20 }
// Calculé depuis les données Supabase :
const defautsRabais = useMemo(() => {
  const map: Record<string, number> = { 'personnalise': 0 };
  tousLesRabais.filter(r => r.type_ui === 'dropdown').forEach(r => {
    map[r.slug] = Number(r.pourcentage);
  });
  return map;
}, [tousLesRabais]);
```

Note : `multi-sites` → slug en DB = `multi-sites`, `volume` → slug en DB = `volume-500`. Le type dans le dropdown restera `'volume'` (invariant UI) mais le pourcentage par défaut viendra de la DB.

### 5. PDF : lire `config` depuis props

`SoumissionPDF` reçoit `soumission` et a accès au `config` via un nouveau prop ou via un appel à `fetchConfig` depuis `SoumissionDetail`. La solution la plus simple : passer un prop `config: Record<string, string>` au composant, que `SoumissionDetail` alimente via son propre `useQuery(['config'])`.

### 6. `SoumissionPresentation.tsx` : charger la config

Ajouter un `useQuery(['config'])` dans `SoumissionPresentation` pour lire `nom_entreprise` et `validite_soumission_jours`.

---

## Périmètre des modifications

| Fichier | Changements |
|---|---|
| DB (INSERT data) | Nouvelles clés config + nouveau paramètre ROI `reduction_dechets` |
| `src/lib/roi-calc.ts` | Corriger 3 clés discordantes + remplacer `* 0.15` par `getParam` |
| `src/pages/Calculateur.tsx` | Remplacer `DEFAUTS_RABAIS` hardcodé par dérivation depuis `tousLesRabais` + taux horaires par défaut depuis config |
| `src/components/pdf/SoumissionPDF.tsx` | Nouveau prop `config`, lire `nom_entreprise`, `sous_titre_entreprise`, `conditions_generales`. Corriger label frais `3 000 $` |
| `src/pages/SoumissionDetail.tsx` | Passer `config` au composant `SoumissionPDF` |
| `src/pages/SoumissionPresentation.tsx` | Charger config, remplacer `"Octogone 360"` et `"Valide 30 jours"` |

---

## Détail technique par fichier

### Étape 1 — Données : INSERT dans `config` et `parametres_roi`

```sql
-- Nouvelles clés config
INSERT INTO config (cle, valeur, categorie, description)
VALUES
  ('sous_titre_entreprise', 'Plateforme de gestion alimentaire', 'pdf', 'Sous-titre PDF'),
  ('taux_horaire_cuisine_defaut', '22', 'roi', 'Taux horaire cuisine par défaut ($/h)'),
  ('taux_horaire_admin_defaut', '35', 'roi', 'Taux horaire admin par défaut ($/h)'),
  ('taux_horaire_compta_defaut', '27', 'roi', 'Taux horaire compta par défaut ($/h)');

-- Nouveau paramètre ROI thermomètres (module bf4d9835-...)
INSERT INTO parametres_roi (module_id, cle, label, valeur, ordre)
VALUES ('bf4d9835-6560-41ac-94c5-e0b65df519f8', 'reduction_dechets', 'Réduction coût gestion déchets (%)', 0.15, 99);
```

### Étape 2 — `roi-calc.ts` : 4 corrections

**Correction 1** — `calculerThermometres` ligne 65 :
```ts
// AVANT :
const economiesDechets = donnees.coutGestionDechets * 0.15;
// APRÈS :
const reductionDechets = getParam(params, moduleId, 'reduction_dechets', 0.15);
const economiesDechets = donnees.coutGestionDechets * reductionDechets;
```

**Corrections 2–4** — clés discordantes dans `calculerRH` et `calculerFacturation` :
```ts
// calculerFacturation ligne 126
const heuresEconomisees = getParam(params, moduleId, 'heures_economisees_an', 65); // était 'heures_economisees'

// calculerRH lignes 144–145
const heuresRH = getParam(params, moduleId, 'heures_rh_an', 72); // était 'heures_rh'
const heuresComptaRH = getParam(params, moduleId, 'heures_compta_rh_an', 12); // était 'heures_compta_rh'
```

### Étape 3 — `Calculateur.tsx` : 3 corrections

**Correction A** — Remplacer `DEFAUTS_RABAIS` statique par calcul dynamique :

```ts
// Supprimer le const DEFAUTS_RABAIS statique en haut de fichier
// Ajouter dans le composant après tousLesRabais :

// Pourcentages par défaut des rabais dropdown (depuis Supabase)
const defautsRabaisDropdown = useMemo(() => {
  const map: Record<string, number> = { 'personnalise': 0 };
  tousLesRabais
    .filter(r => r.type_ui === 'dropdown')
    .forEach(r => { map[r.slug] = Number(r.pourcentage); });
  // Alias : volume-500 → volume (nom interne du type UI)
  if (map['volume-500'] !== undefined) map['volume'] = map['volume-500'];
  return map;
}, [tousLesRabais]);
```

Mettre à jour la référence dans le `Select` (ligne 597) : `DEFAUTS_RABAIS[v]` → `defautsRabaisDropdown[v]`.

**Correction B** — Taux horaires par défaut depuis config :

```ts
// Dans le useState de donneesROI, remplacer les valeurs hardcodées par les valeurs de config :
const [donneesROI, setDonneesROI] = useState<DonneesROI>({
  nbEtablissements: 1,
  budgetAlimentaire: 0,
  coutsApprovisionnement: 0,
  nbEmployesCuisine: 0,
  nbResponsablesCommandes: 0,
  nbEmployesTotal: 0,
  tauxHoraireCuisine: Number(config.taux_horaire_cuisine_defaut || 22),
  tauxHoraireAdmin: Number(config.taux_horaire_admin_defaut || 35),
  tauxHoraireCompta: Number(config.taux_horaire_compta_defaut || 27),
  coutGestionDechets: 0,
});
```

Problème : `useState` ne se réinitialise pas quand `config` change. Solution : ajouter un `useEffect` qui met à jour les taux horaires une fois la config chargée :

```ts
useEffect(() => {
  if (!config.taux_horaire_cuisine_defaut) return; // config pas encore chargée
  setDonneesROI(prev => ({
    ...prev,
    tauxHoraireCuisine: Number(config.taux_horaire_cuisine_defaut),
    tauxHoraireAdmin: Number(config.taux_horaire_admin_defaut || prev.tauxHoraireAdmin),
    tauxHoraireCompta: Number(config.taux_horaire_compta_defaut || prev.tauxHoraireCompta),
  }));
}, [config.taux_horaire_cuisine_defaut, config.taux_horaire_admin_defaut, config.taux_horaire_compta_defaut]);
```

### Étape 4 — `SoumissionPDF.tsx` : nouveau prop `config` + 4 remplacements

Ajouter `config: Record<string, string>` dans l'interface `SoumissionPDFProps` :

```ts
interface SoumissionPDFProps {
  soumission: Soumission;
  etablissements: (SoumissionEtablissement & { segment?: any })[];
  rabais: Rabais[];
  roi: SoumissionRoi | null;
  roiModules: SoumissionRoiModule[];
  options?: SoumissionOption[];
  config?: Record<string, string>;  // NOUVEAU
}
```

Dans le composant, dériver les valeurs :
```ts
const nomEntreprise = config?.nom_entreprise || 'Octogone 360';
const sousTitreEntreprise = config?.sous_titre_entreprise || 'Plateforme de gestion alimentaire';
const conditionsGenerales = config?.conditions_generales || 
  "Cette soumission est valide pour une période de 30 jours à compter de la date d'émission. Les prix sont exprimés en dollars canadiens et sont sujets à change sans préavis après la date d'expiration. Les frais d'intégration sont payables à la signature du contrat. Le prix mensuel s'applique à compter de la mise en service de chaque établissement.";
const fraisParEtabAffichage = config?.frais_integration ? Number(config.frais_integration) : null;
```

Remplacements dans le JSX :
- Ligne 68 : `Octogone 360` → `{nomEntreprise}`
- Ligne 69 : texte sous-titre → `{sousTitreEntreprise}`
- Ligne 182 : `Frais d'intégration ({etablissements.length} étab. × 3 000 $)` → calculer le prix unitaire : `fraisParEtabAffichage ? \`... × ${formatMontant(fraisParEtabAffichage)}\`` ou simplement afficher `Frais d'intégration` si pas de config
- Ligne 303–306 : texte hardcodé → `{conditionsGenerales}`
- Lignes 312, 314 : `Octogone 360` → `{nomEntreprise}`, `Confidentiel` → peut rester

### Étape 5 — `SoumissionDetail.tsx` : passer `config` au PDF

```tsx
// Ajouter le useQuery config
const { data: config = {} } = useQuery({ queryKey: ['config'], queryFn: fetchConfig });

// Dans le JSX :
<SoumissionPDF
  soumission={soumission}
  etablissements={etablissements}
  rabais={rabais}
  roi={roi.soumission_roi}
  roiModules={roi.modules}
  options={options || []}
  config={config}   // NOUVEAU
/>
```

### Étape 6 — `SoumissionPresentation.tsx` : charger config

```tsx
// Ajouter import fetchConfig
import { fetchSoumissionById, fetchConfig } from '@/lib/supabase-queries';

// Ajouter useQuery config
const { data: config = {} } = useQuery({ queryKey: ['config'], queryFn: fetchConfig });

// Remplacements JSX :
// Ligne 44 : "Octogone 360" → {config.nom_entreprise || 'Octogone 360'}
// Ligne 243 : footer hardcodé → construire depuis config
```

Footer de la présentation (ligne 243) :
```tsx
<footer ...>
  {config.nom_entreprise || 'Octogone 360'} — {soumission.numero} — Valide {config.validite_soumission_jours || 30} jours
</footer>
```

---

## Ce qui reste acceptable dans le code (ne pas changer)

- `Login.tsx:143` — `"Octogone 360"` sur la page de connexion → texte UI invariant, non configuré
- `AppLayout.tsx:159` — `"Octogone 360"` dans la navigation → texte UI invariant
- `roi-calc.ts` — tous les `getParam(...)` avec valeur de fallback → correct, les vraies valeurs viennent de DB
- `Calculateur.tsx:217–218` — `|| 3000` et `|| 30` → fallbacks identiques aux valeurs en DB, acceptables
- Labels de formulaire (« Nom du client », « Nombre d'unités ») → UI pur, non configuré
- Routes, noms de colonnes Supabase → technique pur

---

## Ordre d'exécution

```text
Étape 1 → INSERT data (config + parametres_roi)
          — sous_titre_entreprise
          — taux_horaire_cuisine/admin/compta_defaut
          — reduction_dechets dans parametres_roi

Étape 2 → roi-calc.ts
          — Ligne 65 : 0.15 → getParam(..., 'reduction_dechets', 0.15)
          — Ligne 126 : 'heures_economisees' → 'heures_economisees_an'
          — Ligne 144 : 'heures_rh' → 'heures_rh_an'
          — Ligne 145 : 'heures_compta_rh' → 'heures_compta_rh_an'

Étape 3 → Calculateur.tsx
          — Supprimer DEFAUTS_RABAIS statique
          — Ajouter defautsRabaisDropdown calculé depuis tousLesRabais
          — Initialiser taux horaires depuis config (useEffect)

Étape 4 → SoumissionPDF.tsx
          — Nouveau prop config
          — Remplacer nom_entreprise, sous_titre, conditions, frais label

Étape 5 → SoumissionDetail.tsx
          — useQuery config + passer au PDF

Étape 6 → SoumissionPresentation.tsx
          — useQuery config + remplacer "Octogone 360" et "Valide 30 jours"
```

---

## Tests de validation post-implémentation

1. Aller dans Admin → Config soumissions → changer le nom de l'entreprise → PDF doit afficher le nouveau nom
2. Aller dans Admin → Config soumissions → changer les conditions générales → PDF doit afficher le nouveau texte
3. Aller dans Admin → Tarification → changer les frais d'intégration → le calcul et le PDF changent
4. Aller dans Admin → Rabais → changer le % multi-sites → le dropdown du calculateur pré-remplit la nouvelle valeur
5. Aller dans Admin → ROI → changer un paramètre (ex. : `heures_rh_an`) → le calcul ROI change
6. Présentation d'une soumission → footer affiche le vrai nom d'entreprise et la vraie durée de validité
