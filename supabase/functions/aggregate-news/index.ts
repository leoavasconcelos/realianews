import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// URL validation helper
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Decodes common HTML entities (numeric and named) that RSS feeds often
// leave un-decoded in titles/descriptions — without this, users would see
// raw codes like "&#8216;" instead of a curly quote character.
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

// Text sanitization helper
function sanitizeText(text: string, maxLength: number): string {
  return decodeHtmlEntities(
    text
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/<[^>]*>/g, '')
  )
    .trim()
    .substring(0, maxLength);
}

// RSS feed sources for Brazilian real estate news
const RSS_FEEDS = [
  // Specialized real estate sources
  {
    name: "Portal VGV",
    url: "https://www.vgv.com.br/feed/",
    sourceId: null as string | null,
    region: "Brazil",
  },
  {
    name: "Imovelweb Notícias",
    url: "https://www.imovelweb.com.br/noticias/feed/",
    sourceId: null as string | null,
    region: "Brazil",
  },
  {
    name: "ZAP Imóveis",
    url: "https://revista.zapimoveis.com.br/feed/",
    sourceId: null as string | null,
    region: "Brazil",
  },
  {
    name: "VivaReal",
    url: "https://www.vivareal.com.br/blog/feed/",
    sourceId: null as string | null,
    region: "Brazil",
  },
  {
    name: "ABRAINC",
    url: "https://www.abrainc.org.br/feed/",
    sourceId: null as string | null,
    region: "Brazil",
  },
  {
    name: "Secovi-SP",
    url: "https://www.secovi.com.br/noticias/rss",
    sourceId: null as string | null,
    region: "Brazil",
  },
  {
    name: "CBIC",
    url: "https://cbic.org.br/feed/",
    sourceId: null as string | null,
    region: "Brazil",
  },
  {
    name: "Portal DF Imóveis",
    url: "https://www.dfimoveis.com.br/blog/feed/",
    sourceId: null as string | null,
    region: "Brazil",
  },
  {
    name: "Imobi Report",
    url: "https://imobireport.com.br/feed/",
    sourceId: null as string | null,
    region: "Brazil",
  },
  {
    name: "Forbes Brasil",
    tier: "general" as const,
    url: "https://forbes.com.br/feed/",
    sourceId: null as string | null,
    region: "Brazil",
  },
  {
    name: "Estadão Imóveis",
    tier: "general" as const,
    url: "https://www.estadao.com.br/rss/economia.xml",
    sourceId: null as string | null,
    region: "Brazil",
  },
  // General economy sources (filtered for real estate)
  {
    name: "InfoMoney",
    tier: "general" as const,
    url: "https://www.infomoney.com.br/feed/",
    sourceId: null as string | null,
    region: "Brazil",
  },
  {
    name: "Valor Econômico",
    tier: "general" as const,
    url: "https://valor.globo.com/rss/",
    sourceId: null as string | null,
    region: "Brazil",
  },
  {
    name: "Exame",
    tier: "general" as const,
    url: "https://exame.com/feed/",
    sourceId: null as string | null,
    region: "Brazil",
  },
  {
    name: "Money Times",
    tier: "general" as const,
    url: "https://www.moneytimes.com.br/feed/",
    sourceId: null as string | null,
    region: "Brazil",
  },
  // International sources - USA
  {
    name: "Inman News",
    url: "https://feeds.feedburner.com/inmannews",
    sourceId: null as string | null,
    region: "USA",
  },
  {
    name: "HousingWire",
    url: "https://www.housingwire.com/feed/",
    sourceId: null as string | null,
    region: "USA",
  },
  {
    name: "Realtor.com",
    url: "https://www.realtor.com/news/feed/",
    sourceId: null as string | null,
    region: "USA",
  },
  {
    name: "Commercial Property Executive",
    url: "https://www.commercialsearch.com/news/feed/",
    sourceId: null as string | null,
    region: "USA",
  },
  // International sources - Europe
  {
    name: "Property Week UK",
    url: "https://www.propertyweek.com/news/feed",
    sourceId: null as string | null,
    region: "Europe",
  },
  {
    name: "Property Week Residential",
    url: "https://www.propertyweek.com/markets/residential/feed",
    sourceId: null as string | null,
    region: "Europe",
  },
  // International sources - Middle East
  {
    name: "Zawya MENA",
    tier: "general" as const,
    url: "https://www.zawya.com/en/rss-feed",
    sourceId: null as string | null,
    region: "Middle East",
  },
  // International sources - Asia
  {
    name: "South China Morning Post Property",
    url: "https://www.scmp.com/rss/96/feed",
    sourceId: null as string | null,
    region: "World",
  },
  {
    name: "Mingtiandi",
    url: "https://www.mingtiandi.com/feed/",
    sourceId: null as string | null,
    region: "World",
  },
  {
    name: "EdgeProp Singapore",
    url: "https://www.edgeprop.sg/rss.xml",
    sourceId: null as string | null,
    region: "World",
  },
  {
    name: "Nikkei Asia Real Estate",
    tier: "general" as const,
    url: "https://asia.nikkei.com/rss/feed/Business",
    sourceId: null as string | null,
    region: "World",
  },
  // International sources - Oceania
  {
    name: "Domain Australia",
    url: "https://www.domain.com.au/news/feed/",
    sourceId: null as string | null,
    region: "World",
  },
  {
    name: "Australian Financial Review Property",
    url: "https://www.afr.com/rss/property",
    sourceId: null as string | null,
    region: "World",
  },
  {
    name: "Property Council Australia",
    url: "https://www.propertycouncil.com.au/feed/",
    sourceId: null as string | null,
    region: "World",
  },
  // Global real estate consultancies
  {
    name: "Knight Frank Global",
    url: "https://www.knightfrank.com/rss/research",
    sourceId: null as string | null,
    region: "World",
  },
  {
    name: "JLL Research",
    url: "https://www.jll.com/rss/insights",
    sourceId: null as string | null,
    region: "World",
  },
  {
    name: "CBRE Insights",
    url: "https://www.cbre.com/rss/insights",
    sourceId: null as string | null,
    region: "World",
  },
  {
    name: "Savills Research",
    url: "https://www.savills.com/rss/research",
    sourceId: null as string | null,
    region: "World",
  },
];

