import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SITE_ORIGIN = "https://realia.digital";
const SITEMAP_URL = `${SITE_ORIGIN}/sitemap.xml`;
const REQUEST_TIMEOUT_MS = 15000;
const CONCURRENCY = 5;
const FROM_ADDRESS = "REalia Monitor <noreply@resend.dev>";

type Category = "ok" | "redirect" | "client_error" | "server_error" | "network_error";

interface CheckResult {
  url: string;
  statusCode: number | null;
  finalUrl: string | null;
  category: Category;
  error: string | null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const categorize = (status: number | null): Category => {
  if (status === null) return "network_error";
  if (status >= 200 && status < 300) return "ok";
  if (status >= 300 && status < 400) return "redirect";
  if (status >= 400 && status < 500) return "client_error";
  return "server_error";
};

const parseSitemapUrls = (xml: string): string[] => {
  const matches = xml.match(/<loc>\s*([^<\s]+)\s*<\/loc>/gi) || [];
  return matches
    .map((m) => m.replace(/<\/?loc>/gi, "").trim())
    .filter((u) => /^https?:\/\//i.test(u));
};

const checkUrl = async (url: string): Promise<CheckResult> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    // GET com redirect=manual para detectar redirects intermediários.
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "REaliaCrawlMonitor/1.0 (+https://realia.digital)" },
    });
    return {
      url,
      statusCode: res.status,
      finalUrl: res.url && res.url !== url ? res.url : null,
      category: categorize(res.status),
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { url, statusCode: null, finalUrl: null, category: "network_error", error: message };
  } finally {
    clearTimeout(timeout);
  }
};

const runPool = async <T,>(items: string[], worker: (item: string) => Promise<T>, size = CONCURRENCY) => {
  const results: T[] = [];
  let index = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current]);
    }
  });
  await Promise.all(runners);
  return results;
};

const buildEmailHtml = (
  runId: string,
  totals: { total: number; ok: number; redirect: number; error: number },
  changed: Array<{ url: string; previous_category: string | null; previous_status_code: number | null; category: string; status_code: number | null; error: string | null }>,
) => {
  const rows = changed
    .map(
      (c) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px;">${c.url}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${c.previous_category ?? "—"} (${c.previous_status_code ?? "n/a"})</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>${c.category}</strong> (${c.status_code ?? "n/a"})</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#b91c1c;font-size:12px;">${c.error ?? ""}</td>
        </tr>`,
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a;">
      <h2 style="margin:0 0 8px 0;">⚠️ Alterações de crawl detectadas — REalia</h2>
      <p style="color:#475569;margin:0 0 16px 0;">Run <code>${runId}</code></p>
      <div style="background:#f1f5f9;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
        <strong>${totals.total}</strong> URLs · ${totals.ok} OK · ${totals.redirect} redirects · <span style="color:#b91c1c;">${totals.error} erros</span>
      </div>
      <h3 style="margin:0 0 8px 0;">Mudanças em relação à última execução</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f8fafc;text-align:left;">
            <th style="padding:8px;border-bottom:1px solid #e5e7eb;">URL</th>
            <th style="padding:8px;border-bottom:1px solid #e5e7eb;">Anterior</th>
            <th style="padding:8px;border-bottom:1px solid #e5e7eb;">Agora</th>
            <th style="padding:8px;border-bottom:1px solid #e5e7eb;">Erro</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#64748b;font-size:12px;margin-top:24px;">Detalhes completos em Admin → Monitor de Crawl.</p>
    </div>
  `;
};

const getAdminEmails = async (supabase: ReturnType<typeof createClient>): Promise<string[]> => {
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  if (error || !roles?.length) return [];

  const userIds = roles.map((r: { user_id: string }) => r.user_id);
  const emails: string[] = [];
  for (const userId of userIds) {
    const { data } = await supabase.auth.admin.getUserById(userId);
    if (data?.user?.email) emails.push(data.user.email);
  }
  return emails;
};

const sendAlertEmail = async (
  toList: string[],
  runId: string,
  totals: { total: number; ok: number; redirect: number; error: number },
  changed: Array<{ url: string; previous_category: string | null; previous_status_code: number | null; category: string; status_code: number | null; error: string | null }>,
) => {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey || !toList.length) return { sent: false, reason: !apiKey ? "no_api_key" : "no_recipients" };

  const subject = `⚠️ REalia — ${changed.length} URL(s) mudaram no crawl`;
  const html = buildEmailHtml(runId, totals, changed);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to: toList, subject, html }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Resend error:", response.status, text);
    return { sent: false, reason: `resend_${response.status}` };
  }
  return { sent: true, reason: null };
};

