import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrlAuth = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrlAuth, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { newsId } = await req.json();
    if (!newsId || typeof newsId !== "string") {
      return new Response(JSON.stringify({ error: "newsId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the news item
    const { data: news, error: fetchError } = await supabase
      .from("news")
      .select("id, title, summary_ai, topics, full_analysis")
      .eq("id", newsId)
      .single();

    if (fetchError || !news) {
      return new Response(JSON.stringify({ error: "News not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return cached analysis if available
    if (news.full_analysis) {
      return new Response(JSON.stringify({ fullAnalysis: news.full_analysis }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const topics = Array.isArray(news.topics) ? news.topics.join(", ") : "";

    const prompt = `Você é um jornalista especializado em mercado imobiliário. Com base nas informações abaixo, escreva um artigo analítico aprofundado de 400 a 600 palavras em português brasileiro.

Título da notícia: ${news.title}
Resumo: ${news.summary_ai || ""}
Tópicos sugeridos (use apenas se forem coerentes com o conteúdo real da notícia, ignore se parecerem irrelevantes ou genéricos): ${topics || "nenhum"}

Estruture o artigo com:
1. **Contexto do Mercado** - Situe o leitor no cenário e geografia corretos da notícia (ex.: se for mercado norte-americano, fale do mercado norte-americano; não force paralelos com FIIs ou Brasil quando não houver relação clara).
2. **Análise dos Fatos** - Aprofunde os pontos principais da notícia exatamente como descritos, sem inventar ângulos.
3. **Impacto e Consequências** - Identifique quem é o público realmente afetado pela notícia (pode ser construtoras, compradores residenciais, locatários, investidores institucionais, governos, etc.) e fale especificamente para esse público — NÃO assuma que o leitor é investidor de FII a menos que a notícia trate explicitamente disso.
4. **Perspectivas** - Tendências e o que esperar dentro do escopo real da notícia.

Regras importantes:
- Se a notícia for sobre mercado internacional (EUA, Europa, Ásia, etc.), mantenha o foco nesse mercado. Só compare com o Brasil se houver implicação direta clara.
- Se a notícia for sobre construção/arquitetura/sustentabilidade/tecnologia e não mencionar investimento, NÃO direcione a análise para investidores.
- Escreva de forma clara, informativa e profissional. Use parágrafos curtos. Não use markdown, apenas texto corrido com quebras de parágrafo. Não repita o título.`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Você é um jornalista analítico especializado em mercado imobiliário global e brasileiro. Adapte o ângulo da análise ao tipo e à geografia real da notícia. Nunca force um viés de FIIs/investidores em notícias que não tratem disso. Sempre responda em português brasileiro." },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "Failed to generate analysis" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const fullAnalysis = aiData.choices?.[0]?.message?.content || "";

    if (!fullAnalysis) {
      return new Response(JSON.stringify({ error: "Empty analysis generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache in database
    const { error: updateError } = await supabase
      .from("news")
      .update({ full_analysis: fullAnalysis })
      .eq("id", newsId);

    if (updateError) {
      console.error("Failed to cache analysis:", updateError);
    }

    return new Response(JSON.stringify({ fullAnalysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-full-analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
