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
  is_trending?: boolean;
}

interface UserProfile {
  user_id: string;
  display_name: string | null;
  email: string;
  interests: string[] | null;
  email_notifications_enabled: boolean;
}

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=400&fit=crop&q=80";

const getTopicColor = (topic: string): { bg: string; text: string } => {
  const colors: Record<string, { bg: string; text: string }> = {
    "Mercado": { bg: "#dbeafe", text: "#1e40af" },
    "Economia": { bg: "#fef3c7", text: "#b45309" },
    "Investimentos": { bg: "#d1fae5", text: "#065f46" },
    "Lançamentos": { bg: "#fce7f3", text: "#be185d" },
    "Tecnologia": { bg: "#e0e7ff", text: "#4338ca" },
    "Sustentabilidade": { bg: "#dcfce7", text: "#166534" },
    "Regulação": { bg: "#fee2e2", text: "#991b1b" },
    "Crédito": { bg: "#f3e8ff", text: "#7c3aed" },
    "Fundos Imobiliários": { bg: "#ccfbf1", text: "#0f766e" },
    "Tendências": { bg: "#fef9c3", text: "#a16207" },
  };
  return colors[topic] || { bg: "#f3f4f6", text: "#374151" };
};

const getRegionBadge = (region: string | null): string => {
  const badges: Record<string, string> = {
    "Brazil": "🇧🇷",
    "USA": "🇺🇸",
    "Europe": "🇪🇺",
    "Middle East": "🌍",
    "Asia": "🌏",
    "Global": "🌐",
  };
  return region ? badges[region] || "" : "";
};

const formatDate = (): string => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  };
  return now.toLocaleDateString('pt-BR', options);
};

const generateFeaturedNewsHtml = (news: NewsItem): string => {
  const topicColor = news.topics?.[0] ? getTopicColor(news.topics[0]) : { bg: "#f3f4f6", text: "#374151" };
  const regionBadge = getRegionBadge(news.region);
  const imageUrl = news.image_url || PLACEHOLDER_IMAGE;
  
  return `
    <tr>
      <td style="padding: 0 0 24px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          <!-- Featured Image -->
          <tr>
            <td>
              <img src="${imageUrl}" alt="" style="width: 100%; height: 200px; object-fit: cover; display: block;"/>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <!-- Badges -->
                    <table cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                      <tr>
                        ${news.topics?.[0] ? `
                          <td style="padding-right: 8px;">
                            <span style="display: inline-block; background: ${topicColor.bg}; color: ${topicColor.text}; font-size: 11px; padding: 5px 10px; border-radius: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                              ${news.topics[0]}
                            </span>
                          </td>
                        ` : ""}
                        ${regionBadge && news.region !== "Brazil" ? `
                          <td style="padding-right: 8px;">
                            <span style="display: inline-block; background: #f3f4f6; color: #374151; font-size: 11px; padding: 5px 10px; border-radius: 6px; font-weight: 500;">
                              ${regionBadge} ${news.region}
                            </span>
                          </td>
                        ` : ""}
                        ${news.is_trending ? `
                          <td>
                            <span style="display: inline-block; background: #fff7ed; color: #ea580c; font-size: 11px; padding: 5px 10px; border-radius: 6px; font-weight: 600;">
                              🔥 Em alta
                            </span>
                          </td>
                        ` : ""}
                      </tr>
                    </table>
                    <!-- Title -->
                    <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #111827; line-height: 1.4;">
                      ${news.title}
                    </h2>
                    <!-- Summary -->
                    <p style="margin: 0 0 16px 0; font-size: 15px; color: #4b5563; line-height: 1.7;">
                      ${news.summary_ai ? news.summary_ai.substring(0, 200) + "..." : "Clique para ler a notícia completa."}
                    </p>
                    <!-- CTA -->
                    <a href="${news.source_url}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
                      Ler Notícia →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
};

const generateSecondaryNewsHtml = (news: NewsItem): string => {
  const topicColor = news.topics?.[0] ? getTopicColor(news.topics[0]) : { bg: "#f3f4f6", text: "#374151" };
  const regionBadge = getRegionBadge(news.region);
  const imageUrl = news.image_url || PLACEHOLDER_IMAGE;
  
  return `
    <tr>
      <td style="padding: 0 0 16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <!-- Thumbnail -->
            <td style="width: 120px; vertical-align: top;">
              <img src="${imageUrl}" alt="" style="width: 120px; height: 100px; object-fit: cover; display: block;"/>
            </td>
            <!-- Content -->
            <td style="padding: 16px; vertical-align: top;">
              <!-- Badges Row -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                <tr>
                  ${news.topics?.[0] ? `
                    <td style="padding-right: 6px;">
                      <span style="display: inline-block; background: ${topicColor.bg}; color: ${topicColor.text}; font-size: 10px; padding: 3px 8px; border-radius: 4px; font-weight: 600; text-transform: uppercase;">
                        ${news.topics[0]}
                      </span>
                    </td>
                  ` : ""}
                  ${regionBadge && news.region !== "Brazil" ? `
                    <td>
                      <span style="font-size: 12px;">${regionBadge}</span>
                    </td>
                  ` : ""}
                </tr>
              </table>
              <!-- Title -->
              <h3 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 600; color: #111827; line-height: 1.4;">
                ${news.title.length > 70 ? news.title.substring(0, 70) + "..." : news.title}
              </h3>
              <!-- Summary -->
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
                ${news.summary_ai ? news.summary_ai.substring(0, 80) + "..." : ""}
              </p>
              <!-- Link -->
              <a href="${news.source_url}" style="color: #7c3aed; font-size: 13px; font-weight: 600; text-decoration: none;">
                Ler →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
};

