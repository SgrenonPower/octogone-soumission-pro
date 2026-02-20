import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Utilisateur } from '@/lib/supabase-queries';

interface AuthError {
  message: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const chargerProfil = useCallback(async (authUser: User) => {
    try {
      // 1. Chercher par auth_id (rapide)
      let { data, error } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('auth_id', authUser.id)
        .maybeSingle();

      // 2. Fallback par email si auth_id non trouvé
      if (!data && authUser.email) {
        const res = await supabase
          .from('utilisateurs')
          .select('*')
          .eq('email', authUser.email)
          .maybeSingle();
        data = res.data;
        error = res.error;

        // 3. Si trouvé par email, mettre à jour auth_id pour les prochaines fois
        if (data && !data.auth_id) {
          await supabase
            .from('utilisateurs')
            .update({ auth_id: authUser.id })
            .eq('id', data.id);
        }
      }

      if (error) {
        console.error('Erreur chargement profil:', error);
        await supabase.auth.signOut();
        setAuthError('Erreur lors du chargement du profil. Veuillez réessayer.');
        setUser(null);
        setUtilisateur(null);
        setLoading(false);
        return;
      }

      if (!data) {
        await supabase.auth.signOut();
        setAuthError('Votre compte n\'est pas encore configuré. Contactez un administrateur.');
        setUser(null);
        setUtilisateur(null);
        setLoading(false);
        return;
      }

      if (data.actif === false) {
        await supabase.auth.signOut();
        setAuthError('Votre compte a été désactivé. Contactez un administrateur.');
        setUser(null);
        setUtilisateur(null);
        setLoading(false);
        return;
      }

      setUser(authUser);
      setUtilisateur(data as Utilisateur);
      setAuthError(null);
    } catch (err) {
      console.error('Erreur inattendue chargement profil:', err);
      await supabase.auth.signOut();
      setUser(null);
      setUtilisateur(null);
      setAuthError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Nettoyer l'ancien système d'authentification
    localStorage.removeItem('octogone_access');

    // Mettre en place le listener AVANT getSession (recommandé par Supabase)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Utiliser setTimeout pour éviter les deadlocks avec les appels Supabase dans le callback
        setTimeout(() => {
          chargerProfil(session.user);
        }, 0);
      } else {
        setUser(null);
        setUtilisateur(null);
        setLoading(false);
      }
    });

    // Restaurer la session existante
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        chargerProfil(session.user);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [chargerProfil]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const msg = traduireErreur(error);
      return { success: false, error: msg };
    }
    return { success: true };
  };

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
    setUtilisateur(null);
  };

  const isAdmin = utilisateur?.role === 'admin';

  return {
    user,
    utilisateur,
    loading,
    isAdmin,
    authError,
    login,
    logout,
  };
};

const traduireErreur = (error: AuthError): string => {
  const msg = error.message?.toLowerCase() || '';
  if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'Courriel ou mot de passe incorrect.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Votre adresse courriel n\'est pas confirmée.';
  }
  if (msg.includes('too many requests') || msg.includes('rate limit')) {
    return 'Trop de tentatives. Veuillez patienter quelques minutes.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Erreur de connexion. Veuillez réessayer.';
  }
  return 'Erreur de connexion. Veuillez réessayer.';
};
