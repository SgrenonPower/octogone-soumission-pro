
-- ============================================================
-- OCTOGONE — Migration complète Phase 1
-- ============================================================

-- TABLE: segments
CREATE TABLE public.segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  slug text UNIQUE NOT NULL,
  type_tarification text NOT NULL CHECK (type_tarification IN ('lineaire', 'paliers')),
  unite text NOT NULL,
  prix_unitaire numeric,
  minimum_mensuel numeric,
  ordre integer NOT NULL,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLE: paliers
CREATE TABLE public.paliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id uuid NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  capacite_min integer NOT NULL,
  capacite_max integer,
  tarif_mensuel numeric NOT NULL,
  ordre integer NOT NULL
);

-- TABLE: rabais
CREATE TABLE public.rabais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  slug text UNIQUE NOT NULL,
  pourcentage numeric NOT NULL,
  type_ui text NOT NULL CHECK (type_ui IN ('dropdown', 'toggle')),
  groupe_exclusion text,
  condition_description text,
  actif boolean DEFAULT true,
  ordre integer NOT NULL
);

-- TABLE: config
CREATE TABLE public.config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cle text UNIQUE NOT NULL,
  valeur text NOT NULL,
  categorie text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- TABLE: modules_roi
CREATE TABLE public.modules_roi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  ordre integer NOT NULL,
  actif boolean DEFAULT true
);

-- TABLE: parametres_roi
CREATE TABLE public.parametres_roi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.modules_roi(id) ON DELETE CASCADE,
  cle text UNIQUE NOT NULL,
  valeur numeric NOT NULL,
  label text NOT NULL,
  ordre integer NOT NULL
);

-- TABLE: utilisateurs
CREATE TABLE public.utilisateurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('vendeur', 'admin')),
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- TABLE: soumissions
CREATE TABLE public.soumissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE NOT NULL,
  nom_client text NOT NULL,
  statut text NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'envoyee', 'acceptee', 'expiree')),
  utilisateur_id uuid REFERENCES public.utilisateurs(id),
  notes_internes text,
  version integer DEFAULT 1,
  parent_id uuid REFERENCES public.soumissions(id),
  total_mensuel numeric,
  total_annuel numeric,
  frais_integration numeric,
  cout_total_an1 numeric,
  date_expiration timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLE: soumission_etablissements
CREATE TABLE public.soumission_etablissements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  soumission_id uuid NOT NULL REFERENCES public.soumissions(id) ON DELETE CASCADE,
  segment_id uuid REFERENCES public.segments(id),
  nom_etablissement text,
  nombre_unites integer NOT NULL,
  est_pilote boolean DEFAULT false,
  prix_brut numeric,
  prix_final numeric
);

-- TABLE: soumission_rabais
CREATE TABLE public.soumission_rabais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  soumission_id uuid NOT NULL REFERENCES public.soumissions(id) ON DELETE CASCADE,
  rabais_id uuid REFERENCES public.rabais(id)
);

-- TABLE: soumission_roi
CREATE TABLE public.soumission_roi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  soumission_id uuid NOT NULL REFERENCES public.soumissions(id) ON DELETE CASCADE,
  budget_alimentaire numeric,
  couts_approvisionnement numeric,
  nb_employes_cuisine integer,
  nb_responsables_commandes integer,
  nb_employes_total integer,
  taux_horaire_cuisine numeric,
  taux_horaire_admin numeric,
  taux_horaire_comptabilite numeric,
  cout_gestion_dechets numeric,
  economies_totales numeric,
  cout_octogone_annuel numeric,
  roi_multiplicateur numeric,
  periode_retour_mois numeric
);

-- TABLE: soumission_roi_modules
CREATE TABLE public.soumission_roi_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  soumission_roi_id uuid NOT NULL REFERENCES public.soumission_roi(id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.modules_roi(id),
  selectionne boolean DEFAULT false,
  economie_mensuelle numeric,
  economie_annuelle numeric
);

-- TABLE: audit_log
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id uuid REFERENCES public.utilisateurs(id),
  table_modifiee text NOT NULL,
  enregistrement_id uuid,
  champ text,
  ancienne_valeur text,
  nouvelle_valeur text,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_segments_updated_at
  BEFORE UPDATE ON public.segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_config_updated_at
  BEFORE UPDATE ON public.config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_soumissions_updated_at
  BEFORE UPDATE ON public.soumissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RLS — Activer sur toutes les tables
-- ============================================================

ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rabais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules_roi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametres_roi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soumissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soumission_etablissements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soumission_rabais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soumission_roi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soumission_roi_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Policies permissives (accès public pour l'instant — code d'accès géré côté app)
CREATE POLICY "Accès public segments" ON public.segments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Accès public paliers" ON public.paliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Accès public rabais" ON public.rabais FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Accès public config" ON public.config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Accès public modules_roi" ON public.modules_roi FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Accès public parametres_roi" ON public.parametres_roi FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Accès public utilisateurs" ON public.utilisateurs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Accès public soumissions" ON public.soumissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Accès public soumission_etablissements" ON public.soumission_etablissements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Accès public soumission_rabais" ON public.soumission_rabais FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Accès public soumission_roi" ON public.soumission_roi FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Accès public soumission_roi_modules" ON public.soumission_roi_modules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Accès public audit_log" ON public.audit_log FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- DONNÉES INITIALES — Segments
-- ============================================================

