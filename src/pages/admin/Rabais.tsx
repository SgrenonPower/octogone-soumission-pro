import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { fetchAllRabais, updateRabais, insertRabais, deleteRabais, logAudit, Rabais } from '@/lib/supabase-queries';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminRabais = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Record<string, Partial<Rabais>>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nouveau, setNouveau] = useState({ nom: '', pourcentage: '', condition_description: '' });

  const { data: rabais = [] } = useQuery({ queryKey: ['rabais-all'], queryFn: fetchAllRabais });

  const setField = (id: string, field: string, value: any) => {
    setEditing(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSave = async (r: Rabais) => {
    const changes = editing[r.id];
    if (!changes) return;
    try {
      const ancien = r.pourcentage.toString();
      await updateRabais(r.id, changes);
      await logAudit({
        tableModifiee: 'rabais',
        enregistrementId: r.id,
        champ: 'pourcentage',
        ancienneValeur: ancien,
        nouvelleValeur: changes.pourcentage?.toString(),
        description: `Mise à jour rabais ${r.nom}`,
      });
      setEditing(prev => { const n = { ...prev }; delete n[r.id]; return n; });
      qc.invalidateQueries({ queryKey: ['rabais-all'] });
      qc.invalidateQueries({ queryKey: ['rabais'] });
      toast({ title: 'Rabais mis à jour' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleToggleActif = async (r: Rabais, actif: boolean) => {
    try {
      await updateRabais(r.id, { actif });
      qc.invalidateQueries({ queryKey: ['rabais-all'] });
      qc.invalidateQueries({ queryKey: ['rabais'] });
      toast({ title: actif ? 'Rabais activé' : 'Rabais désactivé' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRabais(id);
      qc.invalidateQueries({ queryKey: ['rabais-all'] });
      toast({ title: 'Rabais supprimé' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleAjouter = async () => {
    if (!nouveau.nom || !nouveau.pourcentage) return;
    try {
      await insertRabais({
        nom: nouveau.nom,
        pourcentage: parseFloat(nouveau.pourcentage),
        condition_description: nouveau.condition_description || null,
        slug: nouveau.nom.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
        type_ui: 'toggle',
        actif: true,
        ordre: rabais.length + 1,
        groupe_exclusion: null,
      });
      qc.invalidateQueries({ queryKey: ['rabais-all'] });
      setDialogOpen(false);
      setNouveau({ nom: '', pourcentage: '', condition_description: '' });
      toast({ title: 'Rabais ajouté' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Rabais</h1>
          <p className="text-sm text-muted-foreground">Gestion des rabais et promotions</p>
        </div>
        <Button className="ml-auto gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />Ajouter un rabais
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rabais configurés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rabais.map(r => (
              <div key={r.id} className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{r.nom}</p>
                    <p className="text-xs text-muted-foreground">{r.condition_description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={editing[r.id]?.actif ?? (r.actif ?? true)}
                      onCheckedChange={v => handleToggleActif(r, v)}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Pourcentage (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editing[r.id]?.pourcentage ?? r.pourcentage}
                      onChange={e => setField(r.id, 'pourcentage', parseFloat(e.target.value))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Description condition</label>
                    <Input
                      value={editing[r.id]?.condition_description ?? r.condition_description ?? ''}
                      onChange={e => setField(r.id, 'condition_description', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {editing[r.id] && (
                  <Button size="sm" onClick={() => handleSave(r)} className="gap-2">
                    <Save className="h-3.5 w-3.5" />Sauvegarder
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialogue ajouter */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un rabais temporaire</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nom du rabais</label>
              <Input value={nouveau.nom} onChange={e => setNouveau(p => ({ ...p, nom: e.target.value }))} placeholder="Ex. : Promo été 2025" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Pourcentage (%)</label>
              <Input type="number" step="0.1" value={nouveau.pourcentage} onChange={e => setNouveau(p => ({ ...p, pourcentage: e.target.value }))} placeholder="10" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description / condition</label>
              <Input value={nouveau.condition_description} onChange={e => setNouveau(p => ({ ...p, condition_description: e.target.value }))} placeholder="Optionnel" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleAjouter} disabled={!nouveau.nom || !nouveau.pourcentage}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRabais;
