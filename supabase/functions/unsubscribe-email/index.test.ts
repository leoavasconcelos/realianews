import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/unsubscribe-email`;

async function callFunction(params: Record<string, string>) {
  const url = new URL(FUNCTION_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url.toString(), { method: "GET" });
  const text = await response.text();
  return { status: response.status, body: text };
}

// --- Missing Token ---

Deno.test("unsubscribe-email: returns error page without token", async () => {
  const { status, body } = await callFunction({});
  assertEquals(status, 400);
  assertStringIncludes(body, "Algo deu errado");
  assertStringIncludes(body, "Link de cancelamento inválido ou expirado");
});

// --- Invalid Token Format ---

Deno.test("unsubscribe-email: rejects token with special characters", async () => {
  const { status, body } = await callFunction({ token: '<script>alert(1)</script>' });
  assertEquals(status, 400);
  assertStringIncludes(body, "Algo deu errado");
});

Deno.test("unsubscribe-email: rejects too-short token", async () => {
  const { status, body } = await callFunction({ token: "abc" });
  assertEquals(status, 400);
  assertStringIncludes(body, "Algo deu errado");
});

Deno.test("unsubscribe-email: rejects too-long token (>500 chars)", async () => {
  const longToken = "A".repeat(501);
  const { status, body } = await callFunction({ token: longToken });
  assertEquals(status, 400);
  assertStringIncludes(body, "Algo deu errado");
});

Deno.test("unsubscribe-email: rejects token with SQL injection", async () => {
  const sqlInjection = btoa("'; DROP TABLE profiles; --");
  const { status, body } = await callFunction({ token: sqlInjection });
  // Token decodes but not to a valid UUID
  assertEquals(status, 400);
  assertStringIncludes(body, "Algo deu errado");
});

// --- Token Decodes to Non-UUID ---

Deno.test("unsubscribe-email: rejects token that decodes to non-UUID string", async () => {
  const invalidUUID = btoa("not-a-valid-uuid-string");
  const { status, body } = await callFunction({ token: invalidUUID });
  assertEquals(status, 400);
  assertStringIncludes(body, "Link de cancelamento inválido");
});

Deno.test("unsubscribe-email: rejects token that decodes to empty string", async () => {
  const emptyEncoded = btoa("");
  const { status, body } = await callFunction({ token: emptyEncoded });
  // btoa("") = "" which is too short
  assertEquals(status, 400);
  assertStringIncludes(body, "Algo deu errado");
});

// --- Valid Token Format (UUID) but Nonexistent User ---

Deno.test("unsubscribe-email: handles valid UUID for nonexistent user gracefully", async () => {
  const fakeUUID = "00000000-0000-0000-0000-000000000000";
  const validToken = btoa(fakeUUID);
  const { status, body } = await callFunction({ token: validToken });
  // Should return 200 (success page) even if user doesn't exist
  // because the UPDATE query succeeds with 0 affected rows
  assertEquals(status, 200);
  assertStringIncludes(body, "Inscrição Cancelada");
});

// --- App URL Validation ---

Deno.test("unsubscribe-email: uses default URL for invalid app param", async () => {
  const fakeUUID = "00000000-0000-0000-0000-000000000000";
  const validToken = btoa(fakeUUID);
  const { status, body } = await callFunction({
    token: validToken,
    app: "not-a-url",
  });
  assertEquals(status, 200);
  assertStringIncludes(body, "https://realia.app");
});

Deno.test("unsubscribe-email: uses default URL for FTP app param", async () => {
  const fakeUUID = "00000000-0000-0000-0000-000000000000";
  const validToken = btoa(fakeUUID);
  const { status, body } = await callFunction({
    token: validToken,
    app: "ftp://evil.com",
  });
  assertEquals(status, 200);
  assertStringIncludes(body, "https://realia.app");
});

Deno.test("unsubscribe-email: uses default URL for oversized app param", async () => {
  const fakeUUID = "00000000-0000-0000-0000-000000000000";
  const validToken = btoa(fakeUUID);
  const longUrl = "https://example.com/" + "x".repeat(500);
  const { status, body } = await callFunction({
    token: validToken,
    app: longUrl,
  });
  assertEquals(status, 200);
  assertStringIncludes(body, "https://realia.app");
});

Deno.test("unsubscribe-email: accepts valid HTTPS app URL", async () => {
  const fakeUUID = "00000000-0000-0000-0000-000000000000";
  const validToken = btoa(fakeUUID);
  const { status, body } = await callFunction({
    token: validToken,
    app: "https://myapp.example.com",
  });
  assertEquals(status, 200);
  assertStringIncludes(body, "https://myapp.example.com");
});

// --- XSS in App URL ---

Deno.test("unsubscribe-email: escapes XSS in app URL", async () => {
  const fakeUUID = "00000000-0000-0000-0000-000000000000";
  const validToken = btoa(fakeUUID);
  const { status, body } = await callFunction({
    token: validToken,
    app: 'https://example.com"><script>alert(1)</script>',
  });
  // The URL should be HTML-escaped in the response
  assertEquals(status, 200);
  // Should NOT contain unescaped script tags
  assertEquals(body.includes("<script>"), false);
});

// --- XSS in Token ---

Deno.test("unsubscribe-email: rejects XSS payload in token", async () => {
  const { status, body } = await callFunction({
    token: '"><img src=x onerror=alert(1)>',
  });
  // Gateway may block with 403, or validation returns 400
  const validStatuses = [400, 403];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    // Should not contain the raw XSS payload
    assertEquals(body.includes("onerror=alert"), false);
  }
});
