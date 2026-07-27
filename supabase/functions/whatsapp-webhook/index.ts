import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { getCorsHeaders, handlePreflight } from "../_shared/corsHelper.ts";
// Flow execution engine — mirror of src/lib/chatbot/engine.ts (see header there).
import { matchTrigger, type FlowSchema } from "../_shared/chatbotEngine.ts";
import { runAndPersist } from "../_shared/flowRunner.ts";

/**
 * Inbound WhatsApp webhook (unauthenticated — verify_jwt=false).
 * Handles message / connection / qr events from the provider (uazapi), records
 * conversations & messages, and drives the chatbot engine to auto-reply.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return handlePreflight(req);
  const corsHeaders = getCorsHeaders(req) as Record<string, string>;
  const ok = (extra: Record<string, unknown> = {}) =>
    new Response(JSON.stringify({ success: true, ...extra }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const payload = await req.json().catch(() => null);
    if (!payload) return ok({ ignored: "invalid json" });

    // ---- Identify the tenant session (query param first, then payload) ----
    const url = new URL(req.url);
    const sessionName =
      url.searchParams.get("session") ||
      payload.session ||
      payload.data?.session ||
      payload.instance ||
      payload.instanceId;

    if (!sessionName) return ok({ ignored: "no session identifier" });

    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("session_name", sessionName)
      .maybeSingle();
    if (!session) return ok({ ignored: "session not registered" });

    const companyId = session.company_id;
    const eventType: string = payload.event || payload.EventType || payload.type || "";

    // ---- Connection / status events ----
    if (/connection|status|state/i.test(eventType) || payload.connection || payload.status) {
      const status = payload.status || payload.data?.status || payload.connection || payload.instance?.status;
      const phone = payload.instance?.owner || payload.data?.phone || payload.wid;
      if (status) {
        const connected = /connect|open|online/i.test(String(status));
        await supabase
          .from("whatsapp_sessions")
          .update({
            status,
            phone_number: phone ?? session.phone_number,
            qr_code: connected ? null : session.qr_code,
            connected_at: connected ? new Date().toISOString() : session.connected_at,
          })
          .eq("id", session.id);
      }
      return ok({ handled: "connection" });
    }

    // ---- QR code events ----
    if (/qr/i.test(eventType) || payload.qrcode || payload.data?.qrcode) {
      const qr = payload.qrcode || payload.data?.qrcode || payload.qr;
      if (qr) await supabase.from("whatsapp_sessions").update({ qr_code: qr, status: "qr" }).eq("id", session.id);
      return ok({ handled: "qr" });
    }

    // ---- Message events ----
    if (!/message/i.test(eventType) && !payload.message && !payload.data?.messages) {
      return ok({ ignored: `unhandled event: ${eventType}` });
    }

    const msg = payload.message || payload.data?.messages?.[0] || payload.data?.message || payload.data;
    if (!msg) return ok({ ignored: "no message data" });

    const waMessageId = msg.id || msg.messageid || msg.messageId || msg.key?.id || null;
    const fromMe = Boolean(msg.fromMe ?? msg.from_me ?? msg.key?.fromMe);
    const rawFrom = msg.chatid || msg.chatId || msg.from || msg.sender || msg.key?.remoteJid || "";
    const body =
      msg.text ||
      msg.body ||
      msg.content ||
      msg.caption ||
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      "";
    const contactName = msg.senderName || msg.pushName || msg.pushname || msg.notifyName || null;

    const chatId = String(rawFrom).replace("@s.whatsapp.net", "").replace("@c.us", "").replace("@g.us", "");
    if (!chatId) return ok({ ignored: "no chat id" });

    // ---- Dedup by provider message id (also blocks double bot replies on retries) ----
    if (waMessageId) {
      const { data: dup } = await supabase
        .from("mensagens_whatsapp")
        .select("id")
        .eq("company_id", companyId)
        .eq("wa_message_id", waMessageId)
        .maybeSingle();
      if (dup) return ok({ ignored: "duplicate" });
    }

    // ---- Upsert conversation ----
    const now = new Date().toISOString();
    let { data: conv } = await supabase
      .from("chatbot_conversations")
      .select("*")
      .eq("company_id", companyId)
      .eq("chat_id", chatId)
      .maybeSingle();

    let isNew = false;
    if (!conv) {
      isNew = true;
      // default Kanban stage (lowest position) for the card
      const { data: stage } = await supabase
        .from("chatbot_stages")
        .select("id")
        .eq("company_id", companyId)
        .order("position", { ascending: true })
        .limit(1)
        .maybeSingle();
      const { data: created } = await supabase
        .from("chatbot_conversations")
        .insert({
          company_id: companyId,
          session_id: session.id,
          chat_id: chatId,
          contact_name: contactName,
          contact_phone: chatId,
          stage_id: stage?.id ?? null,
          last_message_at: now,
          last_message_preview: body,
          unread_count: fromMe ? 0 : 1,
        })
        .select()
        .single();
      conv = created;
    } else {
      await supabase
        .from("chatbot_conversations")
        .update({
          contact_name: contactName ?? conv.contact_name,
          last_message_at: now,
          last_message_preview: body,
          unread_count: fromMe ? conv.unread_count : (conv.unread_count ?? 0) + 1,
        })
        .eq("id", conv.id);
    }

    // ---- Persist the message ----
    await supabase.from("mensagens_whatsapp").insert({
      company_id: companyId,
      conversation_id: conv.id,
      chat_id: chatId,
      sender_type: fromMe ? "atendente" : "cliente",
      content: body,
      content_type: "text",
      direction: fromMe ? "out" : "in",
      from_me: fromMe,
      wa_message_id: waMessageId,
    });

    // ---- Drive the chatbot engine (inbound only, unless a human took over) ----
    if (!fromMe && !conv.bot_paused && body) {
      await runEngine(supabase, companyId, session, conv, body, isNew);
    }

    return ok({ handled: "message" });
  } catch (error) {
    console.error("Webhook processing error:", (error as Error).message);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Resolve which flow applies and run it (send replies + persist state).
 */
async function runEngine(
  supabase: any,
  companyId: number,
  session: any,
  conv: any,
  text: string,
  isNew: boolean,
) {
  let flowId: string | null = conv.active_flow_id ?? null;
  let schema: FlowSchema | null = null;
  let flowRow: any = null;
  const resuming = Boolean(flowId && conv.current_node_id);

  if (resuming) {
    const { data: flow } = await supabase.from("chatbot_flows").select("*").eq("id", flowId).maybeSingle();
    schema = flow?.flow_schema ?? null;
    flowRow = flow;
  } else {
    // No active flow — look for an active flow whose trigger matches.
    const { data: flows } = await supabase
      .from("chatbot_flows")
      .select("id, flow_schema, total_launched")
      .eq("company_id", companyId)
      .eq("is_active", true);
    const event = isNew ? "new_conversation" : "message";
    const matched = (flows ?? []).find((f: any) =>
      matchTrigger(f.flow_schema as FlowSchema, { text, event, stageId: conv.stage_id }),
    );
    if (matched) {
      flowId = matched.id;
      schema = matched.flow_schema;
      flowRow = matched;
    }
  }

  if (!schema || !flowId) return; // no bot handles this message

  await runAndPersist({
    supabase,
    companyId,
    session,
    conversation: conv,
    schema,
    flowId,
    flowRow,
    incoming: resuming ? { text } : null,
  });
}
