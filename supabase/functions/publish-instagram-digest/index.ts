import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import React from "https://esm.sh/react@18.2.0";
import { ImageResponse } from "https://deno.land/x/og_edge@0.0.6/mod.ts";
import { z } from "npm:zod@3.24.1";

type Mode = "generate_queue" | "preview_post" | "send_post" | "regenerate_post" | "webhook_test";
type PostType = "single_image" | "carousel";
type PublicationStatus = "queued" | "preview" | "approved" | "sent" | "failed" | "cancelled";

interface InstagramSettings {
  id: string;
  webhook_url: string | null;
  enabled: boolean;
  mode: "approval_queue";
  auto_enqueue_enabled: boolean;
  min_interval_minutes: number;
  single_post_default: boolean;
  carousel_when_multiple_images: boolean;
  max_caption_length: number;
  brand_style: string;
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
  news_ids: string[];
  status: PublicationStatus;
  post_type: PostType;
  title_snapshot: string | null;
  section_label: string | null;
  source_snapshot: string | null;
  image_count: number;
  caption: string | null;
  slides_urls: string[];
  selected_image_urls: string[];
  metadata: Record<string, unknown> | null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-cron-secret",
};

const BUCKET_NAME = "instagram-posts";
const BRAND_URL = "https://realia.digital";
const OG_SIZE = 1080;
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_QUEUE_BATCH = 8;
const DEFAULT_INTERVAL_MINUTES = 90;
const DEFAULT_CAPTION_LENGTH = 1600;
const WEBHOOK_TEST_IMAGE_URL = `${BRAND_URL}/placeholder.svg`;

const BodySchema = z.object({
  mode: z.enum(["generate_queue", "preview_post", "send_post", "regenerate_post", "webhook_test"]).optional(),
  publicationId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(MAX_QUEUE_BATCH).optional(),
  force: z.boolean().optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const unauthorizedResponse = () =>
  new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
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

const tightenLine = (text: string, maxLength: number) => {
  const cleaned = text.replace(/\s+/g, " ").trim().replace(/[.!?]+$/g, "");
  if (cleaned.length <= maxLength) return cleaned;
  const truncated = cleaned.slice(0, maxLength + 1);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated.slice(0, maxLength)).trim();
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

const extractSectionLabel = (news: NewsRow) => {
  const topic = parseTopics(news.topics)[0];
  if (topic) return tightenLine(topic, 24).toUpperCase();

  const summary = `${news.title} ${news.summary_ai || ""}`.toLowerCase();
  if (/(credito|financiamento|juros|selic|banco)/.test(summary)) return "CRÉDITO";
  if (/(incorpora|lançamento|obra|constru)/.test(summary)) return "INCORPORAÇÃO";
  if (/(fundos|fii|capital|invest)/.test(summary)) return "FUNDOS";
  if (/(shopping|varejo|consumo)/.test(summary)) return "VAREJO";
  return "MERCADO";
};

const captionFromNews = (news: NewsRow, maxLength: number) => {
  const summary = tightenLine(news.summary_ai || news.title, 480);
  const source = sourceNameFromUrl(news.source_url);
  const hashtags = [extractSectionLabel(news), ...parseTopics(news.topics).slice(0, 3)]
    .map(toHashtag)
    .filter(Boolean)
    .slice(0, 4)
    .map((tag) => `#${tag}`)
    .join(" ");

  return tightenLine(
    [
      summary,
      `Fonte: ${source}.`,
      `Mais no REalia: ${BRAND_URL}`,
      hashtags,
    ]
      .filter(Boolean)
      .join("\n\n"),
    maxLength,
  );
};

const fetchImageAsDataUrl = async (url: string | null) => {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
};

const renderToPng = async (node: React.ReactElement) => {
  const response = new ImageResponse(node, { width: OG_SIZE, height: OG_SIZE });
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
};

const createPosterPng = async (news: NewsRow) => {
  const titleLines = wrapLines(tightenLine(news.title, 110), 24).slice(0, 4);
  const section = extractSectionLabel(news);
  const source = sourceNameFromUrl(news.source_url);
  const summary = tightenLine(news.summary_ai || news.title, 180);
  const imageDataUrl = await fetchImageAsDataUrl(news.image_url);

  return renderToPng(
    React.createElement(
      "div",
      {
        style: {
          width: `${OG_SIZE}px`,
          height: `${OG_SIZE}px`,
          position: "relative",
          display: "flex",
          overflow: "hidden",
          background: "linear-gradient(145deg, #0f172a 0%, #16253d 55%, #1f5f59 100%)",
          color: "#ffffff",
          fontFamily: "Inter, system-ui, sans-serif",
        },
      },
      imageDataUrl
        ? React.createElement("img", {
            src: imageDataUrl,
            alt: news.title,
            width: OG_SIZE,
            height: OG_SIZE,
            style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
          })
        : null,
      React.createElement("div", {
        style: {
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(2,6,23,0.12) 0%, rgba(2,6,23,0.38) 35%, rgba(2,6,23,0.88) 100%)",
        },
      }),
      React.createElement(
        "div",
        {
          style: {
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px",
            width: "100%",
          },
        },
        React.createElement(
          "div",
          { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
          React.createElement(
            "div",
            {
              style: {
                borderRadius: "999px",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
                padding: "12px 20px",
                fontSize: "24px",
                fontWeight: 700,
                letterSpacing: "0.08em",
              },
            },
            section,
          ),
          React.createElement(
            "div",
            { style: { fontSize: "28px", fontWeight: 700, letterSpacing: "0.08em" } },
            "REalia",
          ),
        ),
        React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "18px" } },
          ...titleLines.map((line) =>
            React.createElement(
              "div",
              { key: line, style: { fontSize: "78px", fontWeight: 800, lineHeight: 0.95, maxWidth: "880px" } },
              line,
            ),
          ),
          React.createElement(
            "div",
            { style: { maxWidth: "820px", fontSize: "28px", lineHeight: 1.35, color: "rgba(255,255,255,0.88)" } },
            summary,
          ),
        ),
        React.createElement(
          "div",
          { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px" } },
          React.createElement(
            "div",
            { style: { fontSize: "24px", color: "rgba(255,255,255,0.78)" } },
            source,
          ),
          React.createElement(
            "div",
            { style: { fontSize: "22px", color: "rgba(255,255,255,0.72)" } },
            BRAND_URL.replace("https://", ""),
          ),
        ),
      ),
    ),
  );
};

