
# Authentification Supabase Auth — Plan d'implémentation complet

## Contexte et état actuel

L'application utilise un code d'accès hardcodé (`octogone2025`) via `localStorage`. La table `utilisateurs` existe en base avec les colonnes `id`, `nom`, `email`, `role`, `actif`, `created_at` — mais elle n'a **aucune colonne `auth_id`** pour lier à Supabase Auth. La table est vide (aucun utilisateur existant).

Le client Supabase est déjà configuré avec `persistSession: true` et `autoRefreshToken: true`.

---

## Architecture de la solution

La liaison entre Supabase Auth et la table `utilisateurs` se fait via une colonne `auth_id uuid UNIQUE` ajoutée à `utilisateurs`. Cela permet :
- Chercher le profil utilisateur par `auth_id` (rapide, indexé)
- Fallback par `email` pour les utilisateurs créés manuellement avant l'ajout de `auth_id`
- Mise à jour automatique du `auth_id` au premier login si trouvé par email

Un **Edge Function** `create-auth-user` gérera la création de comptes Supabase Auth depuis la page Admin Utilisateurs, car `supabase.auth.admin.createUser()` nécessite la clé `service_role` qui ne doit jamais être exposée côté client.

---

## Étapes d'implémentation

### Étape 1 — Migration base de données

```sql
-- Ajouter auth_id à la table utilisateurs
ALTER TABLE public.utilisateurs 
  ADD COLUMN IF NOT EXISTS auth_id uuid UNIQUE;

-- Nettoyer le vieux localStorage octogone_access (rien à faire en SQL)
-- mais on doit s'assurer que les policies RLS restent publiques pour l'instant
-- (pas de Supabase Auth obligatoire sur ces tables, l'auth se fait côté application)
```

### Étape 2 — Edge Function `create-auth-user`

Créer `supabase/functions/create-auth-user/index.ts` qui :
- Reçoit `{ email, password, nom, role }` en POST
- Valide que l'appelant est authentifié et est admin (via `Authorization` header)
- Appelle `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })`
- Met à jour la table `utilisateurs` avec le `auth_id` retourné, OU insère si inexistant
- Retourne `{ success: true, userId }` ou une erreur

### Étape 3 — Réécriture de `src/hooks/useAuth.ts`

Le hook devient le point central d'authentification :

```ts
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);         // Supabase Auth user
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null); // Profil DB
  const [loading, setLoading] = useState(true);

  // Charge le profil depuis la table utilisateurs
  const chargerProfil = async (authUser: User) => { ... }

  useEffect(() => {
    // 1. Nettoyer l'ancien localStorage
    localStorage.removeItem('octogone_access');

    // 2. Restaurer session existante
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) chargerProfil(session.user);
      else setLoading(false);
    });

    // 3. Écouter les changements
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) chargerProfil(session.user);
      else { setUser(null); setUtilisateur(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: traduireErreur(error) };
    return { success: true };
  };

  const logout = async () => { await supabase.auth.signOut(); };

  return { user, utilisateur, loading, isAdmin: utilisateur?.role === 'admin', login, logout };
};
```

La fonction `chargerProfil` :
1. Cherche dans `utilisateurs` par `auth_id = user.id`
2. Si non trouvé, cherche par `email = user.email`
3. Si trouvé par email mais `auth_id` null, met à jour `auth_id`
4. Si `actif === false` → déconnecte et renvoie erreur
5. Si non trouvé du tout → déconnecte et renvoie erreur "compte non configuré"

### Étape 4 — Suppression de `src/lib/auth.ts`

Ce fichier est supprimé. Toutes ses références sont remplacées par `useAuth()`.

### Étape 5 — Réécriture de `src/pages/Login.tsx`

Conservation exacte du design (gradient, glassmorphism, cercles décoratifs). Seul le formulaire change :
- Champ `email` avec icône `Mail` (lucide-react)
- Champ `mot de passe` avec icône `Lock` et toggle œil (inchangé)
- Le hook `useAuth()` fournit `login(email, password)`
- Messages d'erreur français selon le code d'erreur Supabase :
  - `invalid_credentials` → "Courriel ou mot de passe incorrect."
  - `compte_inactif` (erreur custom) → "Votre compte a été désactivé. Contactez un administrateur."
  - réseau → "Erreur de connexion. Veuillez réessayer."
- Raccourci Enter, spinner "Vérification…" maintenus

### Étape 6 — Réécriture de `src/components/ProtectedRoute.tsx`

```tsx
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center">
    <Spinner />
  </div>;

  if (!user) return <Navigate to="/" replace />;

  return <AppLayout>{children}</AppLayout>;
};
```

### Étape 7 — Nouveau composant `AdminRoute`

```tsx
const AdminRoute = ({ children }) => {
  const { user, utilisateur, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/" replace />;

  if (!utilisateur || utilisateur.role !== 'admin') {
    toast({ title: 'Accès réservé aux administrateurs.', variant: 'destructive' });
    return <Navigate to="/calculateur" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
};
```

### Étape 8 — Modification de `src/App.tsx`

