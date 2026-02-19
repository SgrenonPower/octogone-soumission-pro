
# Octogone — Plan complet d'implémentation

## Clarification intégrée — Règle de cumul des rabais

La logique de calcul pour les rabais fonctionne en **3 couches séquentielles** :

```text
COUCHE 1 — Dropdown (mutuellement exclusif)
  └─ Choisir UNE option parmi : Aucun / Multi-sites (15%) / Volume 500+ (20%)

COUCHE 2 — Toggle Engagement annuel (10%)
  └─ S'applique par-dessus la couche 1

COUCHE 3 — Toggle Projet pilote (50%)
  └─ S'applique uniquement sur l'établissement marqué pilote
     Par-dessus les couches 1 et 2

Exemple combiné :
  prix_brut = 1 000 $
  → Après multi-sites (15%) : 850,00 $
  → Après engagement (10%) : 765,00 $
  → Après pilote sur cet étab. (50%) : 382,50 $ ← peut passer sous le minimum
```

---

## Phase 1 — Base de données Supabase

Connexion Supabase via Lovable Cloud, puis migration SQL unique créant :

### Tables principales

| Table | Rôle |
|-------|------|
| `segments` | Types de clientèle (RPA 1-4, CPE, cafétéria, traiteur, restaurant) |
| `paliers` | Tarifs par tranches pour les restaurants |
| `rabais` | Multi-sites, volume, engagement, pilote |
| `config` | Frais d'intégration, validité, textes PDF, paramètres ROI globaux |
| `modules_roi` | 8 modules logiciels Octogone |
| `parametres_roi` | Variables de calcul par module |
| `utilisateurs` | Vendeurs et admins |
| `soumissions` | Soumissions avec versioning |
| `soumission_etablissements` | Détail par établissement |
| `soumission_rabais` | Rabais appliqués à une soumission |
| `soumission_roi` | Données ROI agrégées |
| `soumission_roi_modules` | Modules sélectionnés et économies |
| `audit_log` | Journal complet des modifications |

### Données initiales insérées

- 8 segments (RPA Cat. 1-4, CPE, Cafétéria, Traiteur, Restaurant)
- 5 paliers restaurants (0-60 → 200$, 61-100 → 250$, etc.)
- 4 rabais (multi-sites 15%, volume 20%, engagement 10%, pilote 50%)
- Config : frais intégration 3 000$, validité 30j, textes PDF
- 8 modules ROI avec 25+ paramètres de calcul

### Triggers et sécurité

- Trigger `updated_at` sur `segments`, `config`, `soumissions`
- RLS activé sur toutes les tables avec policy permissive initiale

---

## Phase 2 — Authentification et navigation

### Page de connexion (`/`)
- Fond sombre, design épuré bleu marine
- Champ code d'accès (type password)
- Validation : code "octogone2025"
- Stockage en `localStorage` → redirection vers `/calculateur`
- Message d'erreur en français si code incorrect

### Layout avec sidebar
- Logo "Octogone" en haut
- Navigation : Calculateur / Soumissions / Administration
- Bouton Déconnexion en bas
- Collapsible sur mobile (hamburger)
- Protection des routes (redirection si non connecté)

---

## Phase 3 — Calculateur de prix (`/calculateur`)

### Structure de la page

```text
┌─────────────────────────────┬──────────────────────────┐
│  FORMULAIRE (gauche)        │  RÉCAPITULATIF (droite)  │
│  ─ Segment                  │  sticky, mis à jour      │
│  ─ Infos client             │  en temps réel           │
│  ─ Blocs établissements     │                          │
│  ─ Rabais                   │                          │
│  ─ [Accordéon ROI]          │                          │
│  ─ Boutons action           │                          │
└─────────────────────────────┴──────────────────────────┘
```

### Logique de calcul par établissement

**Tarification linéaire :**
```
prix_brut = nombre_unités × prix_unitaire
prix_base = MAX(prix_brut, minimum_mensuel)
après_dropdown = prix_base × (1 - rabais_dropdown / 100)  [si sélectionné]
après_engagement = après_dropdown × (1 - 10%)  [si toggle activé]
prix_final = après_engagement × (1 - 50%)  [si cet établissement est pilote]
```

**Tarification paliers (restaurants) :**
```
trouver le palier tel que capacité_min ≤ places ≤ capacité_max
prix_base = tarif_mensuel du palier
→ même séquence de rabais que ci-dessus
```

**Règle pilote :** le prix peut descendre sous le minimum mensuel.

### Panneau récapitulatif (sticky)
- Ligne par établissement : nom, prix brut, prix final
- Sous-total mensuel (somme des prix bruts)
- Détail des rabais appliqués avec %
- Total mensuel
- Total annuel (× 12)
- Frais d'intégration (nb établissements × config)
- Coût total 1re année

### Section Rabais
- **Dropdown** : "Aucun" / "Multi-établissements (15%)" / "Volume 500+ (20%)" — un seul actif
- **Toggles** : Engagement annuel (10%) + Projet pilote (50%) — cumulables
- Avertissement si pilote activé sans établissement marqué pilote

### Sauvegarde
- Numéro auto-généré : `OCT-AAAA-NNN`
- Sauvegarde dans `soumissions`, `soumission_etablissements`, `soumission_rabais`
- Bouton "Générer PDF" (désactivé, Phase 6)

---

## Phase 4 — Calculateur ROI (accordéon dans `/calculateur`)

