import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [afficherPassword, setAfficherPassword] = useState(false);
  const [afficherConfirm, setAfficherConfirm] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [succes, setSucces] = useState(false);
  const [erreur, setErreur] = useState('');
  const [sessionValide, setSessionValide] = useState(false);
  const [verificationSession, setVerificationSession] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    let sub: ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription'] | null = null;

    const verifier = async () => {
      // 1. Écouter l'event PASSWORD_RECOVERY (arrive si le hash vient d'être traité)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY' && mounted) {
          setSessionValide(true);
          setVerificationSession(false);
        }
      });
      sub = subscription;

      // 2. Vérifier s'il y a déjà une session active (l'event peut avoir déjà été émis)
      const { data: { session } } = await supabase.auth.getSession();
      if (session && mounted) {
        setSessionValide(true);
      }

      // 3. Délai de sécurité pour laisser le temps aux events d'arriver
      setTimeout(() => {
        if (mounted) setVerificationSession(false);
      }, 1500);
    };

    verifier();

    return () => {
      mounted = false;
      sub?.unsubscribe();
    };
  }, []);

  const validerPassword = (): string | null => {
    if (!password) return 'Veuillez saisir un nouveau mot de passe.';
    if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
    if (!/[A-Z]/.test(password) && !/[0-9]/.test(password)) {
      return 'Le mot de passe doit contenir au moins une majuscule ou un chiffre.';
    }
    if (password !== passwordConfirm) return 'Les mots de passe ne correspondent pas.';
    return null;
  };

  const handleSubmit = async () => {
    const validationErreur = validerPassword();
    if (validationErreur) {
      setErreur(validationErreur);
      return;
    }

    setChargement(true);
    setErreur('');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      if (error.message.includes('same password')) {
        setErreur('Le nouveau mot de passe doit être différent de l\'ancien.');
      } else if (error.message.includes('weak')) {
        setErreur('Mot de passe trop faible. Choisissez un mot de passe plus robuste.');
      } else {
        setErreur('Erreur lors de la mise à jour. Veuillez réessayer ou demander un nouveau lien.');
      }
      setChargement(false);
      return;
    }

    setSucces(true);
    setChargement(false);

    // Déconnecter et rediriger vers login après 2.5s
    setTimeout(async () => {
      await supabase.auth.signOut();
      navigate('/', { replace: true });
    }, 2500);
  };

  if (verificationSession) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gradient-hero)' }}>
        <div className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--gradient-hero)' }}
    >
      {/* Cercles décoratifs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'hsl(var(--accent))' }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-8"
          style={{ background: 'hsl(var(--primary-foreground))' }} />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'hsl(var(--accent))' }} />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div
          className="rounded-2xl p-8 shadow-2xl border"
          style={{
            background: 'hsl(0 0% 100% / 0.06)',
            borderColor: 'hsl(0 0% 100% / 0.12)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
              style={{
                background: 'hsl(var(--accent) / 0.2)',
                border: '1px solid hsl(var(--accent) / 0.3)',
              }}
            >
              <div className="w-8 h-8 rounded-lg" style={{ background: 'hsl(var(--accent))' }} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'hsl(0 0% 100%)' }}>
              Octogone
            </h1>
            <p className="text-base font-medium" style={{ color: 'hsl(210 40% 75%)' }}>
              {succes ? 'Mot de passe mis à jour' : 'Nouveau mot de passe'}
            </p>
          </div>

          {/* Lien invalide ou expiré */}
          {!sessionValide && !succes ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4 py-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: 'hsl(0 70% 50% / 0.2)', border: '1px solid hsl(0 70% 50% / 0.4)' }}
                >
                  <AlertCircle className="h-8 w-8" style={{ color: 'hsl(0 70% 65%)' }} />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium" style={{ color: 'hsl(0 0% 100%)' }}>
                    Ce lien est invalide ou a expiré.
                  </p>
                  <p className="text-xs" style={{ color: 'hsl(210 40% 60%)' }}>
                    Veuillez faire une nouvelle demande de réinitialisation.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate('/forgot-password')}
                className="w-full h-12 text-sm font-semibold rounded-lg"
                style={{ background: 'hsl(var(--accent))', color: 'hsl(0 0% 100%)' }}
              >
                Nouvelle demande
              </Button>
            </div>
          ) : succes ? (
            /* Succès */
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4 py-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: 'hsl(142 71% 45% / 0.2)', border: '1px solid hsl(142 71% 45% / 0.4)' }}
                >
                  <CheckCircle className="h-8 w-8" style={{ color: 'hsl(142 71% 55%)' }} />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium" style={{ color: 'hsl(0 0% 100%)' }}>
                    Votre mot de passe a été mis à jour avec succès.
                  </p>
                  <p className="text-xs" style={{ color: 'hsl(210 40% 60%)' }}>
                    Redirection vers la page de connexion…
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"
                  style={{ color: 'hsl(var(--accent))' }} />
              </div>
            </div>
          ) : (
            /* Formulaire */
            <div className="space-y-5">
              <p className="text-sm text-center" style={{ color: 'hsl(210 40% 70%)' }}>
                Choisissez un nouveau mot de passe sécurisé pour votre compte.
              </p>

              {/* Nouveau mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium" style={{ color: 'hsl(210 40% 80%)' }}>
                  Nouveau mot de passe
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(210 40% 65%)' }}>
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    id="password"
                    type={afficherPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setErreur(''); }}
                    placeholder="Minimum 8 caractères"
                    className="pl-10 pr-10 h-12 text-sm border-0 focus-visible:ring-1"
                    style={{
                      background: 'hsl(0 0% 100% / 0.08)',
                      color: 'hsl(0 0% 100%)',
                      caretColor: 'hsl(var(--accent))',
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setAfficherPassword(!afficherPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                    style={{ color: 'hsl(210 40% 65%)' }}
                  >
                    {afficherPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmation */}
              <div className="space-y-2">
                <Label htmlFor="password-confirm" className="text-sm font-medium" style={{ color: 'hsl(210 40% 80%)' }}>
                  Confirmer le mot de passe
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(210 40% 65%)' }}>
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    id="password-confirm"
                    type={afficherConfirm ? 'text' : 'password'}
                    value={passwordConfirm}
                    onChange={e => { setPasswordConfirm(e.target.value); setErreur(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                    placeholder="Répétez le mot de passe"
                    className="pl-10 pr-10 h-12 text-sm border-0 focus-visible:ring-1"
                    style={{
                      background: 'hsl(0 0% 100% / 0.08)',
                      color: 'hsl(0 0% 100%)',
                      caretColor: 'hsl(var(--accent))',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setAfficherConfirm(!afficherConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                    style={{ color: 'hsl(210 40% 65%)' }}
                  >
                    {afficherConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Indicateur de correspondance */}
              {password && passwordConfirm && (
                <div className="flex items-center gap-2 text-xs">
                  {password === passwordConfirm ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'hsl(142 71% 55%)' }} />
                      <span style={{ color: 'hsl(142 71% 55%)' }}>Les mots de passe correspondent</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'hsl(0 70% 65%)' }} />
                      <span style={{ color: 'hsl(0 70% 65%)' }}>Les mots de passe ne correspondent pas</span>
                    </>
                  )}
                </div>
              )}

              {erreur && (
                <p className="text-sm font-medium" style={{ color: 'hsl(0 70% 65%)' }}>
                  {erreur}
                </p>
              )}

              <Button
                onClick={handleSubmit}
                disabled={chargement || !password || !passwordConfirm}
                className="w-full h-12 text-sm font-semibold rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'hsl(var(--accent))', color: 'hsl(0 0% 100%)' }}
              >
                {chargement ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Mise à jour…
                  </span>
                ) : 'Mettre à jour le mot de passe'}
              </Button>
            </div>
          )}

          <p className="text-center text-xs mt-8" style={{ color: 'hsl(210 40% 55%)' }}>
            Octogone 360 — Gestion alimentaire SaaS
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
