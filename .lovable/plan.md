
# Octogone — Calculateur de prix et générateur de soumissions

## Vue d'ensemble
Application web professionnelle en français pour les vendeurs d'Octogone 360, permettant de calculer des prix, générer des soumissions et présenter des analyses ROI aux clients du secteur alimentaire québécois.

---

## Phase 1 — Base de données Supabase
Mise en place de 13 tables interconnectées :
- **Segments** (types de clientèle : RPA, CPE, cafétéria, restaurant, etc.)
- **Paliers** (tarification par tranches pour les restaurants)
- **Rabais** (multi-sites, volume, engagement annuel, projet pilote)
- **Config** (paramètres globaux : frais, validité, textes PDF)
- **Modules ROI & paramètres** (8 modules avec leurs valeurs de calcul)
- **Utilisateurs** (vendeurs et admins)
- **Soumissions** (avec versioning et statuts)
- **Tables de liaison** (établissements, rabais, données ROI par soumission)
- **Audit log** (journal de toutes les modifications)

Données initiales complètes insérées (8 segments, 5 paliers restaurants, 4 rabais, configs, 8 modules ROI avec 25+ paramètres).

---

## Phase 2 — Authentification et navigation
- Page de connexion sobre et moderne (fond sombre, bleu marine)
- Code d'accès simple "octogone2025" stocké en localStorage
- Sidebar collapsible avec navigation : Calculateur / Soumissions / Administration
- Bouton de déconnexion
- Protection des routes (redirection si non connecté)

---

## Phase 3 — Calculateur de prix (cœur de l'app)
Interface à 4 étapes avec panneau de calcul temps réel :

**Formulaire gauche :**
1. Sélection du segment (dropdown dynamique depuis Supabase)
2. Informations client (nom, nombre d'établissements)
3. Blocs par établissement (nom, unités, toggle pilote)
4. Section rabais (dropdown exclusif + toggles individuels)

**Panneau droit sticky :**
- Prix brut et final par établissement
- Sous-total, rabais détaillés, total mensuel/annuel
- Frais d'intégration et coût total 1re année

**Logique de calcul précise :**
- Tarification linéaire avec minimum mensuel garanti
- Tarification par paliers (restaurants)
- Application ordonnée des rabais (dropdown → engagement → pilote)
- Le pilote peut descendre sous le minimum

**Sauvegarde :** Génération automatique du numéro OCT-AAAA-NNN, sauvegarde dans Supabase.

---

## Phase 4 — Calculateur ROI par module
Section accordéon sous le calculateur :

- **8 modules** présentés en grille avec icônes, checkboxes et style visuel actif/inactif
- **Données d'entrée** contextuelles (apparaissent selon modules sélectionnés)
- **Formules de calcul précises** par module (thermomètres, recettes, inventaires, facturation, etc.)
- **Résultats visuels :**
  - Tableau par module (économie mensuelle / annuelle)
  - 5 cards : économies, coût Octogone, bénéfice net, ROI (ex: "5.1x"), retour en mois
  - Graphique à barres horizontales (recharts) avec contribution par module

---

## Phase 5 — Gestion des soumissions
**Liste (/soumissions) :**
- Tableau avec filtres (statut, segment, recherche), tri et pagination
- Badges colorés par statut (brouillon, envoyée, acceptée, expirée)
- Actions : voir, modifier, dupliquer, changer statut, supprimer
- Expiration automatique au chargement
- Export CSV

**Détail (/soumissions/:id) :**
- Vue lecture avec toutes les informations, notes éditables, historique des versions

**Mode présentation (/soumissions/:id/presentation) :**
- Vue plein écran épurée pour les rencontres client
- Sans navigation, bouton discret "Quitter"

---

## Phase 6 — Génération PDF
Via jsPDF + jspdf-autotable :
- Page 1 : en-tête, infos client, détail établissements, rabais
- Récapitulatif financier complet
- Section ROI (tableau sans graphique)
- Pied de page avec conditions et validité
- Téléchargement automatique, passage en statut "envoyée"

---

## Phase 7 — Administration des prix (/admin)
- **Tableau de bord** : métriques clés, graphiques camembert et barres (recharts)
- **Tarification** : édition inline des segments, paliers restaurants, frais d'intégration
- **Rabais** : gestion complète avec ajout/modification
- **Audit log** sur toutes les modifications avec toast de confirmation

---

## Phase 8 — Administration avancée
- **/admin/roi** : paramètres ROI éditables par module, réinitialisation avec confirmation
- **/admin/utilisateurs** : liste, ajout, toggle actif, changement de rôle
- **/admin/historique** : journal filtrable avec possibilité de rollback individuel et réinitialisation complète (double confirmation)
- **/admin/soumissions** : configuration des textes et durées

---

## Phase 9 — Polissage
- Responsive complet (tablette et mobile)
- Toast de succès/erreur partout
- Skeleton loaders et boutons désactivés pendant les opérations
- Validation des formulaires avec messages en français
- Formatage canadien (1 234,56 $, 17 février 2025)
- États vides avec illustrations
- Raccourcis clavier (Ctrl+S, Escape)
- Accessibilité (labels, focus visible, contrastes)

---

## Stack technique
React + TypeScript + Tailwind CSS + shadcn/ui + Supabase + Recharts + jsPDF