### Sélection des modules
Grille 2 colonnes, chaque module = Card avec :
- Icône lucide-react (Thermometer, ChefHat, Package, BarChart3, FileText, ShoppingCart, Users, Clock)
- Checkbox + nom + description
- Bordure colorée quand sélectionné

### Données d'entrée contextuelles
S'affichent seulement si au moins 1 module coché :
- Budget alimentaire, coûts appro, nb employés cuisine/commandes/total
- Taux horaires cuisine (22$/h), admin (35$/h), comptabilité (27$/h)
- Coût gestion déchets (800$/an)

### Formules par module
Calculées en temps réel depuis les paramètres Supabase :

- **Thermomètres** : économies saisie + pertes alimentaires + déchets + énergie
- **Produits & Recettes** : réduction gaspillage + gains temps recherche/coûts
- **Gestion Inventaires** : économie base × étab. + réduction appro %
- **Inventaires temps réel** : commandes + suivi + incongruités × taux admin
- **Facturation** : heures économisées × taux compta / 12
- **Paniers** : nb responsables × heures × taux admin / 12
- **RH** : heures RH × taux admin + heures compta × taux compta
- **Tâches répétitives** : moyenne heures/semaine × 52/12 × taux admin

### Affichage des résultats
1. Tableau par module sélectionné (économie mensuelle / annuelle)
2. 5 cards : Économies annuelles / Coût Octogone / Bénéfice net / ROI (ex: "5.1x") / Retour (ex: "2.3 mois")
3. Graphique barres horizontales recharts (contributions par module + barre coût)

### Sauvegarde ROI
Avec la soumission → `soumission_roi` + `soumission_roi_modules`

---

## Phase 5 — Gestion des soumissions

### Liste (`/soumissions`)
- Tableau : Numéro, Client, Segment(s), Total mensuel, Statut, Date, Actions
- Filtres : statut (multi-select), segment, recherche texte
- Tri cliquable par colonne, plus récent par défaut
- Pagination 20/page
- Badges : bleu=brouillon, vert=envoyée, émeraude=acceptée, gris=expirée
- Expiration automatique au chargement (statuts passés à "expirée")
- Export CSV des soumissions filtrées

### Actions par soumission
- Voir / Modifier / Dupliquer / Changer statut / Supprimer (avec confirmation)

### Détail (`/soumissions/:id`)
- Vue lecture : établissements, rabais, récap financier, section ROI
- Notes internes éditables
- Historique des versions (parent_id / enfants)
- Boutons : Modifier, Dupliquer, Générer PDF, Mode présentation

### Mode présentation (`/soumissions/:id/presentation`)
- Plein écran sans sidebar
- Design professionnel pour rencontres client
- Bouton discret "Quitter la présentation"

---

## Phase 6 — Génération PDF

Via `jsPDF` + `jspdf-autotable` :

**Structure du PDF :**
- En-tête : titre SOUMISSION, nom entreprise (config), numéro, date, client
- Tableau établissements : Nom, Unités, Prix unitaire, Prix brut
- Rabais appliqués avec %
- Récapitulatif financier : mensuel, annuel, intégration, coût an 1
- Section ROI (tableau par module, total, ROI et retour)
- Pied de page : conditions générales, validité, numéro de page

**Comportement :** Téléchargement automatique + passage statut → "envoyée"

---

## Phase 7 — Administration (`/admin`)

### Tableau de bord
- Cards : soumissions ce mois, valeur totale, expirant sous 7 jours
- Graphique camembert par segment (recharts)
- Graphique barres des 6 derniers mois (recharts)

### Tarification (`/admin/tarification`)
- Tableau éditable inline : segments linéaires (prix/unité, minimum, actif)
- Tableau éditable : paliers restaurants (min, max, tarif) + ajout/suppression
- Champ frais d'intégration
- Audit log sur chaque modification

### Rabais (`/admin/rabais`)
- Tableau éditable : nom, %, type UI, groupe, condition, actif
- Ajout d'un rabais
- Audit log

---

## Phase 8 — Administration avancée

### ROI (`/admin/roi`)
- Modules avec toggle actif/inactif
- Paramètres éditables groupés par module (Accordion)
- Bouton "Sauvegarder" par module
- Config coût Octogone mensuel
- Bouton "Réinitialiser" avec modal de confirmation

### Utilisateurs (`/admin/utilisateurs`)
- Liste + ajout (nom, email, rôle)
- Toggle actif, changement de rôle

### Historique (`/admin/historique`)
- Journal filtrable (utilisateur, table, période)
- Pagination 50/page
- Bouton "Annuler ce changement" avec modal + rollback + nouvel audit_log
- Bouton "Réinitialisation complète" avec double confirmation (saisir "REINITIALISER")

### Config soumissions (`/admin/soumissions`)
- Durée validité, conditions générales, nom entreprise

---

## Phase 9 — Polissage

- Responsive : panneau ROI en dessous sur < 1024px, hamburger mobile
- Toasts succès/erreur partout
- Skeleton loaders + boutons désactivés pendant opérations async
- Validation en français (client requis, unités min 1, pilote unique)
- Formatage canadien : `1 234,56 $`, `17 février 2025`, `15,0 %`
- Empty states avec illustration et CTA
- Raccourcis : `Ctrl+S` sauvegarder, `Escape` fermer modales
- Accessibilité : labels, focus visible, contrastes WCAG

---

## Prochaine étape

Connexion d'un projet Supabase (Lovable Cloud) pour créer la base de données, puis implémentation séquentielle des phases 2 à 9.