// Real estate specific keywords for relevance filtering (Portuguese)
const REAL_ESTATE_KEYWORDS_PT = [
  // Core terms
  "imóvel", "imóveis", "imobiliário", "imobiliária", "imobiliárias",
  "incorporadora", "incorporadoras", "incorporação",
  // Property types
  "apartamento", "apartamentos", "casa própria", "compra de casa",
  "aluguel de casa", "terreno", "terrenos",
  "lote", "lotes", "sala comercial", "salas comerciais", "galpão", "galpões",
  "loja", "lojas", "escritório", "escritórios", "cobertura", "coberturas",
  "kitnet", "kitnets", "studio", "studios", "flat", "flats",
  // Market terms
  "construtora", "construtoras", "construção civil", "lançamento imobiliário",
  "empreendimento", "empreendimentos", "condomínio", "condomínios",
  "prédio", "prédios", "edifício", "edifícios", "residencial", "residenciais",
  // Financial terms
  "financiamento imobiliário", "crédito imobiliário", "hipoteca",
  "fgts habitação", "fgts moradia", "fii", "fiis", "fundos imobiliários",
  "fundo imobiliário", "cri", "cris", "lci", "lcis",
  // Rental terms
  "aluguel", "aluguéis", "locação", "locações", "inquilino", "inquilinos",
  "locador", "locadores", "igp-m", "reajuste aluguel",
  // Government programs
  "minha casa minha vida", "mcmv", "casa verde amarela",
  "programa habitacional", "habitação popular", "moradia popular",
  // Major companies
  "mrv", "cyrela", "eztec", "tenda", "direcional", "cury", "moura dubeux",
  "even", "gafisa", "tecnisa", "helbor", "trisul", "lavvi", "plano&plano",
  "mitre", "melnick", "rni", "tegra",
  // Industry associations
  "abrainc", "secovi", "sinduscon", "cbic",
  // Related terms
  "setor imobiliário", "mercado imobiliário", "corretor de imóveis",
  "corretagem", "compra e venda de imóveis", "metro quadrado", "m²",
];

