import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  fetchAllModulesRoi,
  fetchParametresRoi,
  fetchConfig,
  updateParametreRoi,
  updateConfig,
  logAudit,
  ParametreRoi,
  ModuleRoi,
} from '@/lib/supabase-queries';
import { formatMontant } from '@/lib/format';
import { ArrowLeft, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminRoi = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Record<string, number>>({});
  const [coutEdit, setCoutEdit] = useState('');
  const [savingCout, setSavingCout] = useState(false);

  const { data: modules = [] } = useQuery({ queryKey: ['modules-roi-all'], queryFn: fetchAllModulesRoi });
  const { data: params = [] } = useQuery({ queryKey: ['parametres-roi'], queryFn: fetchParametresRoi });
  const { data: config = {} } = useQuery({ queryKey: ['config'], queryFn: fetchConfig });

  const handleSaveParam = async (p: ParametreRoi) => {
    const nouvelleValeur = editing[p.id];
    if (nouvelleValeur === undefined) return;
    try {
      await updateParametreRoi(p.id, nouvelleValeur);
      await logAudit({
        tableModifiee: 'parametres_roi',
        enregistrementId: p.id,
        champ: p.cle,
        ancienneValeur: p.valeur.toString(),
        nouvelleValeur: nouvelleValeur.toString(),
        description: `Paramètre ROI ${p.label} : ${p.valeur} → ${nouvelleValeur}`,
      });
      setEditing(prev => { const n = { ...prev }; delete n[p.id]; return n; });
      qc.invalidateQueries({ queryKey: ['parametres-roi'] });
      toast({ title: 'Paramètre mis à jour' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleSaveCout = async () => {
    setSavingCout(true);
    try {
      const ancien = config.cout_octogone_mensuel_par_etablissement || '299';
      await updateConfig('cout_octogone_mensuel_par_etablissement', coutEdit);
      await logAudit({
        tableModifiee: 'config',
        champ: 'cout_octogone_mensuel_par_etablissement',
        ancienneValeur: ancien,
        nouvelleValeur: coutEdit,
        description: `Coût Octogone/mois/étab. : ${ancien} $ → ${coutEdit} $`,
      });
      qc.invalidateQueries({ queryKey: ['config'] });
      setCoutEdit('');
      toast({ title: 'Coût Octogone mis à jour' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setSavingCout(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Paramètres ROI</h1>
          <p className="text-sm text-muted-foreground">Constantes et hypothèses du calculateur ROI</p>
        </div>
      </div>

      {/* Coût Octogone */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Coût Octogone (référence ROI)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Utilisé pour calculer le coût de référence dans l'analyse ROI — distinct du prix de la soumission.
          </p>
          <div className="flex items-center gap-3 max-w-xs">
            <Input
              type="number"
              step="1"
              placeholder={config.cout_octogone_mensuel_par_etablissement || '299'}
              value={coutEdit}
              onChange={e => setCoutEdit(e.target.value)}
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">$ / étab. / mois</span>
            <Button size="sm" onClick={handleSaveCout} disabled={!coutEdit || savingCout}>
              <Save className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Actuel : {formatMontant(Number(config.cout_octogone_mensuel_par_etablissement || 299))} / établissement / mois
          </p>
        </CardContent>
      </Card>

      {/* Paramètres par module */}
      {modules.map(module => {
        const moduleParams = params.filter(p => p.module_id === module.id);
        if (moduleParams.length === 0) return null;

        return (
          <Card key={module.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{module.nom}</CardTitle>
              {module.description && (
                <p className="text-xs text-muted-foreground">{module.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Paramètre</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase w-36">Valeur</th>
                      <th className="px-4 py-2.5 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {moduleParams.map(p => (
                      <tr key={p.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 text-sm">{p.label}</td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            step="any"
                            value={editing[p.id] ?? p.valeur}
                            onChange={e => setEditing(prev => ({ ...prev, [p.id]: parseFloat(e.target.value) }))}
                            className="h-8 w-28 text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          {editing[p.id] !== undefined && editing[p.id] !== Number(p.valeur) && (
                            <Button size="sm" variant="outline" onClick={() => handleSaveParam(p)}>
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AdminRoi;
