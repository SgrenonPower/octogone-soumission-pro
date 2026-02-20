import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SYSTEM_PROMPT = `Tu es un rédacteur professionnel pour une entreprise québécoise de gestion alimentaire (Octogone 360). Tu rédiges des textes pour des soumissions commerciales envoyées à des clients institutionnels (CHSLD, résidences, CPE, hôpitaux).

Règles :
- Français québécois professionnel (pas de France)
- Ton professionnel mais accessible, jamais condescendant
- Phrases courtes et claires
- Montants en format canadien (1 234,56 $)
- Ne jamais inventer de chiffres — utilise seulement les données fournies
- Maximum 3-4 phrases pour la portée, 3-5 points pour les notes
- Retourne SEULEMENT le texte, sans explication ni guillemets`;

function buildPromptAmeliorer(type: 'portee' | 'notes', texteOriginal: string, contexte: Record<string, unknown>): string {
  if (type === 'portee') {
    return `Améliore ce texte d'introduction de soumission. Garde le même sens mais rends-le plus professionnel, clair et convaincant.

Contexte de la soumission :
- Client : ${contexte.nomClient || 'non spécifié'}
- Segment : ${contexte.segment || 'non spécifié'}
- Établissements : ${contexte.etablissements || 'non spécifié'}

Texte à améliorer :
${texteOriginal}`;
  } else {
    return `Améliore ces notes de soumission. Garde les mêmes informations mais rends-les plus claires et professionnelles. Formate en points avec "•" au début de chaque ligne.

Contexte de la soumission :
- Client : ${contexte.nomClient || 'non spécifié'}
- Segment : ${contexte.segment || 'non spécifié'}

Notes à améliorer :
${texteOriginal}`;
  }
}

function buildPromptGenerer(type: 'portee' | 'notes', contexte: Record<string, unknown>): string {
  if (type === 'portee') {
    return `Génère un texte d'introduction (portée) pour cette soumission commerciale.

Contexte :
- Client : ${contexte.nomClient || 'non spécifié'}
- Segment : ${contexte.segment || 'non spécifié'}
- Nombre d'établissements : ${contexte.nbEtablissements || 1}
- Modules ROI activés : ${Array.isArray(contexte.modulesROI) && contexte.modulesROI.length > 0 ? (contexte.modulesROI as string[]).join(', ') : 'aucun'}
- Rabais appliqués : ${Array.isArray(contexte.rabais) && contexte.rabais.length > 0 ? (contexte.rabais as string[]).join(', ') : 'aucun'}
- Projet pilote : ${contexte.aUnPilote ? 'oui' : 'non'}

Le texte doit :
- Présenter Octogone comme solution de gestion alimentaire
- Mentionner les bénéfices clés liés aux modules sélectionnés
- Si projet pilote, mentionner que l'intégration est incluse
- 3-4 phrases maximum`;
  } else {
    return `Génère des notes personnalisées pour cette soumission.

Contexte :
- Client : ${contexte.nomClient || 'non spécifié'}
- Segment : ${contexte.segment || 'non spécifié'}
- Établissements : ${contexte.etablissementsDetail || 'non spécifié'}
- Rabais : ${contexte.rabaisDetail || 'aucun'}
- Budget alimentaire : ${contexte.budgetAlimentaire ? `${contexte.budgetAlimentaire} $` : 'non fourni'}

Les notes doivent :
- Clarifier les conditions des rabais appliqués
- Mentionner les particularités (pilote, RQRA, volume)
- Utiliser le format "• " pour chaque point
- 3-5 points maximum`;
  }
}

function buildPromptSuggestion(textePartiel: string): string {
  return `Complète cette phrase de manière naturelle et professionnelle pour une soumission de gestion alimentaire au Québec. Retourne SEULEMENT la suite du texte (1-2 phrases).

Début du texte :
${textePartiel}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const body = await req.json();
    const { mode, champType, texteOriginal, contexte } = body;

    if (!mode || !champType) {
      return new Response(JSON.stringify({ error: 'Paramètres manquants' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    let userMessage: string;
    if (mode === 'ameliorer') {
      if (!texteOriginal || texteOriginal.trim().length < 10) {
        return new Response(JSON.stringify({ error: 'Texte trop court pour amélioration' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      userMessage = buildPromptAmeliorer(champType, texteOriginal, contexte || {});
    } else if (mode === 'generer') {
      userMessage = buildPromptGenerer(champType, contexte || {});
    } else if (mode === 'suggestion') {
      if (!texteOriginal || texteOriginal.trim().length < 10) {
        return new Response(JSON.stringify({ resultat: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      userMessage = buildPromptSuggestion(texteOriginal);
    } else {
      return new Response(JSON.stringify({ error: 'Mode invalide' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'Clé API non configurée' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let aiResponse: Response;
    try {
      aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
          max_tokens: 600,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI Gateway error:', errText);
      return new Response(JSON.stringify({ error: "L'assistant IA n'est pas disponible pour le moment." }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const aiData = await aiResponse.json();
    const resultat = aiData.choices?.[0]?.message?.content?.trim() || '';

    return new Response(JSON.stringify({ resultat }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    console.error('Edge function error:', err);
    const msg = err instanceof Error && err.name === 'AbortError'
      ? "L'assistant IA a mis trop de temps à répondre."
      : "L'assistant IA n'est pas disponible pour le moment.";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
