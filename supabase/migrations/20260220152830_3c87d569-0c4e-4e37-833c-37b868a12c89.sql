
-- Ajouter auth_id à la table utilisateurs pour lier à Supabase Auth
ALTER TABLE public.utilisateurs 
  ADD COLUMN IF NOT EXISTS auth_id uuid UNIQUE;

-- Créer l'enum pour les rôles (sécurité séparée)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'vendeur');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Créer la table user_roles séparée (sécurité : pas de rôles dans la table profil)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Activer RLS sur user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Fonction security definer pour vérifier les rôles (évite récursion RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Politiques RLS pour user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
