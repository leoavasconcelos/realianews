# Edge Function Input Validation Documentation

This document outlines the input validation constraints and security rules for all backend edge functions. These constraints prevent injection attacks, resource exhaustion, and data corruption.

## Overview

All edge functions validate inputs at the entry point before processing. Invalid inputs return HTTP 400 with descriptive error messages. No sensitive internal details are leaked in error responses.

---

## 1. summarize-news

**Purpose**: Generates AI summaries of news articles using Lovable AI.

**Authentication**: Required (Bearer token)

### Input Parameters

| Parameter | Type | Required | Constraints | Example |
|-----------|------|----------|-------------|---------|
| `newsId` | UUID | Optional | Valid UUID format or null | `550e8400-e29b-41d4-a716-446655440000` |
| `title` | string | Required | 1-500 characters, HTML stripped | `Mercado imobiliário cresce 15%` |
| `content` | string | Required | 1-10,000 characters, HTML stripped | Article text (max 10k chars) |
| `topics` | string[] | Optional | Max 10 items, each 1-100 chars, HTML stripped | `["crescimento", "vendas", "preços"]` |

### Validation Rules

```typescript
// UUID validation
- Must match: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// String validation
- title: 1-500 chars after trimming
- content: 1-10,000 chars after trimming
- All HTML tags removed via regex: /<[^>]*>/g

// Array validation
- topics: optional array
- Max 10 items
- Each item: 1-100 chars, trimmed, HTML stripped
```

### Error Responses

| Error Message | Status | Cause |
|---------------|--------|-------|
| `"newsId must be a valid UUID"` | 400 | Invalid UUID format |
| `"title must be at least 1 characters"` | 400 | Empty title |
| `"title must not exceed 500 characters"` | 400 | Title too long |
| `"content must be at least 1 characters"` | 400 | Empty content |
| `"content must not exceed 10000 characters"` | 400 | Content too long |
| `"topics must have at most 10 items"` | 400 | Too many topics |
| `"topics[0] must be between 1 and 100 characters"` | 400 | Topic item invalid |
| `"Invalid JSON in request body"` | 400 | Malformed JSON |
| `"Unauthorized"` | 401 | Missing or invalid auth token |

### Valid Request Example

```bash
curl -X POST https://api.example.com/functions/v1/summarize-news \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Mercado imobiliário cresce 15% no trimestre",
    "content": "O mercado imobiliário brasileiro registrou crescimento...",
    "topics": ["crescimento", "mercado", "imóveis"],
    "newsId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### Security Considerations

- ✅ HTML tags stripped to prevent XSS via summary content
- ✅ Length limits prevent resource exhaustion and DoS attacks
- ✅ UUID validation prevents arbitrary database queries
- ✅ Topics array size limited to prevent array bombing

---

## 2. manage-push-subscription

**Purpose**: Manages Web Push API subscriptions for users (subscribe/unsubscribe).

**Authentication**: Required (Bearer token)

### Input Parameters

| Parameter | Type | Required | Constraints | Notes |
|-----------|------|----------|-------------|-------|
| `action` | enum | Required | `"subscribe"` or `"unsubscribe"` | Case-sensitive |
| `subscription.endpoint` | URL | Conditional | 10-2000 chars, HTTPS only | Required if `action="subscribe"` |
| `subscription.keys.p256dh` | base64 | Conditional | 20-500 chars, valid base64 | Cryptographic key, required if `action="subscribe"` |
| `subscription.keys.auth` | base64 | Conditional | 10-200 chars, valid base64 | Authentication token, required if `action="subscribe"` |

### Validation Rules

```typescript
// Action validation
- Must be exactly "subscribe" or "unsubscribe"
- Case-sensitive

// Endpoint validation (subscribe only)
- 10-2000 characters
- Must be valid HTTPS URL: protocol must be "https:"
- Regex: /^https:\/\/.+/

