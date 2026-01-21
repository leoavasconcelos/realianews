import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// RSS feed sources for Brazilian real estate news
const RSS_FEEDS = [
  {
    name: "InfoMoney Imóveis",
    url: "https://www.infomoney.com.br/feed/",
    sourceId: null as string | null,
  },
  {
    name: "Estadão Economia",
    url: "https://www.estadao.com.br/rss/economia.xml",
    sourceId: null as string | null,
  },
  {
    name: "G1 Economia",
    url: "https://g1.globo.com/rss/g1/economia/",
    sourceId: null as string | null,
  },
  {
    name: "Folha Mercado",
    url: "https://feeds.folha.uol.com.br/mercado/rss091.xml",
    sourceId: null as string | null,
  },
  {
    name: "Exame Economia",
    url: "https://exame.com/feed/economia/",
    sourceId: null as string | null,
  },
  {
    name: "CNN Brasil Economia",
    url: "https://www.cnnbrasil.com.br/economia/feed/",
    sourceId: null as string | null,
  },
  {
    name: "UOL Economia",
    url: "https://rss.uol.com.br/feed/economia.xml",
    sourceId: null as string | null,
  },
  {
    name: "Terra Economia",
    url: "https://www.terra.com.br/economia/rss.xml",
    sourceId: null as string | null,
  },
];

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
        description: description.replace(/<[^>]*>/g, '').substring(0, 500),
        pubDate,
        imageUrl,
      });
    }
  }
  
  return articles;
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

    const systemPrompt = `Você é um especialista em resumir notícias do mercado imobiliário brasileiro. 
Seu objetivo é criar resumos concisos, informativos e em português brasileiro.

Diretrizes:
- Escreva em português brasileiro formal mas acessível
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

function detectTopics(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const topics: string[] = [];
  
  const topicKeywords: Record<string, string[]> = {
    "Mercado": ["mercado", "setor", "economia", "crescimento", "queda", "alta"],
    "Financiamento": ["financiamento", "crédito", "juros", "taxa", "banco", "selic"],
    "Lançamentos": ["lançamento", "novo", "empreendimento", "projeto", "construção"],
    "Investimentos": ["investimento", "fii", "fundo", "rendimento", "retorno"],
    "Aluguel": ["aluguel", "locação", "inquilino", "locador"],
    "Comercial": ["comercial", "escritório", "loja", "shopping", "galpão"],
    "Residencial": ["residencial", "casa", "apartamento", "condomínio"],
    "Legislação": ["lei", "legislação", "regulamentação", "imposto", "tributo"],
  };
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => text.includes(kw))) {
      topics.push(topic);
    }
  }
  
  return topics.slice(0, 3);
}

serve(async (req) => {
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

          // Insert new article
          const { data: insertedNews, error: insertError } = await supabase
            .from("news")
            .insert({
              title: article.title,
              full_text: article.description,
              source_url: article.link,
              image_url: article.imageUrl,
              source_id: sourceMap.get(feed.name) || null,
              topics: topics,
              published_at: publishedAt,
              is_trending: false,
            })
            .select("id")
            .single();

          if (insertError) {
            results.errors.push(`Insert error: ${insertError.message}`);
            continue;
          }

          results.inserted++;

          // Generate AI summary for the new article
          if (insertedNews && article.description) {
            const summarySuccess = await generateAISummary(
              insertedNews.id,
              article.title,
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
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
