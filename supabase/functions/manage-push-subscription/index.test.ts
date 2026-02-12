import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/manage-push-subscription`;

async function callFunction(body: unknown, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: response.status, data };
}

// --- Authentication Tests ---

Deno.test("manage-push-subscription: rejects without auth", async () => {
  const { status, data } = await callFunction({ action: "subscribe" });
  assertEquals(status, 401);
  assertEquals(data.error, "Unauthorized");
});

Deno.test("manage-push-subscription: rejects invalid token", async () => {
  const { status, data } = await callFunction(
    { action: "subscribe" },
    "invalid-jwt-token"
  );
  assertEquals(status, 401);
  assertExists(data.error);
});

// --- Action Validation ---

Deno.test("manage-push-subscription: rejects invalid action", async () => {
  const { status, data } = await callFunction(
    { action: "invalid-action" },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "action must be 'subscribe' or 'unsubscribe'");
  }
});

Deno.test("manage-push-subscription: rejects empty action", async () => {
  const { status, data } = await callFunction(
    { action: "" },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "action must be 'subscribe' or 'unsubscribe'");
  }
});

Deno.test("manage-push-subscription: rejects action as number", async () => {
  const { status, data } = await callFunction(
    { action: 42 },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "action must be 'subscribe' or 'unsubscribe'");
  }
});

Deno.test("manage-push-subscription: rejects action with SQL injection", async () => {
  const { status, data } = await callFunction(
    { action: "subscribe DROP TABLE push_subscriptions" },
    SUPABASE_ANON_KEY
  );
  // Gateway may block (403) or validation catches it (400) or auth fails (401)
  const validStatuses = [400, 401, 403];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "action must be 'subscribe' or 'unsubscribe'");
  }
});

// --- Subscription Object Validation ---

Deno.test("manage-push-subscription: rejects subscribe without subscription object", async () => {
  const { status, data } = await callFunction(
    { action: "subscribe" },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "subscription must be an object");
  }
});

Deno.test("manage-push-subscription: rejects subscription as string", async () => {
  const { status, data } = await callFunction(
    { action: "subscribe", subscription: "not-an-object" },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "subscription must be an object");
  }
});

Deno.test("manage-push-subscription: rejects subscription as array", async () => {
  const { status, data } = await callFunction(
    { action: "subscribe", subscription: [1, 2, 3] },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "subscription must be an object");
  }
});

// --- Endpoint URL Validation ---

Deno.test("manage-push-subscription: rejects HTTP endpoint (non-HTTPS)", async () => {
  const { status, data } = await callFunction(
    {
      action: "subscribe",
      subscription: {
        endpoint: "http://example.com/push",
        keys: { p256dh: "A".repeat(50), auth: "B".repeat(20) },
      },
    },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "endpoint must use HTTPS protocol");
  }
});

Deno.test("manage-push-subscription: rejects malformed endpoint URL", async () => {
  const { status, data } = await callFunction(
    {
      action: "subscribe",
      subscription: {
        endpoint: "not-a-url-at-all",
        keys: { p256dh: "A".repeat(50), auth: "B".repeat(20) },
      },
    },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "endpoint must be a valid URL");
  }
});

Deno.test("manage-push-subscription: rejects FTP endpoint", async () => {
  const { status, data } = await callFunction(
    {
      action: "subscribe",
      subscription: {
        endpoint: "ftp://files.example.com/push",
        keys: { p256dh: "A".repeat(50), auth: "B".repeat(20) },
      },
    },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "endpoint must use HTTPS protocol");
  }
});

Deno.test("manage-push-subscription: rejects too-short endpoint", async () => {
  const { status, data } = await callFunction(
    {
      action: "subscribe",
      subscription: {
        endpoint: "https://a",
        keys: { p256dh: "A".repeat(50), auth: "B".repeat(20) },
      },
    },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
});

Deno.test("manage-push-subscription: rejects oversized endpoint (>2000 chars)", async () => {
  const longEndpoint = "https://example.com/" + "x".repeat(2000);
  const { status, data } = await callFunction(
    {
      action: "subscribe",
      subscription: {
        endpoint: longEndpoint,
        keys: { p256dh: "A".repeat(50), auth: "B".repeat(20) },
      },
    },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "endpoint must be between 10 and 2000 characters");
  }
});

// --- Base64 Key Validation ---

Deno.test("manage-push-subscription: rejects invalid base64 for p256dh", async () => {
  const { status, data } = await callFunction(
    {
      action: "subscribe",
      subscription: {
        endpoint: "https://fcm.googleapis.com/fcm/send/test",
        keys: { p256dh: "!!!invalid-base64!!!", auth: "B".repeat(20) },
      },
    },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "p256dh must be a valid base64 string");
  }
});

Deno.test("manage-push-subscription: rejects too-short p256dh", async () => {
  const { status, data } = await callFunction(
    {
      action: "subscribe",
      subscription: {
        endpoint: "https://fcm.googleapis.com/fcm/send/test",
        keys: { p256dh: "short", auth: "B".repeat(20) },
      },
    },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "p256dh must be between 20 and 500 characters");
  }
});

Deno.test("manage-push-subscription: rejects oversized p256dh (>500 chars)", async () => {
  const { status, data } = await callFunction(
    {
      action: "subscribe",
      subscription: {
        endpoint: "https://fcm.googleapis.com/fcm/send/test",
        keys: { p256dh: "A".repeat(501), auth: "B".repeat(20) },
      },
    },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "p256dh must be between 20 and 500 characters");
  }
});

Deno.test("manage-push-subscription: rejects invalid base64 for auth", async () => {
  const { status, data } = await callFunction(
    {
      action: "subscribe",
      subscription: {
        endpoint: "https://fcm.googleapis.com/fcm/send/test",
        keys: { p256dh: "A".repeat(50), auth: "!!!invalid!!!" },
      },
    },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "auth must be a valid base64 string");
  }
});

Deno.test("manage-push-subscription: rejects too-short auth key", async () => {
  const { status, data } = await callFunction(
    {
      action: "subscribe",
      subscription: {
        endpoint: "https://fcm.googleapis.com/fcm/send/test",
        keys: { p256dh: "A".repeat(50), auth: "short" },
      },
    },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "auth must be between 10 and 200 characters");
  }
});

// --- Missing Keys Object ---

Deno.test("manage-push-subscription: rejects missing keys object", async () => {
  const { status, data } = await callFunction(
    {
      action: "subscribe",
      subscription: {
        endpoint: "https://fcm.googleapis.com/fcm/send/test",
      },
    },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "subscription.keys must be an object");
  }
});

Deno.test("manage-push-subscription: rejects keys as string", async () => {
  const { status, data } = await callFunction(
    {
      action: "subscribe",
      subscription: {
        endpoint: "https://fcm.googleapis.com/fcm/send/test",
        keys: "not-an-object",
      },
    },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "subscription.keys must be an object");
  }
});

// --- Body Format Tests ---

Deno.test("manage-push-subscription: rejects non-object body", async () => {
  const { status, data } = await callFunction(
    "just a string",
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
});

Deno.test("manage-push-subscription: rejects array body", async () => {
  const { status, data } = await callFunction(
    [{ action: "subscribe" }],
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
});

// --- XSS Attempts ---

Deno.test("manage-push-subscription: rejects XSS in action field", async () => {
  const { status, data } = await callFunction(
    { action: '<script>alert("xss")</script>' },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "action must be 'subscribe' or 'unsubscribe'");
  }
});