- Supprimer `import { isAuthenticated } from '@/lib/auth'`
- La route `/` rend toujours `<Login />` (la redirection se fait dans le hook après login réussi)
- La route `/soumissions/:id/presentation` utilise `<ProtectedRoute>` au lieu de la vérification inline
- Toutes les routes `/admin/*` utilisent `<AdminRoute>` au lieu de `<ProtectedRoute>`

### Étape 9 — Modification de `src/components/AppLayout.tsx`

Ajouts dans la sidebar :
- En bas, au-dessus du bouton Déconnexion : bloc avec avatar (initiales), nom et badge role
- Masquer le lien "Administration" si `!isAdmin`
- Le bouton Déconnexion appelle `await logout()` puis `navigate('/')`

```tsx
// Bloc utilisateur dans SidebarContent
<div className="px-3 pb-2">
  <div className="flex items-center gap-3 px-3 py-2">
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
      style={{ background: 'hsl(var(--sidebar-primary) / 0.2)', color: 'hsl(var(--sidebar-primary))' }}>
      {utilisateur?.nom?.charAt(0)?.toUpperCase() || '?'}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold truncate" style={{ color: 'hsl(var(--sidebar-foreground))' }}>
        {utilisateur?.nom || 'Utilisateur'}
      </p>
      <p className="text-xs" style={{ color: 'hsl(var(--sidebar-foreground) / 0.5)' }}>
        {isAdmin ? 'Administrateur' : 'Vendeur'}
      </p>
    </div>
  </div>
</div>
```

### Étape 10 — Modification de `src/lib/supabase-queries.ts`

Ajouter `utilisateurId?: string` au paramètre de `sauvegarderSoumission` :

```ts
.insert({
  numero: params.numero,
  nom_client: params.nomClient,
  ...
  utilisateur_id: params.utilisateurId || null,  // NOUVEAU
})
```

### Étape 11 — Modification de `src/pages/Calculateur.tsx`

```tsx
// Ajouter import useAuth
const { utilisateur } = useAuth();

// Dans handleSauvegarder, passer utilisateurId
await sauvegarderSoumission({
  ...
  utilisateurId: utilisateur?.id,  // NOUVEAU
});
```

### Étape 12 — Modification de `src/pages/admin/Utilisateurs.tsx`

Remplacer la logique de création simple par un appel à l'Edge Function `create-auth-user`. Le dialog de création affiche maintenant un champ mot de passe temporaire. La création insère dans `utilisateurs` ET crée le compte Auth en même temps.

Si l'Edge Function échoue, un message clair s'affiche : "Erreur lors de la création du compte. Vérifiez que l'email n'existe pas déjà."

---

## Fichiers impactés — résumé complet

| Fichier | Action |
|---|---|
| `src/lib/auth.ts` | Supprimer |
| `src/hooks/useAuth.ts` | Réécrire complètement |
| `src/pages/Login.tsx` | Réécrire le formulaire (garder le design) |
| `src/components/ProtectedRoute.tsx` | Réécrire avec useAuth + spinner loading |
| `src/App.tsx` | Supprimer import auth, ajouter AdminRoute, corriger routes |
| `src/components/AppLayout.tsx` | Afficher nom/rôle, masquer admin si vendeur |
| `src/lib/supabase-queries.ts` | Ajouter `utilisateurId` dans sauvegarderSoumission |
| `src/pages/Calculateur.tsx` | Passer `utilisateur.id` à la sauvegarde |
| `src/pages/admin/Utilisateurs.tsx` | Appeler Edge Function pour créer compte Auth |
| `supabase/functions/create-auth-user/index.ts` | Créer (nouvelle Edge Function) |
| DB migration | Ajouter colonne `auth_id uuid UNIQUE` à `utilisateurs` |

---

## Gestion des edge cases

1. **Ancien localStorage `octogone_access`** : nettoyé au montage du hook `useAuth` via `localStorage.removeItem('octogone_access')`
2. **Auth user sans profil `utilisateurs`** : déconnexion + message "Votre compte n'est pas encore configuré."
3. **Profil `actif = false`** : déconnexion + message "Votre compte a été désactivé."
4. **Session expirée** : `onAuthStateChange` détecte l'événement `SIGNED_OUT` → redirect login
5. **Vendeur sur `/admin`** : `AdminRoute` redirige vers `/calculateur` + toast

---

## Création du premier admin

Puisque la table `utilisateurs` est vide et qu'il n'y a pas d'interface d'inscription, le premier admin doit être créé manuellement :

1. Aller dans le backend (Cloud View) → Authentication → Users → "Add user"
2. Entrer email + mot de passe
3. Aller dans la page Admin Utilisateurs de l'app et créer le profil correspondant
4. Ou bien : l'Edge Function `create-auth-user` peut être appelée directement pour créer les deux en même temps depuis la page Admin Utilisateurs.

---

## Ce qui ne change pas

- Tout le calcul de prix, rabais, ROI
- Le design de toutes les pages (sauf Login : 2 champs au lieu de 1)
- Les pages admin (tarification, rabais, ROI, historique, config)
- Le composant PDF et les pages soumissions
- La sidebar navigation (sauf masquage conditionnel du lien Administration)
