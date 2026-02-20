import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { formatMontant, formatPourcentage } from '@/lib/format';
import {
  fetchSegments,
  fetchAllPaliers,
  fetchRabais,
  fetchConfig,
  fetchModulesRoi,
  fetchParametresRoi,
  genererNumero,
  sauvegarderSoumission,
  Segment,
  Palier,
  Rabais as RabaisType,
  ModuleRoi,
  ParametreRoi,
} from '@/lib/supabase-queries';
import { calculerROI, DonneesROI, ResultatROI } from '@/lib/roi-calc';
import { Plus, Trash2, Save, FileDown, AlertCircle, Building2, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// ============================================================
// Types internes
// ============================================================

interface Etablissement {
  id: string;
  nom: string;
  nombreUnites: number;
  estPilote: boolean;
}

interface RabaisState {
  dropdownId: string | null; // ID du rabais dropdown sélectionné
  engagement: boolean;
  pilote: boolean;
}

// ============================================================
// Calcul du prix
// ============================================================

const calculerPrixEtablissement = (
  etab: Etablissement,
  segment: Segment | null,
  paliers: Palier[],
  rabais: RabaisType[],
  rabaisState: RabaisState,
): { prixBrut: number; prixFinal: number } => {
  if (!segment) return { prixBrut: 0, prixFinal: 0 };

  let prixBase: number;

  if (segment.type_tarification === 'paliers') {
    // Trouver le palier correspondant
    const palier = paliers.find(p =>
      etab.nombreUnites >= p.capacite_min &&
      (p.capacite_max === null || etab.nombreUnites <= p.capacite_max)
    );
    prixBase = palier ? Number(palier.tarif_mensuel) : 0;
  } else {
    // Linéaire
    const prixBrutCalc = etab.nombreUnites * Number(segment.prix_unitaire || 0);
    prixBase = Math.max(prixBrutCalc, Number(segment.minimum_mensuel || 0));
  }

  const prixBrut = prixBase;
  let prixFinal = prixBase;

  // Couche 1 : rabais dropdown
  if (rabaisState.dropdownId) {
    const r = rabais.find(r => r.id === rabaisState.dropdownId);
    if (r) prixFinal = prixFinal * (1 - Number(r.pourcentage) / 100);
  }

  // Couche 2 : engagement annuel
  if (rabaisState.engagement) {
    const r = rabais.find(r => r.slug === 'engagement-annuel');
    if (r) prixFinal = prixFinal * (1 - Number(r.pourcentage) / 100);
  }

  // Couche 3 : pilote (seulement si cet établissement est marqué pilote)
  if (rabaisState.pilote && etab.estPilote) {
    const r = rabais.find(r => r.slug === 'projet-pilote');
    if (r) prixFinal = prixFinal * (1 - Number(r.pourcentage) / 100);
  }

  return {
    prixBrut: Math.round(prixBrut * 100) / 100,
    prixFinal: Math.round(prixFinal * 100) / 100,
  };
};

// ============================================================
// Composant principal
// ============================================================

const Calculateur = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Données depuis Supabase
  const { data: modulesRoi = [] } = useQuery({ queryKey: ['modules-roi'], queryFn: fetchModulesRoi });
  const { data: paramsRoi = [] } = useQuery({ queryKey: ['parametres-roi'], queryFn: fetchParametresRoi });
  const { data: segments = [], isLoading: loadingSegments } = useQuery({
    queryKey: ['segments'],
    queryFn: fetchSegments,
  });
  const { data: tousLesPaliers = [] } = useQuery({
    queryKey: ['paliers'],
    queryFn: fetchAllPaliers,
  });
  const { data: tousLesRabais = [] } = useQuery({
    queryKey: ['rabais'],
    queryFn: fetchRabais,
  });
  const { data: config = {} } = useQuery({
    queryKey: ['config'],
    queryFn: fetchConfig,
  });

  // État du formulaire
  const [segmentId, setSegmentId] = useState<string>('');
  const [nomClient, setNomClient] = useState('');
  const [etablissements, setEtablissements] = useState<Etablissement[]>([
    { id: '1', nom: '', nombreUnites: 0, estPilote: false },
  ]);
  const [rabaisState, setRabaisState] = useState<RabaisState>({
    dropdownId: null,
    engagement: false,
    pilote: false,
  });
  const [notes, setNotes] = useState('');
  const [notesPerso, setNotesPerso] = useState('');
  const [sauvegarde, setSauvegarde] = useState(false);
  const [roiOuvert, setRoiOuvert] = useState(false);
  const [modulesSelectionnes, setModulesSelectionnes] = useState<Set<string>>(new Set());
  const [donneesROI, setDonneesROI] = useState<DonneesROI>({
    nbEtablissements: 1,
    budgetAlimentaire: 0,
    coutsApprovisionnement: 0,
    nbEmployesCuisine: 0,
    nbResponsablesCommandes: 0,
    nbEmployesTotal: 0,
    tauxHoraireCuisine: 22,
    tauxHoraireAdmin: 35,
    tauxHoraireCompta: 27,
    coutGestionDechets: 0,
  });

  // Segment sélectionné
  const segment = segments.find(s => s.id === segmentId) || null;
  const paliersSegment = tousLesPaliers.filter(p => p.segment_id === segmentId);

  // Rabais dropdown disponibles
  const rabaisDropdown = tousLesRabais.filter(r => r.type_ui === 'dropdown');
  const rabaisToggle = tousLesRabais.filter(r => r.type_ui === 'toggle');
  const rabaisEngagement = rabaisToggle.find(r => r.slug === 'engagement-annuel');
  const rabaisPilote = rabaisToggle.find(r => r.slug === 'projet-pilote');

  // Config
  const fraisParEtab = Number(config.frais_integration || 3000);
  const validiteJours = Number(config.validite_soumission_jours || 30);

  // ---- Handlers établissements ----

  const ajouterEtablissement = () => {
    setEtablissements(prev => [
      ...prev,
      { id: Date.now().toString(), nom: '', nombreUnites: 0, estPilote: false },
    ]);
  };

  const supprimerEtablissement = (id: string) => {
    setEtablissements(prev => prev.filter(e => e.id !== id));
  };

  const majEtablissement = (id: string, champ: keyof Etablissement, valeur: unknown) => {
    setEtablissements(prev => prev.map(e => {
      if (e.id !== id) return e;
      return { ...e, [champ]: valeur };
    }));
  };

  const togglePilote = (id: string) => {
    setEtablissements(prev => prev.map(e => ({
      ...e,
      estPilote: e.id === id ? !e.estPilote : false, // max 1 pilote
    })));
  };

  // ---- Calculs récapitulatifs ----

  const calculs = etablissements.map(etab => ({
    etab,
    ...calculerPrixEtablissement(etab, segment, paliersSegment, tousLesRabais, rabaisState),
  }));

  const sousTotalMensuel = calculs.reduce((acc, c) => acc + c.prixBrut, 0);
  const totalMensuel = calculs.reduce((acc, c) => acc + c.prixFinal, 0);
  const totalAnnuel = totalMensuel * 12;
  const fraisIntegration = etablissements.length * fraisParEtab;
  const coutTotalAn1 = totalAnnuel + fraisIntegration;

  // Rabais effectif en %
  const pctRabaisTotal = sousTotalMensuel > 0
    ? ((sousTotalMensuel - totalMensuel) / sousTotalMensuel) * 100
    : 0;

  // Avertissement pilote sans établissement marqué
  const piloteSansEtab = rabaisState.pilote && !etablissements.some(e => e.estPilote);

  // ---- Label unité ----

  const labelUnite = (s: Segment | null): string => {
    if (!s) return 'unités';
    const map: Record<string, string> = {
      lit: 'lits',
      enfant: 'enfants',
      'repas planifié': 'repas planifiés',
      place: 'places',
    };
    return map[s.unite] || s.unite;
  };

  // ---- Palier restaurant ----

  const trouverPalier = (nbUnites: number): Palier | null => {
    return paliersSegment.find(p =>
      nbUnites >= p.capacite_min &&
      (p.capacite_max === null || nbUnites <= p.capacite_max)
    ) || null;
  };

  // ---- Sauvegarde ----

  const handleSauvegarder = async () => {
    if (!nomClient.trim()) {
      toast({ title: 'Erreur', description: 'Le nom du client est requis.', variant: 'destructive' });
      return;
    }
    if (!segmentId) {
      toast({ title: 'Erreur', description: 'Veuillez sélectionner un segment.', variant: 'destructive' });
      return;
    }
    if (etablissements.some(e => e.nombreUnites < 1)) {
      toast({ title: 'Erreur', description: 'Le nombre d\'unités doit être d\'au moins 1 pour chaque établissement.', variant: 'destructive' });
      return;
    }

    setSauvegarde(true);
    try {
      const numero = await genererNumero();
      const dateExpiration = new Date();
      dateExpiration.setDate(dateExpiration.getDate() + validiteJours);

      // Collecter les IDs des rabais appliqués
      const rabaisIds: string[] = [];
      if (rabaisState.dropdownId) rabaisIds.push(rabaisState.dropdownId);
      if (rabaisState.engagement && rabaisEngagement) rabaisIds.push(rabaisEngagement.id);
      if (rabaisState.pilote && rabaisPilote) rabaisIds.push(rabaisPilote.id);

      await sauvegarderSoumission({
        numero,
        nomClient: nomClient.trim(),
        totalMensuel,
        totalAnnuel,
        fraisIntegration,
        coutTotalAn1,
        notesInternes: notes,
        notesPersonnalisees: notesPerso.trim(),
        etablissements: calculs.map(c => ({
          segmentId,
          nomEtablissement: c.etab.nom,
          nombreUnites: c.etab.nombreUnites,
          estPilote: c.etab.estPilote,
          prixBrut: c.prixBrut,
          prixFinal: c.prixFinal,
        })),
        rabaisIds,
        dateExpiration,
      });

      toast({
        title: '✓ Soumission sauvegardée',
        description: `Numéro ${numero} créé avec succès.`,
      });
      navigate('/soumissions');
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder la soumission.',
        variant: 'destructive',
      });
    } finally {
      setSauvegarde(false);
    }
  };

  // Raccourci Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSauvegarder();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nomClient, segmentId, etablissements, rabaisState, notes, notesPerso]);

  // ============================================================
  // Rendu
  // ============================================================

  if (loadingSegments) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="flex gap-0 h-full">
      {/* ====== FORMULAIRE GAUCHE ====== */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nouveau calculateur</h1>
          <p className="text-sm text-muted-foreground mt-1">Préparez une soumission en temps réel</p>
        </div>

        {/* Section 1 — Segment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">1. Segment de clientèle</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={segmentId} onValueChange={setSegmentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisissez un segment…" />
              </SelectTrigger>
              <SelectContent>
                {segments.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {segment && (
              <div className="mt-3 p-3 rounded-lg text-sm"
                style={{ background: 'hsl(var(--primary) / 0.06)', borderLeft: '3px solid hsl(var(--primary))' }}>
                {segment.type_tarification === 'lineaire' ? (
                  <span>
                    <strong>{formatMontant(Number(segment.prix_unitaire))}</strong> / {segment.unite}
                    {' — '}minimum {formatMontant(Number(segment.minimum_mensuel))} / mois
                  </span>
                ) : (
                  <span>Tarification par paliers selon le nombre de places</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2 — Informations client */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2. Informations client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nom-client">Nom du client <span className="text-destructive">*</span></Label>
              <Input
                id="nom-client"
                placeholder="Ex. : Résidence Les Érables"
                value={nomClient}
                onChange={e => setNomClient(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3 — Établissements */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">3. Établissements</CardTitle>
            <Button size="sm" variant="outline" onClick={ajouterEtablissement}>
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {etablissements.map((etab, idx) => {
              const palier = segment?.type_tarification === 'paliers'
                ? trouverPalier(etab.nombreUnites)
                : null;

              return (
                <div key={etab.id} className="p-4 rounded-lg border space-y-3"
                  style={{ background: 'hsl(var(--muted) / 0.3)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Établissement {idx + 1}</span>
                    </div>
                    {etablissements.length > 1 && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                        onClick={() => supprimerEtablissement(etab.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nom de l'établissement</Label>
                      <Input
                        placeholder="Optionnel"
                        value={etab.nom}
                        onChange={e => majEtablissement(etab.id, 'nom', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs capitalize">
                        Nombre de {segment ? labelUnite(segment) : 'unités'} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="0"
                        value={etab.nombreUnites || ''}
                        onChange={e => majEtablissement(etab.id, 'nombreUnites', parseInt(e.target.value) || 0)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Afficher le palier pour les restaurants */}
                  {palier && etab.nombreUnites > 0 && (
                    <div className="text-xs p-2 rounded"
                      style={{ background: 'hsl(var(--accent) / 0.1)', color: 'hsl(var(--accent))' }}>
                      Palier : {palier.capacite_min}–{palier.capacite_max ?? '∞'} places → {formatMontant(Number(palier.tarif_mensuel))}/mois
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Switch
                      id={`pilote-${etab.id}`}
                      checked={etab.estPilote}
                      onCheckedChange={() => togglePilote(etab.id)}
                      disabled={!rabaisState.pilote}
                    />
                    <Label htmlFor={`pilote-${etab.id}`} className="text-xs cursor-pointer">
                      Établissement pilote
                      {!rabaisState.pilote && (
                        <span className="text-muted-foreground ml-1">(activez le rabais pilote)</span>
                      )}
                    </Label>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Section 4 — Rabais */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">4. Rabais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dropdown exclusif */}
            <div className="space-y-2">
              <Label className="text-sm">Rabais volumique</Label>
              <Select
                value={rabaisState.dropdownId || 'aucun'}
                onValueChange={v => setRabaisState(prev => ({
                  ...prev,
                  dropdownId: v === 'aucun' ? null : v,
                }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aucun">Aucun</SelectItem>
                  {rabaisDropdown.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nom} ({formatPourcentage(Number(r.pourcentage))})
                      {r.condition_description && ` — ${r.condition_description}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              {rabaisEngagement && (
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{rabaisEngagement.nom}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPourcentage(Number(rabaisEngagement.pourcentage))} de réduction supplémentaire
                    </p>
                  </div>
                  <Switch
                    checked={rabaisState.engagement}
                    onCheckedChange={v => setRabaisState(prev => ({ ...prev, engagement: v }))}
                  />
                </div>
              )}

              {rabaisPilote && (
                <div className="space-y-2">
                  <div className={`flex items-center justify-between p-3 rounded-lg border ${piloteSansEtab ? 'border-warning' : ''}`}>
                    <div>
                      <p className="text-sm font-medium">{rabaisPilote.nom}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPourcentage(Number(rabaisPilote.pourcentage))} sur l'établissement pilote
                        {rabaisPilote.condition_description && ` — ${rabaisPilote.condition_description}`}
                      </p>
                    </div>
                    <Switch
                      checked={rabaisState.pilote}
                      onCheckedChange={v => setRabaisState(prev => ({ ...prev, pilote: v }))}
                    />
                  </div>
                  {piloteSansEtab && (
                    <div className="flex items-center gap-2 text-xs p-2 rounded"
                      style={{ background: 'hsl(38 92% 50% / 0.1)', color: 'hsl(38 92% 40%)' }}>
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      Marquez un établissement comme pilote dans la section ci-dessus.
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes internes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notes internes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Notes internes (non visibles sur le PDF)…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Section ROI */}
        <Card>
          <CardHeader
            className="pb-3 cursor-pointer select-none"
            onClick={() => setRoiOuvert(v => !v)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
                <CardTitle className="text-base">5. Calculateur ROI (optionnel)</CardTitle>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${roiOuvert ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
          {roiOuvert && (
            <CardContent className="space-y-5">
              {/* Sélection modules */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Modules sélectionnés</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {modulesRoi.map(m => (
                    <label key={m.id} className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/30">
                      <Checkbox
                        checked={modulesSelectionnes.has(m.id)}
                        onCheckedChange={checked => {
                          setModulesSelectionnes(prev => {
                            const n = new Set(prev);
                            if (checked) n.add(m.id); else n.delete(m.id);
                            return n;
                          });
                        }}
                      />
                      <span className="text-sm">{m.nom}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Données d'entrée */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Budget alimentaire annuel ($)', field: 'budgetAlimentaire' },
                  { label: 'Coûts approvisionnement ($)', field: 'coutsApprovisionnement' },
                  { label: 'Nb employés cuisine', field: 'nbEmployesCuisine' },
                  { label: 'Nb responsables commandes', field: 'nbResponsablesCommandes' },
                  { label: 'Nb employés total', field: 'nbEmployesTotal' },
                  { label: 'Taux horaire cuisine ($/h)', field: 'tauxHoraireCuisine' },
                  { label: 'Taux horaire admin ($/h)', field: 'tauxHoraireAdmin' },
                  { label: 'Taux horaire compta ($/h)', field: 'tauxHoraireCompta' },
                  { label: 'Coût gestion déchets annuel ($)', field: 'coutGestionDechets' },
                ].map(({ label, field }) => (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={donneesROI[field as keyof DonneesROI] || ''}
                      onChange={e => setDonneesROI(prev => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }))}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>

              {/* Résultats ROI */}
              {modulesSelectionnes.size > 0 && (() => {
                const coutOcto = Number(config.cout_octogone_mensuel_par_etablissement || 299);
                const roi = calculerROI(
                  { ...donneesROI, nbEtablissements: etablissements.length },
                  modulesRoi,
                  paramsRoi,
                  modulesSelectionnes,
                  coutOcto,
                );
                const modulesAvecEco = roi.modules.filter(m => m.selectionne && m.economieAnnuelle > 0);
                const chartData = [
                  { name: 'Coût Octogone', valeur: roi.coutOctogoneAnnuel, fill: 'hsl(var(--muted-foreground))' },
                  ...modulesAvecEco.map(m => ({ name: m.nom.substring(0, 18), valeur: m.economieAnnuelle, fill: 'hsl(var(--primary))' })),
                ];
                return (
                  <div className="space-y-4 pt-2 border-t">
                    {/* Cards métriques */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'Économies totales', value: formatMontant(roi.economiesTotales), color: 'hsl(var(--success))' },
                        { label: 'Coût Octogone/an', value: formatMontant(roi.coutOctogoneAnnuel), color: 'hsl(var(--muted-foreground))' },
                        { label: 'Bénéfice net', value: formatMontant(roi.beneficeNet), color: roi.beneficeNet >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))' },
                        { label: 'ROI', value: `${roi.roiMultiplicateur}×`, color: 'hsl(var(--primary))' },
                        { label: 'Retour en', value: `${roi.periodeRetourMois} mois`, color: 'hsl(var(--foreground))' },
                      ].map(m => (
                        <div key={m.label} className="p-3 rounded-lg text-center" style={{ background: 'hsl(var(--muted) / 0.5)' }}>
                          <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                          <p className="text-base font-bold" style={{ color: m.color }}>{m.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Tableau par module */}
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/40 border-b">
                            <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Module</th>
                            <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Mensuel</th>
                            <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Annuel</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {roi.modules.filter(m => m.selectionne).map(m => (
                            <tr key={m.moduleId}>
                              <td className="px-3 py-2">{m.nom}</td>
                              <td className="px-3 py-2 text-right text-muted-foreground">{formatMontant(m.economieMensuelle)}</td>
                              <td className="px-3 py-2 text-right font-semibold" style={{ color: 'hsl(var(--success))' }}>{formatMontant(m.economieAnnuelle)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Graphique */}
                    {chartData.length > 1 && (
                      <div style={{ height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 40 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(v: number) => formatMontant(v)} />
                            <Bar dataKey="valeur" radius={[0, 4, 4, 0]}>
                              {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          )}
        </Card>

        {/* Section 6 — Notes et conditions spéciales */}
        <Card>
          <Collapsible open={!!notesPerso.trim() || undefined} defaultOpen={false}>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer select-none">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">6. Notes et conditions spéciales</CardTitle>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    {notesPerso.trim() && (
                      <span className="text-xs font-normal px-2 py-0.5 rounded-full"
                        style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}>
                        {notesPerso.trim().split('\n').filter(Boolean).length} ligne{notesPerso.trim().split('\n').filter(Boolean).length > 1 ? 's' : ''}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-2 pt-0">
                <Label htmlFor="notes-perso" className="text-sm">
                  Notes personnalisées{' '}
                  <span className="text-muted-foreground font-normal">(apparaîtront sur la soumission)</span>
                </Label>
                <Textarea
                  id="notes-perso"
                  placeholder="Ex. : Le rabais volume de 10 % s'applique si les deux établissements participent au projet pilote."
                  value={notesPerso}
                  onChange={e => setNotesPerso(e.target.value)}
                  className="min-h-[96px] resize-y"
                />
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Boutons d'action */}
        <div className="flex gap-3 pb-6">
          <Button
            onClick={handleSauvegarder}
            disabled={sauvegarde}
            className="flex-1">
            {sauvegarde ? (
              <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />Sauvegarde…</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Sauvegarder comme brouillon</>
            )}
          </Button>
          <Button variant="outline" disabled className="gap-2">
            <FileDown className="h-4 w-4" />
            Générer le PDF
          </Button>
        </div>
      </div>

      {/* ====== PANNEAU RÉCAPITULATIF STICKY ====== */}
      <div className="hidden xl:flex flex-col w-80 flex-shrink-0 border-l bg-card overflow-auto"
        style={{ position: 'sticky', top: 0, height: '100vh' }}>
        <div className="p-5 border-b">
          <h2 className="font-bold text-base">Récapitulatif</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Mis à jour en temps réel</p>
        </div>

        <div className="flex-1 p-5 space-y-4 overflow-auto">
          {/* Par établissement */}
          {calculs.length > 0 && segment && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Établissements</p>
              {calculs.map((c, i) => (
                <div key={c.etab.id} className="space-y-0.5">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-medium truncate max-w-[140px]">
                      {c.etab.nom || `Étab. ${i + 1}`}
                      {c.etab.estPilote && (
                        <span className="ml-1 text-xs px-1 py-0.5 rounded text-white"
                          style={{ background: 'hsl(var(--accent))' }}>pilote</span>
                      )}
                    </span>
                    <span className="text-xs text-right text-muted-foreground">{formatMontant(c.prixFinal)}</span>
                  </div>
                  {c.prixBrut !== c.prixFinal && (
                    <div className="text-right">
                      <span className="text-xs line-through text-muted-foreground">{formatMontant(c.prixBrut)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sous-total (brut)</span>
              <span>{formatMontant(sousTotalMensuel)}</span>
            </div>

            {/* Détail des rabais */}
            {rabaisState.dropdownId && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {tousLesRabais.find(r => r.id === rabaisState.dropdownId)?.nom}
                </span>
                <span style={{ color: 'hsl(var(--success))' }}>
                  −{formatPourcentage(Number(tousLesRabais.find(r => r.id === rabaisState.dropdownId)?.pourcentage || 0))}
                </span>
              </div>
            )}
            {rabaisState.engagement && rabaisEngagement && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{rabaisEngagement.nom}</span>
                <span style={{ color: 'hsl(var(--success))' }}>−{formatPourcentage(Number(rabaisEngagement.pourcentage))}</span>
              </div>
            )}
            {rabaisState.pilote && rabaisPilote && !piloteSansEtab && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{rabaisPilote.nom}</span>
                <span style={{ color: 'hsl(var(--success))' }}>−{formatPourcentage(Number(rabaisPilote.pourcentage))} (sur pilote)</span>
              </div>
            )}

            <div className="border-t pt-2">
              <div className="flex justify-between font-semibold text-sm">
                <span>Total mensuel</span>
                <span style={{ color: 'hsl(var(--primary))' }}>{formatMontant(totalMensuel)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Total annuel</span>
                <span>{formatMontant(totalAnnuel)}</span>
              </div>
            </div>

            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Frais d'intégration ({etablissements.length} étab.)</span>
                <span>{formatMontant(fraisIntegration)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1 border-t">
                <span>Coût total 1re année</span>
                <span style={{ color: 'hsl(var(--primary))' }}>{formatMontant(coutTotalAn1)}</span>
              </div>
            </div>
          </div>

          {pctRabaisTotal > 0 && (
            <div className="text-center p-3 rounded-lg text-sm font-medium"
              style={{ background: 'hsl(var(--success) / 0.1)', color: 'hsl(var(--success))' }}>
              Économie totale : {formatPourcentage(pctRabaisTotal)}
            </div>
          )}
        </div>
      </div>

      {/* Récap mobile — bandeau bas */}
      <div className="fixed bottom-0 left-0 right-0 xl:hidden border-t bg-card p-3 flex items-center justify-between shadow-lg z-10">
        <div>
          <p className="text-xs text-muted-foreground">Total mensuel</p>
          <p className="font-bold text-sm" style={{ color: 'hsl(var(--primary))' }}>{formatMontant(totalMensuel)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">An 1</p>
          <p className="font-bold text-sm">{formatMontant(coutTotalAn1)}</p>
        </div>
        <Button size="sm" onClick={handleSauvegarder} disabled={sauvegarde}>
          <Save className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Calculateur;
