import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { formatMontant } from '@/lib/format';
import {
  fetchAllSegments,
  fetchAllPaliers,
  fetchConfig,
  fetchModulesProduit,
  fetchPrixModulesProduit,
  updateSegment,
  updatePalier,
  insertPalier,
  deletePalier,
  updateConfig,
  updatePrixModuleProduit,
  logAudit,
  Segment,
  Palier,
} from '@/lib/supabase-queries';
import { Save, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminTarification = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Record<string, Partial<Segment & Palier>>>({});
  const [editingModules, setEditingModules] = useState<Record<string, string>>({}); // prixModuleId → new value
  const [savingModuleId, setSavingModuleId] = useState<string | null>(null);
  const [newPalier, setNewPalier] = useState<{ segmentId: string; min: string; max: string; tarif: string } | null>(null);
  const [fraisEdit, setFraisEdit] = useState('');
  const [savingFrais, setSavingFrais] = useState(false);

  const { data: segments = [] } = useQuery({ queryKey: ['segments-all'], queryFn: fetchAllSegments });
  const { data: paliers = [] } = useQuery({ queryKey: ['paliers-all'], queryFn: fetchAllPaliers });
  const { data: modulesProduit = [] } = useQuery({ queryKey: ['modules-produit'], queryFn: fetchModulesProduit });
  const { data: prixModules = [] } = useQuery({ queryKey: ['prix-modules-produit'], queryFn: fetchPrixModulesProduit });
  const { data: config = {} } = useQuery({ queryKey: ['config'], queryFn: fetchConfig });

  const segmentRestaurant = segments.find(s => s.type_tarification === 'paliers');

  const handleSaveSegment = async (seg: Segment) => {
    const changes = editing[seg.id];
    if (!changes) return;
    try {
      const ancienPrix = seg.prix_unitaire?.toString() || '';
      await updateSegment(seg.id, changes as any);
      await logAudit({
        tableModifiee: 'segments',
        enregistrementId: seg.id,
        champ: 'prix_unitaire',
        ancienneValeur: ancienPrix,
        nouvelleValeur: changes.prix_unitaire?.toString(),
        description: `Mise à jour segment ${seg.nom}`,
      });
      setEditing(prev => { const n = { ...prev }; delete n[seg.id]; return n; });
      qc.invalidateQueries({ queryKey: ['segments-all'] });
      qc.invalidateQueries({ queryKey: ['segments'] });
      toast({ title: 'Segment mis à jour' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleSavePalier = async (p: Palier) => {
    const changes = editing[p.id];
    if (!changes) return;
    try {
      await updatePalier(p.id, changes as any);
      setEditing(prev => { const n = { ...prev }; delete n[p.id]; return n; });
      qc.invalidateQueries({ queryKey: ['paliers-all'] });
      qc.invalidateQueries({ queryKey: ['paliers'] });
      toast({ title: 'Palier mis à jour' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleDeletePalier = async (id: string) => {
    try {
      await deletePalier(id);
      qc.invalidateQueries({ queryKey: ['paliers-all'] });
      toast({ title: 'Palier supprimé' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleAddPalier = async () => {
    if (!newPalier || !newPalier.segmentId) return;
    const maxOrdre = paliers.filter(p => p.segment_id === newPalier.segmentId).length;
    try {
      await insertPalier({
        segment_id: newPalier.segmentId,
        capacite_min: parseInt(newPalier.min) || 0,
        capacite_max: newPalier.max ? parseInt(newPalier.max) : null,
        tarif_mensuel: parseFloat(newPalier.tarif) || 0,
        ordre: maxOrdre + 1,
      });
      setNewPalier(null);
      qc.invalidateQueries({ queryKey: ['paliers-all'] });
      toast({ title: 'Palier ajouté' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleSaveFrais = async () => {
    setSavingFrais(true);
    try {
      const ancien = config.frais_integration || '3000';
      await updateConfig('frais_integration', fraisEdit);
      await logAudit({
        tableModifiee: 'config',
        champ: 'frais_integration',
        ancienneValeur: ancien,
        nouvelleValeur: fraisEdit,
        description: `Frais intégration : ${ancien} $ → ${fraisEdit} $`,
      });
      qc.invalidateQueries({ queryKey: ['config'] });
      setFraisEdit('');
      toast({ title: 'Frais d\'intégration mis à jour' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setSavingFrais(false);
    }
  };

  const setField = (id: string, field: string, value: any) => {
    setEditing(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Tarification</h1>
          <p className="text-sm text-muted-foreground">Segments, paliers et frais d'intégration</p>
        </div>
      </div>

      {/* Frais d'intégration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Frais d'intégration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 max-w-xs">
            <Input
              type="number"
              placeholder={config.frais_integration || '3000'}
              value={fraisEdit}
              onChange={e => setFraisEdit(e.target.value)}
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">$ / étab.</span>
            <Button size="sm" onClick={handleSaveFrais} disabled={!fraisEdit || savingFrais}>
              <Save className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Actuel : {formatMontant(Number(config.frais_integration || 3000))}</p>
        </CardContent>
      </Card>

      {/* Segments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Segments de clientèle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {segments.filter(s => s.type_tarification === 'lineaire').map(seg => (
              <div key={seg.id} className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{seg.nom}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{seg.unite}</span>
                    <Switch
                      checked={editing[seg.id]?.actif ?? (seg.actif ?? true)}
                      onCheckedChange={v => {
                        setField(seg.id, 'actif', v);
                        setTimeout(() => handleSaveSegment({ ...seg, actif: v }), 100);
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Prix unitaire ($/mois)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editing[seg.id]?.prix_unitaire ?? seg.prix_unitaire ?? ''}
                      onChange={e => setField(seg.id, 'prix_unitaire', parseFloat(e.target.value))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Minimum mensuel ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editing[seg.id]?.minimum_mensuel ?? seg.minimum_mensuel ?? ''}
                      onChange={e => setField(seg.id, 'minimum_mensuel', parseFloat(e.target.value))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                {editing[seg.id] && (
                  <Button size="sm" onClick={() => handleSaveSegment(seg)} className="gap-2">
                    <Save className="h-3.5 w-3.5" />Sauvegarder
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Paliers restaurants */}
      {segmentRestaurant && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Paliers — {segmentRestaurant.nom}</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setNewPalier({ segmentId: segmentRestaurant.id, min: '', max: '', tarif: '' })}>
              <Plus className="h-4 w-4 mr-1" />Ajouter
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Min places</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Max places</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Tarif/mois</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paliers.filter(p => p.segment_id === segmentRestaurant.id).map(p => (
                    <tr key={p.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <Input
                          type="number"
                          value={editing[p.id]?.capacite_min ?? p.capacite_min}
                          onChange={e => setField(p.id, 'capacite_min', parseInt(e.target.value))}
                          className="h-8 w-24"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <Input
                          type="number"
                          value={editing[p.id]?.capacite_max ?? p.capacite_max ?? ''}
                          placeholder="∞"
                          onChange={e => setField(p.id, 'capacite_max', e.target.value ? parseInt(e.target.value) : null)}
                          className="h-8 w-24"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <Input
                          type="number"
                          step="0.01"
                          value={editing[p.id]?.tarif_mensuel ?? p.tarif_mensuel}
                          onChange={e => setField(p.id, 'tarif_mensuel', parseFloat(e.target.value))}
                          className="h-8 w-28"
                        />
                      </td>
                      <td className="px-4 py-2.5 flex gap-2 justify-end">
                        {editing[p.id] && (
                          <Button size="sm" variant="outline" onClick={() => handleSavePalier(p)}>
                            <Save className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeletePalier(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {newPalier && newPalier.segmentId === segmentRestaurant.id && (
                    <tr className="bg-muted/20">
                      <td className="px-4 py-2.5">
                        <Input type="number" placeholder="0" value={newPalier.min} onChange={e => setNewPalier(p => p && { ...p, min: e.target.value })} className="h-8 w-24" />
                      </td>
                      <td className="px-4 py-2.5">
                        <Input type="number" placeholder="∞" value={newPalier.max} onChange={e => setNewPalier(p => p && { ...p, max: e.target.value })} className="h-8 w-24" />
                      </td>
                      <td className="px-4 py-2.5">
                        <Input type="number" step="0.01" placeholder="0.00" value={newPalier.tarif} onChange={e => setNewPalier(p => p && { ...p, tarif: e.target.value })} className="h-8 w-28" />
                      </td>
                      <td className="px-4 py-2.5 flex gap-2 justify-end">
                        <Button size="sm" onClick={handleAddPalier}><Save className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setNewPalier(null)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminTarification;
