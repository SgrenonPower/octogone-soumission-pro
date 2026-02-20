import { useState, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [chargement, setChargement] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) {
      setErreur('Veuillez saisir votre adresse courriel.');
      return;
    }

    setChargement(true);
    setErreur('');

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      // On affiche toujours le succès pour ne pas révéler si l'email existe
      console.error('Reset password error:', error);
    }

    setEnvoye(true);
    setChargement(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

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
              {envoye ? 'Courriel envoyé' : 'Mot de passe oublié'}
            </p>
          </div>

          {envoye ? (
            /* État succès */
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
                    Si un compte est associé à{' '}
                    <span style={{ color: 'hsl(var(--accent))' }}>{email}</span>,
                    vous recevrez un lien de réinitialisation dans les prochaines minutes.
                  </p>
                  <p className="text-xs" style={{ color: 'hsl(210 40% 60%)' }}>
                    Pensez à vérifier vos courriels indésirables.
                  </p>
                </div>
              </div>

              <Link to="/">
                <Button
                  className="w-full h-12 text-sm font-semibold rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'hsl(var(--accent))', color: 'hsl(0 0% 100%)' }}
                >
                  Retour à la connexion
                </Button>
              </Link>
            </div>
          ) : (
            /* Formulaire */
            <div className="space-y-5">
              <p className="text-sm text-center" style={{ color: 'hsl(210 40% 70%)' }}>
                Entrez votre adresse courriel et nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium" style={{ color: 'hsl(210 40% 80%)' }}>
                  Adresse courriel
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(210 40% 65%)' }}>
                    <Mail className="h-4 w-4" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setErreur(''); }}
                    onKeyDown={handleKeyDown}
                    placeholder="votre.nom@octogone360.com"
                    className="pl-10 h-12 text-sm border-0 focus-visible:ring-1"
                    style={{
                      background: 'hsl(0 0% 100% / 0.08)',
                      color: 'hsl(0 0% 100%)',
                      caretColor: 'hsl(var(--accent))',
                    }}
                    autoFocus
                  />
                </div>
                {erreur && (
                  <p className="text-sm font-medium" style={{ color: 'hsl(0 70% 65%)' }}>
                    {erreur}
                  </p>
                )}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={chargement}
                className="w-full h-12 text-sm font-semibold rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'hsl(var(--accent))', color: 'hsl(0 0% 100%)' }}
              >
                {chargement ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Envoi…
                  </span>
                ) : 'Envoyer le lien de réinitialisation'}
              </Button>

              <Link
                to="/"
                className="flex items-center justify-center gap-2 text-sm transition-opacity hover:opacity-80"
                style={{ color: 'hsl(210 40% 65%)' }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour à la connexion
              </Link>
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

export default ForgotPassword;
