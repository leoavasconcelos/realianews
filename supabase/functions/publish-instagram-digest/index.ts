import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import React from "https://esm.sh/react@18.2.0";
import { ImageResponse } from "https://deno.land/x/og_edge@0.0.6/mod.ts";

type Mode = "preview" | "send" | "webhook_test";

interface InstagramSettings {
  id: string;
  webhook_url: string | null;
  enabled: boolean;
  schedule_hour: number;
  top_n: number;
}

interface NewsRow {
  id: string;
  title: string;
  summary_ai: string | null;
  topics: unknown;
  source_url: string;
  image_url: string | null;
  published_at: string;
  region: string | null;
  is_trending: boolean;
}

interface PublicationRow {
  id: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-cron-secret",
};

const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const BUCKET_NAME = "instagram-posts";
const DEFAULT_TOP_N = 5;
const MAX_TOP_N = 8;
const BRAND_URL = "https://realia.digital";
const SLIDE_SIZE = 864;
const WEBHOOK_TEST_IMAGE_URL = `${BRAND_URL}/placeholder.svg`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const parseTopics = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === "string");
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
};

const clampTopN = (value: unknown) => {
  const numeric = typeof value === "number" ? value : Number(value ?? DEFAULT_TOP_N);
  if (!Number.isFinite(numeric)) return DEFAULT_TOP_N;
  return Math.min(MAX_TOP_N, Math.max(1, Math.floor(numeric)));
};

const sourceNameFromUrl = (url: string) => {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname
      .split(".")
      .slice(0, -1)
      .join(" ")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  } catch {
    return "Fonte";
  }
};

const toHashtag = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();

const bulletize = (text: string, count = 3): string[] => {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const selected = sentences.length > 0 ? sentences.slice(0, count) : [text.trim()];

  return selected
    .map((sentence) => sentence.replace(/[.!?]+$/g, "").trim())
    .filter(Boolean)
    .slice(0, count);
};

const tightenLine = (text: string, maxLength: number) => {
  const cleaned = text.replace(/\s+/g, " ").trim().replace(/[.!?]+$/g, "");
  if (cleaned.length <= maxLength) return cleaned;

  const truncated = cleaned.slice(0, maxLength + 1);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated.slice(0, maxLength)).trim();
};

const toShortParagraph = (text: string, maxLength: number) => {
  const bullets = bulletize(text, 2);
  return tightenLine(bullets.join(". "), maxLength);
};

const buildRealiaReading = (newsItems: NewsRow[]) => {
  const analysisBase = newsItems
    .slice(0, 3)
    .map((item) => `${item.title} ${item.summary_ai || ""}`.toLowerCase())
    .join(" ");

  if (/(juros|selic|credito|financiamento|capital|funding|banco|spread)/.test(analysisBase)) {
    return "O ponto central não é só a manchete, mas o custo de capital por trás dela. Quando crédito e funding entram na equação, o mercado tende a premiar operação eficiente, balanço sólido e timing de execução.";
  }

  if (/(locacao|aluguel|demanda|vacancia|ocupacao|absor[cç][aã]o|vendas|ticket)/.test(analysisBase)) {
    return "A leitura mais importante está na demanda efetiva. Em um mercado mais seletivo, produto certo e preço correto seguem girando; o restante perde velocidade e margem.";
  }

  if (/(plano diretor|regulacao|licenciamento|prefeitura|zoneamento|lei|norma)/.test(analysisBase)) {
    return "Quando a mudança vem por regulação, o impacto raramente é imediato na manchete — ele aparece depois em preço de terreno, prazo de aprovação e apetite de investimento.";
  }

  if (/(logistica|industrial|escritorio|laje|galp[aã]o|shopping|varejo|multifamily|hotel)/.test(analysisBase)) {
    return "O sinal aqui é de reposicionamento de demanda e qualidade. Quem estiver melhor calibrado em produto, localização e ocupação tende a capturar valor antes do resto do mercado.";
  }

  return "Mais do que um fato isolado, o movimento reforça um mercado em que contexto vale tanto quanto notícia. A diferença competitiva está em interpretar cedo onde preço, liquidez e demanda podem se deslocar.";
};

