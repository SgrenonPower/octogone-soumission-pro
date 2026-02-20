CREATE TABLE public.soumission_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soumission_id UUID NOT NULL REFERENCES public.soumissions(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  prix_description TEXT NOT NULL DEFAULT '',
  ordre INTEGER DEFAULT 0
);

ALTER TABLE public.soumission_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accès public soumission_options"
  ON public.soumission_options FOR ALL
  USING (true) WITH CHECK (true);