// Real estate specific keywords for relevance filtering (English)
const REAL_ESTATE_KEYWORDS_EN = [
  // Core terms
  "real estate", "property", "properties", "housing", "home prices", "home sales",
  "home buyers", "home builders", "residential", "commercial", "industrial", "retail",
  // Property types
  "apartment", "apartments", "condo", "condos", "condominium",
  "townhouse", "duplex", "mansion", "penthouse", "loft",
  "office", "offices", "warehouse", "retail space",
  // Market terms
  "developer", "developers", "construction", "building", "buildings",
  "reit", "reits", "real estate investment trust",
  "mortgage", "mortgages", "home loan", "home loans",
  // Rental terms
  "rent", "rental", "rentals", "lease", "leasing", "tenant", "landlord",
  // Major companies
  "zillow", "redfin", "realtor", "keller williams", "coldwell banker",
  "cbre", "jll", "cushman wakefield", "colliers",
  // Industry terms
  "nar", "national association of realtors",
  "housing market", "property market", "home sales", "home prices",
  "interest rates", "fed rate", "federal reserve",
];

// Word-boundary keyword matching. The previous implementation used
// text.includes(keyword), i.e. SUBSTRING matching — which meant short
// keywords matched inside unrelated words: "cri" (the CRI security)
// matched "crise"/"crime"/"criminalizar", "tegra" (the builder) matched
// "íntegra", "even" (the builder) matched "evento", "tenda" (the
// builder) matched the common noun "tenda". That was the single biggest
// reason unrelated general news kept flooding the feed. This version
// requires the keyword to appear as a whole word/phrase (unicode-aware,
// so accented Portuguese characters count as letters).
function matchesKeyword(text: string, keyword: string): boolean {
  const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "iu").test(text);
}

// Core terms that unambiguously signal real-estate subject matter. News
// from GENERAL sources (economy/finance feeds that cover everything) must
// match at least one of these to enter the pipeline — a single incidental
// keyword is not enough for those sources. Specialized real-estate sources
// keep the looser 1-keyword rule since their content is on-topic by
// definition.
const CORE_TERMS_PT = [
  "imóvel", "imóveis", "imobiliário", "imobiliária", "imobiliárias",
  "incorporadora", "incorporadoras", "incorporação", "construtora", "construtoras",
  "fii", "fiis", "fundo imobiliário", "fundos imobiliários",
  "financiamento imobiliário", "crédito imobiliário", "aluguel", "locação",
  "minha casa minha vida", "mcmv", "construção civil", "lançamento imobiliário",
];

const CORE_TERMS_EN = [
  "real estate", "property market", "housing market", "property prices",
  "home prices", "home sales", "homebuilder", "homebuilders", "mortgage",
  "mortgages", "reit", "reits", "commercial property", "residential property",
  "property developer", "rental market", "landlord", "landlords",
];

function isRealEstateRelevant(
  title: string,
  description: string,
  isInternational: boolean = false,
  sourceTier: "specialized" | "general" = "specialized",
): boolean {
  const text = `${title} ${description}`.toLowerCase();

  const keywords = isInternational ? REAL_ESTATE_KEYWORDS_EN : REAL_ESTATE_KEYWORDS_PT;
  const coreTerms = isInternational ? CORE_TERMS_EN : CORE_TERMS_PT;

  const matchCount = keywords.filter((keyword) => matchesKeyword(text, keyword)).length;

  if (sourceTier === "general") {
    // General-news sources publish about everything; require an
    // unambiguous core real-estate term, not just any keyword.
    return coreTerms.some((term) => matchesKeyword(text, term));
  }

  // Specialized real-estate sources: one whole-word keyword match suffices.
  return matchCount >= 1;
}

interface ParsedArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrl?: string;
}