const buildFinalInsight = (newsItems: NewsRow[]) => {
  const analysisBase = newsItems
    .map((item) => `${item.title} ${item.summary_ai || ""} ${parseTopics(item.topics).join(" ")}`.toLowerCase())
    .join(" ");

  const themes = [
    {
      score: (analysisBase.match(/juros|selic|credito|financiamento|funding|capital|spread|banco/g) || []).length,
      text: "No fim, a variável decisiva parece ser capital: onde o dinheiro encarece, a execução precisa ficar mais disciplinada — e isso muda quem consegue crescer com qualidade.",
    },
    {
      score: (analysisBase.match(/locacao|aluguel|vacancia|ocupacao|absor[cç][aã]o|demanda|ticket|vendas/g) || []).length,
      text: "O pano de fundo é demanda real: o mercado segue ativo, mas cada vez mais intolerante a produto mal calibrado, preço fora de contexto e tese sem lastro operacional.",
    },
    {
      score: (analysisBase.match(/regulacao|plano diretor|zoneamento|licenciamento|prefeitura|lei|norma/g) || []).length,
      text: "Quando a agenda dominante é regulatória, a consequência mais relevante costuma aparecer depois: repricing de terrenos, mudança de viabilidade e nova disputa por timing.",
    },
    {
      score: (analysisBase.match(/logistica|industrial|escritorio|laje|galp[aã]o|shopping|varejo|multifamily|hotel/g) || []).length,
      text: "O tema central aqui é reposicionamento de ativos: valor tende a migrar para tipologias e localizações capazes de sustentar ocupação, margem e recorrência com mais consistência.",
    },
  ];

  const bestTheme = themes.sort((a, b) => b.score - a.score)[0];
  if (bestTheme && bestTheme.score > 0) return bestTheme.text;

  return "O que une essas histórias não é o volume de notícia, mas a direção do mercado: capital mais seletivo, demanda mais criteriosa e vantagem para quem interpreta antes de reagir.";
};

const wrapLines = (text: string, maxChars: number) => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
};

const isUsableCoverImageUrl = (url: string | null) => {
  if (!url) return false;

  const normalized = url.trim().toLowerCase();
  if (!normalized) return false;

  const blockedFragments = ["placeholder", "default", "blank", "fallback", "/placeholder.svg"];
  return !blockedFragments.some((fragment) => normalized.includes(fragment));
};

const fetchImageDataUrl = async (_url: string | null) => null;

const slideShell = (children: React.ReactNode, background = "linear-gradient(135deg, #102A43 0%, #183A5A 60%, #1F7A72 100%)") =>
  React.createElement(
    "div",
    {
      style: {
        width: `${SLIDE_SIZE}px`,
        height: `${SLIDE_SIZE}px`,
        display: "flex",
        position: "relative",
        background,
        color: "#F8FAFC",
        fontFamily: "Inter, Arial, sans-serif",
      },
    },
    children,
  );

const renderToPng = async (node: React.ReactElement) => {
  const response = new ImageResponse(node, {
    width: SLIDE_SIZE,
    height: SLIDE_SIZE,
  });
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
};

