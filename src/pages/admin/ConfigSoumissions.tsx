import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { fetchConfig, updateConfig } from '@/lib/supabase-queries';
import { ArrowLeft, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminConfigSoumissions = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [validite, setValidite] = useState('');
  const [conditions, setConditions] = useState('');
  const [entreprise, setEntreprise] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: config = {} } = useQuery({ queryKey: ['config'], queryFn: fetchConfig });

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: { cle: string; valeur: string }[] = [];
      if (validite) updates.push({ cle: 'validite_soumission_jours', valeur: validite });
      if (conditions) updates.push({ cle: 'conditions_generales', valeur: conditions });
      if (entreprise) updates.push({ cle: 'nom_entreprise', valeur: entreprise });

      await Promise.all(updates.map(u => updateConfig(u.cle, u.valeur)));
      qc.invalidateQueries({ queryKey: ['config'] });
      setValidite('');
      setConditions('');
      setEntreprise('');
      toast({ title: 'Configuration sauvegardée' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Config soumissions</h1>
          <p className="text-sm text-muted-foreground">Validité, conditions générales et informations entreprise</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Paramètres généraux</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nom de l'entreprise (affiché sur PDF)</label>
            <Input
              value={entreprise}
              onChange={e => setEntreprise(e.target.value)}
              placeholder={config.nom_entreprise || 'Octogone 360'}
            />
            <p className="text-xs text-muted-foreground">Actuel : {config.nom_entreprise || 'Octogone 360'}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Durée de validité des soumissions (jours)</label>
            <Input
              type="number"
              value={validite}
              onChange={e => setValidite(e.target.value)}
              placeholder={config.validite_soumission_jours || '30'}
              className="max-w-[160px]"
            />
            <p className="text-xs text-muted-foreground">Actuel : {config.validite_soumission_jours || '30'} jours</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Conditions générales (texte du PDF)</label>
            <textarea
              className="w-full min-h-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={conditions}
              onChange={e => setConditions(e.target.value)}
              placeholder={config.conditions_generales || 'Cette soumission est valide pour une période de 30 jours…'}
            />
            {config.conditions_generales && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Voir la valeur actuelle</summary>
                <p className="mt-1 whitespace-pre-wrap">{config.conditions_generales}</p>
              </details>
            )}
          </div>

          <Button onClick={handleSave} disabled={saving || (!validite && !conditions && !entreprise)} className="gap-2">
            <Save className="h-4 w-4" />Sauvegarder les modifications
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminConfigSoumissions;
