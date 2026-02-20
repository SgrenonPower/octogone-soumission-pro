import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérifier l'Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Client avec le token de l'appelant pour vérifier son identité
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Vérifier que l'appelant est authentifié
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Token invalide' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerId = claimsData.claims.sub;

    // Vérifier que l'appelant est admin via la table user_roles
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Accès réservé aux administrateurs' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Lire le body
    const { email, password, nom, role } = await req.json();

    if (!email || !password || !nom || !role) {
      return new Response(JSON.stringify({ error: 'Champs requis : email, password, nom, role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Client admin avec la clé service_role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Créer le compte Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authUserId = authData.user.id;

    // Créer ou mettre à jour le profil dans utilisateurs
    const { data: existingUser } = await supabaseAdmin
      .from('utilisateurs')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    let utilisateurId: string;

    if (existingUser) {
      // Mettre à jour auth_id du profil existant
      await supabaseAdmin
        .from('utilisateurs')
        .update({ auth_id: authUserId, nom, role })
        .eq('id', existingUser.id);
      utilisateurId = existingUser.id;
    } else {
      // Insérer un nouveau profil
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('utilisateurs')
        .insert({ email, nom, role, actif: true, auth_id: authUserId })
        .select()
        .single();

      if (insertError) {
        // Supprimer le compte Auth créé si l'insertion échoue
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      utilisateurId = newUser.id;
    }

    // Insérer le rôle dans user_roles
    const appRole = role === 'admin' ? 'admin' : 'vendeur';
    await supabaseAdmin
      .from('user_roles')
      .upsert({ user_id: authUserId, role: appRole }, { onConflict: 'user_id,role' });

    return new Response(JSON.stringify({ success: true, utilisateurId, authUserId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erreur serveur', details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