const createPublicUrls = (supabase: ReturnType<typeof createClient>, paths: string[]) =>
  paths.map((path) => {
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("Failed to create public asset URL");
    return data.publicUrl;
  });

const buildAssets = async (supabase: ReturnType<typeof createClient>, publicationId: string, news: NewsRow, postType: PostType) => {
  const poster = await createPosterPng(news);
  const posterPath = `${publicationId}/cover-${news.id}.png`;

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(posterPath, poster, {
    contentType: "image/png",
    upsert: true,
  });

  if (error) throw error;

  const paths = [posterPath];
  const selectedImages = postType === "carousel" && news.image_url ? [news.image_url] : [];
  return {
    uploadedPaths: paths,
    publicUrls: createPublicUrls(supabase, paths),
    selectedImages,
  };
};

const getSettings = async (supabase: ReturnType<typeof createClient>) => {
  const { data, error } = await supabase.from("instagram_settings").select("*").order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (error) throw error;

  if (data) return data as InstagramSettings;

  const { data: inserted, error: insertError } = await supabase
    .from("instagram_settings")
    .insert({ enabled: false })
    .select("*")
    .single();
  if (insertError) throw insertError;
  return inserted as InstagramSettings;
};

const getRecentlyPublishedCutoff = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

const getEligibleNews = async (supabase: ReturnType<typeof createClient>, limit: number, minIntervalMinutes: number) => {
  const { data: existing, error: existingError } = await supabase
    .from("instagram_publications")
    .select("primary_news_id, published_at, created_at, status")
    .in("status", ["queued", "preview", "approved", "sent"])
    .order("created_at", { ascending: false })
    .limit(200);

  if (existingError) throw existingError;

  const usedIds = new Set((existing || []).map((row: { primary_news_id: string | null }) => row.primary_news_id).filter(Boolean));
  const recentCutoff = getRecentlyPublishedCutoff(minIntervalMinutes);
  const recentPublication = (existing || []).find((row: { published_at: string | null; status: string }) => row.status === "sent" && row.published_at && row.published_at >= recentCutoff);

  const { data, error } = await supabase
    .from("news")
    .select("id, title, summary_ai, topics, source_url, image_url, published_at, region, is_trending")
    .not("image_url", "is", null)
    .not("summary_ai", "is", null)
    .gte("published_at", new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString())
    .order("is_trending", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(limit * 4);

  if (error) throw error;

  const filtered = ((data || []) as NewsRow[])
    .filter((item) => item.summary_ai?.trim() && item.image_url?.trim())
    .filter((item) => !usedIds.has(item.id))
    .slice(0, limit);

  return { items: filtered, hasRecentPublication: !!recentPublication };
};

const getPublicationById = async (supabase: ReturnType<typeof createClient>, publicationId: string) => {
  const { data, error } = await supabase.from("instagram_publications").select("*").eq("id", publicationId).single();
  if (error) throw error;
  return data as PublicationRow;
};

const getNewsById = async (supabase: ReturnType<typeof createClient>, newsId: string) => {
  const { data, error } = await supabase
    .from("news")
    .select("id, title, summary_ai, topics, source_url, image_url, published_at, region, is_trending")
    .eq("id", newsId)
    .single();
  if (error) throw error;
  return data as NewsRow;
};

const createQueuedPublication = async (supabase: ReturnType<typeof createClient>, userId: string | null, news: NewsRow, settings: InstagramSettings) => {
  const postType: PostType = settings.single_post_default ? "single_image" : settings.carousel_when_multiple_images ? "carousel" : "single_image";
  const caption = captionFromNews(news, settings.max_caption_length || DEFAULT_CAPTION_LENGTH);
  const { data, error } = await supabase
    .from("instagram_publications")
    .insert({
      created_by: userId,
      news_ids: [news.id],
      primary_news_id: news.id,
      post_type: postType,
      status: "queued",
      title_snapshot: news.title,
      section_label: extractSectionLabel(news),
      source_snapshot: sourceNameFromUrl(news.source_url),
      image_count: 1,
      caption,
      metadata: {
        origin: "editorial_queue",
        queued_at: new Date().toISOString(),
        published_at_news: news.published_at,
      },
    })
    .select("id")
    .single();

  if (error) throw error;
  return data as { id: string };
};

const updatePublication = async (supabase: ReturnType<typeof createClient>, id: string, values: Record<string, unknown>) => {
  const { error } = await supabase.from("instagram_publications").update(values).eq("id", id);
  if (error) throw error;
};

const approveAndRenderPublication = async (supabase: ReturnType<typeof createClient>, publication: PublicationRow, settings: InstagramSettings, userId: string | null, markApproved = false) => {
  const primaryNewsId = publication.primary_news_id || publication.news_ids?.[0];
  if (!primaryNewsId) throw new Error("Publicação sem notícia principal.");
  const news = await getNewsById(supabase, primaryNewsId);
  const { uploadedPaths, publicUrls, selectedImages } = await buildAssets(supabase, publication.id, news, publication.post_type);
  const caption = captionFromNews(news, settings.max_caption_length || DEFAULT_CAPTION_LENGTH);

  const nextStatus: PublicationStatus = markApproved ? "approved" : "preview";
  await updatePublication(supabase, publication.id, {
    caption,
    slides_urls: uploadedPaths,
    selected_image_urls: selectedImages,
    image_count: publicUrls.length,
    approved_by: markApproved ? userId : publication.approved_by,
    approved_at: markApproved ? new Date().toISOString() : publication.approved_at,
    status: nextStatus,
    metadata: {
      ...(publication.metadata || {}),
      public_urls_preview: publicUrls,
      regenerated_at: new Date().toISOString(),
    },
  });

  return {
    publicationId: publication.id,
    caption,
    slides: publicUrls,
    postType: publication.post_type,
    news: [{ id: news.id, title: news.title, source: sourceNameFromUrl(news.source_url), topics: parseTopics(news.topics) }],
  };
};

const sendPublication = async (supabase: ReturnType<typeof createClient>, publication: PublicationRow, settings: InstagramSettings, userId: string | null) => {
  const primaryNewsId = publication.primary_news_id || publication.news_ids?.[0];
  if (!primaryNewsId) throw new Error("Publicação sem notícia principal.");
  const news = await getNewsById(supabase, primaryNewsId);

  const previewUrls = Array.isArray(publication.metadata?.public_urls_preview)
    ? (publication.metadata?.public_urls_preview as string[])
    : [];

  let publicUrls = previewUrls;
  let uploadedPaths = publication.slides_urls || [];
  let selectedImages = publication.selected_image_urls || [];

  if (!publicUrls.length) {
    const rendered = await buildAssets(supabase, publication.id, news, publication.post_type);
    publicUrls = rendered.publicUrls;
    uploadedPaths = rendered.uploadedPaths;
    selectedImages = rendered.selectedImages;
  }

  const caption = publication.caption || captionFromNews(news, settings.max_caption_length || DEFAULT_CAPTION_LENGTH);
  const webhookUrl = settings.webhook_url?.trim() || Deno.env.get("ZAPIER_INSTAGRAM_WEBHOOK_URL")?.trim() || "";
  if (!webhookUrl) throw new Error("Webhook do Zapier não configurado");

  const payload = {
    publicationId: publication.id,
    newsId: news.id,
    title: news.title,
    section: extractSectionLabel(news),
    postType: publication.post_type,
    caption,
    images: publicUrls,
    source: sourceNameFromUrl(news.source_url),
    origin: "realia-instagram-editorial-queue",
    timestamp: new Date().toISOString(),
  };

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
    caption,
    slides_urls: uploadedPaths,
    selected_image_urls: selectedImages,
    image_count: publicUrls.length,
    approved_by: publication.approved_by || userId,
    approved_at: publication.approved_at || new Date().toISOString(),
    sent_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
    status: "sent",
    error: null,
    metadata: {
      ...(publication.metadata || {}),
      public_urls_preview: publicUrls,
      webhook_response_preview: responseText.slice(0, 300),
    },
  });

  return {
    success: true,
    publicationId: publication.id,
    caption,
    slides: publicUrls,
    postType: publication.post_type,
    news: [{ id: news.id, title: news.title, source: sourceNameFromUrl(news.source_url), topics: parseTopics(news.topics) }],
  };
};

