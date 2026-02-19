
# Plan d'implémentation — Sections 4 à 12

## Contexte et état actuel

Le calculateur de prix (Section 1–3) est **entièrement fonctionnel** : segments, paliers, rabais, ordre d'application, frais d'intégration. La base de données contient déjà toutes les tables nécessaires (`modules_roi`, `parametres_roi`, `soumissions`, `soumission_roi`, `soumission_roi_modules`, `audit_log`, `utilisateurs`), avec les 8 modules ROI et leurs 22 paramètres correctement peuplés.

Ce qui reste à construire : le **calculateur ROI**, la **gestion des soumissions**, la **génération PDF**, et les **pages d'administration**.

---

## Phase 1 — Calculateur ROI (Section 4)

### Emplacement : section 5 de `src/pages/Calculateur.tsx`

Une nouvelle section accordéon s'ajoutera sous les rabais et les notes internes, avant les boutons d'action.

### Données d'entrée communes (10 champs)

```text
Nombre d'établissements    → lu depuis etablissements.length (automatique)
Budget alimentaire annuel  → saisie manuelle
Coûts d'approvisionnement  → saisie manuelle
Nb employés cuisine        → saisie manuelle
Nb responsables commandes  → saisie manuelle
Nb employés total          → saisie manuelle
Taux horaire cuisine       → saisie manuelle
Taux horaire admin         → saisie manuelle
Taux horaire comptabilité  → saisie manuelle
Coût gestion déchets       → saisie manuelle
```

### Formules ROI (implémentées en TypeScript pur, paramètres lus depuis `parametres_roi`)

| Module | Économie annuelle calculée |
|--------|---------------------------|
| Thermomètres | saisie_moy×12 + budget×0.0075 + déchets×0.15 + 480 |
| Produits & Recettes | budget×0.125 + nbCuisine×25×tauxCuisine + 50×tauxCuisine |
| Gestion Inventaires | 950×12×nbEtab + appro×0.075 |
| Inventaires temps réel | (300+100)×12×nbEtab + 4×tauxAdmin×12×nbEtab |
| Facturation | 65×tauxCompta |
| Paniers | nbResponsables×50×tauxAdmin |
| RH | 72×tauxAdmin + 12×tauxCompta |
| Tâches répétitives | 3.5×52×tauxAdmin (moyenne 2–5h/sem) |

La constante `cout_octogone_mensuel_par_etablissement` (299 $/mois, déjà en `config`) est utilisée pour le coût Octogone ROI — **distinct** du prix calculé de la soumission.

### Affichage des résultats

- Tableau par module sélectionné : économie mensuelle | économie annuelle
- 5 métriques cards : Économies totales / Coût Octogone / Bénéfice net / ROI (x) / Retour en mois
- Graphique Recharts barres horizontales : économies par module vs coût Octogone

---

## Phase 2 — Gestion des soumissions (Section 5)

### Nouveaux fichiers et pages

**`src/pages/Soumissions.tsx`** — Liste complète (remplace le placeholder actuel)
- Tableau avec : numéro, client, segment(s), total mensuel, statut, date, actions
- Recherche texte (nom client, numéro)
- Filtre par statut (badges colorés : brouillon/envoyée/acceptée/expirée)
- Tri par colonne cliquable
- Pagination 20/page
- Actions : voir détail, dupliquer, changer statut, supprimer (avec confirmation)
- Export CSV

**`src/pages/SoumissionDetail.tsx`** — `/soumissions/:id`
- Vue complète de la soumission (lecture seule + actions)
- Section tarifaire + section ROI si disponible
- Boutons : modifier, dupliquer, changer statut, générer PDF

**`src/pages/SoumissionPresentation.tsx`** — `/soumissions/:id/presentation`
- Mode plein écran, sans sidebar, sans contrôles d'édition
- Affichage pour rencontre client

### Fonctions backend ajoutées à `src/lib/supabase-queries.ts`

```text
fetchSoumissions(filtres)        → liste paginée
fetchSoumissionById(id)          → détail complet avec établissements et rabais
dupliquerSoumission(id)          → copie avec nouveau numéro et parent_id
changerStatut(id, statut)        → mise à jour statut
supprimerSoumission(id)          → soft delete ou delete
exporterCSV(filtres)             → génération CSV côté client
```

### Nouveaux champs dans `sauvegarderSoumission`

La fonction actuelle sera étendue pour supporter la sauvegarde optionnelle des données ROI (`soumission_roi` + `soumission_roi_modules`) dans la même transaction.

### Statuts avec couleurs

| Statut | Couleur |
|--------|---------|
| brouillon | gris |
| envoyée | bleu |
| acceptée | vert |
| expirée | rouge |

---

## Phase 3 — Génération PDF (Section 6)

La génération PDF se fera **côté client** en utilisant `window.print()` avec une feuille de style CSS `@media print` dédiée — sans dépendance externe lourde, compatible avec tous les navigateurs.

**Structure `src/components/pdf/SoumissionPDF.tsx`**
- Composant React rendu dans un `<div id="pdf-content">` caché
- CSS print avec mise en page A4, polices, marges
- Sections : en-tête / infos client / tableau établissements / rabais / totaux / ROI (si présent) / conditions / pied de page

