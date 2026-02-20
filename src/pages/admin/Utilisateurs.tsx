import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchUtilisateurs,
  updateUtilisateur,
  Utilisateur,
} from '@/lib/supabase-queries';
import { ArrowLeft, Plus, UserCheck, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminUtilisateurs = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nouveau, setNouveau] = useState({ nom: '', email: '', role: 'vendeur', password: '' });
  const [creation, setCreation] = useState(false);

  const { data: utilisateurs = [] } = useQuery({
    queryKey: ['utilisateurs'],
    queryFn: fetchUtilisateurs,
  });

  const handleToggleActif = async (u: Utilisateur) => {
    try {
      await updateUtilisateur(u.id, { actif: !u.actif });
      qc.invalidateQueries({ queryKey: ['utilisateurs'] });
      toast({ title: u.actif ? 'Utilisateur désactivé' : 'Utilisateur activé' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleChangeRole = async (u: Utilisateur, role: string) => {
    try {
      await updateUtilisateur(u.id, { role });
      qc.invalidateQueries({ queryKey: ['utilisateurs'] });
      toast({ title: 'Rôle mis à jour' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleAjouter = async () => {
    if (!nouveau.nom || !nouveau.email || !nouveau.password) return;
    if (nouveau.password.length < 6) {
      toast({ title: 'Le mot de passe doit contenir au moins 6 caractères.', variant: 'destructive' });
      return;
    }

    setCreation(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        toast({ title: 'Session expirée. Veuillez vous reconnecter.', variant: 'destructive' });
        return;
      }

      const response = await supabase.functions.invoke('create-auth-user', {
        body: {
          email: nouveau.email,
          password: nouveau.password,
          nom: nouveau.nom,
          role: nouveau.role,
        },
      });

      if (response.error || response.data?.error) {
        const msg = response.data?.error || response.error?.message || 'Erreur inconnue';
        toast({ title: `Erreur : ${msg}`, variant: 'destructive' });
        return;
      }

      qc.invalidateQueries({ queryKey: ['utilisateurs'] });
      setDialogOpen(false);
      setNouveau({ nom: '', email: '', role: 'vendeur', password: '' });
      toast({ title: 'Utilisateur créé avec succès.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur lors de la création du compte.', variant: 'destructive' });
    } finally {
      setCreation(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground">Gestion de l'équipe de vente et des administrateurs</p>
        </div>
        <Button className="ml-auto gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />Ajouter un utilisateur
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Équipe ({utilisateurs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {utilisateurs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun utilisateur configuré.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Nom</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Email</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Rôle</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Actif</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {utilisateurs.map(u => (
                    <tr key={u.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}>
                            {u.nom.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{u.nom}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <Select value={u.role} onValueChange={v => handleChangeRole(u, v)}>
                          <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vendeur">Vendeur</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {u.actif
                            ? <UserCheck className="h-4 w-4 text-green-600" />
                            : <UserX className="h-4 w-4 text-muted-foreground" />}
                          <Switch checked={u.actif ?? true} onCheckedChange={() => handleToggleActif(u)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un utilisateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nom complet</label>
              <Input value={nouveau.nom} onChange={e => setNouveau(p => ({ ...p, nom: e.target.value }))} placeholder="Jean Tremblay" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Adresse courriel</label>
              <Input type="email" value={nouveau.email} onChange={e => setNouveau(p => ({ ...p, email: e.target.value }))} placeholder="jean@octogone.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mot de passe temporaire</label>
              <Input type="password" value={nouveau.password} onChange={e => setNouveau(p => ({ ...p, password: e.target.value }))} placeholder="Minimum 6 caractères" />
              <p className="text-xs text-muted-foreground">L'utilisateur devra changer son mot de passe à la première connexion.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rôle</label>
              <Select value={nouveau.role} onValueChange={v => setNouveau(p => ({ ...p, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendeur">Vendeur</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creation}>Annuler</Button>
            <Button onClick={handleAjouter} disabled={!nouveau.nom || !nouveau.email || !nouveau.password || creation}>
              {creation ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Création…
                </span>
              ) : 'Créer le compte'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUtilisateurs;