const authorizeRequest = async (req: Request, supabaseUrl: string, anonKey: string, serviceRoleKey: string) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const cronHeader = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "").trim() : null;

  const isCronCall = !!cronSecret && ((cronHeader && cronHeader === cronSecret) || (bearerToken && bearerToken === cronSecret));
  if (isCronCall) return { isCronCall: true, userId: null };

  if (!authHeader?.startsWith("Bearer ") || !bearerToken) throw unauthorizedResponse();

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil((RATE_LIMIT_WINDOW_MS - (now - lastCall)) / 1000)),
      },
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Service configuration error" }, 500);

    const { isCronCall, userId } = await authorizeRequest(req, supabaseUrl, anonKey, serviceRoleKey);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const rawBody = await req.text();
    let requestBody: unknown = {};
    if (rawBody) {
      try {
        requestBody = JSON.parse(rawBody);
      } catch {
        return json({ error: { body: ["JSON inválido."] } }, 400);
      }
    }

    const parsed = BodySchema.safeParse(requestBody);
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }

    const mode: Mode = parsed.data.mode || (isCronCall ? "generate_queue" : "generate_queue");
    const settings = await getSettings(supabase);

    if (mode !== "webhook_test" && !settings.enabled && !isCronCall) {
      return json({ success: true, message: "Fila editorial do Instagram desativada." });
    }

    if (mode === "webhook_test") {
      const webhookUrl = settings.webhook_url?.trim() || Deno.env.get("ZAPIER_INSTAGRAM_WEBHOOK_URL")?.trim() || "";
      if (!webhookUrl) throw new Error("Webhook do Zapier não configurado");
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicationId: crypto.randomUUID(),
          newsId: null,
          title: "[TESTE] REalia Instagram",
          section: "TESTE",
          postType: "single_image",
          caption: "[TESTE WEBHOOK] Fluxo editorial do Instagram validado com sucesso.",
          images: [WEBHOOK_TEST_IMAGE_URL],
          origin: "realia-instagram-editorial-queue",
          timestamp: new Date().toISOString(),
        }),
      });
      const responseText = await response.text();
      if (!response.ok) throw new Error(`Zapier respondeu com ${response.status}: ${responseText.slice(0, 300)}`);
      return json({ success: true, message: "Teste enviado ao Zapier" });
    }

    if (mode === "generate_queue") {
      if (isCronCall && (!settings.enabled || !settings.auto_enqueue_enabled)) {
        return json({ success: true, message: "Fila editorial automática desativada." });
      }
      const { items, hasRecentPublication } = await getEligibleNews(
        supabase,
        parsed.data.limit ?? 4,
        settings.min_interval_minutes || DEFAULT_INTERVAL_MINUTES,
      );

      if (hasRecentPublication && !parsed.data.force) {
        return json({ success: true, queuedCount: 0, message: "Intervalo mínimo ainda em andamento." });
      }

      const queuedIds: string[] = [];
      for (const news of items) {
        const publication = await createQueuedPublication(supabase, userId, news, settings);
        queuedIds.push(publication.id);
      }

      return json({ success: true, queuedCount: queuedIds.length, publicationIds: queuedIds });
    }

    const publicationId = parsed.data.publicationId;
    if (!publicationId) return json({ error: { publicationId: ["publicationId é obrigatório."] } }, 400);

    const publication = await getPublicationById(supabase, publicationId);

    if (mode === "preview_post") {
      const result = await approveAndRenderPublication(supabase, publication, settings, userId, false);
      return json({ success: true, ...result });
    }

    if (mode === "regenerate_post") {
      const result = await approveAndRenderPublication(supabase, publication, settings, userId, false);
      return json({ success: true, ...result });
    }

    if (mode === "send_post") {
      if (!["queued", "preview", "approved", "failed"].includes(publication.status)) {
        return json({ error: "Essa publicação não pode ser enviada no estado atual." }, 400);
      }
      const result = await sendPublication(supabase, publication, settings, userId);
      return json(result);
    }

    return json({ error: "Modo inválido" }, 400);
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("publish-instagram-digest error:", error);
    return json({ error: message }, 500);
  }
});
