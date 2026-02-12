import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Input Validation Utilities ---

const VALID_ACTIONS = ["subscribe", "unsubscribe"] as const;
const BASE64_REGEX = /^[A-Za-z0-9+/\-_]+=*$/;

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function validateAction(value: unknown): "subscribe" | "unsubscribe" {
  if (typeof value !== "string" || !(VALID_ACTIONS as readonly string[]).includes(value)) {
    throw new ValidationError("action must be 'subscribe' or 'unsubscribe'");
  }
  return value as "subscribe" | "unsubscribe";
}

function validateEndpoint(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError("endpoint must be a string");
  }
  const trimmed = value.trim();
  if (trimmed.length < 10 || trimmed.length > 2000) {
    throw new ValidationError("endpoint must be between 10 and 2000 characters");
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") {
      throw new ValidationError("endpoint must use HTTPS protocol");
    }
  } catch (e) {
    if (e instanceof ValidationError) throw e;
    throw new ValidationError("endpoint must be a valid URL");
  }
  return trimmed;
}

function validateBase64Key(value: unknown, fieldName: string, minLen: number, maxLen: number): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length < minLen || trimmed.length > maxLen) {
    throw new ValidationError(`${fieldName} must be between ${minLen} and ${maxLen} characters`);
  }
  if (!BASE64_REGEX.test(trimmed)) {
    throw new ValidationError(`${fieldName} must be a valid base64 string`);
  }
  return trimmed;
}

function validateSubscriptionData(value: unknown): { endpoint: string; keys: { p256dh: string; auth: string } } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError("subscription must be an object");
  }
  const sub = value as Record<string, unknown>;

  const endpoint = validateEndpoint(sub.endpoint);

  if (typeof sub.keys !== "object" || sub.keys === null || Array.isArray(sub.keys)) {
    throw new ValidationError("subscription.keys must be an object");
  }
  const keys = sub.keys as Record<string, unknown>;

  const p256dh = validateBase64Key(keys.p256dh, "p256dh", 20, 500);
  const auth = validateBase64Key(keys.auth, "auth", 10, 200);

  return { endpoint, keys: { p256dh, auth } };
}

// --- Main Handler ---

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

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
    const action = validateAction(body.action);

    if (action === "subscribe") {
      const subscription = validateSubscriptionData(body.subscription);

      const { error: upsertError } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            user_id: userId,
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
          { onConflict: "user_id,endpoint" }
        );

      if (upsertError) {
        console.error("Error saving subscription:", upsertError);
        throw upsertError;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ push_notifications_enabled: true })
        .eq("user_id", userId);

      if (profileError) {
        console.error("Error updating profile:", profileError);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Subscription saved" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const { error: deleteError } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId);

      if (deleteError) {
        console.error("Error deleting subscriptions:", deleteError);
        throw deleteError;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ push_notifications_enabled: false })
        .eq("user_id", userId);

      if (profileError) {
        console.error("Error updating profile:", profileError);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Unsubscribed successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.error("Error in manage-push-subscription:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