function extractTextContent(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*><!\\\[CDATA\\\[([\\s\\S]*?)\\\]\\\]><\\/${tagName}>|<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  if (match) {
    return (match[1] || match[2] || '').trim();
  }
  return '';
}

function extractImageUrl(itemXml: string): string | undefined {
  // Try media:content
  const mediaMatch = itemXml.match(/<media:content[^>]*url=["']([^"']+)["']/i);
  if (mediaMatch) return mediaMatch[1];

  // Try enclosure
  const enclosureMatch = itemXml.match(/<enclosure[^>]*url=["']([^"']+)["']/i);
  if (enclosureMatch) return enclosureMatch[1];

  // Try image in content
  const imgMatch = itemXml.match(/<img[^>]*src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];

  return undefined;
}

// Fetches the article's own page and pulls its real image from standard
// social-sharing meta tags (og:image / twitter:image).
async function fetchArticleOgImage(articleUrl: string, timeoutMs = 6000): Promise<string | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(articleUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; REaliaBot/1.0; +https://realia.digital)",
        "Accept": "text/html",
      },
      signal: controller.signal,
    });

    if (!response.ok) return undefined;

    const reader = response.body?.getReader();
    if (!reader) return undefined;

    const decoder = new TextDecoder();
    let html = "";
    const maxBytes = 200_000;
    let bytesRead = 0;

    while (bytesRead < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.length;
      html += decoder.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
    reader.cancel().catch(() => {});

    const ogMatch = html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch?.[1]) return ogMatch[1];

    const twitterMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    if (twitterMatch?.[1]) return twitterMatch[1];

    return undefined;
  } catch (err) {
    console.warn(`Could not fetch og:image for ${articleUrl}:`, err instanceof Error ? err.message : err);
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

function parseRSS(xmlText: string): ParsedArticle[] {
  const articles: ParsedArticle[] = [];
  
  // Split by item tags
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemXml = match[1];
    
    const title = extractTextContent(itemXml, 'title');
    const link = extractTextContent(itemXml, 'link');
    const description = extractTextContent(itemXml, 'description');
    const pubDate = extractTextContent(itemXml, 'pubDate');
    const imageUrl = extractImageUrl(itemXml);
    
    if (title && link) {
      articles.push({
        title,
        link,
        description: sanitizeText(description, 500),
        pubDate,
        imageUrl,
      });
    }
  }
  
  return articles;
}

// Translate a foreign-language title to Brazilian Portuguese.
// Returns the translated title, or the original on any failure.
async function translateTitleToPtBr(
  title: string,
  apiKey: string
): Promise<string> {
  try {
    const systemPrompt = `Você é um tradutor especializado em jornalismo do mercado imobiliário.
Traduza títulos de notícias para português brasileiro de forma natural, fluente e jornalística.

Diretrizes:
- Traduza SEMPRE para português brasileiro, mesmo títulos curtos ou ambíguos
- Mantenha o tom jornalístico e o sentido original
- Não adicione aspas, prefixos como "Tradução:" nem explicações
- Mantenha nomes próprios, siglas e marcas no original (ex.: Fed, BlackRock, NYC)
- Adapte termos técnicos para equivalentes em português quando houver
- Preserve números, percentuais e moedas
- Responda APENAS com o título traduzido, em uma única linha`;

    const userPrompt = `Traduza este título de notícia para português brasileiro:\n\n${title}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 150,
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      console.error(`Title translation AI error:`, aiResponse.status);
      return title;
    }

    const aiData = await aiResponse.json();
    const translated = aiData.choices?.[0]?.message?.content?.trim();
    if (!translated) return title;

    // Strip surrounding quotes if the model added them
    return translated.replace(/^["'`]+|["'`]+$/g, "").trim() || title;
  } catch (err) {
    console.error("translateTitleToPtBr error:", err);
    return title;
  }
}