const generateEmailHtml = (
  userName: string,
  news: NewsItem[],
  appUrl: string,
  unsubscribeUrl: string
): string => {
  const featuredNews = news[0];
  const secondaryNews = news.slice(1);
  const formattedDate = formatDate();
  const newsCount = news.length;

  const featuredHtml = featuredNews ? generateFeaturedNewsHtml(featuredNews) : "";
  const secondaryHtml = secondaryNews.map(item => generateSecondaryNewsHtml(item)).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumo Diário REalia</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" style="max-width: 600px;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                REalia
              </h1>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500;">
                Resumo Diário • ${formattedDate}
              </p>
            </td>
          </tr>
          
          <!-- Body Container -->
          <tr>
            <td style="background-color: #f9fafb; padding: 0; border-radius: 0 0 16px 16px; overflow: hidden;">
              <table width="100%" cellpadding="0" cellspacing="0">
                
                <!-- Greeting -->
                <tr>
                  <td style="padding: 28px 24px 20px 24px; background-color: #ffffff; border-bottom: 1px solid #e5e7eb;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #111827;">
                      Bom dia, ${userName || "leitor"}! 👋
                    </h2>
                    <p style="margin: 8px 0 0 0; font-size: 15px; color: #6b7280; line-height: 1.5;">
                      ${newsCount === 1 ? "1 notícia selecionada" : `${newsCount} notícias selecionadas`} para você nas últimas 24 horas.
                    </p>
                  </td>
                </tr>
                
                <!-- Featured Section -->
                ${featuredNews ? `
                <tr>
                  <td style="padding: 24px 24px 0 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <span style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #78350f; font-size: 11px; padding: 6px 12px; border-radius: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                            ⭐ Destaque
                          </span>
                        </td>
                      </tr>
                      ${featuredHtml}
                    </table>
                  </td>
                </tr>
                ` : ""}
                
                <!-- Secondary News Section -->
                ${secondaryNews.length > 0 ? `
                <tr>
                  <td style="padding: 8px 24px 0 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <span style="font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                            Mais Notícias
                          </span>
                        </td>
                      </tr>
                      ${secondaryHtml}
                    </table>
                  </td>
                </tr>
                ` : ""}
                
                <!-- CTA Button -->
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);">
                      Ver Todas as Notícias
                    </a>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f3f4f6; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af;">
                      Você está recebendo este e-mail porque ativou o resumo diário no REalia.
                    </p>
                    <p style="margin: 0; font-size: 12px;">
                      <a href="${appUrl}" style="color: #7c3aed; text-decoration: underline; font-weight: 500;">Gerenciar preferências</a>
                      <span style="color: #d1d5db; margin: 0 8px;">|</span>
                      <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Cancelar inscrição</a>
                    </p>
                  </td>
                </tr>
                
              </table>
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

    const appUrl = req.headers.get("origin") || "https://realia.app";

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: newsData, error: newsError } = await supabase
      .from("news")
      .select("id, title, summary_ai, topics, published_at, source_url, image_url, region, is_trending")
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

    for (const profile of profilesData) {
      const email = userEmailMap.get(profile.user_id);
      if (!email) {
        console.log(`No email found for user ${profile.user_id}`);
        continue;
      }

      let userNews = newsData as NewsItem[];
      if (profile.interests && profile.interests.length > 0) {
        const filteredNews = userNews.filter((news) => {
          if (!news.topics || news.topics.length === 0) return true;
          return news.topics.some((topic) =>
            profile.interests!.includes(topic)
          );
        });
        if (filteredNews.length > 0) {
          userNews = filteredNews;
        }
      }

      try {
        // Generate unsubscribe URL with encoded user_id
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const unsubscribeToken = btoa(profile.user_id);
        const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe-email?token=${unsubscribeToken}&app=${encodeURIComponent(appUrl)}`;

        const emailHtml = generateEmailHtml(
          profile.display_name || email.split("@")[0],
          userNews.slice(0, 5),
          appUrl,
          unsubscribeUrl
        );

        const { error: sendError } = await resend.emails.send({
          from: "REalia <noreply@resend.dev>",
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
