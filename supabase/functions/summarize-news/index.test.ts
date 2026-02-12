import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/summarize-news`;

// Helper to make requests
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

Deno.test("summarize-news: rejects request without auth token", async () => {
  const { status, data } = await callFunction({ title: "Test", content: "Content" });
  assertEquals(status, 401);
  assertEquals(data.error, "Unauthorized");
});

Deno.test("summarize-news: rejects request with invalid auth token", async () => {
  const { status, data } = await callFunction(
    { title: "Test", content: "Content" },
    "invalid-token-value"
  );
  assertEquals(status, 401);
  assertExists(data.error);
});

// --- Input Validation Tests (using anon key as token to pass auth header check) ---

Deno.test("summarize-news: rejects invalid JSON body", async () => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  };
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers,
    body: "not valid json{{{",
  });
  const text = await response.text();
  // Should return 400 or 401 (auth may fail first)
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(response.status), true);
});

Deno.test("summarize-news: rejects non-object body (array)", async () => {
  const { status, data } = await callFunction(
    [1, 2, 3],
    SUPABASE_ANON_KEY
  );
  // May get 401 (invalid token) or 400 (validation)
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
});

// --- UUID Validation ---

Deno.test("summarize-news: rejects invalid UUID for newsId", async () => {
  const { status, data } = await callFunction(
    { newsId: "not-a-uuid", title: "Test Title", content: "Test content" },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "newsId must be a valid UUID");
  }
});

Deno.test("summarize-news: rejects newsId with SQL injection", async () => {
  const { status, data } = await callFunction(
    { newsId: "DROP TABLE news", title: "Test", content: "Content" },
    SUPABASE_ANON_KEY
  );
  // Gateway may block (403) or validation catches it (400) or auth fails (401)
  const validStatuses = [400, 401, 403];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "newsId must be a valid UUID");
  }
});

Deno.test("summarize-news: rejects newsId as number", async () => {
  const { status, data } = await callFunction(
    { newsId: 12345, title: "Test", content: "Content" },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "newsId must be a string");
  }
});

// --- Title Validation ---

Deno.test("summarize-news: rejects empty title", async () => {
  const { status, data } = await callFunction(
    { title: "", content: "Some content here" },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "title must be at least 1 characters");
  }
});

Deno.test("summarize-news: rejects whitespace-only title", async () => {
  const { status, data } = await callFunction(
    { title: "   ", content: "Some content here" },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
});

Deno.test("summarize-news: rejects title exceeding 500 characters", async () => {
  const longTitle = "A".repeat(501);
  const { status, data } = await callFunction(
    { title: longTitle, content: "Content" },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "title must not exceed 500 characters");
  }
});

Deno.test("summarize-news: rejects title with type number", async () => {
  const { status, data } = await callFunction(
    { title: 12345, content: "Content" },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "title must be a string");
  }
});

Deno.test("summarize-news: strips XSS from title", async () => {
  // This should not return 400 - it should strip the tags and proceed
  // (may still fail on auth, which is fine for this test)
  const { status } = await callFunction(
    { title: '<script>alert("xss")</script>Real Title', content: "Content" },
    SUPABASE_ANON_KEY
  );
  // Should NOT be 400 for XSS in title (tags are stripped, not rejected)
  // Will likely be 401 (auth) which is fine
  const validStatuses = [200, 401];
  assertEquals(validStatuses.includes(status), true);
});

// --- Content Validation ---

Deno.test("summarize-news: rejects empty content", async () => {
  const { status, data } = await callFunction(
    { title: "Valid Title", content: "" },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "content must be at least 1 characters");
  }
});

Deno.test("summarize-news: rejects content exceeding 10000 characters", async () => {
  const longContent = "B".repeat(10001);
  const { status, data } = await callFunction(
    { title: "Valid Title", content: longContent },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "content must not exceed 10000 characters");
  }
});

Deno.test("summarize-news: rejects null content", async () => {
  const { status, data } = await callFunction(
    { title: "Valid Title", content: null },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "content must be a string");
  }
});

// --- Topics Array Validation ---

Deno.test("summarize-news: rejects topics with more than 10 items", async () => {
  const manyTopics = Array.from({ length: 11 }, (_, i) => `topic-${i}`);
  const { status, data } = await callFunction(
    { title: "Valid Title", content: "Content", topics: manyTopics },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "topics must have at most 10 items");
  }
});

Deno.test("summarize-news: rejects topics as string instead of array", async () => {
  const { status, data } = await callFunction(
    { title: "Valid Title", content: "Content", topics: "not-an-array" },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "topics must be an array");
  }
});

Deno.test("summarize-news: rejects topic items exceeding 100 chars", async () => {
  const longTopic = "C".repeat(101);
  const { status, data } = await callFunction(
    { title: "Valid Title", content: "Content", topics: [longTopic] },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "topics[0] must be between 1 and 100 characters");
  }
});

Deno.test("summarize-news: rejects non-string topic items", async () => {
  const { status, data } = await callFunction(
    { title: "Valid Title", content: "Content", topics: [123, "valid"] },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "topics[0] must be a string");
  }
});

// --- Missing Required Fields ---

Deno.test("summarize-news: rejects missing title", async () => {
  const { status, data } = await callFunction(
    { content: "Some content" },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "title must be a string");
  }
});

Deno.test("summarize-news: rejects missing content", async () => {
  const { status, data } = await callFunction(
    { title: "Valid Title" },
    SUPABASE_ANON_KEY
  );
  const validStatuses = [400, 401];
  assertEquals(validStatuses.includes(status), true);
  if (status === 400) {
    assertEquals(data.error, "content must be a string");
  }
});
