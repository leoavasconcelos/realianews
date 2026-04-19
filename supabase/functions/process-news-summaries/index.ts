import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication + admin check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Check admin/moderator role
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "moderator"]);

    if (!roleData || roleData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Service configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = supabaseAdmin;

    // Fetch news articles that need summaries OR international titles still in English (backfill)
    // Heuristic: international news whose title contains common English stopwords likely not translated yet.
    const { data: missingSummary, error: fetchError } = await supabase
      .from("news")
      .select("id, title, full_text, topics, region, summary_ai")
      .is("summary_ai", null)
      .limit(10);

    const { data: untranslatedIntl } = await supabase
      .from("news")
      .select("id, title, full_text, topics, region, summary_ai")
      .neq("region", "Brazil")
      .not("summary_ai", "is", null)
      .or("title.ilike.% the %,title.ilike.% of %,title.ilike.% and %,title.ilike.% to %,title.ilike.% in %,title.ilike.% for %,title.ilike.% with %,title.ilike.% over %,title.ilike.% says %")
      .limit(20);

    const seen = new Set<string>();
    const newsToProcess = [...(missingSummary ?? []), ...(untranslatedIntl ?? [])].filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });

    if (fetchError) {
      console.error("Error fetching news:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch news articles" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!newsToProcess || newsToProcess.length === 0) {
      return new Response(
        JSON.stringify({ message: "No news articles need processing", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Helper: translate a title to PT-BR (used for international news)
    async function translateTitleToPtBr(title: string): Promise<string> {
      try {
        const sysPrompt = `Você é um tradutor especializado em jornalismo do mercado imobiliário.
Traduza títulos de notícias para português brasileiro de forma natural, fluente e jornalística.

Diretrizes:
- Traduza SEMPRE para português brasileiro
- Mantenha o tom jornalístico e o sentido original
- Não adicione aspas, prefixos como "Tradução:" nem explicações
- Mantenha nomes próprios, siglas e marcas no original (ex.: Fed, BlackRock, NYC)
- Adapte termos técnicos quando houver equivalente em português
- Preserve números, percentuais e moedas
- Responda APENAS com o título traduzido, em uma única linha`;

        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: sysPrompt },
              { role: "user", content: `Traduza este título para português brasileiro:\n\n${title}` },
            ],
            max_tokens: 150,
            temperature: 0.2,
          }),
        });

        if (!r.ok) {
          console.error("Title translation error:", r.status);
          return title;
        }
        const data = await r.json();
        const translated = data.choices?.[0]?.message?.content?.trim();
        if (!translated) return title;
        return translated.replace(/^["'`]+|["'`]+$/g, "").trim() || title;
      } catch (e) {
        console.error("translateTitleToPtBr error:", e);
        return title;
      }
    }

    const results = [];

    for (const news of newsToProcess) {
      try {
        if (!news.full_text && !news.title) {
          continue;
        }

        // For international (non-Brazil) news, translate the title to PT-BR
        // and persist it so the feed header shows the translated headline.
        let displayTitle = news.title;
        const isInternational = news.region && news.region !== "Brazil";
        let translatedTitle: string | null = null;
        if (isInternational && news.title) {
          translatedTitle = await translateTitleToPtBr(news.title);
          if (translatedTitle && translatedTitle !== news.title) {
            displayTitle = translatedTitle;
          }
        }

        // Backfill mode: if summary already exists, only update the title and skip AI summary call.
        const alreadyHasSummary = !!(news as { summary_ai?: string | null }).summary_ai;
        if (alreadyHasSummary) {
          if (translatedTitle && translatedTitle !== news.title) {
            const { error: updateError } = await supabase
              .from("news")
              .update({
                title: translatedTitle.substring(0, 500),
                title_original: news.title.substring(0, 500),
              })
              .eq("id", news.id);
            results.push({ id: news.id, status: updateError ? "update_failed" : "title_translated" });
          } else {
            results.push({ id: news.id, status: "skipped_no_translation" });
          }
          await new Promise((resolve) => setTimeout(resolve, 300));
          continue;
        }

        const content = news.full_text || displayTitle;
        const topics = Array.isArray(news.topics) ? news.topics : [];
        const topicsContext = topics.length 
          ? `Tópicos relacionados: ${topics.join(", ")}.` 
          : "";

        const systemPrompt = `Você é um especialista em resumir notícias do mercado imobiliário brasileiro. 
Seu objetivo é criar resumos concisos, informativos e em português brasileiro.

Diretrizes:
- Escreva em português brasileiro formal mas acessível
- O resumo deve ter no máximo 3-4 frases (cerca de 50-80 palavras)
- Destaque os pontos mais importantes e impactantes
- Inclua números e dados relevantes quando disponíveis
- Mantenha um tom neutro e jornalístico`;

        const userPrompt = `Crie um resumo conciso da seguinte notícia:

Título: ${displayTitle}

${topicsContext}

Conteúdo:
${content.substring(0, 4000)}

Responda APENAS com o resumo.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: 300,
            temperature: 0.3,
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI error for news ${news.id}:`, aiResponse.status);
          continue;
        }

        const aiData = await aiResponse.json();
        const summary = aiData.choices?.[0]?.message?.content?.trim();

        if (summary) {
          const updatePayload: Record<string, unknown> = { summary_ai: summary };
          if (translatedTitle && translatedTitle !== news.title) {
            updatePayload.title = translatedTitle.substring(0, 500);
          }

          const { error: updateError } = await supabase
            .from("news")
            .update(updatePayload)
            .eq("id", news.id);

          if (!updateError) {
            results.push({ id: news.id, status: "success" });
          } else {
            results.push({ id: news.id, status: "update_failed" });
          }
        }

        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err) {
        console.error(`Error processing news ${news.id}:`, err);
        results.push({ id: news.id, status: "error" });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${results.length} news articles`,
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("process-news-summaries error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