INSERT INTO public.segments (nom, slug, type_tarification, unite, prix_unitaire, minimum_mensuel, ordre) VALUES
  ('RPA Cat. 1 — Autonomes', 'rpa-cat-1', 'lineaire', 'lit', 5.00, 250, 1),
  ('RPA Cat. 2 — Médication', 'rpa-cat-2', 'lineaire', 'lit', 7.00, 350, 2),
  ('RPA Cat. 3 — Semi-autonomes', 'rpa-cat-3', 'lineaire', 'lit', 10.00, 500, 3),
  ('RPA Cat. 4 — Unités de soins', 'rpa-cat-4', 'lineaire', 'lit', 13.00, 650, 4),
  ('CPE (Garderie)', 'cpe', 'lineaire', 'enfant', 3.50, 200, 5),
  ('Cafétéria / Institution', 'cafeteria', 'lineaire', 'repas planifié', 1.50, 500, 6),
  ('Traiteur / Cuisine centrale', 'traiteur', 'lineaire', 'repas planifié', 1.75, 500, 7),
  ('Restaurant', 'restaurant', 'paliers', 'place', null, null, 8);

-- ============================================================
-- DONNÉES INITIALES — Paliers restaurants
-- ============================================================

INSERT INTO public.paliers (segment_id, capacite_min, capacite_max, tarif_mensuel, ordre)
SELECT id, 0, 60, 200, 1 FROM public.segments WHERE slug = 'restaurant'
UNION ALL
SELECT id, 61, 100, 250, 2 FROM public.segments WHERE slug = 'restaurant'
UNION ALL
SELECT id, 101, 150, 325, 3 FROM public.segments WHERE slug = 'restaurant'
UNION ALL
SELECT id, 151, 200, 400, 4 FROM public.segments WHERE slug = 'restaurant'
UNION ALL
SELECT id, 201, null, 500, 5 FROM public.segments WHERE slug = 'restaurant';

-- ============================================================
-- DONNÉES INITIALES — Rabais
-- ============================================================

INSERT INTO public.rabais (nom, slug, pourcentage, type_ui, groupe_exclusion, condition_description, ordre) VALUES
  ('Multi-établissements', 'multi-sites', 15, 'dropdown', 'dropdown', '2+ établissements', 1),
  ('Volume 500+', 'volume-500', 20, 'dropdown', 'dropdown', '500+ unités/licences', 2),
  ('Engagement annuel', 'engagement-annuel', 10, 'toggle', null, null, 3),
  ('Projet pilote', 'projet-pilote', 50, 'toggle', null, '1 seul établissement, 24 mois', 4);

-- ============================================================
-- DONNÉES INITIALES — Config
-- ============================================================

INSERT INTO public.config (cle, valeur, categorie, description) VALUES
  ('frais_integration', '3000', 'general', 'Frais d''intégration par établissement ($)'),
  ('validite_soumission_jours', '30', 'general', 'Durée de validité d''une soumission (jours)'),
  ('nom_entreprise', 'Octogone 360', 'pdf', 'Nom de l''entreprise sur le PDF'),
  ('conditions_generales', 'Cette soumission est valide pour une durée de 30 jours.', 'pdf', 'Conditions générales sur le PDF'),
  ('cout_octogone_mensuel_par_etablissement', '299', 'roi', 'Coût Octogone par mois par établissement ($)'),
  ('semaines_an', '52', 'roi', 'Semaines par an');

-- ============================================================
-- DONNÉES INITIALES — Modules ROI
-- ============================================================

INSERT INTO public.modules_roi (nom, slug, description, ordre) VALUES
  ('Thermomètres', 'thermometres', 'Contrôle des températures et alertes précoces', 1),
  ('Produits et Recettes', 'produits-recettes', 'Standardisation des recettes et réduction du gaspillage', 2),
  ('Gestion des Inventaires', 'gestion-inventaires', 'Optimisation et automatisation des inventaires', 3),
  ('Inventaires en temps réel', 'inventaires-temps-reel', 'Suivi en direct des stocks et commandes', 4),
  ('Facturation', 'facturation', 'Automatisation de la saisie et surveillance des prix', 5),
  ('Paniers / Bons de Commandes', 'paniers-commandes', 'Gestion optimisée des commandes fournisseurs', 6),
  ('Ressources Humaines', 'ressources-humaines', 'Centralisation et automatisation RH', 7),
  ('Tâches répétitives', 'taches-repetitives', 'Réduction du temps sur rapports, food cost, analyses', 8);

-- ============================================================
-- DONNÉES INITIALES — Paramètres ROI
-- ============================================================

