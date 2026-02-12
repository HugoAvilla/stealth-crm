const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, text } = await req.json();

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: 'Campos "to" e "subject" são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GMAIL_USER = Deno.env.get("GMAIL_USER")!;
    const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const REFRESH_TOKEN = Deno.env.get("REFRESH_TOKEN")!;

    // Step 1: Get access token using refresh token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Erro ao obter access token:", tokenData);
      throw new Error(`Falha ao obter access token: ${tokenData.error_description || tokenData.error || 'unknown'}`);
    }

    // Step 2: Build RFC 2822 email
    const emailBody = html || text || "";
    const contentType = html ? "text/html" : "text/plain";

    const rawEmail = [
      `From: "CRM WFE" <${GMAIL_USER}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: ${contentType}; charset=utf-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      btoa(unescape(encodeURIComponent(emailBody))),
    ].join("\r\n");

    // Step 3: Base64url encode the entire message
    const encodedMessage = btoa(rawEmail)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Step 4: Send via Gmail API
    const sendRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encodedMessage }),
      }
    );

    const sendData = await sendRes.json();

    if (!sendRes.ok) {
      console.error("Erro ao enviar email via Gmail API:", sendData);
      throw new Error(`Gmail API error: ${sendData.error?.message || JSON.stringify(sendData)}`);
    }

    console.log("Email enviado com sucesso:", sendData.id);

    return new Response(
      JSON.stringify({ success: true, message: `Email enviado para ${to}`, messageId: sendData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    return new Response(
      JSON.stringify({ error: `Falha ao enviar email: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
