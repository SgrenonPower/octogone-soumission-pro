
-- ============================================================
-- 1. Désactiver anciens segments RPA et réordonner les existants
-- ============================================================
UPDATE public.segments SET actif = false WHERE slug IN ('rpa-cat-1', 'rpa-cat-2', 'rpa-cat-3', 'rpa-cat-4');

UPDATE public.segments SET ordre = 5 WHERE slug = 'cpe';
UPDATE public.segments SET ordre = 6 WHERE slug = 'cafeteria';
UPDATE public.segments SET ordre = 7 WHERE slug = 'traiteur';
UPDATE public.segments SET ordre = 8 WHERE slug = 'restaurant';

-- Insérer les nouveaux segments (si pas déjà présents)
INSERT INTO public.segments (nom, slug, type_tarification, unite, prix_unitaire, minimum_mensuel, ordre)
SELECT * FROM (VALUES
  ('Cat 1-2 — Autonomes / Médication', 'cat-1-2', 'lineaire', 'lit', 5.00::numeric, 250::numeric, 1),
  ('Cat 3-4 — Semi-autonomes / Soins', 'cat-3-4', 'lineaire', 'lit', 5.00::numeric, 250::numeric, 2),
  ('CHSLD', 'chsld', 'lineaire', 'lit', 5.00::numeric, 250::numeric, 3),
  ('Public / Hôpitaux', 'public-hopitaux', 'lineaire', 'lit', 6.00::numeric, 300::numeric, 4)
) AS v(nom, slug, type_tarification, unite, prix_unitaire, minimum_mensuel, ordre)
WHERE NOT EXISTS (SELECT 1 FROM public.segments WHERE slug = v.slug);

-- ============================================================
-- 2. Table modules_produit
-- ============================================================
CREATE TABLE IF NOT EXISTS public.modules_produit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  ordre integer NOT NULL DEFAULT 0,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.modules_produit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Accès public modules_produit" ON public.modules_produit;
CREATE POLICY "Accès public modules_produit" ON public.modules_produit FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.modules_produit (nom, slug, description, ordre)
VALUES
  ('Interface soins', 'interface-soins', 'Interface de suivi et gestion des soins', 1),
  ('IA', 'ia', 'Intelligence artificielle et analyses prédictives', 2)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 3. Table prix_modules_produit
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prix_modules_produit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id uuid NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  module_produit_id uuid NOT NULL REFERENCES public.modules_produit(id) ON DELETE CASCADE,
  prix_unitaire numeric NOT NULL,
  UNIQUE(segment_id, module_produit_id)
);

ALTER TABLE public.prix_modules_produit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Accès public prix_modules_produit" ON public.prix_modules_produit;
CREATE POLICY "Accès public prix_modules_produit" ON public.prix_modules_produit FOR ALL USING (true) WITH CHECK (true);

-- Cat 1-2
INSERT INTO public.prix_modules_produit (segment_id, module_produit_id, prix_unitaire)
SELECT s.id, m.id, 5 FROM public.segments s, public.modules_produit m WHERE s.slug = 'cat-1-2' AND m.slug = 'interface-soins'
ON CONFLICT (segment_id, module_produit_id) DO NOTHING;
INSERT INTO public.prix_modules_produit (segment_id, module_produit_id, prix_unitaire)
SELECT s.id, m.id, 7 FROM public.segments s, public.modules_produit m WHERE s.slug = 'cat-1-2' AND m.slug = 'ia'
ON CONFLICT (segment_id, module_produit_id) DO NOTHING;

-- Cat 3-4
INSERT INTO public.prix_modules_produit (segment_id, module_produit_id, prix_unitaire)
SELECT s.id, m.id, 7 FROM public.segments s, public.modules_produit m WHERE s.slug = 'cat-3-4' AND m.slug = 'interface-soins'
ON CONFLICT (segment_id, module_produit_id) DO NOTHING;
INSERT INTO public.prix_modules_produit (segment_id, module_produit_id, prix_unitaire)
SELECT s.id, m.id, 9 FROM public.segments s, public.modules_produit m WHERE s.slug = 'cat-3-4' AND m.slug = 'ia'
ON CONFLICT (segment_id, module_produit_id) DO NOTHING;

-- CHSLD
INSERT INTO public.prix_modules_produit (segment_id, module_produit_id, prix_unitaire)
SELECT s.id, m.id, 8 FROM public.segments s, public.modules_produit m WHERE s.slug = 'chsld' AND m.slug = 'interface-soins'
ON CONFLICT (segment_id, module_produit_id) DO NOTHING;
INSERT INTO public.prix_modules_produit (segment_id, module_produit_id, prix_unitaire)
SELECT s.id, m.id, 10 FROM public.segments s, public.modules_produit m WHERE s.slug = 'chsld' AND m.slug = 'ia'
ON CONFLICT (segment_id, module_produit_id) DO NOTHING;

