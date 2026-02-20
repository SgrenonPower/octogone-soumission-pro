import { useState, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  const [afficherPassword, setAfficherPassword] = useState(false);
  const { login, authError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setErreur('Veuillez remplir tous les champs.');
      return;
    }
    setChargement(true);
    setErreur('');

    const result = await login(email.trim(), password);
    if (result.success) {
      navigate('/calculateur');
    } else {
      setErreur(result.error || 'Erreur de connexion. Veuillez réessayer.');
      setPassword('');
    }
    setChargement(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

  // Afficher authError (compte inactif, non configuré) si présent
  const messageErreur = erreur || authError;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--gradient-hero)' }}>
      
      {/* Cercles décoratifs en arrière-plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'hsl(var(--accent))' }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-8"
          style={{ background: 'hsl(var(--primary-foreground))' }} />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'hsl(var(--accent))' }} />
      </div>

      {/* Carte de connexion */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="rounded-2xl p-8 shadow-2xl border"
          style={{
            background: 'hsl(0 0% 100% / 0.06)',
            borderColor: 'hsl(0 0% 100% / 0.12)',
            backdropFilter: 'blur(20px)',
          }}>
          
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
              style={{ background: 'hsl(var(--accent) / 0.2)', border: '1px solid hsl(var(--accent) / 0.3)' }}>
              <div className="w-8 h-8 rounded-lg"
                style={{ background: 'hsl(var(--accent))' }} />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-2"
              style={{ color: 'hsl(0 0% 100%)' }}>
              Octogone
            </h1>
            <p className="text-base font-medium"
              style={{ color: 'hsl(210 40% 75%)' }}>
              Calculateur de soumissions
            </p>
          </div>

          {/* Formulaire */}
          <div className="space-y-4">
            {/* Champ courriel */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium"
                style={{ color: 'hsl(210 40% 80%)' }}>
                Courriel
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'hsl(210 40% 65%)' }}>
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
            </div>

            {/* Champ mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium"
                style={{ color: 'hsl(210 40% 80%)' }}>
                Mot de passe
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'hsl(210 40% 65%)' }}>
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="password"
                  type={afficherPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErreur(''); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Votre mot de passe"
                  className="pl-10 pr-10 h-12 text-sm border-0 focus-visible:ring-1"
                  style={{
                    background: 'hsl(0 0% 100% / 0.08)',
                    color: 'hsl(0 0% 100%)',
                    caretColor: 'hsl(var(--accent))',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setAfficherPassword(!afficherPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                  style={{ color: 'hsl(210 40% 65%)' }}>
                  {afficherPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Message d'erreur */}
            {messageErreur && (
              <p className="text-sm font-medium" style={{ color: 'hsl(0 70% 65%)' }}>
                {messageErreur}
              </p>
            )}

            <Button
              onClick={handleSubmit}
              disabled={chargement}
              className="w-full h-12 text-sm font-semibold rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'hsl(var(--accent))',
                color: 'hsl(0 0% 100%)',
              }}>
              {chargement ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Vérification…
                </span>
              ) : 'Entrer'}
            </Button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs mt-8" style={{ color: 'hsl(210 40% 55%)' }}>
            Octogone 360 — Gestion alimentaire SaaS
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
