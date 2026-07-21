import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Setup Supabase client using Service Role to bypass RLS (since this is an unauthenticated webhook call from UAZAPI)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let payload;
    try {
      payload = await req.json();
    } catch (e) {
      console.warn("Could not parse JSON payload", e);
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Received webhook payload:", payload);

    // 2. Extract session identifier
    // Different providers (UAZAPI, whapi, wuzapi) use slightly different keys for the session identifier.
    const session_name = payload.session || (payload.data && payload.data.session) || payload.instanceId || payload.instance;
    
    if (!session_name) {
      return new Response(JSON.stringify({ error: "No session identifier provided" }), {
        status: 200, // Returning 200 so the external provider doesn't keep retrying unnecessarily for bad formats
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Lookup tenant company_id for this session
    const { data: sessionData, error: sessionError } = await supabase
      .from("whatsapp_sessions")
      .select("company_id")
      .eq("session_name", session_name)
      .single();

    if (sessionError || !sessionData) {
      console.error("Session lookup error:", sessionError);
      return new Response(JSON.stringify({ error: "Session not registered to any tenant" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const company_id = sessionData.company_id;
    
    // 4. Extract message body and sender
    // Providers differ slightly. Assumes standard WhatsApp Web / Baileys format inside 'payload.data' or flat payload
    const eventType = payload.event || payload.type;
    
    // We only care about incoming messages
    // Baileys 'messages.upsert' or generic 'message' event
    if (eventType === "messages.upsert" || eventType === "message") {
        
      const msgData = payload.data?.messages?.[0] || payload.message || payload.data;
      if (!msgData) throw new Error("Could not find message data in payload");

      const body = msgData?.message?.conversation || msgData?.message?.extendedTextMessage?.text || msgData?.body;
      const fromNumber = msgData?.key?.remoteJid || msgData?.from || "unknown";

      // Ignore our own outbound messages if they loop back to webhook
      const fromMe = msgData?.key?.fromMe;
      if (fromMe) {
          return new Response(JSON.stringify({ success: true, ignored: "message from me" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
          });
      }

      if (body && fromNumber !== "unknown") {
        // Remove whatsapp domain suffixes
        const chatId = fromNumber.replace("@s.whatsapp.net", "").replace("@c.us", "");

        // Save incoming message to Supabase
        const { error: insertError } = await supabase.from("mensagens_whatsapp").insert({
          company_id,
          chat_id: chatId,
          sender_type: "cliente",
          content: body,
          content_type: "text", // assuming text for MVP
        });

        if (insertError) {
            console.error("Database insert error:", insertError);
            throw insertError;
        }
        
        // 5. [TODO: Chatbot Flow Triggers]
        // Here we can evaluate `chatbot_flows` to see if a trigger matches and send a reply via UAZAPI.
        // For example:
        // const { data: activeFlow } = await supabase.from('chatbot_flows').select('*').eq('company_id', company_id)...
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook processing error:", error.message);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
