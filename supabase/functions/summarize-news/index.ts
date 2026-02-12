import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Input Validation Utilities ---

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HTML_TAG_REGEX = /<[^>]*>/g;

function validateUUID(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  if (!UUID_REGEX.test(value)) {
    throw new ValidationError(`${fieldName} must be a valid UUID`);
  }
  return value;
}

function validateString(value: unknown, minLen: number, maxLen: number, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length < minLen) {
    throw new ValidationError(`${fieldName} must be at least ${minLen} characters`);
  }
  if (trimmed.length > maxLen) {
    throw new ValidationError(`${fieldName} must not exceed ${maxLen} characters`);
  }
  return trimmed;
}

function sanitizeString(value: string): string {
  return value.replace(HTML_TAG_REGEX, "");
}

function validateTopicsArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new ValidationError("topics must be an array");
  }
  if (value.length > 10) {
    throw new ValidationError("topics must have at most 10 items");
  }
  return value.map((item, i) => {
    if (typeof item !== "string") {
      throw new ValidationError(`topics[${i}] must be a string`);
    }
    const trimmed = item.trim();
    if (trimmed.length < 1 || trimmed.length > 100) {
      throw new ValidationError(`topics[${i}] must be between 1 and 100 characters`);
    }
    return sanitizeString(trimmed);
  });
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// --- Main Handler ---

interface SummarizeRequest {
  newsId?: string;
  title: string;
  content: string;
  topics?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Service configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate request body
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof rawBody !== "object" || rawBody === null || Array.isArray(rawBody)) {
      return new Response(
        JSON.stringify({ error: "Request body must be a JSON object" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = rawBody as Record<string, unknown>;

    // Validate each field
    let newsId: string | undefined;
    if (body.newsId !== undefined && body.newsId !== null) {
      newsId = validateUUID(body.newsId, "newsId");
    }

    const title = sanitizeString(validateString(body.title, 1, 500, "title"));
    const content = sanitizeString(validateString(body.content, 1, 10000, "content"));

    let topics: string[] | undefined;
    if (body.topics !== undefined && body.topics !== null) {
      topics = validateTopicsArray(body.topics);
    }

    // Build AI prompt
    const topicsContext = topics?.length
      ? `Tópicos relacionados: ${topics.join(", ")}.`
      : "";

    const systemPrompt = `Você é um especialista em resumir notícias do mercado imobiliário brasileiro. 
Seu objetivo é criar resumos concisos, informativos e em português brasileiro.

Diretrizes:
- Escreva em português brasileiro formal mas acessível
- O resumo deve ter no máximo 3-4 frases (cerca de 50-80 palavras)
- Destaque os pontos mais importantes e impactantes
- Inclua números e dados relevantes quando disponíveis
- Mantenha um tom neutro e jornalístico
- Foque no que é mais relevante para profissionais do mercado imobiliário`;

    const userPrompt = `Crie um resumo conciso da seguinte notícia do mercado imobiliário:

Título: ${title}

${topicsContext}

Conteúdo:
${content.substring(0, 4000)}

Responda APENAS com o resumo, sem introduções ou explicações adicionais.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI Gateway error:", response.status);
      return new Response(
        JSON.stringify({ error: "An error occurred generating the summary" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const summary = aiResponse.choices?.[0]?.message?.content?.trim() || "";

    // If newsId provided, update the news record with the summary
    if (newsId) {
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { error: updateError } = await supabase
          .from("news")
          .update({ summary_ai: summary })
          .eq("id", newsId);

        if (updateError) {
          console.error("Error updating news summary:", updateError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        summary,
        newsId,
        model: "google/gemini-3-flash-preview",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.error("summarize-news error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
