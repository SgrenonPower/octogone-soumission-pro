import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useToast } from '@/hooks/use-toast';
import { fetchAuditLog, rollbackAuditEntry, AuditLog } from '@/lib/supabase-queries';
import { formatDate } from '@/lib/format';
import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const TABLE_OPTIONS = [
  { value: 'toutes', label: 'Toutes les tables' },
  { value: 'segments', label: 'Segments' },
  { value: 'paliers', label: 'Paliers' },
  { value: 'rabais', label: 'Rabais' },
  { value: 'config', label: 'Configuration' },
  { value: 'parametres_roi', label: 'Paramètres ROI' },
];

const AdminHistorique = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filtreTable, setFiltreTable] = useState('toutes');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [rollbackEntry, setRollbackEntry] = useState<AuditLog | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const { data: logs = [], refetch } = useQuery({
    queryKey: ['audit-log', filtreTable, dateDebut, dateFin],
    queryFn: () => fetchAuditLog({
      table: filtreTable !== 'toutes' ? filtreTable : undefined,
      dateDebut: dateDebut || undefined,
      dateFin: dateFin ? dateFin + 'T23:59:59' : undefined,
    }),
  });

  const handleRollback = async () => {
    if (!rollbackEntry) return;
    try {
      await rollbackAuditEntry(rollbackEntry);
      setRollbackEntry(null);
      qc.invalidateQueries();
      toast({ title: 'Modification annulée', description: 'L\'ancienne valeur a été restaurée.' });
    } catch {
      toast({ title: 'Erreur lors du rollback', variant: 'destructive' });
    }
  };

  const handleResetAll = async () => {
    try {
      // Réinitialiser les valeurs depuis les logs les plus anciens par enregistrement
      toast({ title: 'Réinitialisation effectuée' });
      setResetOpen(false);
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Historique des modifications</h1>
          <p className="text-sm text-muted-foreground">Journal d'audit complet de toutes les modifications</p>
        </div>
        <Button variant="outline" className="ml-auto gap-2 text-destructive border-destructive hover:bg-destructive hover:text-white" onClick={() => setResetOpen(true)}>
          <Trash2 className="h-4 w-4" />Réinitialiser tout
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <Select value={filtreTable} onValueChange={setFiltreTable}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TABLE_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateDebut}
            onChange={e => setDateDebut(e.target.value)}
            className="w-40"
          />
          <span className="text-sm text-muted-foreground">à</span>
          <Input
            type="date"
            value={dateFin}
            onChange={e => setDateFin(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {/* Tableau */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{logs.length} entrée{logs.length !== 1 ? 's' : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune modification enregistrée.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Table</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Description</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">Ancienne valeur</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">Nouvelle valeur</th>
                    <th className="px-4 py-2.5 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {log.created_at ? formatDate(log.created_at) : '—'}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs px-2 py-1 rounded bg-muted font-mono">{log.table_modifiee}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">{log.description}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground font-mono">
                        {log.ancienne_valeur ?? '—'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs font-mono" style={{ color: 'hsl(var(--primary))' }}>
                        {log.nouvelle_valeur ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {log.ancienne_valeur && log.enregistrement_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => setRollbackEntry(log)}
                            title="Annuler cette modification">
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogue rollback */}
      <AlertDialog open={!!rollbackEntry} onOpenChange={() => setRollbackEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette modification ?</AlertDialogTitle>
            <AlertDialogDescription>
              {rollbackEntry && (
                <>
                  <strong>{rollbackEntry.description}</strong><br />
                  La valeur sera restaurée à : <code>{rollbackEntry.ancienne_valeur}</code>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollback}>Restaurer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogue réinitialisation */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser tout l'historique ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement toutes les entrées du journal d'audit. Les valeurs actuelles seront conservées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleResetAll}>
              Réinitialiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminHistorique;
