import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Topic detection aligned with `topics` table names.
// MUST stay in sync with aggregate-news/detectTopics and process-news-summaries/detectTopics.
function detectTopics(...texts: Array<string | null | undefined>): string[] {
  const text = texts.filter(Boolean).join(" ").toLowerCase();
  const topics: string[] = [];

  const topicKeywords: Record<string, string[]> = {
    "Fundos Imobiliários": [
      "\\bfii\\b", "\\bfiis\\b", "fundo\\s+imobili[áa]rio", "fundos\\s+imobili[áa]rios",
      "\\breit\\b", "\\breits\\b", "real\\s+estate\\s+investment\\s+trust",
      "\\bcri\\b", "\\bcris\\b", "certificado\\s+de\\s+receb[íi]veis", "\\bfiagro\\b",
    ],
    "Investimentos": [
      "investimento", "investidor", "investor", "investment", "yield", "rentabilidade",
      "retorno", "valoriza[çc][ãa]o", "ativo\\s+imobili[áa]rio", "real\\s+estate\\s+invest",
      "private\\s+equity", "venture\\s+capital",
    ],
    "Financiamento": [
      "financiamento", "cr[ée]dito\\s+imobili[áa]rio", "hipoteca", "mortgage", "loan",
      "\\bfgts\\b", "\\bselic\\b", "juros", "interest\\s+rate", "fed\\s+rate", "refinanc",
    ],
    "Aluguel": [
      "aluguel", "alugu[ée]is", "loca[çc][ãa]o", "inquilino", "locador", "locat[áa]rio",
      "\\brent\\b", "rental", "renting", "tenant", "landlord", "lease", "leasing",
      "\\bigp-m\\b", "\\bivar\\b",
    ],
    "Comercial": [
      "comercial", "escrit[óo]rio", "office", "loja", "varejo", "retail", "shopping",
      "shopping\\s+center", "\\bmall\\b", "commercial\\s+real\\s+estate", "\\bcre\\b",
    ],
    "Residencial": [
      "residencial", "residential", "apartamento", "apartment", "\\bcasa\\b", "house",
      "housing", "condom[íi]nio", "condo", "moradia", "habita[çc][ãa]o", "single-family",
      "multifamily",
    ],
    "Logística": [
      "log[íi]stica", "logistic", "galp[ãa]o", "warehouse", "industrial", "distribui[çc][ãa]o",
      "distribution\\s+center", "centro\\s+log[íi]stico", "fulfillment",
    ],
    "Sustentabilidade": [
      "sustentabilidade", "sustentável", "sustent[áa]vel", "sustainable", "sustainability",
      "\\besg\\b", "\\bgreen\\b", "carbon\\s+neutral", "net[\\s-]zero", "leed",
      "energia\\s+renov[áa]vel", "renewable\\s+energy", "efici[êe]ncia\\s+energ[ée]tica",
    ],
    "Luxo": [
      "\\bluxo\\b", "luxury", "high[\\s-]end", "alto\\s+padr[ãa]o", "premium",
      "ultra[\\s-]luxury", "mans[ãa]o", "mansion", "penthouse", "luxuoso", "luxuosa",
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
      "\\bstartup\\b", "\\bstartups\\b", "scale[\\s-]?up", "rodada\\s+de\\s+investimento",
      "funding\\s+round", "s[ée]rie\\s+[abc]\\b", "series\\s+[abc]\\b",
    ],
    "Regulamentação": [
      "regulamenta[çc][ãa]o", "regula[çc][ãa]o", "regulation", "legisla[çc][ãa]o",
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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const CRON_SECRET = Deno.env.get("CRON_SECRET");

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: "Service configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Auth: cron secret OR admin/moderator user
    const cronHeader = req.headers.get("x-cron-secret");
    const isCron = !!CRON_SECRET && cronHeader === CRON_SECRET;

    if (!isCron) {
      const authHeader = req.headers.get("Authorization") ?? "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      if (!token) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
      if (userErr || !userData.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      const allowed = (roles ?? []).some((r) => r.role === "admin" || r.role === "moderator");
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Parse optional body { batchSize?: number; onlyEmpty?: boolean; before?: string }
    let batchSize = 200;
    let onlyEmpty = true;
    let before: string | null = null;
    try {
      const raw = await req.text();
      if (raw) {
        const body = JSON.parse(raw) as { batchSize?: number; onlyEmpty?: boolean; before?: string };
        if (typeof body.batchSize === "number" && body.batchSize > 0 && body.batchSize <= 500) {
          batchSize = body.batchSize;
        }
        if (typeof body.onlyEmpty === "boolean") {
          onlyEmpty = body.onlyEmpty;
        }
        if (typeof body.before === "string" && body.before) {
          before = body.before;
        }
      }
    } catch {
      // ignore parse errors, use defaults
    }

    // Fetch a batch of news that need re-categorization.
    let query = supabaseAdmin
      .from("news")
      .select("id, title, title_original, full_text, summary_ai, topics, published_at")
      .order("published_at", { ascending: false })
      .limit(batchSize);

    if (onlyEmpty) {
      // Either NULL or empty array
      query = query.or("topics.is.null,topics.eq.[]");
    }

    if (before) {
      query = query.lt("published_at", before);
    }

    const { data: newsBatch, error: fetchError } = await query;
    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to fetch news" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!newsBatch || newsBatch.length === 0) {
      return new Response(
        JSON.stringify({ message: "No news to re-categorize", processed: 0, updated: 0, nextBefore: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let updated = 0;
    let unchanged = 0;
    let skipped = 0;

    for (const n of newsBatch) {
      const detected = detectTopics(n.title, n.title_original, n.full_text, n.summary_ai);
      if (detected.length === 0) {
        skipped++;
        continue;
      }
      const current = Array.isArray(n.topics) ? (n.topics as string[]) : [];
      const same =
        current.length === detected.length &&
        current.every((t) => detected.includes(t));
      if (same) {
        unchanged++;
        continue;
      }
      const { error: updErr } = await supabaseAdmin
        .from("news")
        .update({ topics: detected })
        .eq("id", n.id);
      if (!updErr) updated++;
    }

    const lastItem = newsBatch[newsBatch.length - 1] as { published_at?: string } | undefined;
    const nextBefore = newsBatch.length === batchSize ? (lastItem?.published_at ?? null) : null;

    return new Response(
      JSON.stringify({
        processed: newsBatch.length,
        updated,
        unchanged,
        skipped,
        nextBefore,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("recategorize-news-topics error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
