import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const generateSuccessHtml = (appUrl: string): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inscrição Cancelada - REalia</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    .container {
      background: white;
      padding: 48px;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 420px;
      margin: 20px;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon svg {
      width: 40px;
      height: 40px;
      color: white;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 24px;
      font-weight: 700;
      color: #111827;
    }
    p {
      margin: 0 0 24px;
      font-size: 15px;
      color: #6b7280;
      line-height: 1.6;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: white;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 28px;
      border-radius: 10px;
      text-decoration: none;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(124, 58, 237, 0.4);
    }
    .footer {
      margin-top: 24px;
      font-size: 13px;
      color: #9ca3af;
    }
    .footer a {
      color: #7c3aed;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h1>Inscrição Cancelada</h1>
    <p>
      Você não receberá mais o resumo diário por e-mail. 
      Caso mude de ideia, você pode reativar nas configurações do seu perfil.
    </p>
    <a href="${appUrl}" class="btn">Voltar ao REalia</a>
    <div class="footer">
      Mudou de ideia? <a href="${appUrl}">Reative as notificações</a>
    </div>
  </div>
</body>
</html>
  `;
};

const generateErrorHtml = (appUrl: string, message: string): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Erro - REalia</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    .container {
      background: white;
      padding: 48px;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 420px;
      margin: 20px;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: #fee2e2;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon svg {
      width: 40px;
      height: 40px;
      color: #dc2626;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 24px;
      font-weight: 700;
      color: #111827;
    }
    p {
      margin: 0 0 24px;
      font-size: 15px;
      color: #6b7280;
      line-height: 1.6;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: white;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 28px;
      border-radius: 10px;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
    <h1>Algo deu errado</h1>
    <p>${message}</p>
    <a href="${appUrl}" class="btn">Voltar ao REalia</a>
  </div>
</body>
</html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const appUrl = url.searchParams.get("app") || "https://realia.app";

    if (!token) {
      return new Response(
        generateErrorHtml(appUrl, "Link de cancelamento inválido ou expirado. Por favor, acesse seu perfil para gerenciar suas preferências."),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } 
        }
      );
    }

    // Decode token (base64 encoded user_id)
    let userId: string;
    try {
      userId = atob(token);
    } catch {
      return new Response(
        generateErrorHtml(appUrl, "Link de cancelamento inválido. Por favor, acesse seu perfil para gerenciar suas preferências."),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } 
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update user profile to disable email notifications
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ email_notifications_enabled: false })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return new Response(
        generateErrorHtml(appUrl, "Não foi possível processar o cancelamento. Por favor, tente novamente ou acesse seu perfil."),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } 
        }
      );
    }

    console.log(`Successfully unsubscribed user: ${userId}`);

    return new Response(
      generateSuccessHtml(appUrl),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } 
      }
    );
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return new Response(
      generateErrorHtml("https://realia.app", "Ocorreu um erro inesperado. Por favor, tente novamente."),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } 
      }
    );
  }
};

serve(handler);