-- Public / Hôpitaux
INSERT INTO public.prix_modules_produit (segment_id, module_produit_id, prix_unitaire)
SELECT s.id, m.id, 9 FROM public.segments s, public.modules_produit m WHERE s.slug = 'public-hopitaux' AND m.slug = 'interface-soins'
ON CONFLICT (segment_id, module_produit_id) DO NOTHING;
INSERT INTO public.prix_modules_produit (segment_id, module_produit_id, prix_unitaire)
SELECT s.id, m.id, 12 FROM public.segments s, public.modules_produit m WHERE s.slug = 'public-hopitaux' AND m.slug = 'ia'
ON CONFLICT (segment_id, module_produit_id) DO NOTHING;

-- CPE
INSERT INTO public.prix_modules_produit (segment_id, module_produit_id, prix_unitaire)
SELECT s.id, m.id, 3.50 FROM public.segments s, public.modules_produit m WHERE s.slug = 'cpe' AND m.slug = 'interface-soins'
ON CONFLICT (segment_id, module_produit_id) DO NOTHING;
INSERT INTO public.prix_modules_produit (segment_id, module_produit_id, prix_unitaire)
SELECT s.id, m.id, 5.00 FROM public.segments s, public.modules_produit m WHERE s.slug = 'cpe' AND m.slug = 'ia'
ON CONFLICT (segment_id, module_produit_id) DO NOTHING;

-- Cafétéria
INSERT INTO public.prix_modules_produit (segment_id, module_produit_id, prix_unitaire)
SELECT s.id, m.id, 1.50 FROM public.segments s, public.modules_produit m WHERE s.slug = 'cafeteria' AND m.slug = 'interface-soins'
ON CONFLICT (segment_id, module_produit_id) DO NOTHING;
INSERT INTO public.prix_modules_produit (segment_id, module_produit_id, prix_unitaire)
SELECT s.id, m.id, 2.00 FROM public.segments s, public.modules_produit m WHERE s.slug = 'cafeteria' AND m.slug = 'ia'
ON CONFLICT (segment_id, module_produit_id) DO NOTHING;

-- Traiteur
INSERT INTO public.prix_modules_produit (segment_id, module_produit_id, prix_unitaire)
SELECT s.id, m.id, 1.75 FROM public.segments s, public.modules_produit m WHERE s.slug = 'traiteur' AND m.slug = 'interface-soins'
ON CONFLICT (segment_id, module_produit_id) DO NOTHING;
INSERT INTO public.prix_modules_produit (segment_id, module_produit_id, prix_unitaire)
SELECT s.id, m.id, 2.50 FROM public.segments s, public.modules_produit m WHERE s.slug = 'traiteur' AND m.slug = 'ia'
ON CONFLICT (segment_id, module_produit_id) DO NOTHING;

-- Restaurant (forfait fixe)
INSERT INTO public.prix_modules_produit (segment_id, module_produit_id, prix_unitaire)
SELECT s.id, m.id, 100 FROM public.segments s, public.modules_produit m WHERE s.slug = 'restaurant' AND m.slug = 'interface-soins'
ON CONFLICT (segment_id, module_produit_id) DO NOTHING;
INSERT INTO public.prix_modules_produit (segment_id, module_produit_id, prix_unitaire)
SELECT s.id, m.id, 150 FROM public.segments s, public.modules_produit m WHERE s.slug = 'restaurant' AND m.slug = 'ia'
ON CONFLICT (segment_id, module_produit_id) DO NOTHING;

-- ============================================================
-- 4. Table soumission_etablissement_modules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.soumission_etablissement_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  soumission_etablissement_id uuid NOT NULL REFERENCES public.soumission_etablissements(id) ON DELETE CASCADE,
  module_produit_id uuid NOT NULL REFERENCES public.modules_produit(id),
  prix_unitaire numeric NOT NULL,
  UNIQUE(soumission_etablissement_id, module_produit_id)
);

ALTER TABLE public.soumission_etablissement_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Accès public soumission_etablissement_modules" ON public.soumission_etablissement_modules;
CREATE POLICY "Accès public soumission_etablissement_modules" ON public.soumission_etablissement_modules FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 5. Désactiver ancien rabais volume et ajouter flag RQRA
-- ============================================================
ALTER TABLE public.soumissions ADD COLUMN IF NOT EXISTS est_rqra boolean DEFAULT false;
