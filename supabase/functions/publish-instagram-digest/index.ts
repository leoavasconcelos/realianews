import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resvg } from "https://esm.sh/@resvg/resvg-js@2.6.2";

type Mode = "preview" | "send";

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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

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

const renderTextLines = (lines: string[], x: number, startY: number, lineHeight: number, size: number, weight = 700, color = "#F8FAFC") =>
  lines
    .map(
      (line, index) => `<text x="${x}" y="${startY + index * lineHeight}" font-size="${size}" font-weight="${weight}" font-family="Inter, Arial, sans-serif" fill="${color}">${escapeXml(line)}</text>`,
    )
    .join("");

const buildCoverSvg = (news: NewsRow, heroImageDataUrl: string | null, totalStories: number) => {
  const titleLines = wrapLines(news.title, 22).slice(0, 4);
  const source = sourceNameFromUrl(news.source_url);
  const topics = parseTopics(news.topics).slice(0, 2);

  return `
  <svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="coverGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#183A5A" />
        <stop offset="55%" stop-color="#234E70" />
        <stop offset="100%" stop-color="#1F7A72" />
      </linearGradient>
      <linearGradient id="overlayGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(10,15,24,0.20)" />
        <stop offset="100%" stop-color="rgba(10,15,24,0.82)" />
      </linearGradient>
      <clipPath id="heroClip">
        <rect x="56" y="56" width="968" height="968" rx="46" ry="46" />
      </clipPath>
    </defs>

    <rect width="1080" height="1080" fill="url(#coverGradient)" />
    ${heroImageDataUrl ? `<image href="${heroImageDataUrl}" x="56" y="56" width="968" height="968" preserveAspectRatio="xMidYMid slice" clip-path="url(#heroClip)" />` : ""}
    <rect x="56" y="56" width="968" height="968" rx="46" ry="46" fill="url(#overlayGradient)" />
    <rect x="56" y="56" width="968" height="968" rx="46" ry="46" fill="none" stroke="rgba(255,255,255,0.14)" />

    <rect x="88" y="88" width="192" height="48" rx="24" fill="rgba(248,250,252,0.12)" />
    <text x="112" y="119" font-size="22" font-weight="700" font-family="Inter, Arial, sans-serif" fill="#F8FAFC">REalia · Digest</text>

    <text x="88" y="792" font-size="20" font-weight="600" font-family="Inter, Arial, sans-serif" fill="#FDBA74">TOP ${totalStories} · MERCADO IMOBILIÁRIO</text>
    ${renderTextLines(titleLines, 88, 856, 72, 58, 800)}

    <text x="88" y="1000" font-size="26" font-weight="500" font-family="Inter, Arial, sans-serif" fill="#E2E8F0">${escapeXml(source)}</text>
    <text x="888" y="1000" font-size="26" font-weight="700" text-anchor="end" font-family="Inter, Arial, sans-serif" fill="#F8FAFC">${escapeXml(topics.join(" · ") || "realia.digital")}</text>
  </svg>`;
};

const buildSummarySvg = (news: NewsRow, index: number, totalStories: number) => {
  const source = sourceNameFromUrl(news.source_url);
  const titleLines = wrapLines(news.title, 28).slice(0, 2);
  const bullets = bulletize(news.summary_ai || news.title, 3);
  const bulletSvg = bullets
    .map((bullet, bulletIndex) => {
      const y = 400 + bulletIndex * 170;
      const bulletLines = wrapLines(bullet, 34).slice(0, 3);
      return `
        <circle cx="108" cy="${y - 18}" r="8" fill="#F97316" />
        ${renderTextLines(bulletLines, 138, y, 48, 34, 500, "#E2E8F0")}
      `;
    })
    .join("");

  const tags = parseTopics(news.topics).slice(0, 3).map((topic, topicIndex) => {
    const x = 84 + topicIndex * 300;
    return `
      <rect x="${x}" y="932" width="250" height="54" rx="27" fill="rgba(249,115,22,0.14)" stroke="rgba(249,115,22,0.3)" />
      <text x="${x + 125}" y="966" text-anchor="middle" font-size="22" font-weight="600" font-family="Inter, Arial, sans-serif" fill="#FDBA74">${escapeXml(topic)}</text>
    `;
  }).join("");

  return `
  <svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="summaryGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#102A43" />
        <stop offset="100%" stop-color="#183A5A" />
      </linearGradient>
    </defs>
    <rect width="1080" height="1080" fill="url(#summaryGradient)" />
    <rect x="56" y="56" width="968" height="968" rx="46" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" />
    <text x="84" y="122" font-size="22" font-weight="700" font-family="Inter, Arial, sans-serif" fill="#F8FAFC">REalia · Resumo ${index + 1}/${totalStories}</text>
    <text x="996" y="122" text-anchor="end" font-size="20" font-weight="500" font-family="Inter, Arial, sans-serif" fill="#94A3B8">${escapeXml(source)}</text>
    ${renderTextLines(titleLines, 84, 222, 62, 48, 800)}
    ${bulletSvg}
    ${tags}
  </svg>`;
};

