import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Topic detection aligned with the `topics` table names.
// MUST stay in sync with aggregate-news/detectTopics.
function detectTopics(title: string, description: string): string[] {
  const text = `${title || ""} ${description || ""}`.toLowerCase();
  const topics: string[] = [];

  const topicKeywords: Record<string, string[]> = {
    "Fundos Imobiliários": [
      "\\bfii\\b", "\\bfiis\\b", "fundo\\s+imobili[áa]rio", "fundos\\s+imobili[áa]rios",
      "\\breit\\b", "\\breits\\b", "real\\s+estate\\s+investment\\s+trust",
      "\\bcri\\b", "\\bcris\\b", "certificado\\s+de\\s+receb[íi]veis", "\\bfiagro\\b",
    ],
    "Investimentos": [
      "investimento", "investidor", "investor", "investment", "yield", "rentabilidade",
      "retorno", "valorização", "ativo\\s+imobili[áa]rio", "real\\s+estate\\s+invest",
      "private\\s+equity", "venture\\s+capital",
    ],
    "Financiamento": [
      "financiamento", "cr[ée]dito\\s+imobili[áa]rio", "hipoteca", "mortgage", "loan",
      "\\bfgts\\b", "\\bselic\\b", "\\btr\\b", "juros", "interest\\s+rate", "fed\\s+rate",
      "refinanc",
    ],
    "Aluguel": [
      "aluguel", "alugu[ée]is", "loca[çc][ãa]o", "inquilino", "locador", "locat[áa]rio",
      "\\brent\\b", "rental", "renting", "tenant", "landlord", "lease", "leasing",
      "\\bigp-m\\b", "\\bivar\\b",
    ],
    "Comercial": [
      "comercial", "escrit[óo]rio", "office", "loja", "varejo", "retail", "shopping",
      "shopping\\s+center", "mall", "commercial\\s+real\\s+estate", "\\bcre\\b",
    ],
    "Residencial": [
      "residencial", "residential", "apartamento", "apartment",
      "\\bcasa\\b(?!\\s+(civil|branca|dos\\s+deputados|legislativa))", "house",
      "housing", "condom[íi]nio", "condo", "moradia", "habita[çc][ãa]o", "single-family",
      "multifamily",
    ],
    "Logística": [
      "log[íi]stica", "logistic", "galp[ãa]o", "warehouse", "industrial", "distribui[çc][ãa]o",
      "distribution\\s+center", "centro\\s+log[íi]stico", "fulfillment",
    ],
    "Sustentabilidade": [
      "sustentabilidade", "sustainable", "sustainability", "\\besg\\b", "verde",
      "\\bgreen\\b", "carbon\\s+neutral", "net[\\s-]zero", "leed", "energia\\s+renov[áa]vel",
      "renewable\\s+energy", "efici[êe]ncia\\s+energ[ée]tica",
    ],
    "Luxo": [
      "\\bluxo\\b", "luxury", "high[\\s-]end", "alto\\s+padr[ãa]o", "premium",
      "ultra[\\s-]luxury", "mans[ãa]o", "mansion", "penthouse",
    ],
    "PropTech": [
      "proptech", "prop\\s+tech", "tecnologia\\s+imobili[áa]ria", "real\\s+estate\\s+tech",
      "real\\s+estate\\s+technology", "fintech\\s+imobili[áa]rio",
    ],
    "Data Centers": [
      "data\\s+center", "data\\s+centers", "centro\\s+de\\s+dados", "hyperscale", "colocation",
    ],
    "Coliving": [
      "coliving", "co-living", "moradia\\s+compartilhada", "shared\\s+housing",
    ],
    "Leilões": [
      "leil[ãa]o", "leil[õo]es", "auction", "foreclosure", "execu[çc][ãa]o\\s+judicial",
    ],
    "Multipropriedade": [
      "multipropriedade", "fractional\\s+ownership", "timeshare", "tempo\\s+compartilhado",
    ],
    "Retrofit": [
      "retrofit", "revitaliza[çc][ãa]o", "requalifica[çc][ãa]o", "reabilita[çc][ãa]o",
      "renova[çc][ãa]o\\s+predial", "building\\s+renovation",
    ],
    "Startups": [
      "startup", "scale[\\s-]?up", "rodada\\s+de\\s+investimento", "funding\\s+round",
      "s[ée]rie\\s+[abc]\\b", "series\\s+[abc]\\b",
    ],
    "Regulamentação": [
      "regulamenta[çc][ãa]o", "regula[çc][ãa]o", "regulation", "lei", "legisla[çc][ãa]o",
      "legislation", "norma\\s+t[ée]cnica", "marco\\s+legal", "zoning", "zoneamento",
    ],
    "Corporativo": [
      "corporativo", "corporate", "edif[íi]cio\\s+corporativo", "lajes\\s+corporativas",
      "headquarters", "sede\\s+corporativa",
    ],
    "Lançamentos": [
      "lan[çc]amento", "lan[çc]amentos", "novo\\s+empreendimento", "incorpora[çc][ãa]o",
      "ground[\\s-]?breaking", "groundbreaking", "new\\s+development", "new\\s+project",
      "topping\\s+off",
    ],
    "Construtoras": [
      "construtora", "incorporadora", "homebuilder", "home\\s+builder", "developer",
      "\\bmrv\\b", "\\bcyrela\\b", "\\beztec\\b", "\\btenda\\b", "direcional",
      "even\\s+construtora", "moura\\s+dubeux",
    ],
    "Governo": [
      "minha\\s+casa\\s+minha\\s+vida", "\\bmcmv\\b", "casa\\s+verde\\s+amarela",
      "programa\\s+habitacional", "pol[íi]tica\\s+habitacional", "subs[íi]dio\\s+habitacional",
      "housing\\s+policy", "affordable\\s+housing",
    ],
    "Mercado Imobiliário": [
      "mercado\\s+imobili[áa]rio", "setor\\s+imobili[áa]rio", "real\\s+estate\\s+market",
      "housing\\s+market", "property\\s+market", "\\bvgv\\b", "vendas\\s+imobili[áa]rias",
    ],
  };

  for (const [topic, patterns] of Object.entries(topicKeywords)) {
    const matched = patterns.some((pattern) => {
      try {
        return new RegExp(pattern, "i").test(text);
      } catch {
        return false;
      }
    });
    if (matched) topics.push(topic);
  }

  return topics.slice(0, 4);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authentication: allow cron secret OR admin/moderator user
    const cronSecret = Deno.env.get("CRON_SECRET");
    const cronHeader = req.headers.get("X-Cron-Secret");
    const authHeader = req.headers.get("Authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "").trim()
      : null;
    const isCronCall = !!(
      cronSecret &&
      ((cronHeader && cronHeader === cronSecret) ||
        (bearerToken && bearerToken === cronSecret))
    );

    if (!isCronCall && !authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (!isCronCall) {
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader! } },
      });

      const token = authHeader!.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = claimsData.claims.sub as string;

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
    }

    console.log(`process-news-summaries called via ${isCronCall ? "cron" : "user"}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Service configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = supabaseAdmin;

    let mode: "all" | "titles_only" | "recheck_relevance" = "all";
    const rawBody = await req.text();
    if (rawBody) {
      try {
        const body = JSON.parse(rawBody) as { mode?: string };
        if (body.mode === "titles_only") {
          mode = "titles_only";
        } else if (body.mode === "recheck_relevance") {
          mode = "recheck_relevance";
        } else if (body.mode && body.mode !== "all") {
          return new Response(
            JSON.stringify({ error: "Invalid mode" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // One-time backlog cleanup: re-evaluate articles that already have a
    // summary (published before the relevance-check existed) and remove
    // the ones that don't actually belong in a real estate feed.
    //
    // This runs as a background task (EdgeRuntime.waitUntil) instead of
    // being driven by the client in a loop: the browser tab can be closed
    // or backgrounded and the sweep keeps running server-side. We respond
    // to the request immediately and keep processing batches until either
    // the backlog is empty or we're close to the platform's background-task
    // time ceiling (150s on the free plan) — if there's still backlog left
    // when we stop, clicking the button again just picks up where it left
    // off, since relevance_rechecked_at tracks progress in the database.
    if (mode === "recheck_relevance") {
      const recheckPrompt = `Você é um curador de notícias do mercado imobiliário brasileiro. Avalie se a notícia abaixo é GENUINAMENTE sobre o mercado imobiliário (compra, venda, aluguel, construção civil, incorporação, financiamento imobiliário, fundos imobiliários/FIIs, políticas habitacionais, grandes players do setor). O CONTEXTO e ASSUNTO PRINCIPAL precisam ser sobre imóveis — não basta mencionar uma palavra relacionada de passagem, e não importa qual fonte publicou. Notícias de política, esportes, entretenimento, acidentes, crime ou qualquer assunto sem relação direta com o setor imobiliário NÃO são relevantes, mesmo que mencionem termos como "residencial" ou "casa" incidentalmente.

Responda ESTRITAMENTE em JSON, sem texto antes/depois, sem markdown:
{"relevant": true} ou {"relevant": false, "reason": "explicação curta de 1 frase"}`;

      async function runRelevanceCleanup() {
        const startedAt = Date.now();
        const TIME_BUDGET_MS = 120_000;
        let totalProcessed = 0;
        let totalRemoved = 0;

        while (Date.now() - startedAt < TIME_BUDGET_MS) {
          const { data: backlog, error: backlogError } = await supabase
            .from("news")
            .select("id, title, full_text, summary_ai, region")
            .not("summary_ai", "is", null)
            .is("relevance_rechecked_at", null)
            .order("created_at", { ascending: true })
            .limit(10);

          if (backlogError) {
            console.error("Error fetching backlog:", backlogError);
            break;
          }
          if (!backlog || backlog.length === 0) {
            console.log(`Relevance cleanup: backlog empty, stopping. Total processed: ${totalProcessed}, removed: ${totalRemoved}`);
            break;
          }

          for (const item of backlog) {
            try {
              const content = (item.full_text || item.summary_ai || item.title || "").substring(0, 3000);
              const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-3-flash-preview",
                  messages: [
                    { role: "system", content: recheckPrompt },
                    { role: "user", content: `Título: ${item.title}\n\nConteúdo: ${content}` },
                  ],
                  max_tokens: 150,
                  temperature: 0.1,
                }),
              });

              let relevant = true;
              let reason: string | undefined;

              if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                const raw = aiData.choices?.[0]?.message?.content?.trim() || "";
                try {
                  const cleaned = raw.replace(/^```json\s*|^```\s*|```$/gm, "").trim();
                  const parsed = JSON.parse(cleaned);
                  if (typeof parsed.relevant === "boolean") relevant = parsed.relevant;
                  if (typeof parsed.reason === "string") reason = parsed.reason;
                } catch {
                  relevant = true;
                }
              } else {
                console.error(`AI error rechecking ${item.id}:`, aiResponse.status);
              }

              const updatePayload: Record<string, unknown> = {
                relevance_rechecked_at: new Date().toISOString(),
                is_relevant: relevant,
              };
              if (!relevant) {
                updatePayload.summary_ai = null;
                updatePayload.rejection_reason = reason ?? null;
              }

              await supabase.from("news").update(updatePayload).eq("id", item.id);

              totalProcessed++;
              if (!relevant) totalRemoved++;
            } catch (err) {
              console.error(`Error rechecking news ${item.id}:`, err);
            }
          }

          if (Date.now() - startedAt >= TIME_BUDGET_MS) {
            console.log(`Relevance cleanup: time budget reached, stopping for now. Processed: ${totalProcessed}, removed: ${totalRemoved}`);
            break;
          }
        }
      }

      // @ts-ignore — EdgeRuntime is a Supabase/Deno Deploy global, not in standard lib types
      EdgeRuntime.waitUntil(runRelevanceCleanup());

      return new Response(
        JSON.stringify({ started: true, message: "Faxina iniciada em segundo plano" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch news articles that need summaries OR international titles still in English (backfill)
    // Heuristic: international news whose title contains common English stopwords likely not translated yet.
    const { data: missingSummary, error: fetchError } = mode === "titles_only"
      ? { data: [], error: null }
      : await supabase
          .from("news")
          .select("id, title, full_text, topics, region, summary_ai, is_relevant")
          .is("summary_ai", null)
          .is("is_relevant", null)
          .limit(10);

    // Backfill: international news that haven't been translated yet (title_original is null)
    const { data: untranslatedIntl, error: untranslatedError } = await supabase
      .from("news")
      .select("id, title, full_text, topics, region, summary_ai, is_relevant")
      .neq("region", "Brazil")
      .is("title_original", null)
      .limit(40);

    const seen = new Set<string>();
    const newsToProcess = [...(missingSummary ?? []), ...(untranslatedIntl ?? [])].filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });

    if (fetchError || untranslatedError) {
      console.error("Error fetching news:", fetchError ?? untranslatedError);
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

    const results: Array<{ id: string; status: string }> = [];

    async function processNews(news: typeof newsToProcess[number]): Promise<{ id: string; status: string }> {
      try {
        if (!news.full_text && !news.title) {
          return { id: news.id, status: "skipped_empty" };
        }

        let displayTitle = news.title;
        const isInternational = !!(news.region && news.region !== "Brazil");
        let translatedTitle: string | null = null;
        if (isInternational && news.title) {
          translatedTitle = await translateTitleToPtBr(news.title);
          if (translatedTitle && translatedTitle !== news.title) {
            displayTitle = translatedTitle;
          }
        }

        if (mode === "titles_only") {
          if (!isInternational || !news.title) {
            return { id: news.id, status: "skipped_not_intl" };
          }

          const updatePayload: Record<string, unknown> = {
            title_original: news.title.substring(0, 500),
          };

          if (translatedTitle && translatedTitle !== news.title) {
            updatePayload.title = translatedTitle.substring(0, 500);
          }

          // Re-detect topics on the translated PT-BR title + summary.
          // Fixes intl news that came in with wrong/missing topics from English-only detection.
          const detected = detectTopics(
            (translatedTitle || news.title) ?? "",
            (news as { summary_ai?: string | null }).summary_ai ?? "",
          );
          if (detected.length > 0) {
            updatePayload.topics = detected;
          }

          const { error: updateError } = await supabase
            .from("news")
            .update(updatePayload)
            .eq("id", news.id);

          return { id: news.id, status: updateError ? "update_failed" : "title_translated" };
        }

        const alreadyHasSummary = !!(news as { summary_ai?: string | null }).summary_ai;

        // Backfill mode (summary already exists): persist title_original + translated title + re-detect topics
        if (alreadyHasSummary) {
          if (!isInternational) return { id: news.id, status: "skipped_not_intl" };
          const updatePayload: Record<string, unknown> = {
            title_original: news.title.substring(0, 500),
          };
          if (translatedTitle && translatedTitle !== news.title) {
            updatePayload.title = translatedTitle.substring(0, 500);
          }
          const detected = detectTopics(
            (translatedTitle || news.title) ?? "",
            (news as { summary_ai?: string | null }).summary_ai ?? "",
          );
          if (detected.length > 0) {
            updatePayload.topics = detected;
          }
          const { error: updateError } = await supabase
            .from("news")
            .update(updatePayload)
            .eq("id", news.id);
          return { id: news.id, status: updateError ? "update_failed" : "title_translated" };
        }

        // Generate summary (and, in the same call, judge whether the
        // article is genuinely about the real estate market — see the
        // is_relevant column added in
        // supabase/migrations/20260711040000_add_news_is_relevant.sql).
        // The keyword-based filter in aggregate-news/index.ts is a cheap
        // first pass; this catches articles that merely mention a related
        // word without actually being about real estate.
        const content = news.full_text || displayTitle;
        const topics = Array.isArray(news.topics) ? news.topics : [];
        const topicsContext = topics.length
          ? `Tópicos detectados automaticamente (podem estar incorretos, não use como confirmação): ${topics.join(", ")}.`
          : "";

        const systemPrompt = `Você é um curador e editor especializado em notícias do mercado imobiliário brasileiro, para um app de inteligência de mercado voltado a corretores, incorporadoras e investidores.

Sua tarefa tem duas partes:

1. Avaliar se a notícia é GENUINAMENTE sobre o mercado imobiliário (compra, venda, aluguel, construção civil, incorporação, financiamento imobiliário, fundos imobiliários/FIIs, políticas habitacionais, grandes players do setor, etc). Não basta a notícia mencionar de passagem uma palavra relacionada (ex: "casa", "juros", "construção") — o CONTEXTO e o ASSUNTO PRINCIPAL da notícia precisam ser sobre o setor imobiliário. Notícias de economia geral, política, esportes, entretenimento, acidentes, crimes ou qualquer outro assunto que não seja sobre imóveis NÃO são relevantes, mesmo que venham de uma fonte que normalmente cobre o setor.

Exemplo de notícia que deve ser REJEITADA (relevant: false): uma matéria sobre um corredor ferido por um touro durante um festival na Espanha. Isso é notícia de acidente/entretenimento internacional, sem NENHUMA relação com imóveis — mesmo que tenha vindo de uma fonte cadastrada como "imobiliária", o conteúdo da matéria em si é o que importa, não a fonte.

Exemplo de notícia que deve ser ACEITA (relevant: true): "Construtora X anuncia lançamento de empreendimento residencial de alto padrão em São Paulo" — assunto central é claramente sobre o setor imobiliário.

Os "tópicos relacionados" fornecidos abaixo (se houver) vêm de uma detecção automática simples por palavras-chave e PODEM ESTAR ERRADOS — não os use como confirmação de relevância. Julgue apenas pelo título e conteúdo reais da notícia.

2. Se for relevante, escrever um resumo conciso (3-4 frases, 50-80 palavras), em português brasileiro formal mas acessível, com tom neutro e jornalístico, destacando os pontos mais importantes e números/dados quando disponíveis.

Responda ESTRITAMENTE em formato JSON, sem nenhum texto antes ou depois, sem markdown, no formato exato:
{"relevant": true, "summary": "texto do resumo aqui"}
ou, se não for relevante:
{"relevant": false, "summary": null, "rejection_reason": "categoria curta + explicação de 1 frase"}

Para o campo rejection_reason, comece com uma CATEGORIA curta em maiúsculas entre colchetes, seguida de uma frase explicando. Categorias possíveis:
[ECONOMIA_GERAL] — matéria de macroeconomia sem foco no setor
[POLITICA] — política/eleições sem relação direta com imóveis
[OUTRO_SETOR] — outro setor econômico que só cita termo relacionado
[MENCAO_INCIDENTAL] — só menciona uma palavra-chave de passagem
[NAO_RELACIONADO] — esportes, entretenimento, acidentes, crime, ou qualquer notícia geral sem nenhuma relação econômica ou imobiliária
[CONTEUDO_INSUFICIENTE] — texto vazio, muito curto ou ilegível
[OUTRO] — qualquer outro motivo (explique)`;

        const userPrompt = `Avalie e, se aplicável, resuma a seguinte notícia:

Título: ${displayTitle}

${topicsContext}

Conteúdo:
${content.substring(0, 4000)}

Responda apenas com o JSON, no formato especificado.`;

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
            max_tokens: 350,
            temperature: 0.3,
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI error for news ${news.id}:`, aiResponse.status);
          return { id: news.id, status: "ai_error" };
        }

        const aiData = await aiResponse.json();
        const rawContent = aiData.choices?.[0]?.message?.content?.trim() || "";

        // Parse the model's JSON response. Strip a ```json fence if the
        // model added one despite instructions not to, and fail open
        // (treat as relevant, keep the raw text as the summary) if parsing
        // fails — a formatting hiccup isn't evidence the article is
        // irrelevant, and this matches the previous (pre-relevance-check)
        // behavior as the fallback.
        let relevant = true;
        let summary: string | null = null;
        let rejectionReason: string | null = null;
        try {
          const cleaned = rawContent.replace(/^```json\s*|^```\s*|```$/gm, "").trim();
          const parsed = JSON.parse(cleaned);
          if (typeof parsed.relevant === "boolean") {
            relevant = parsed.relevant;
          }
          summary = typeof parsed.summary === "string" ? parsed.summary.trim() : null;
          if (typeof parsed.rejection_reason === "string") {
            rejectionReason = parsed.rejection_reason.trim().substring(0, 500) || null;
          }
        } catch (parseErr) {
          console.warn(`Could not parse relevance/summary JSON for news ${news.id}, failing open:`, parseErr);
          summary = rawContent || null;
        }

        if (!relevant) {
          const { error: updateError } = await supabase
            .from("news")
            .update({ is_relevant: false, rejection_reason: rejectionReason })
            .eq("id", news.id);
          console.log(`Filtered out non-real-estate article: ${displayTitle?.substring(0, 60)}... | reason: ${rejectionReason ?? "n/a"}`);
          return { id: news.id, status: updateError ? "update_failed" : "filtered_not_relevant" };
        }

        if (!summary) return { id: news.id, status: "no_summary" };

        const updatePayload: Record<string, unknown> = { summary_ai: summary, is_relevant: true };
        if (isInternational && news.title) {
          updatePayload.title_original = news.title.substring(0, 500);
        }
        if (translatedTitle && translatedTitle !== news.title) {
          updatePayload.title = translatedTitle.substring(0, 500);
        }
        // Re-detect topics now that we have the (possibly translated) title + new PT-BR summary.
        const detectedAfter = detectTopics(displayTitle ?? "", summary);
        if (detectedAfter.length > 0) {
          updatePayload.topics = detectedAfter;
        }

        const { error: updateError } = await supabase
          .from("news")
          .update(updatePayload)
          .eq("id", news.id);

        return { id: news.id, status: updateError ? "update_failed" : "success" };
      } catch (err) {
        console.error(`Error processing news ${news.id}:`, err);
        return { id: news.id, status: "error" };
      }
    }

    // Process in parallel chunks (concurrency = 5) to stay under timeout while respecting rate limits
    const CONCURRENCY = 5;
    for (let i = 0; i < newsToProcess.length; i += CONCURRENCY) {
      const chunk = newsToProcess.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.all(chunk.map((n) => processNews(n)));
      results.push(...chunkResults);
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
