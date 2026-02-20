import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { formatMontant, formatDate } from '@/lib/format';
import {
  fetchSoumissions,
  changerStatut,
  supprimerSoumission,
  dupliquerSoumission,
  exporterCSV,
  Soumission,
} from '@/lib/supabase-queries';
import {
  Plus,
  Search,
  FileDown,
  MoreHorizontal,
  Eye,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Edit,
} from 'lucide-react';

// ---- Badge statut ----

const STATUTS = {
  brouillon: { label: 'Brouillon', color: 'bg-muted text-muted-foreground', icon: Edit },
  envoyee: { label: 'Envoyée', color: 'bg-primary/15 text-primary', icon: Clock },
  acceptee: { label: 'Acceptée', color: 'bg-success/15 text-success', icon: CheckCircle2 },
  expiree: { label: 'Expirée', color: 'bg-destructive/15 text-destructive', icon: XCircle },
} as const;

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

const STATUT_OPTIONS = [
  { value: 'tous', label: 'Tous les statuts' },
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'envoyee', label: 'Envoyée' },
  { value: 'acceptee', label: 'Acceptée' },
  { value: 'expiree', label: 'Expirée' },
];

const PAR_PAGE = 20;

const Soumissions = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [recherche, setRecherche] = useState('');
  const [statut, setStatut] = useState('tous');
  const [page, setPage] = useState(1);
  const [suppressionId, setSuppressionId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['soumissions', recherche, statut, page],
    queryFn: () => fetchSoumissions({ recherche, statut, page, parPage: PAR_PAGE }),
  });

  const soumissions = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAR_PAGE);

  const handleSearch = (v: string) => {
    setRecherche(v);
    setPage(1);
  };

  const handleStatut = (v: string) => {
    setStatut(v);
    setPage(1);
  };

  const handleChangerStatut = async (id: string, nouveauStatut: string) => {
    setLoading(id);
    try {
      await changerStatut(id, nouveauStatut);
      await refetch();
      toast({ title: 'Statut mis à jour' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de modifier le statut.', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleDupliquer = async (id: string) => {
    setLoading(id);
    try {
      const nouvelId = await dupliquerSoumission(id);
      await refetch();
      toast({ title: 'Soumission dupliquée', description: 'La copie a été créée en brouillon.' });
      navigate(`/soumissions/${nouvelId}`);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de dupliquer.', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleSupprimer = async () => {
    if (!suppressionId) return;
    setLoading(suppressionId);
    try {
      await supprimerSoumission(suppressionId);
      setSuppressionId(null);
      await refetch();
      toast({ title: 'Soumission supprimée' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer.', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleExportCSV = () => {
    exporterCSV(soumissions);
    toast({ title: 'Export CSV téléchargé' });
  };

  return (
    <div className="p-6 space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Soumissions</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} soumission{total !== 1 ? 's' : ''} au total</p>
        </div>
        <Link to="/calculateur">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle soumission
          </Button>
        </Link>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par client ou numéro…"
            value={recherche}
            onChange={e => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statut} onValueChange={handleStatut}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUT_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleExportCSV} className="gap-2 shrink-0">
          <FileDown className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Tableau */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : soumissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'hsl(var(--muted))' }}>
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Aucune soumission</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm">
            {recherche || statut !== 'tous'
              ? 'Aucun résultat ne correspond à votre recherche.'
              : 'Créez votre première soumission depuis le calculateur.'}
          </p>
          {!recherche && statut === 'tous' && (
            <Link to="/calculateur">
              <Button>Créer une soumission</Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Numéro</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Client</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">Total mensuel</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Total annuel</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Statut</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {soumissions.map((s: Soumission) => (
                  <tr
                    key={s.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/soumissions/${s.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-medium">{s.numero}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-sm">{s.nom_client}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-sm">
                      {formatMontant(Number(s.total_mensuel || 0))}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-sm">
                      {formatMontant(Number(s.total_annuel || 0))}
                    </td>
                    <td className="px-4 py-3">
                      <BadgeStatut statut={s.statut} />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
                      {s.created_at ? formatDate(s.created_at) : '—'}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={loading === s.id}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/soumissions/${s.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />Voir le détail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDupliquer(s.id)}>
                            <Copy className="h-4 w-4 mr-2" />Dupliquer
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {Object.entries(STATUTS).map(([key, val]) => (
                            key !== s.statut && (
                              <DropdownMenuItem key={key} onClick={() => handleChangerStatut(s.id, key)}>
                                → {val.label}
                              </DropdownMenuItem>
                            )
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setSuppressionId(s.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} sur {totalPages} — {total} résultats
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialogue suppression */}
      <AlertDialog open={!!suppressionId} onOpenChange={() => setSuppressionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la soumission ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La soumission et toutes ses données seront définitivement supprimées.
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

export default Soumissions;
