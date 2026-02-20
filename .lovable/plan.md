
## Correction du flux reset-password — Double listener et session non détectée

### Diagnostic précis

L'architecture actuelle crée un conflit entre deux composants qui écoutent simultanément les events d'authentification :

```text
1. Utilisateur clique le lien email
   → Supabase charge la page racine avec #access_token=...&type=recovery dans le hash
   → AuthRedirect.tsx déclenche sur PASSWORD_RECOVERY → navigue vers /reset-password

2. ResetPassword.tsx monte
   → Crée un NOUVEAU onAuthStateChange listener
   → Appelle getSession() → mais le hash a disparu après la redirection interne
   → PASSWORD_RECOVERY ne se redéclenche PAS (event déjà consommé)
   → getSession() retourne une session mais sans context recovery dans le hash
   → Après 1500ms : setVerificationSession(false), sessionValide reste false
   → Affiche "Lien invalide ou expiré" ❌
```

Le problème central : `AuthRedirect` consomme l'event `PASSWORD_RECOVERY` en naviguant vers `/reset-password`. Quand `ResetPassword` monte, cet event ne se produit plus. La vérification du hash `type=recovery` dans l'URL est aussi inutile car la navigation React a effacé le hash.

### Solution en 2 fichiers

#### 1. `src/components/AuthRedirect.tsx` — Transmettre le contexte recovery à la navigation

Au lieu de juste naviguer vers `/reset-password`, passer un state de navigation pour signaler que l'event recovery a bien eu lieu :

```tsx
navigate('/reset-password', { replace: true, state: { fromRecovery: true } });
```

#### 2. `src/pages/ResetPassword.tsx` — Lire le state de navigation en priorité

Utiliser `useLocation()` de react-router-dom pour lire `state.fromRecovery`. Si ce flag est présent, la session est valide immédiatement, sans attendre un event ou un timeout :

```tsx
const location = useLocation();

useEffect(() => {
  // Cas 1 : on arrive depuis AuthRedirect avec le flag recovery → valide immédiatement
  if (location.state?.fromRecovery) {
    setSessionValide(true);
    setVerificationSession(false);
    return; // pas besoin d'attendre
  }

  // Cas 2 : arrivée directe sur /reset-password (ex: rechargement de page)
  // Vérifier s'il y a une session active avec getSession()
  let mounted = true;
  const verifier = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && mounted) {
      setSessionValide(true);
    }
    if (mounted) setVerificationSession(false);
  };
  verifier();

  return () => { mounted = false; };
}, [location.state]);
```

### Fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| `src/components/AuthRedirect.tsx` | Ajouter `state: { fromRecovery: true }` à la navigation |
| `src/pages/ResetPassword.tsx` | Lire `location.state.fromRecovery` via `useLocation()` pour valider la session immédiatement; garder `getSession()` comme fallback pour les rechargements de page |

### Ce qui ne change PAS

- La structure du formulaire (UI identique)
- Le flux `handleSubmit` avec `supabase.auth.updateUser`
- `App.tsx` (aucun changement nécessaire)
- `ForgotPassword.tsx` (aucun changement nécessaire)
- La configuration `redirectTo` dans `resetPasswordForEmail`

### Comportements couverts

1. **Flux normal** : clic email → `AuthRedirect` détecte `PASSWORD_RECOVERY` → navigue avec `fromRecovery: true` → `ResetPassword` valide immédiatement → formulaire affiché ✅
2. **Rechargement de page sur `/reset-password`** : pas de `fromRecovery`, `getSession()` vérifie s'il reste une session active → formulaire ou message d'expiration ✅
3. **Accès direct non autorisé** : pas de `fromRecovery`, pas de session → "Lien invalide ou expiré" ✅

### Note sur la configuration Lovable Cloud

Le `redirectTo` dans `ForgotPassword.tsx` est déjà correctement configuré à `${window.location.origin}/reset-password`. Pour que Supabase accepte cette URL, il faut s'assurer que l'URL du projet est dans la liste des Redirect URLs autorisées dans les paramètres d'authentification. Si les tests échouent encore après ce correctif côté code, l'administrateur devra vérifier cette configuration dans les paramètres du backend (Authentication → URL Configuration).