Le bouton "Générer le PDF" dans le calculateur déclenchera `window.print()` sur ce composant.

---

## Phase 4 — Pages d'administration (Section 7)

### Nouvelles routes à ajouter dans `App.tsx`

```text
/admin/tarification    → Segments + paliers + frais intégration
/admin/rabais          → Gestion des rabais
/admin/roi             → Paramètres ROI
/admin/soumissions     → Config PDF, validité, conditions
/admin/utilisateurs    → Gestion utilisateurs
/admin/historique      → Journal audit log
```

### `src/pages/admin/Tarification.tsx`

- Tableau éditable des segments (prix unitaire, minimum mensuel, toggle actif)
- Section paliers restaurants (ajout/modif/suppression de lignes)
- Champ frais d'intégration (depuis `config`)
- Chaque modification écrit dans `audit_log`

### `src/pages/admin/Rabais.tsx`

- Liste des rabais avec toggle actif/inactif
- Édition du pourcentage en ligne
- Bouton "Ajouter un rabais temporaire"
- Chaque modification écrit dans `audit_log`

### `src/pages/admin/Roi.tsx`

- Tableau éditable de tous les `parametres_roi` groupés par module
- Édition de la valeur en ligne avec validation numérique
- Champ coût Octogone par défaut (depuis `config`)

### `src/pages/admin/ConfigSoumissions.tsx`

- Durée de validité (jours)
- Texte des conditions générales (textarea)
- Nom de l'entreprise sur le PDF

### `src/pages/admin/Utilisateurs.tsx`

- Tableau des utilisateurs de la table `utilisateurs`
- Ajout / désactivation (toggle actif)
- Rôle : vendeur / admin

### `src/pages/admin/Historique.tsx`

- Journal chronologique de `audit_log`
- Filtres : utilisateur, table modifiée, date (plage)
- Tableau avec : qui / quand / quoi / ancienne valeur / nouvelle valeur
- Bouton "Rollback" par ligne (restaure l'ancienne valeur)
- Bouton "Réinitialiser tout" avec confirmation modale

---

## Phase 5 — Navigation et routes

### Modifications dans `App.tsx`

Ajout des routes imbriquées pour admin et soumissions :

```text
/soumissions/:id                 → SoumissionDetail
/soumissions/:id/presentation    → SoumissionPresentation
/admin/tarification              → AdminTarification
/admin/rabais                    → AdminRabais
/admin/roi                       → AdminRoi
/admin/soumissions               → AdminConfigSoumissions
/admin/utilisateurs              → AdminUtilisateurs
/admin/historique                → AdminHistorique
```

---

## Phase 6 — Authentification et rôles (Section 8)

L'authentification actuelle (code d'accès en localStorage) sera **conservée pour la connexion**, mais les rôles seront gérés via la table `utilisateurs` existante.

Une fonction `getCurrentUser()` sera ajoutée pour identifier l'utilisateur connecté (par email stocké dans la session) et déterminer son rôle (`vendeur` ou `admin`). Les routes `/admin/*` vérifieront le rôle admin avant d'afficher le contenu.

Note : la table `utilisateurs` n'utilise pas l'auth Supabase native — elle est autonome, ce qui correspond à l'approche actuelle "code d'accès simple" sans inscription.

---

## Ordre d'implémentation

```text
Étape 1  →  Calculateur ROI (section 5 de Calculateur.tsx) + lib/roi-calc.ts
Étape 2  →  Extension sauvegarderSoumission (ROI + multi-segments)
Étape 3  →  Page Soumissions (liste) + SoumissionDetail
Étape 4  →  Génération PDF (composant + bouton)
Étape 5  →  Routes admin + pages admin (Tarification, Rabais, ROI, Config)
Étape 6  →  Historique audit log + Utilisateurs
Étape 7  →  Mode présentation + export CSV
```

---

## Fichiers créés / modifiés

| Fichier | Action |
|---------|--------|
| `src/lib/roi-calc.ts` | Nouveau — fonctions de calcul ROI |
| `src/lib/supabase-queries.ts` | Étendu — fetchSoumissions, dupliquer, etc. |
| `src/pages/Calculateur.tsx` | Étendu — section ROI accordéon |
| `src/pages/Soumissions.tsx` | Remplacé — liste complète |
| `src/pages/SoumissionDetail.tsx` | Nouveau |
| `src/pages/SoumissionPresentation.tsx` | Nouveau |
| `src/components/pdf/SoumissionPDF.tsx` | Nouveau |
| `src/pages/admin/Tarification.tsx` | Nouveau |
| `src/pages/admin/Rabais.tsx` | Nouveau |
| `src/pages/admin/Roi.tsx` | Nouveau |
| `src/pages/admin/ConfigSoumissions.tsx` | Nouveau |
| `src/pages/admin/Utilisateurs.tsx` | Nouveau |
| `src/pages/admin/Historique.tsx` | Nouveau |
| `src/App.tsx` | Étendu — nouvelles routes |

**Aucune migration de base de données requise** — toutes les tables nécessaires existent déjà.
