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
  envoyee: { label: 'Envoyée', color: 'bg-primary/15 text-primary', icon: Clock },
  acceptee: { label: 'Acceptée', color: 'bg-success/15 text-success', icon: CheckCircle2 },
  expiree: { label: 'Expirée', color: 'bg-destructive/15 text-destructive', icon: XCircle },
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

      {/* ── Synthèse ROI (si activé) — argument de vente pour le vendeur ── */}
      {roi.soumission_roi && roi.modules.filter((m: any) => m.selectionne).length > 0 && (() => {
        const totalAnn = Number(soumission.total_annuel || 0);
        const econTotales = Number(roi.soumission_roi!.economies_totales || 0);
        const beneficeNet = econTotales - totalAnn;
        const positif = beneficeNet >= 0;
        return (
          <div className="rounded-xl p-4 border-2 text-sm"
            style={{
              background: positif ? 'rgba(16,185,129,0.07)' : 'rgba(245,158,11,0.07)',
              borderColor: positif ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)',
            }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4" style={{ color: positif ? '#10b981' : '#f59e0b' }} />
              <span className="font-semibold text-foreground">Argument ROI pour ce client</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Économies générées', value: formatMontant(econTotales) + '/an', color: '#10b981' },
                { label: 'Investissement', value: formatMontant(Number(soumission.total_mensuel || 0)) + '/mois', color: 'hsl(var(--foreground))' },
                { label: 'Bénéfice net', value: formatMontant(Math.abs(beneficeNet)) + '/an', color: positif ? '#10b981' : '#f59e0b' },
                { label: 'ROI', value: `${roi.soumission_roi!.roi_multiplicateur}× en ${roi.soumission_roi!.periode_retour_mois} mois`, color: 'hsl(var(--primary))' },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-lg bg-background/50 border" style={{ borderColor: 'hsl(var(--border))' }}>
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <p className="font-bold text-sm" style={{ color: item.color }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Établissements */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Établissements ({etablissements.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const totalBrutMens = etablissements.reduce((s, e) => s + Number(e.prix_brut || 0), 0);
            const totalMens = Number(soumission.total_mensuel || 0);
            const aDesRabais = totalBrutMens - totalMens > 0.01;
            return (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Établissement</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Unités</th>
                      {aDesRabais && (
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prix régulier</th>
                      )}
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Votre prix</th>
                      {aDesRabais && (
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Économie</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {etablissements.map((e, i) => {
                      const brut = Number(e.prix_brut || 0);
                      const final = Number(e.prix_final || 0);
                      const eco = brut - final;
                      const aRabaisLigne = eco > 0.01;
                      return (
                        <tr key={e.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <span className="font-medium">{e.nom_etablissement || `Établissement ${i + 1}`}</span>
                            {e.est_pilote && (
                              <span className="ml-2 text-xs px-1.5 py-0.5 rounded text-white"
                                style={{ background: 'hsl(var(--accent))' }}>pilote</span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{e.nombre_unites}</td>
                          {aDesRabais && (
                            <td className="px-4 py-3 text-right text-muted-foreground/60 text-xs"
                              style={{ textDecoration: aRabaisLigne ? 'line-through' : 'none' }}>
                              {formatMontant(brut)}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right font-semibold" style={{ color: 'hsl(var(--primary))' }}>
                            {formatMontant(final)}
                          </td>
                          {aDesRabais && (
                            <td className="px-4 py-3 text-right text-xs font-semibold hidden sm:table-cell"
                              style={{ color: aRabaisLigne ? '#10b981' : 'hsl(var(--muted-foreground))' }}>
                              {aRabaisLigne ? `−\u00a0${formatMontant(eco)}` : '—'}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
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

      {/* ROI — détail par module avec vrais noms */}
      {roi.soumission_roi && roi.modules.filter((m: any) => m.selectionne).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />Détail ROI par module
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Module</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Économie/mois</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Économie/an</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {roi.modules.filter((m: any) => m.selectionne).map((m: any, i: number) => (
                    <tr key={m.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{m.modules_roi?.nom || `Module ${i + 1}`}</td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: '#10b981' }}>
                        {formatMontant(Number(m.economie_mensuelle || 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold hidden sm:table-cell" style={{ color: '#10b981' }}>
                        {formatMontant(Number(m.economie_annuelle || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