const renderCoverPng = async (news: NewsRow, totalStories: number) => {
  const coverImage = await fetchImageDataUrl(news.image_url ?? null);
  const titleLines = wrapLines(news.title, 18).slice(0, 4);
  const topics = parseTopics(news.topics).slice(0, 2);
  const sourceName = sourceNameFromUrl(news.source_url);

  return renderToPng(
    slideShell(
      React.createElement(
        React.Fragment,
        null,
        coverImage
          ? React.createElement("img", {
              src: coverImage,
              width: SLIDE_SIZE,
              height: SLIDE_SIZE,
              style: {
                position: "absolute",
                inset: 0,
                objectFit: "cover",
              },
            })
          : null,
        React.createElement("div", {
          style: {
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(15,23,42,0.18) 0%, rgba(15,23,42,0.84) 100%)",
          },
        }),
        React.createElement(
          "div",
          {
            style: {
              position: "absolute",
              inset: "56px",
              borderRadius: "46px",
              border: "1px solid rgba(255,255,255,0.14)",
              padding: "32px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            },
          },
          React.createElement(
            "div",
            { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                },
              },
              React.createElement(
                "div",
                {
                  style: {
                    color: "#F8FAFC",
                    fontSize: "22px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  },
                },
                "REalia",
              ),
              React.createElement("div", {
                style: {
                  width: "96px",
                  height: "2px",
                  background: "rgba(248,250,252,0.85)",
                },
              }),
            ),
          ),
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "24px" } },
            React.createElement(
              "div",
              {
                style: {
                  color: "rgba(248,250,252,0.72)",
                  fontSize: "20px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                },
              },
              `Top ${totalStories} · editorial briefing`,
            ),
            ...titleLines.map((line) =>
              React.createElement(
                "div",
                {
                  key: line,
                  style: {
                    fontSize: "72px",
                    lineHeight: 0.98,
                    fontWeight: 800,
                    maxWidth: "860px",
                    letterSpacing: "-0.02em",
                  },
                },
                line,
              ),
            ),
          ),
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                gap: "24px",
                paddingTop: "28px",
                borderTop: "1px solid rgba(248,250,252,0.16)",
              },
            },
            React.createElement(
              "div",
              { style: { fontSize: "26px", color: "#E2E8F0", fontWeight: 500, maxWidth: "420px" } },
              sourceName,
            ),
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  alignItems: "flex-end",
                  textAlign: "right",
                },
              },
              React.createElement(
                "div",
                { style: { fontSize: "18px", color: "rgba(248,250,252,0.64)", textTransform: "uppercase", letterSpacing: "0.12em" } },
                coverImage ? "featured story" : "branded cover",
              ),
              React.createElement(
                "div",
                { style: { fontSize: "26px", color: "#F8FAFC", fontWeight: 700 } },
                topics.join(" · ") || "realia.digital",
              ),
            ),
          ),
        ),
      ),
      coverImage
        ? "linear-gradient(135deg, #05070B 0%, #0F172A 60%, #111827 100%)"
        : "radial-gradient(circle at top left, rgba(148,163,184,0.18) 0%, rgba(148,163,184,0.02) 26%, transparent 46%), linear-gradient(145deg, #030712 0%, #0B1120 54%, #111827 100%)",
    ),
  );
};

const buildWhatHappenedBullets = (newsItems: NewsRow[]) => {
  const lead = newsItems[0];
  const leadSummary = bulletize(lead.summary_ai || lead.title, 1)[0] || lead.title;
  const supporting = newsItems
    .slice(1, 3)
    .map((item) => `${sourceNameFromUrl(item.source_url)} amplia o quadro com ${tightenLine(item.title.toLowerCase(), 90)}`);

  return [
    tightenLine(leadSummary, 120),
    ...supporting,
    tightenLine(`O recorte reúne ${newsItems.length} sinais que apontam para a mesma direção competitiva no mercado.`, 110),
  ].slice(0, 3);
};

