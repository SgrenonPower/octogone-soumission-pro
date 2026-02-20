import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatMontant, formatDate } from '@/lib/format';
import {
  fetchSoumissionById,
  fetchConfig,
  changerStatut,
  supprimerSoumission,
  dupliquerSoumission,
} from '@/lib/supabase-queries';
import {
  ArrowLeft,
  Copy,
  Trash2,
  Presentation,
  FileDown,
  CheckCircle2,
  Clock,
  XCircle,
  Edit,
  Building2,
  TrendingUp,
} from 'lucide-react';
import SoumissionPDF, { triggerPrint } from '@/components/pdf/SoumissionPDF';

const STATUTS = {
  brouillon: { label: 'Brouillon', color: 'bg-muted text-muted-foreground', icon: Edit },
  envoyee: { label: 'Envoyée', color: 'bg-blue-100 text-blue-700', icon: Clock },
  acceptee: { label: 'Acceptée', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  expiree: { label: 'Expirée', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const BadgeStatut = ({ statut }: { statut: string }) => {
  const cfg = STATUTS[statut as keyof typeof STATUTS] || STATUTS.brouillon;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
};

const SoumissionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [suppressionOpen, setSuppressionOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['soumission', id],
    queryFn: () => fetchSoumissionById(id!),
    enabled: !!id,
  });

  const { data: configData = {} } = useQuery({
    queryKey: ['config'],
    queryFn: fetchConfig,
  });

  const handleChangerStatut = async (nouveauStatut: string) => {
    if (!id) return;
    try {
      await changerStatut(id, nouveauStatut);
      toast({ title: 'Statut mis à jour' });
      navigate('/soumissions');
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleDupliquer = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const nouvelId = await dupliquerSoumission(id);
      toast({ title: 'Soumission dupliquée' });
      navigate(`/soumissions/${nouvelId}`);
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSupprimer = async () => {
    if (!id) return;
    setLoading(true);
    try {
      await supprimerSoumission(id);
      toast({ title: 'Soumission supprimée' });
      navigate('/soumissions');
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <p className="text-destructive">Soumission introuvable.</p>
        <Link to="/soumissions"><Button variant="outline" className="mt-4">Retour</Button></Link>
      </div>
    );
  }

  const { soumission, etablissements, rabais, roi, options } = data;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/soumissions')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold font-mono">{soumission.numero}</h1>
          <p className="text-sm text-muted-foreground">{soumission.nom_client}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 items-center">
        <BadgeStatut statut={soumission.statut} />

        <Select onValueChange={handleChangerStatut} defaultValue={soumission.statut}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="Changer le statut" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUTS).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={handleDupliquer} disabled={loading} className="gap-2">
          <Copy className="h-4 w-4" />Dupliquer
        </Button>
        <Link to={`/soumissions/${id}/presentation`}>
          <Button variant="outline" size="sm" className="gap-2">
            <Presentation className="h-4 w-4" />Présentation
          </Button>
        </Link>
        <Button size="sm" onClick={triggerPrint} className="gap-2">
          <FileDown className="h-4 w-4" />Générer le PDF
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive ml-auto"
          onClick={() => setSuppressionOpen(true)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Infos générales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />Informations générales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Client</p>
              <p className="font-medium">{soumission.nom_client}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Date de création</p>
              <p className="font-medium">{soumission.created_at ? formatDate(soumission.created_at) : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Date d'expiration</p>
              <p className="font-medium">{soumission.date_expiration ? formatDate(soumission.date_expiration) : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Version</p>
              <p className="font-medium">v{soumission.version || 1}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Établissements */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Établissements ({etablissements.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Établissement</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Unités</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prix brut</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prix final</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {etablissements.map((e, i) => (
                  <tr key={e.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <span className="font-medium">{e.nom_etablissement || `Établissement ${i + 1}`}</span>
                      {e.est_pilote && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded text-white"
                          style={{ background: 'hsl(var(--accent))' }}>pilote</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{e.nombre_unites}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatMontant(Number(e.prix_brut || 0))}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatMontant(Number(e.prix_final || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Rabais */}
      {rabais.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Rabais appliqués</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {rabais.map((r: any) => (
                <span key={r.id} className="px-3 py-1 rounded-full text-xs font-medium bg-muted">
                  {r.nom} — {r.pourcentage}%
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Options supplémentaires */}
      {options && options.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Options supplémentaires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {options.map((opt: any) => (
                <div key={opt.id} className="flex justify-between text-sm py-2.5 border-b last:border-0">
                  <span className="font-medium">{opt.nom}</span>
                  <span className="text-muted-foreground">{opt.prix_description || 'Sur demande'}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Totaux */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Récapitulatif financier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total mensuel</span>
              <span className="font-semibold">{formatMontant(Number(soumission.total_mensuel || 0))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total annuel</span>
              <span>{formatMontant(Number(soumission.total_annuel || 0))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frais d'intégration</span>
              <span>{formatMontant(Number(soumission.frais_integration || 0))}</span>
            </div>
            <div className="flex justify-between pt-2 border-t font-bold">
              <span>Coût total 1re année</span>
              <span style={{ color: 'hsl(var(--primary))' }}>{formatMontant(Number(soumission.cout_total_an1 || 0))}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ROI */}
      {roi.soumission_roi && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />Analyse ROI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="p-3 rounded-lg" style={{ background: 'hsl(var(--muted))' }}>
                <p className="text-xs text-muted-foreground">Économies totales</p>
                <p className="text-lg font-bold" style={{ color: 'hsl(var(--success))' }}>
                  {formatMontant(Number(roi.soumission_roi.economies_totales || 0))}
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'hsl(var(--muted))' }}>
                <p className="text-xs text-muted-foreground">ROI</p>
                <p className="text-lg font-bold" style={{ color: 'hsl(var(--primary))' }}>
                  {roi.soumission_roi.roi_multiplicateur}x
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'hsl(var(--muted))' }}>
                <p className="text-xs text-muted-foreground">Bénéfice net</p>
                <p className="text-lg font-bold">
                  {formatMontant(Number((roi.soumission_roi.economies_totales || 0) - (roi.soumission_roi.cout_octogone_annuel || 0)))}
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'hsl(var(--muted))' }}>
                <p className="text-xs text-muted-foreground">Retour en</p>
                <p className="text-lg font-bold">{roi.soumission_roi.periode_retour_mois} mois</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes internes */}
      {soumission.notes_internes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notes internes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{soumission.notes_internes}</p>
          </CardContent>
        </Card>
      )}

      {/* Composant PDF (caché) */}
      {data && (
        <SoumissionPDF
          soumission={soumission}
          etablissements={etablissements}
          rabais={rabais}
          roi={roi.soumission_roi}
          roiModules={roi.modules}
          options={options || []}
          config={configData}
        />
      )}

      {/* Dialogue suppression */}
      <AlertDialog open={suppressionOpen} onOpenChange={setSuppressionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette soumission ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La soumission {soumission.numero} sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSupprimer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SoumissionDetail;
