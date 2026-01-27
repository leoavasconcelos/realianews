import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewsItem {
  id: string;
  title: string;
  summary_ai: string | null;
  topics: string[];
  published_at: string;
  source_url: string;
  image_url: string | null;
  region: string | null;
}

interface UserProfile {
  user_id: string;
  display_name: string | null;
  email: string;
  interests: string[] | null;
  email_notifications_enabled: boolean;
}

const generateEmailHtml = (
  userName: string,
  news: NewsItem[],
  appUrl: string
): string => {
  const newsItems = news
    .map(
      (item) => `
      <tr>
        <td style="padding: 20px 0; border-bottom: 1px solid #e5e7eb;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                ${
                  item.topics && item.topics.length > 0
                    ? `<span style="display: inline-block; background-color: #f3f4f6; color: #374151; font-size: 12px; padding: 4px 10px; border-radius: 12px; margin-bottom: 8px;">${item.topics[0]}</span>`
                    : ""
                }
                <h3 style="margin: 8px 0; font-size: 16px; font-weight: 600; color: #111827; line-height: 1.4;">
                  ${item.title}
                </h3>
                <p style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                  ${item.summary_ai ? item.summary_ai.substring(0, 150) + "..." : "Clique para ler mais."}
                </p>
                <a href="${item.source_url}" style="display: inline-block; color: #2563eb; font-size: 14px; font-weight: 500; text-decoration: none;">
                  Ler mais →
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumo Diário REalia</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                REalia
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.8);">
                Seu resumo diário do mercado imobiliário
              </p>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 24px 16px 24px;">
              <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">
                Bom dia, ${userName || "leitor"}! 👋
              </h2>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.5;">
                Aqui estão as principais notícias selecionadas para você nas últimas 24 horas.
              </p>
            </td>
          </tr>
          
          <!-- News Items -->
          <tr>
            <td style="padding: 0 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${newsItems}
              </table>
            </td>
          </tr>
          
          <!-- CTA -->
          <tr>
            <td style="padding: 32px 24px; text-align: center;">
              <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; font-size: 14px; font-weight: 600; padding: 14px 28px; border-radius: 8px; text-decoration: none;">
                Ver todas as notícias
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af;">
                Você está recebendo este e-mail porque ativou o resumo diário no REalia.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                <a href="${appUrl}" style="color: #6b7280; text-decoration: underline;">Gerenciar preferências</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get app URL from request or use default
    const appUrl = req.headers.get("origin") || "https://realia.app";

    // Fetch top 5 trending news from last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: newsData, error: newsError } = await supabase
      .from("news")
      .select("id, title, summary_ai, topics, published_at, source_url, image_url, region")
      .gte("published_at", yesterday.toISOString())
      .order("is_trending", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(5);

    if (newsError) {
      console.error("Error fetching news:", newsError);
      throw newsError;
    }

    if (!newsData || newsData.length === 0) {
      console.log("No news found for the last 24 hours");
      return new Response(
        JSON.stringify({ success: true, message: "No news to send", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${newsData.length} news items`);

    // Fetch users with email notifications enabled
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, display_name, interests, email_notifications_enabled")
      .eq("email_notifications_enabled", true);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    if (!profilesData || profilesData.length === 0) {
      console.log("No users with email notifications enabled");
      return new Response(
        JSON.stringify({ success: true, message: "No users to notify", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${profilesData.length} users with notifications enabled`);

    // Fetch user emails from auth.users using service role
    const userIds = profilesData.map((p) => p.user_id);
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    const userEmailMap = new Map(
      users.filter((u) => userIds.includes(u.id)).map((u) => [u.id, u.email])
    );

    let sentCount = 0;
    const errors: string[] = [];

    // Send emails to each user
    for (const profile of profilesData) {
      const email = userEmailMap.get(profile.user_id);
      if (!email) {
        console.log(`No email found for user ${profile.user_id}`);
        continue;
      }

      // Filter news by user interests if they have any
      let userNews = newsData as NewsItem[];
      if (profile.interests && profile.interests.length > 0) {
        const filteredNews = userNews.filter((news) => {
          if (!news.topics || news.topics.length === 0) return true;
          return news.topics.some((topic) =>
            profile.interests!.includes(topic)
          );
        });
        // If filtering results in no news, send all news
        if (filteredNews.length > 0) {
          userNews = filteredNews;
        }
      }

      try {
        const emailHtml = generateEmailHtml(
          profile.display_name || email.split("@")[0],
          userNews.slice(0, 5),
          appUrl
        );

        const { error: sendError } = await resend.emails.send({
          from: "REalia <noreply@resend.dev>", // Using Resend's test domain
          to: [email],
          subject: `📰 Seu resumo diário do mercado imobiliário`,
          html: emailHtml,
        });

        if (sendError) {
          console.error(`Error sending email to ${email}:`, sendError);
          errors.push(`Failed to send to ${email}: ${sendError.message}`);
        } else {
          console.log(`Email sent successfully to ${email}`);
          sentCount++;
        }
      } catch (emailError) {
        console.error(`Exception sending email to ${email}:`, emailError);
        errors.push(`Exception for ${email}: ${emailError}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        total: profilesData.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-daily-digest:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
