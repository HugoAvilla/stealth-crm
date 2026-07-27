import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handlePreflight } from "../_shared/corsHelper.ts";
import { resolveTenant, HttpError } from "../_shared/auth.ts";
import { getWhatsAppProvider } from "../_shared/whatsappProvider.ts";

/**
 * Sends a manual (human) reply from the inbox.
 *  POST { conversationId: string, text: string }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return handlePreflight(req);
  const corsHeaders = getCorsHeaders(req) as Record<string, string>;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { companyId, service } = await resolveTenant(req);
    const { conversationId, text } = (await req.json()) as { conversationId?: string; text?: string };

    if (!conversationId || !text?.trim()) return json({ error: "conversationId e text são obrigatórios" }, 400);

    // Load the conversation (scoped to tenant) and its session.
    const { data: conv } = await service
      .from("chatbot_conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!conv) return json({ error: "Conversa não encontrada" }, 404);

    const { data: session } = await service
      .from("whatsapp_sessions")
      .select("instance_token")
      .eq("company_id", companyId)
      .maybeSingle();

    const provider = getWhatsAppProvider();
    const result = await provider.sendText(session?.instance_token ?? "", conv.chat_id, text);

    if (!result.ok) return json({ error: result.error || "Falha ao enviar" }, 502);

    // Persist the outbound message.
    await service.from("mensagens_whatsapp").insert({
      company_id: companyId,
      conversation_id: conversationId,
      chat_id: conv.chat_id,
      sender_type: "atendente",
      content: text,
      content_type: "text",
      direction: "out",
      from_me: true,
      sent_by_bot: false,
      status: "sent",
      wa_message_id: result.messageId,
    });

    await service
      .from("chatbot_conversations")
      .update({ last_message_at: new Date().toISOString(), last_message_preview: text })
      .eq("id", conversationId);

    return json({ ok: true, messageId: result.messageId });
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error("whatsapp-send error:", (error as Error).message);
    return json({ error: "Internal Server Error" }, 500);
  }
});
