-- Rendre rabais_id nullable (déjà nullable selon le schema actuel, mais on ajoute les nouvelles colonnes)
ALTER TABLE soumission_rabais
  ADD COLUMN IF NOT EXISTS type_rabais TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pourcentage_applique NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS description_rabais TEXT DEFAULT NULL;