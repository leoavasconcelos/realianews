import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch news articles that need summaries
    const { data: newsToProcess, error: fetchError } = await supabase
      .from("news")
      .select("id, title, full_text, topics")
      .is("summary_ai", null)
      .limit(10);

    if (fetchError) {
      throw fetchError;
    }

    if (!newsToProcess || newsToProcess.length === 0) {
      return new Response(
        JSON.stringify({ message: "No news articles need processing", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const news of newsToProcess) {
      try {
        // Skip if no content
        if (!news.full_text && !news.title) {
          continue;
        }

        const content = news.full_text || news.title;
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

Título: ${news.title}

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
          const { error: updateError } = await supabase
            .from("news")
            .update({ summary_ai: summary })
            .eq("id", news.id);

          if (!updateError) {
            results.push({ id: news.id, status: "success" });
          } else {
            results.push({ id: news.id, status: "update_failed" });
          }
        }

        // Small delay to avoid rate limiting
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
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
