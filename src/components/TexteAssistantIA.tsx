import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Wand2, Settings2, RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TexteAssistantIAProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: ReactNode;
  champType: 'portee' | 'notes';
  contexte: {
    nomClient?: string;
    segment?: string;
    etablissements?: { nom: string; unites: number; estPilote: boolean }[];
    modulesROI?: string[];
    rabais?: string[];
    budgetAlimentaire?: number;
  };
  className?: string;
  minHeight?: string;
}

type ModeChargement = 'ameliorer' | 'generer' | 'suggestion' | null;

export const TexteAssistantIA = ({
  value,
  onChange,
  placeholder,
  label,
  champType,
  contexte,
  className,
  minHeight = '96px',
}: TexteAssistantIAProps) => {
  const [chargement, setChargement] = useState<ModeChargement>(null);
  const [ancienneValeur, setAncienneValeur] = useState<string | null>(null);
  const [afficherRetablir, setAfficherRetablir] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionsActives, setSuggestionsActives] = useState(false);

  const retablirTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Effacer le timer de rétablissement
  const annulerRetablirTimer = () => {
    if (retablirTimerRef.current) {
      clearTimeout(retablirTimerRef.current);
      retablirTimerRef.current = null;
    }
  };

  // Appel à l'edge function
  const appelIA = async (mode: 'ameliorer' | 'generer' | 'suggestion'): Promise<string> => {
    const nbEtablissements = contexte.etablissements?.length || 1;
    const aUnPilote = contexte.etablissements?.some(e => e.estPilote) || false;
    const etablissementsDetail = contexte.etablissements
      ?.map(e => `${e.nom || 'Sans nom'} (${e.unites} unités${e.estPilote ? ', pilote' : ''})`)
      .join(', ') || '';
    const rabaisDetail = contexte.rabais?.join(', ') || '';

    const { data, error } = await supabase.functions.invoke('assistant-ia-texte', {
      body: {
        mode,
        champType,
        texteOriginal: value,
        contexte: {
          nomClient: contexte.nomClient,
          segment: contexte.segment,
          nbEtablissements,
          aUnPilote,
          etablissements: etablissementsDetail,
          etablissementsDetail,
          modulesROI: contexte.modulesROI || [],
          rabais: contexte.rabais || [],
          rabaisDetail,
          budgetAlimentaire: contexte.budgetAlimentaire,
        },
      },
    });

    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data?.resultat || '';
  };

  // Mode Améliorer
  const handleAmeliorer = async () => {
    if (value.trim().length < 10) return;
    setChargement('ameliorer');
    setAncienneValeur(value);
    annulerRetablirTimer();
    try {
      const resultat = await appelIA('ameliorer');
      if (!resultat) {
        toast({ title: 'Aucune suggestion disponible.', variant: 'destructive' });
        return;
      }
      onChange(resultat);
      setAfficherRetablir(true);
      retablirTimerRef.current = setTimeout(() => setAfficherRetablir(false), 10000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "L'assistant IA n'est pas disponible pour le moment.";
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setChargement(null);
    }
  };

  // Mode Générer
  const handleGenerer = async () => {
    const aDejaContenu = value.trim().length > 0;
    if (aDejaContenu) {
      const ok = window.confirm('Ce champ contient déjà du texte. Voulez-vous le remplacer par un texte généré ?');
      if (!ok) return;
    }
    setChargement('generer');
    if (aDejaContenu) setAncienneValeur(value);
    annulerRetablirTimer();
    try {
      const resultat = await appelIA('generer');
      if (!resultat) {
        toast({ title: 'Aucune suggestion disponible.', variant: 'destructive' });
        return;
      }
      onChange(resultat);
      if (aDejaContenu) {
        setAfficherRetablir(true);
        retablirTimerRef.current = setTimeout(() => setAfficherRetablir(false), 10000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "L'assistant IA n'est pas disponible pour le moment.";
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setChargement(null);
    }
  };

  // Rétablir l'original
  const handleRetablir = () => {
    if (ancienneValeur !== null) {
      onChange(ancienneValeur);
      setAncienneValeur(null);
      setAfficherRetablir(false);
      annulerRetablirTimer();
    }
  };

  // Suggestion automatique (debounce 3s)
  const fetchSuggestion = useCallback(async (texte: string) => {
    if (!suggestionsActives) return;
    if (texte.length < 10 || texte.length > 100) {
      setSuggestion('');
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('assistant-ia-texte', {
        body: {
          mode: 'suggestion',
          champType,
          texteOriginal: texte,
          contexte: {},
        },
      });
      if (!error && data?.resultat) {
        setSuggestion(data.resultat);
      } else {
        setSuggestion('');
      }
    } catch {
      setSuggestion('');
    }
  }, [suggestionsActives, champType]);

  useEffect(() => {
    setSuggestion('');
    if (!suggestionsActives) return;

    if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current);
    if (value.length >= 10 && value.length <= 100) {
      suggestionTimerRef.current = setTimeout(() => fetchSuggestion(value), 3000);
    }
    return () => {
      if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current);
    };
  }, [value, suggestionsActives, fetchSuggestion]);

  const appliquerSuggestion = () => {
    const nouveau = value.trimEnd() + ' ' + suggestion.trim();
    onChange(nouveau);
    setSuggestion('');
  };

  const isDisabled = chargement !== null;
  const peutAmeliorer = value.trim().length >= 10 && !isDisabled;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label + boutons */}
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm">{label}</Label>
        <div className="flex items-center gap-1">
          {/* Bouton Améliorer */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              'h-7 px-2 text-xs gap-1 transition-all',
              peutAmeliorer
                ? 'text-primary hover:text-primary hover:bg-primary/10'
                : 'text-muted-foreground/40 cursor-not-allowed'
            )}
            disabled={!peutAmeliorer}
            onClick={handleAmeliorer}
            title="Améliorer le texte existant"
          >
            {chargement === 'ameliorer' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Améliorer</span>
          </Button>

          {/* Bouton Générer */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10 transition-all"
            disabled={isDisabled}
            onClick={handleGenerer}
            title="Générer un texte complet"
          >
            {chargement === 'generer' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Générer</span>
          </Button>

          {/* Menu options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 w-7 px-0 text-muted-foreground hover:text-foreground"
                title="Options IA"
              >
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Options IA
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="flex items-center justify-between px-2 py-2 gap-3">
                <div>
                  <p className="text-sm font-medium">Suggestions automatiques</p>
                  <p className="text-xs text-muted-foreground">Après 3 sec d'inactivité</p>
                </div>
                <Switch
                  checked={suggestionsActives}
                  onCheckedChange={setSuggestionsActives}
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <Textarea
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={isDisabled}
          style={{ minHeight }}
          className={cn(
            'resize-y text-sm transition-opacity',
            isDisabled && 'opacity-60 cursor-wait'
          )}
        />
        {isDisabled && (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/80 px-3 py-1.5 rounded-full border">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              {chargement === 'ameliorer' ? 'Amélioration en cours…' : chargement === 'generer' ? 'Génération en cours…' : 'Analyse…'}
            </div>
          </div>
        )}
      </div>

      {/* Lien Rétablir l'original */}
      {afficherRetablir && (
        <button
          type="button"
          onClick={handleRetablir}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
        >
          <RotateCcw className="h-3 w-3" />
          Rétablir l'original
        </button>
      )}

      {/* Suggestion automatique */}
      {suggestion && !isDisabled && (
        <div className="p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 space-y-2">
          <p className="text-xs text-muted-foreground/70 italic leading-relaxed">
            💡 <span className="text-muted-foreground">{suggestion}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 text-xs px-2"
              onClick={appliquerSuggestion}
            >
              Appliquer
            </Button>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setSuggestion('')}
            >
              Ignorer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TexteAssistantIA;