const buildCtaSvg = (storiesCount: number) => `
  <svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ctaGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#183A5A" />
        <stop offset="100%" stop-color="#F97316" />
      </linearGradient>
    </defs>
    <rect width="1080" height="1080" fill="#0F172A" />
    <rect x="56" y="56" width="968" height="968" rx="46" fill="url(#ctaGradient)" opacity="0.18" stroke="rgba(255,255,255,0.15)" />
    <text x="540" y="310" text-anchor="middle" font-size="34" font-weight="700" font-family="Inter, Arial, sans-serif" fill="#FDBA74">REalia NEWS</text>
    <text x="540" y="430" text-anchor="middle" font-size="84" font-weight="800" font-family="Inter, Arial, sans-serif" fill="#F8FAFC">Leia mais</text>
    <text x="540" y="520" text-anchor="middle" font-size="84" font-weight="800" font-family="Inter, Arial, sans-serif" fill="#F8FAFC">no app</text>
    <text x="540" y="646" text-anchor="middle" font-size="34" font-weight="500" font-family="Inter, Arial, sans-serif" fill="#E2E8F0">${storiesCount} destaques selecionados nas últimas 24 horas</text>
    <rect x="318" y="744" width="444" height="86" rx="43" fill="rgba(248,250,252,0.12)" stroke="rgba(248,250,252,0.18)" />
    <text x="540" y="798" text-anchor="middle" font-size="34" font-weight="700" font-family="Inter, Arial, sans-serif" fill="#F8FAFC">${BRAND_URL}</text>
    <text x="540" y="928" text-anchor="middle" font-size="24" font-weight="500" font-family="Inter, Arial, sans-serif" fill="#CBD5E1">Mercado imobiliário com curadoria diária</text>
  </svg>`;

const svgToPng = (svg: string) => {
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: 1080,
    },
  });
  return resvg.render().asPng();
};

const fetchImageDataUrl = async (url: string | null) => {
  if (!url) return null;

  try {
    const response = await fetch(url, { headers: { "User-Agent": "realia-instagram-digest" } });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
    }
    return `data:${contentType};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
};

const composeCaption = (newsItems: NewsRow[]) => {
  const lead = newsItems[0];
  const allTopics = [...new Set(newsItems.flatMap((item) => parseTopics(item.topics)))].slice(0, 6);
  const hashtags = ["imoveis", "mercadoimobiliario", ...allTopics.map(toHashtag), "realianews"]
    .filter(Boolean)
    .slice(0, 10)
    .map((tag) => `#${tag}`)
    .join(" ");

  const storyLines = newsItems
    .map((item, index) => `${index + 1}. ${item.title}`)
    .join("\n");

  const summary = (lead.summary_ai || lead.title).replace(/\s+/g, " ").trim().slice(0, 1100);
  const source = sourceNameFromUrl(lead.source_url);

  return `${lead.title}\n\n${summary}\n\nHoje no carrossel:\n${storyLines}\n\n📍 Fonte: ${source}\n🔗 Leia mais no REalia News (${BRAND_URL})\n\n${hashtags}`;
};