async function generateAISummary(
  newsId: string,
  title: string,
  content: string,
  topics: string[],
  apiKey: string,
  supabaseClient: any
): Promise<boolean> {
  try {
    const topicsContext = topics.length 
      ? `Tópicos relacionados: ${topics.join(", ")}.` 
      : "";

    const systemPrompt = `Você é um especialista em resumir notícias do mercado imobiliário. 
Seu objetivo é criar resumos concisos, informativos e SEMPRE em português brasileiro.

Diretrizes:
- SEMPRE escreva o resumo em português brasileiro, mesmo se a notícia original estiver em inglês ou outro idioma
- Traduza termos técnicos para equivalentes em português quando apropriado
- O resumo deve ter no máximo 3-4 frases (cerca de 50-80 palavras)
- Destaque os pontos mais importantes e impactantes
- Inclua números e dados relevantes quando disponíveis
- Mantenha um tom neutro e jornalístico`;

    const userPrompt = `Crie um resumo conciso da seguinte notícia:

Título: ${title}

${topicsContext}

Conteúdo:
${content.substring(0, 4000)}

Responda APENAS com o resumo.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
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
      console.error(`AI error for news ${newsId}:`, aiResponse.status);
      return false;
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content?.trim();

    if (summary) {
      const { error: updateError } = await supabaseClient
        .from("news")
        .update({ summary_ai: summary })
        .eq("id", newsId);

      if (updateError) {
        console.error(`Failed to update summary for ${newsId}:`, updateError);
        return false;
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Error generating summary for ${newsId}:`, err);
    return false;
  }
}