const authorize = (req: Request): boolean => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) return false;
  const header = req.headers.get("x-cron-secret");
  const auth = req.headers.get("Authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  return header === cronSecret || bearer === cronSecret;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!authorize(req)) {
      // Also allow authenticated admins to trigger manually via service role bearer check
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const authHeader = req.headers.get("Authorization");
      if (!supabaseUrl || !anonKey || !serviceRoleKey || !authHeader?.startsWith("Bearer ")) {
        return json({ error: "Unauthorized" }, 401);
      }
      const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user?.id) return json({ error: "Unauthorized" }, 401);
      const admin = createClient(supabaseUrl, serviceRoleKey);
      const { data: roles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .in("role", ["admin", "moderator"]);
      if (!roles?.length) return json({ error: "Forbidden" }, 403);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Service configuration error" }, 500);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Buscar sitemap
    const sitemapResponse = await fetch(SITEMAP_URL, {
      headers: { "User-Agent": "REaliaCrawlMonitor/1.0" },
    });
    if (!sitemapResponse.ok) {
      return json({ error: `Falha ao buscar sitemap (${sitemapResponse.status})` }, 502);
    }
    const sitemapXml = await sitemapResponse.text();
    const urls = parseSitemapUrls(sitemapXml);
    if (!urls.length) return json({ error: "Nenhuma URL encontrada no sitemap." }, 400);

    // 2. Buscar último resultado por URL (estado anterior)
    const { data: previous } = await supabase
      .from("crawl_monitor_urls")
      .select("url, status_code, category, checked_at")
      .in("url", urls)
      .order("checked_at", { ascending: false })
      .limit(urls.length * 3);

    const previousMap = new Map<string, { status_code: number | null; category: string }>();
    for (const row of previous || []) {
      if (!previousMap.has(row.url)) {
        previousMap.set(row.url, { status_code: row.status_code, category: row.category });
      }
    }

    // 3. Checar URLs em paralelo
    const results = await runPool(urls, checkUrl);

    // 4. Consolidar
    const totals = { total: results.length, ok: 0, redirect: 0, error: 0 };
    const changed: Array<{ url: string; previous_category: string | null; previous_status_code: number | null; category: string; status_code: number | null; error: string | null }> = [];

    const urlRows = results.map((r) => {
      if (r.category === "ok") totals.ok++;
      else if (r.category === "redirect") totals.redirect++;
      else totals.error++;

      const prev = previousMap.get(r.url) || null;
      const isChanged = prev ? prev.category !== r.category : false;
      if (isChanged) {
        changed.push({
          url: r.url,
          previous_category: prev?.category ?? null,
          previous_status_code: prev?.status_code ?? null,
          category: r.category,
          status_code: r.statusCode,
          error: r.error,
        });
      }

      return {
        url: r.url,
        status_code: r.statusCode,
        final_url: r.finalUrl,
        category: r.category,
        previous_status_code: prev?.status_code ?? null,
        previous_category: prev?.category ?? null,
        changed: isChanged,
        error: r.error,
      };
    });

    // 5. Persistir run
    const { data: runRow, error: runError } = await supabase
      .from("crawl_monitor_runs")
      .insert({
        total_urls: totals.total,
        ok_count: totals.ok,
        redirect_count: totals.redirect,
        error_count: totals.error,
        changed: changed.length > 0,
      })
      .select("id")
      .single();

    if (runError || !runRow) {
      console.error("Erro ao criar run:", runError);
      return json({ error: "Falha ao registrar execução" }, 500);
    }

    const rowsToInsert = urlRows.map((r) => ({ ...r, run_id: runRow.id }));
    const { error: urlsError } = await supabase.from("crawl_monitor_urls").insert(rowsToInsert);
    if (urlsError) {
      console.error("Erro ao inserir URLs:", urlsError);
    }

    // 6. Alerta por e-mail apenas quando há mudança
    let alert = { sent: false, reason: "no_changes" as string | null };
    if (changed.length > 0) {
      const admins = await getAdminEmails(supabase);
      alert = await sendAlertEmail(admins, runRow.id, totals, changed);
      if (alert.sent) {
        await supabase.from("crawl_monitor_runs").update({ alert_sent: true }).eq("id", runRow.id);
      }
    }

    return json({
      success: true,
      runId: runRow.id,
      totals,
      changedCount: changed.length,
      alert,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("monitor-crawl-health error:", error);
    return json({ error: message }, 500);
  }
});