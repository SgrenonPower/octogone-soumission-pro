import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Composant monté une seule fois au démarrage de l'app.
 * Écoute l'event PASSWORD_RECOVERY envoyé par Supabase quand un lien
 * de réinitialisation est cliqué. Redirige vers /reset-password.
 */
const AuthRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
};

export default AuthRedirect;