const buildWhyItMattersBullets = (newsItems: NewsRow[]) => {
  const analysisBase = newsItems.map((item) => `${item.title} ${item.summary_ai || ""}`).join(" ").toLowerCase();

  if (/(juros|selic|credito|financiamento|funding|capital|spread|banco)/.test(analysisBase)) {
    return [
      "Custo de capital volta ao centro da tomada de decisão.",
      "Projetos dependentes de alavancagem perdem margem de erro.",
      "Execução disciplinada ganha ainda mais peso na precificação.",
    ];
  }

  if (/(locacao|aluguel|vacancia|ocupacao|absor[cç][aã]o|demanda|ticket|vendas)/.test(analysisBase)) {
    return [
      "Demanda continua ativa, mas mais criteriosa no ponto de entrada.",
      "Produto e preço desalinhados tendem a perder velocidade.",
      "Quem lê tração real antes da concorrência captura valor primeiro.",
    ];
  }

  if (/(regulacao|plano diretor|zoneamento|licenciamento|prefeitura|lei|norma)/.test(analysisBase)) {
    return [
      "Mudança regulatória altera viabilidade antes de aparecer no preço final.",
      "Timing de aprovação volta a ser variável estratégica.",
      "Terra bem posicionada tende a reagir antes do mercado consolidado.",
    ];
  }

  return [
    "A disputa deixa de ser por volume e passa a ser por qualidade de leitura.",
    "Liquidez e demanda seguem presentes, mas com filtros mais rígidos.",
    "Contexto bem interpretado vira vantagem prática de execução.",
  ];
};

const buildRealiaInsightBullets = (newsItems: NewsRow[]) => {
  const reading = buildRealiaReading(newsItems);
  const closing = buildFinalInsight(newsItems);

  return [tightenLine(reading, 120), ...bulletize(closing, 2).map((item) => tightenLine(item, 100))].slice(0, 3);
};

const renderEditorialTextSlide = async ({
  section,
  title,
  bullets,
  footer,
}: {
  section: string;
  title: string;
  bullets: string[];
  footer: string;
}) => {
  const titleLines = wrapLines(title, 20).slice(0, 3);

  return renderToPng(
    slideShell(
      React.createElement(
        "div",
        {
          style: {
            position: "absolute",
            inset: "56px",
            borderRadius: "46px",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.02) 100%)",
            padding: "42px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          },
        },
        React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "24px" } },
          React.createElement(
            "div",
            { style: { color: "rgba(248,250,252,0.68)", fontSize: "20px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" } },
            section,
          ),
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "14px" } },
            ...titleLines.map((line) =>
              React.createElement(
                "div",
                { key: line, style: { fontSize: "66px", lineHeight: 0.98, fontWeight: 800, maxWidth: "860px", letterSpacing: "-0.02em" } },
                line,
              ),
            ),
          ),
        ),
        React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "28px", marginTop: "16px" } },
          ...bullets.map((bullet) =>
            React.createElement(
              "div",
              { key: bullet, style: { display: "flex", gap: "18px", alignItems: "flex-start" } },
              React.createElement("div", {
                style: {
                  width: "10px",
                  height: "10px",
                  minWidth: "10px",
                  borderRadius: "999px",
                  background: "#F8FAFC",
                  marginTop: "18px",
                },
              }),
              React.createElement(
                "div",
                { style: { fontSize: "34px", lineHeight: 1.32, color: "#E2E8F0", fontWeight: 500, maxWidth: "840px" } },
                bullet,
              ),
            ),
          ),
        ),
        React.createElement(
          "div",
          {
            style: {
              paddingTop: "24px",
              borderTop: "1px solid rgba(248,250,252,0.14)",
              fontSize: "24px",
              color: "rgba(248,250,252,0.72)",
            },
          },
          footer,
        ),
      ),
      "linear-gradient(145deg, #030712 0%, #0B1120 58%, #111827 100%)",
    ),
  );
};

const renderWhatHappenedPng = async (newsItems: NewsRow[]) =>
  renderEditorialTextSlide({
    section: "Slide 2 · O que aconteceu",
    title: "Os fatos que definem o recorte",
    bullets: buildWhatHappenedBullets(newsItems),
    footer: `${newsItems.length} histórias lidas em conjunto, não em isolamento.`,
  });