// Base64 key validation (subscribe only)
- p256dh: 20-500 characters, matches /^[A-Za-z0-9+/\-_]+=*$/
- auth: 10-200 characters, matches /^[A-Za-z0-9+/\-_]+=*$/
```

### Error Responses

| Error Message | Status | Cause |
|---------------|--------|-------|
| `"action must be 'subscribe' or 'unsubscribe'"` | 400 | Invalid action value |
| `"endpoint must be a string"` | 400 | Endpoint not a string |
| `"endpoint must be between 10 and 2000 characters"` | 400 | Endpoint length invalid |
| `"endpoint must use HTTPS protocol"` | 400 | Non-HTTPS URL |
| `"endpoint must be a valid URL"` | 400 | Malformed URL |
| `"p256dh must be a string"` | 400 | Key not a string |
| `"p256dh must be between 20 and 500 characters"` | 400 | Key length invalid |
| `"p256dh must be a valid base64 string"` | 400 | Invalid base64 format |
| `"auth must be between 10 and 200 characters"` | 400 | Auth length invalid |
| `"auth must be a valid base64 string"` | 400 | Invalid base64 format |
| `"subscription must be an object"` | 400 | Not an object |
| `"subscription.keys must be an object"` | 400 | Keys not an object |
| `"Request body must be a JSON object"` | 400 | Not a JSON object |
| `"Unauthorized"` | 401 | Missing or invalid auth token |

### Valid Request Example

```bash
# Subscribe
curl -X POST https://api.example.com/functions/v1/manage-push-subscription \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "action": "subscribe",
    "subscription": {
      "endpoint": "https://fcm.googleapis.com/fcm/send/ABC123...",
      "keys": {
        "p256dh": "BOpc+z8p8+8t9u0v1w2x3y4z5a6b7c8d9e0f1g2h3i4j5k6l7m8n9o0p1q2r3s4t5u6v7w8x9y0z1a2b3c4d5e6f7",
        "auth": "sKqZTqLgr6x7s8t9u0v1w2x3y4z5a6b7"
      }
    }
  }'

# Unsubscribe
curl -X POST https://api.example.com/functions/v1/manage-push-subscription \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"action": "unsubscribe"}'
```

### Security Considerations

- ✅ Endpoint validated as HTTPS URL to prevent downgrade attacks
- ✅ Base64 keys size-limited to prevent oversized key injection
- ✅ Action enum prevents arbitrary operations
- ✅ Keys stored server-side, not exposed to other users (RLS protected)

---

## 3. unsubscribe-email

**Purpose**: Handles email unsubscription links for daily digest notifications.

**Authentication**: Not required (public endpoint)

### Input Parameters

| Parameter | Type | Location | Constraints | Notes |
|-----------|------|----------|-------------|-------|
| `token` | string | Query param | 10-500 chars, base64 decodable to UUID | Base64-encoded user ID |
| `app` | URL | Query param | Optional, HTTPS, max 500 chars | App redirect URL |

### Validation Rules

```typescript
// Token validation
- 10-500 characters
- Must contain only base64 chars: /^[A-Za-z0-9+/=\-_]+$/
- When decoded with atob(), must be a valid UUID
- UUID regex: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// App URL validation
- Optional, falls back to "https://realia.app"
- Must be valid HTTPS or HTTP URL
- Max 500 characters
- Invalid URLs are silently ignored (fallback to default)
```

### Error Responses

| Error Scenario | Status | Response |
|----------------|--------|----------|
| Invalid token format | 400 | HTML error page: "Link de cancelamento inválido ou expirado..." |
| Token doesn't decode to UUID | 400 | HTML error page: "Link de cancelamento inválido..." |
| Invalid app URL | 200 | HTML success/error page with fallback URL |
| Database error | 500 | HTML error page: "Não foi possível processar o cancelamento..." |

### Valid Request Example

```bash
# Generate token: base64(user_id)
# Example: user_id = "550e8400-e29b-41d4-a716-446655440000"
# Token = base64("550e8400-e29b-41d4-a716-446655440000")