const createSignedUrls = async (supabase: ReturnType<typeof createClient>, paths: string[]) => {
  const results = await Promise.all(
    paths.map(async (path) => {
      const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(path, 60 * 60 * 24 * 7);
      if (error || !data?.signedUrl) throw error || new Error("Failed to sign slide URL");
      return data.signedUrl;
    }),
  );
  return results;
};

const createSlides = async (supabase: ReturnType<typeof createClient>, publicationId: string, newsItems: NewsRow[]) => {
  const coverImage = await fetchImageDataUrl(newsItems[0]?.image_url ?? null);
  const slideDefinitions = [
    { fileName: `cover-${newsItems[0].id}.png`, svg: buildCoverSvg(newsItems[0], coverImage, newsItems.length) },
    ...newsItems.map((item, index) => ({
      fileName: `story-${index + 1}-${item.id}.png`,
      svg: buildSummarySvg(item, index, newsItems.length),
    })),
    { fileName: `cta-${publicationId}.png`, svg: buildCtaSvg(newsItems.length) },
  ];

  const uploadedPaths: string[] = [];

  for (const slide of slideDefinitions) {
    const path = `${publicationId}/${slide.fileName}`;
    const png = svgToPng(slide.svg);
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, png, {
      contentType: "image/png",
      upsert: true,
    });

    if (error) throw error;
    uploadedPaths.push(path);
  }

  const signedUrls = await createSignedUrls(supabase, uploadedPaths);
  return { uploadedPaths, signedUrls };
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

const createPublication = async (
  supabase: ReturnType<typeof createClient>,
  userId: string | null,
  mode: Mode,
  topN: number,
) => {
  const { data, error } = await supabase
    .from("instagram_publications")
    .insert({
      created_by: userId,
      status: "pending",
      metadata: { mode, requested_top_n: topN },
    })
    .select("id")
    .single();

  if (error) throw error;
  return data as PublicationRow;
};

const updatePublication = async (
  supabase: ReturnType<typeof createClient>,
  id: string,
  values: Record<string, unknown>,
) => {
  const { error } = await supabase.from("instagram_publications").update(values).eq("id", id);
  if (error) throw error;
};

const authorizeRequest = async (req: Request, supabaseUrl: string, anonKey: string, serviceRoleKey: string) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const cronHeader = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "").trim() : null;

  const isCronCall = !!cronSecret && ((cronHeader && cronHeader === cronSecret) || (bearerToken && bearerToken === cronSecret));
  if (isCronCall) return { isCronCall: true, userId: null };

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = Date.now();
  const lastCall = rateLimitMap.get(user.id);
  if (lastCall && now - lastCall < RATE_LIMIT_WINDOW_MS) {
    throw new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil((RATE_LIMIT_WINDOW_MS - (now - lastCall)) / 1000)) },
    });
  }
  rateLimitMap.set(user.id, now);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: roles, error: rolesError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["admin", "moderator"]);

  if (rolesError || !roles?.length) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return { isCronCall: false, userId: user.id };
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

    const mode: Mode = body.mode === "send" ? "send" : "preview";
    const settings = await getSettings(supabase);
    const topN = clampTopN(body.topN ?? settings?.top_n ?? DEFAULT_TOP_N);
    const webhookUrl = settings?.webhook_url?.trim() || Deno.env.get("ZAPIER_INSTAGRAM_WEBHOOK_URL")?.trim() || "";

    if (isCronCall && !settings?.enabled) {
      return json({ success: true, message: "Instagram automation disabled" });
    }

    const newsItems = await getTopNews(supabase, topN);
    if (!newsItems.length) {
      return json({ success: true, message: "Nenhuma notícia elegível encontrada", slides: [] });
    }

    const publication = await createPublication(supabase, userId, mode, topN);

    try {
      const { uploadedPaths, signedUrls } = await createSlides(supabase, publication.id, newsItems);
      const caption = composeCaption(newsItems);
      const payload = {
        publicationId: publication.id,
        timestamp: new Date().toISOString(),
        origin: "realia-instagram-digest",
        mode,
        caption,
        slides: signedUrls,
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
          signed_urls_preview: signedUrls,
        },
      });

      return json({
        success: true,
        publicationId: publication.id,
        mode,
        caption,
        slides: signedUrls,
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