const renderWhyItMattersPng = async (newsItems: NewsRow[]) =>
  renderEditorialTextSlide({
    section: "Slide 3 · Por que importa",
    title: "O efeito real para o mercado",
    bullets: buildWhyItMattersBullets(newsItems),
    footer: "Leitura voltada a preço, demanda, capital e execução.",
  });

const renderInsightPng = async (newsItems: NewsRow[]) =>
  renderEditorialTextSlide({
    section: "Slide 4 · Leitura do REalia",
    title: "A interpretação que muda a decisão",
    bullets: buildRealiaInsightBullets(newsItems),
    footer: "Interpretação editorial para quem opera com contexto.",
  });

const renderCtaPng = async (storiesCount: number) =>
  renderEditorialTextSlide({
    section: "Slide 5 · Próximo passo",
    title: "Acompanhe o mercado com mais profundidade",
    bullets: [
      tightenLine(`${storiesCount} sinais relevantes, organizados com leitura editorial e filtro de mercado.`, 110),
      "Sem ruído, sem excesso, sem urgência artificial.",
      tightenLine(`Quando o contexto importa, ${BRAND_URL} entra antes da decisão.`, 100),
    ],
    footer: BRAND_URL,
  });

const composeCaption = (newsItems: NewsRow[]) => {
  const lead = newsItems[0];
  const allTopics = [...new Set(newsItems.flatMap((item) => parseTopics(item.topics)))].slice(0, 6);
  const hashtags = ["imoveis", "mercadoimobiliario", ...allTopics.map(toHashtag), "realianews"]
    .filter(Boolean)
    .slice(0, 10)
    .map((tag) => `#${tag}`)
    .join(" ");

  const openingLine = tightenLine(lead.title, 110);
  const contextParagraphs = newsItems
    .slice(0, 3)
    .map((item) => {
      const source = sourceNameFromUrl(item.source_url);
      const context = toShortParagraph(item.summary_ai || item.title, 180);
      return `${source}: ${context}`;
    })
    .filter(Boolean);

  const finalInsight = tightenLine(buildFinalInsight(newsItems), 210);

  const realiaReading = tightenLine(buildRealiaReading(newsItems), 220);

  const softCta = tightenLine(
    `Para quem decide com contexto, o carrossel completo está no REalia.`,
    120,
  );

  return [
    openingLine,
    ...contextParagraphs,
    `Leitura do REalia\n${realiaReading}`,
    finalInsight,
    softCta,
    hashtags,
  ].join("\n\n");
};

const createPublicUrls = (supabase: ReturnType<typeof createClient>, paths: string[]) => {
  return paths.map((path) => {
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("Failed to create public slide URL");
    return data.publicUrl;
  });
};

const createSlides = async (supabase: ReturnType<typeof createClient>, publicationId: string, newsItems: NewsRow[]) => {
  const slideDefinitions = [
    { fileName: `cover-${newsItems[0].id}.png`, png: await renderCoverPng(newsItems[0], newsItems.length) },
    { fileName: `what-happened-${publicationId}.png`, png: await renderWhatHappenedPng(newsItems) },
    { fileName: `why-it-matters-${publicationId}.png`, png: await renderWhyItMattersPng(newsItems) },
    { fileName: `realia-insight-${publicationId}.png`, png: await renderInsightPng(newsItems) },
    { fileName: `cta-${publicationId}.png`, png: await renderCtaPng(newsItems.length) },
  ];

  const uploadedPaths: string[] = [];

  for (const slide of slideDefinitions) {
    const path = `${publicationId}/${slide.fileName}`;
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, slide.png, {
      contentType: "image/png",
      upsert: true,
    });

    if (error) throw error;
    uploadedPaths.push(path);
  }

  const publicUrls = createPublicUrls(supabase, uploadedPaths);
  return { uploadedPaths, publicUrls };
};