curl "https://api.example.com/functions/v1/unsubscribe-email?token=NTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAw&app=https://myapp.com"
```

### Security Considerations

- ✅ Token format validated before decoding to prevent atob() attacks
- ✅ UUID validation after decoding ensures token points to valid user
- ✅ App URL sanitized for XSS prevention (HTML-escaped in templates)
- ✅ Invalid tokens return generic error message (no user enumeration)
- ✅ Public endpoint but token is one-time, user-specific

---

## 4. aggregate-news

**Purpose**: Aggregates news from RSS feeds (cron-triggered).

**Authentication**: Not required (admin-only via RLS)

### Input Parameters

None (hardcoded RSS feed URLs)

### Validation Rules

- No user input (feeds are hardcoded)
- Function is cron-scheduled (internal only)

### Security Considerations

- ✅ No user input = no injection risk
- ✅ RLS policies prevent unauthorized access to news table

---

## 5. process-news-summaries

**Purpose**: Processes queued news items for AI summarization (cron-triggered).

**Authentication**: Not required (admin-only via RLS)

### Input Parameters

None (cron-triggered)

### Validation Rules

- No user input (cron-triggered)
- Validates newsId exists and is type UUID before calling summarize-news

### Security Considerations

- ✅ No user input = no injection risk
- ✅ Calls summarize-news function which has its own validation

---

## 6. send-daily-digest

**Purpose**: Sends daily email digests to users (cron-triggered).

**Authentication**: Not required (admin-only via RLS)

### Input Parameters

None (cron-triggered)

### Validation Rules

- No user input (cron-triggered)
- Uses service role to query user preferences and subscriptions

### Security Considerations

- ✅ No user input = no injection risk
- ✅ Service role prevents unauthorized email sending

---

## Common Validation Patterns

### UUID Validation

```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  if (!UUID_REGEX.test(value)) {
    throw new ValidationError(`${fieldName} must be a valid UUID`);
  }
  return value;
}
```

### String Validation

```typescript
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
```

### Base64 Validation

```typescript
const BASE64_REGEX = /^[A-Za-z0-9+/\-_]+=*$/;

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
```

### HTML Sanitization

```typescript
const HTML_TAG_REGEX = /<[^>]*>/g;

function sanitizeString(value: string): string {
  return value.replace(HTML_TAG_REGEX, "");
}
```

---

## Maintenance Guidelines

### When Adding New Edge Functions

1. **Define input constraints** in this document
2. **Implement validation** using patterns from "Common Validation Patterns" section
3. **Return 400 errors** with descriptive messages for invalid inputs
4. **Never log sensitive data** in error messages
5. **Test with invalid inputs** (oversized, malformed, XSS, SQL injection attempts)

### When Modifying Constraints

1. Update this documentation **first**
2. Update the edge function code
3. Deploy and test with boundary cases
4. Document the reason for the constraint change in git history

### Testing Invalid Inputs

Always test edge functions with:

```bash
# Oversized inputs
curl ... -d '{"title": "<very long string x 10000>"}'

# Malformed data
curl ... -d '{"title": null}'
curl ... -d '{"title": 123}'

# XSS attempts
curl ... -d '{"title": "<script>alert(1)</script>"}'

# SQL injection patterns (prevented by parameterized queries)
curl ... -d '{"title": "'; DROP TABLE users; --"}'

# Invalid UUIDs
curl ... -d '{"newsId": "not-a-uuid"}'
curl ... -d '{"newsId": "00000000-0000-0000-0000-000000000000"}'

# Invalid URLs
curl ... -d '{"endpoint": "http://example.com"}'
curl ... -d '{"endpoint": "ftp://example.com"}'

# Invalid base64
curl ... -d '{"p256dh": "!!invalid base64!!"}'
```

---

## Security Incident Response

If a validation bypass is discovered:

1. **Immediately** update this documentation with the missing constraint
2. **Update the edge function** to enforce the constraint
3. **Deploy** the fix
4. **Audit** logs for exploitation attempts
5. **Document** the incident in the function comments

---

**Last Updated**: February 12, 2026  
**Reviewed By**: Security team  
**Next Review**: Quarterly