-- Module: thermometres
INSERT INTO public.parametres_roi (module_id, cle, valeur, label, ordre)
SELECT m.id, 'economie_saisie_min', 170, 'Économie saisie manuelle min ($/mois)', 1 FROM public.modules_roi m WHERE m.slug = 'thermometres'
UNION ALL
SELECT m.id, 'economie_saisie_max', 195, 'Économie saisie manuelle max ($/mois)', 2 FROM public.modules_roi m WHERE m.slug = 'thermometres'
UNION ALL
SELECT m.id, 'reduction_pertes_alim', 0.15, 'Réduction pertes alimentaires (%)', 3 FROM public.modules_roi m WHERE m.slug = 'thermometres'
UNION ALL
SELECT m.id, 'cout_moyen_par_kg', 5, 'Coût moyen par kg de produit ($)', 4 FROM public.modules_roi m WHERE m.slug = 'thermometres'
UNION ALL
SELECT m.id, 'gaspillage_annuel_kg', 1000, 'Gaspillage annuel estimé (kg)', 5 FROM public.modules_roi m WHERE m.slug = 'thermometres'
UNION ALL
SELECT m.id, 'economie_energie_annuelle', 480, 'Économie énergie annuelle ($)', 6 FROM public.modules_roi m WHERE m.slug = 'thermometres';

-- Module: produits-recettes
INSERT INTO public.parametres_roi (module_id, cle, valeur, label, ordre)
SELECT m.id, 'reduction_gaspillage_min', 0.10, 'Réduction gaspillage min (%)', 1 FROM public.modules_roi m WHERE m.slug = 'produits-recettes'
UNION ALL
SELECT m.id, 'reduction_gaspillage_max', 0.15, 'Réduction gaspillage max (%)', 2 FROM public.modules_roi m WHERE m.slug = 'produits-recettes'
UNION ALL
SELECT m.id, 'heures_recherche_par_employe', 25, 'Heures économisées recherche/an/employé', 3 FROM public.modules_roi m WHERE m.slug = 'produits-recettes'
UNION ALL
SELECT m.id, 'heures_cout_recettes', 50, 'Heures économisées calcul coûts/an', 4 FROM public.modules_roi m WHERE m.slug = 'produits-recettes';

-- Module: gestion-inventaires
INSERT INTO public.parametres_roi (module_id, cle, valeur, label, ordre)
SELECT m.id, 'economie_base_mensuelle', 950, 'Économie base mensuelle ($)', 1 FROM public.modules_roi m WHERE m.slug = 'gestion-inventaires'
UNION ALL
SELECT m.id, 'reduction_appro_min', 0.05, 'Réduction approvisionnement min (%)', 2 FROM public.modules_roi m WHERE m.slug = 'gestion-inventaires'
UNION ALL
SELECT m.id, 'reduction_appro_max', 0.10, 'Réduction approvisionnement max (%)', 3 FROM public.modules_roi m WHERE m.slug = 'gestion-inventaires';

-- Module: inventaires-temps-reel
INSERT INTO public.parametres_roi (module_id, cle, valeur, label, ordre)
SELECT m.id, 'economie_commandes_mensuelle', 300, 'Économie commandes ($/mois)', 1 FROM public.modules_roi m WHERE m.slug = 'inventaires-temps-reel'
UNION ALL
SELECT m.id, 'economie_suivi_mensuel', 100, 'Économie suivi pertes ($/mois)', 2 FROM public.modules_roi m WHERE m.slug = 'inventaires-temps-reel'
UNION ALL
SELECT m.id, 'heures_incongruites', 4, 'Heures économisées incongruités/mois', 3 FROM public.modules_roi m WHERE m.slug = 'inventaires-temps-reel';

-- Module: facturation
INSERT INTO public.parametres_roi (module_id, cle, valeur, label, ordre)
SELECT m.id, 'heures_economisees_an', 65, 'Heures économisées par an', 1 FROM public.modules_roi m WHERE m.slug = 'facturation';

-- Module: paniers-commandes
INSERT INTO public.parametres_roi (module_id, cle, valeur, label, ordre)
SELECT m.id, 'heures_par_responsable', 50, 'Heures économisées/an/responsable', 1 FROM public.modules_roi m WHERE m.slug = 'paniers-commandes';

-- Module: ressources-humaines
INSERT INTO public.parametres_roi (module_id, cle, valeur, label, ordre)
SELECT m.id, 'heures_rh_an', 72, 'Heures RH économisées/an', 1 FROM public.modules_roi m WHERE m.slug = 'ressources-humaines'
UNION ALL
SELECT m.id, 'heures_compta_rh_an', 12, 'Heures comptabilité RH économisées/an', 2 FROM public.modules_roi m WHERE m.slug = 'ressources-humaines';

-- Module: taches-repetitives
INSERT INTO public.parametres_roi (module_id, cle, valeur, label, ordre)
SELECT m.id, 'heures_min_semaine', 2, 'Heures économisées min/semaine', 1 FROM public.modules_roi m WHERE m.slug = 'taches-repetitives'
UNION ALL
SELECT m.id, 'heures_max_semaine', 5, 'Heures économisées max/semaine', 2 FROM public.modules_roi m WHERE m.slug = 'taches-repetitives';