const getSettings = async (supabase: ReturnType<typeof createClient>) => {
  const { data, error } = await supabase.from("instagram_settings").select("*").limit(1).maybeSingle();
  if (error) throw error;
  return data as InstagramSettings | null;
};

const getTopNews = async (supabase: ReturnType<typeof createClient>, topN: number) => {
  const since = new Date();
  since.setDate(since.getDate() - 1);

  const { data, error } = await supabase
    .from("news")
    .select("id, title, summary_ai, topics, source_url, image_url, published_at, region, is_trending")
    .gte("published_at", since.toISOString())
    .not("image_url", "is", null)
    .not("summary_ai", "is", null)
    .order("is_trending", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(topN * 2);

  if (error) throw error;

  return ((data || []) as NewsRow[])
    .filter((item) => item.summary_ai?.trim() && item.image_url?.trim())
    .slice(0, topN);
};

const createPublication = async (supabase: ReturnType<typeof createClient>, userId: string | null, mode: Mode, topN: number, initialValues: Record<string, unknown> = {}) => {
  const { data, error } = await supabase
    .from("instagram_publications")
    .insert({
      created_by: userId,
      status: "pending",
      metadata: { mode, requested_top_n: topN },
      ...initialValues,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data as PublicationRow;
};

const updatePublication = async (supabase: ReturnType<typeof createClient>, id: string, values: Record<string, unknown>) => {
  const { error } = await supabase.from("instagram_publications").update(values).eq("id", id);
  if (error) throw error;
};

const unauthorizedResponse = () =>
  new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const authorizeRequest = async (req: Request, supabaseUrl: string, anonKey: string, serviceRoleKey: string) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const cronHeader = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "").trim() : null;

  const isCronCall = !!cronSecret && ((cronHeader && cronHeader === cronSecret) || (bearerToken && bearerToken === cronSecret));
  if (isCronCall) return { isCronCall: true, userId: null };

  if (!authHeader?.startsWith("Bearer ") || !bearerToken) throw unauthorizedResponse();

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  let userId: string | null = null;

  const claimsResult = await (userClient.auth as { getClaims?: (jwt: string) => Promise<{ data?: { claims?: { sub?: string } }; error?: unknown }> }).getClaims?.(bearerToken);
  userId = claimsResult?.data?.claims?.sub ?? null;

  if (!userId) {
    const { data, error } = await userClient.auth.getUser(bearerToken);
    if (error || !data?.user?.id) throw unauthorizedResponse();
    userId = data.user.id;
  }

  const now = Date.now();
  const lastCall = rateLimitMap.get(userId);
  if (lastCall && now - lastCall < RATE_LIMIT_WINDOW_MS) {
    throw new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil((RATE_LIMIT_WINDOW_MS - (now - lastCall)) / 1000)) },
    });
  }
  rateLimitMap.set(userId, now);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: roles, error: rolesError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "moderator"]);

  if (rolesError || !roles?.length) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return { isCronCall: false, userId };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "Service configuration error" }, 500);
    }

    const { isCronCall, userId } = await authorizeRequest(req, supabaseUrl, anonKey, serviceRoleKey);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let body: { mode?: Mode; topN?: number } = {};
    try {
      const raw = await req.text();
      if (raw) body = JSON.parse(raw);
    } catch {
      body = {};
    }

    const mode: Mode = body.mode === "send" ? "send" : body.mode === "webhook_test" ? "webhook_test" : "preview";
    const settings = await getSettings(supabase);
    const topN = clampTopN(body.topN ?? settings?.top_n ?? DEFAULT_TOP_N);
    const webhookUrl = settings?.webhook_url?.trim() || Deno.env.get("ZAPIER_INSTAGRAM_WEBHOOK_URL")?.trim() || "";

    if (mode === "webhook_test") {
      if (!webhookUrl) {
        throw new Error("Webhook do Zapier não configurado");
      }

      const testCaption = "[TESTE WEBHOOK] 🏙️ Teste do webhook REalia News\n\nCarrossel de validação enviado pelo painel admin.\n\n#realianews #mercadoimobiliario #imoveis";
      const publication = await createPublication(supabase, userId, mode, 1, {
        caption: testCaption,
        slides_urls: [WEBHOOK_TEST_IMAGE_URL],
      });

      const payload = {
        publicationId: publication.id,
        timestamp: new Date().toISOString(),
        origin: "realia-instagram-digest",
        mode,
        image_url: WEBHOOK_TEST_IMAGE_URL,
        caption: testCaption,
        slides: [WEBHOOK_TEST_IMAGE_URL],
        websiteUrl: BRAND_URL,
      };

      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const responseText = await response.text();

        if (!response.ok) {
          throw new Error(`Zapier respondeu com ${response.status}: ${responseText.slice(0, 300)}`);
        }

        await updatePublication(supabase, publication.id, {
          status: "sent",
          sent_at: new Date().toISOString(),
          error: null,
          metadata: {
            mode,
            acknowledged: true,
            webhook_response_preview: responseText.slice(0, 300),
            is_test: true,
          },
        });
      } catch (webhookError) {
        const message = webhookError instanceof Error ? webhookError.message : "Erro ao testar webhook";
        await updatePublication(supabase, publication.id, {
          status: "failed",
          error: message,
          metadata: {
            mode,
            acknowledged: false,
            is_test: true,
          },
        });
        throw webhookError;
      }

      return json({ success: true, mode, message: "Teste enviado ao Zapier" });
    }

    if (isCronCall && !settings?.enabled) {
      return json({ success: true, message: "Instagram automation disabled" });
    }

    const newsItems = await getTopNews(supabase, topN);
    if (!newsItems.length) {
      return json({ success: true, message: "Nenhuma notícia elegível encontrada", slides: [] });
    }

    const publication = await createPublication(supabase, userId, mode, topN);

    try {
      const { uploadedPaths, publicUrls } = await createSlides(supabase, publication.id, newsItems);
      const caption = composeCaption(newsItems);
      const payload = {
        publicationId: publication.id,
        timestamp: new Date().toISOString(),
        origin: "realia-instagram-digest",
        mode,
        caption,
        image_url: publicUrls[0] ?? null,
        slides: publicUrls,
        newsIds: newsItems.map((item) => item.id),
        topN: newsItems.length,
        websiteUrl: BRAND_URL,
      };

      if (mode === "send") {
        if (!webhookUrl) {
          throw new Error("Webhook do Zapier não configurado");
        }

        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Zapier respondeu com ${response.status}: ${errorText.slice(0, 300)}`);
        }
      }

      await updatePublication(supabase, publication.id, {
        news_ids: newsItems.map((item) => item.id),
        slides_urls: uploadedPaths,
        caption,
        status: mode === "send" ? "sent" : "preview",
        sent_at: mode === "send" ? new Date().toISOString() : null,
        error: null,
        metadata: {
          mode,
          top_n: newsItems.length,
          source_names: newsItems.map((item) => sourceNameFromUrl(item.source_url)),
          public_urls_preview: publicUrls,
        },
      });

      return json({
        success: true,
        publicationId: publication.id,
        mode,
        caption,
        image_url: publicUrls[0] ?? null,
        slides: publicUrls,
        news: newsItems.map((item) => ({
          id: item.id,
          title: item.title,
          source: sourceNameFromUrl(item.source_url),
          topics: parseTopics(item.topics),
        })),
      });
    } catch (publicationError) {
      const message = publicationError instanceof Error ? publicationError.message : "Erro ao publicar digest";
      await updatePublication(supabase, publication.id, {
        status: "failed",
        error: message,
      });
      throw publicationError;
    }
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("publish-instagram-digest error:", error);
    return json({ error: message }, 500);
  }
});