// Topic detection aligned with the `topics` table names.
// Uses word-boundary regex matching (PT + EN keywords) to avoid false positives
// like "cri" matching "escritório" or "fii" matching "edifício".
// Exported via export so process-news-summaries can re-detect after translation.
export function detectTopics(title: string, description: string): string[] {
  const text = `${title || ""} ${description || ""}`.toLowerCase();
  const topics: string[] = [];

  // Each entry: topic name (must match `topics` table) -> array of keyword regex sources.
  // Multi-word phrases use \\s+ for whitespace. Single-word entries get \\b word boundaries.
  const topicKeywords: Record<string, string[]> = {
    "Fundos Imobiliários": [
      "\\bfii\\b", "\\bfiis\\b", "fundo\\s+imobili[áa]rio", "fundos\\s+imobili[áa]rios",
      "\\breit\\b", "\\breits\\b", "real\\s+estate\\s+investment\\s+trust",
      "\\bcri\\b", "\\bcris\\b", "certificado\\s+de\\s+receb[íi]veis",
      "\\bfiagro\\b",
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
      "data\\s+center", "data\\s+centers", "centro\\s+de\\s+dados", "hyperscale",
      "colocation",
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

// Rate limiting: 1 request per 5 minutes per user
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY || !supabaseUrl || !supabaseServiceKey) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({ error: "Service configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authentication: allow cron secret or admin user
    const cronSecret = Deno.env.get("CRON_SECRET");
    const cronHeader = req.headers.get("X-Cron-Secret");
    const isCronCall = !!(cronSecret && cronHeader && cronHeader === cronSecret);

    const authHeader = req.headers.get("Authorization");
    if (!isCronCall && !authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isCronCall) {
      // User call: validate JWT and check admin role
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = claimsData.claims.sub as string;

      // Rate limit check (only for user calls)
      const now = Date.now();
      const lastCall = rateLimitMap.get(userId);
      if (lastCall && now - lastCall < RATE_LIMIT_WINDOW_MS) {
        const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - lastCall)) / 1000);
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retryAfter) } }
        );
      }
      rateLimitMap.set(userId, now);

      // Check admin/moderator role
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
    }

    console.log(`aggregate-news called via ${isCronCall ? "cron" : "user"}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get source IDs from database
    const { data: sources } = await supabase
      .from("sources")
      .select("id, name")
      .eq("is_active", true);

    const sourceMap = new Map(sources?.map(s => [s.name, s.id]) || []);

    const results = {
      fetched: 0,
      inserted: 0,
      duplicates: 0,
      summariesGenerated: 0,
      errors: [] as string[],
    };

    for (const feed of RSS_FEEDS) {
      try {
        console.log(`Fetching feed: ${feed.name}`);
        
        const response = await fetch(feed.url, {
          headers: {
            "User-Agent": "REalia News Aggregator/1.0",
            "Accept": "application/rss+xml, application/xml, text/xml",
          },
        });

        if (!response.ok) {
          results.errors.push(`Failed to fetch ${feed.name}: ${response.status}`);
          continue;
        }

        const xmlText = await response.text();
        const articles = parseRSS(xmlText);
        results.fetched += articles.length;

        console.log(`Parsed ${articles.length} articles from ${feed.name}`);

        for (const article of articles) {
          // Check if article already exists
          const { data: existing } = await supabase
            .from("news")
            .select("id")
            .eq("source_url", article.link)
            .single();

          if (existing) {
            results.duplicates++;
            continue;
          }

          // Check if article is relevant to real estate
          const isInternational = feed.region !== "Brazil";
          const sourceTier = (feed as { tier?: "specialized" | "general" }).tier ?? "specialized";
          if (!isRealEstateRelevant(article.title, article.description, isInternational, sourceTier)) {
            console.log(`Skipping non-real-estate article: ${article.title.substring(0, 50)}...`);
            continue;
          }

          // Detect topics from content
          const topics = detectTopics(article.title, article.description);

          // Parse publication date
          let publishedAt = new Date().toISOString();
          if (article.pubDate) {
            try {
              publishedAt = new Date(article.pubDate).toISOString();
            } catch {
              // Keep default
            }
          }

          // Validate URLs before insertion
          if (!isValidUrl(article.link)) {
            console.log(`Skipping article with invalid URL: ${article.link?.substring(0, 50)}`);
            continue;
          }

          // Prefer the real image from the article's own page (og:image) over
          // whatever the RSS feed provided — some sources reuse one generic
          // thumbnail across many articles in their feed.
          const pageImageUrl = await fetchArticleOgImage(article.link);
          const candidateImageUrl = pageImageUrl || article.imageUrl;
          const validImageUrl = candidateImageUrl && isValidUrl(candidateImageUrl) ? candidateImageUrl : null;

          // Translate the title to PT-BR for international (non-Brazil) feeds.
          // Preserve the original (English/foreign) title in `title_original`.
          const originalTitle = sanitizeText(article.title, 500);
          let finalTitle = originalTitle;
          let titleOriginal: string | null = null;
          if (isInternational && finalTitle) {
            const translated = await translateTitleToPtBr(finalTitle, LOVABLE_API_KEY);
            const translatedSanitized = sanitizeText(translated, 500);
            if (translatedSanitized && translatedSanitized !== finalTitle) {
              titleOriginal = originalTitle;
              finalTitle = translatedSanitized;
            }
          }

          // Insert new article with sanitized data
          const { data: insertedNews, error: insertError } = await supabase
            .from("news")
            .insert({
              title: finalTitle,
              title_original: titleOriginal,
              full_text: sanitizeText(article.description, 5000),
              source_url: article.link,
              image_url: validImageUrl,
              source_id: sourceMap.get(feed.name) || null,
              topics: topics,
              published_at: publishedAt,
              is_trending: false,
              region: feed.region || "Brazil",
            })
            .select("id")
            .single();

          if (insertError) {
            console.error(`Insert error for ${feed.name}:`, insertError.message);
            results.errors.push(`Insert error for ${feed.name}`);
            continue;
          }

          results.inserted++;

          // Generate AI summary for the new article
          if (insertedNews && article.description) {
            const summarySuccess = await generateAISummary(
              insertedNews.id,
              finalTitle,
              article.description,
              topics,
              LOVABLE_API_KEY,
              supabase
            );

            if (summarySuccess) {
              results.summariesGenerated++;
            }

            // Delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } catch (feedError) {
        results.errors.push(`Feed error ${feed.name}: ${feedError instanceof Error ? feedError.message : 'Unknown'}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Aggregation complete`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("aggregate-news error:", error);
    return new Response(
      JSON.stringify({ 
        error: "An error occurred processing your request",
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
