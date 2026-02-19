import { useState, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock } from 'lucide-react';

const Login = () => {
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  const [afficherCode, setAfficherCode] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!code.trim()) {
      setErreur('Veuillez saisir votre code d\'accès.');
      return;
    }
    setChargement(true);
    setErreur('');

    // Petit délai pour UX
    await new Promise(r => setTimeout(r, 400));

    const success = login(code);
    if (success) {
      navigate('/calculateur');
    } else {
      setErreur('Code d\'accès incorrect. Veuillez réessayer.');
      setCode('');
    }
    setChargement(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

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
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="code-acces" className="text-sm font-medium"
                style={{ color: 'hsl(210 40% 80%)' }}>
                Code d'accès
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'hsl(210 40% 65%)' }}>
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="code-acces"
                  type={afficherCode ? 'text' : 'password'}
                  value={code}
                  onChange={e => { setCode(e.target.value); setErreur(''); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Entrez votre code d'accès"
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
                  onClick={() => setAfficherCode(!afficherCode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                  style={{ color: 'hsl(210 40% 65%)' }}>
                  {afficherCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
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
