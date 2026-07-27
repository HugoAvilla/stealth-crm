import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handlePreflight } from "../_shared/corsHelper.ts";
import { resolveTenant, HttpError } from "../_shared/auth.ts";
import { runAndPersist } from "../_shared/flowRunner.ts";

/**
 * Manually starts a bot flow for a conversation (e.g. when a card is dropped
 * into a Kanban column linked to a bot).
 *  POST { conversationId: string, flowId: string }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return handlePreflight(req);
  const corsHeaders = getCorsHeaders(req) as Record<string, string>;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { companyId, service } = await resolveTenant(req);
    const { conversationId, flowId } = (await req.json()) as { conversationId?: string; flowId?: string };
    if (!conversationId || !flowId) return json({ error: "conversationId e flowId são obrigatórios" }, 400);

    const { data: conversation } = await service
      .from("chatbot_conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!conversation) return json({ error: "Conversa não encontrada" }, 404);

    if (conversation.bot_paused) return json({ ok: false, skipped: "bot em atendimento humano" });

    const { data: flow } = await service
      .from("chatbot_flows")
      .select("*")
      .eq("id", flowId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!flow?.flow_schema) return json({ error: "Bot não encontrado" }, 404);

    const { data: session } = await service
      .from("whatsapp_sessions")
      .select("instance_token")
      .eq("company_id", companyId)
      .maybeSingle();

    await runAndPersist({
      supabase: service,
      companyId,
      session,
      conversation,
      schema: flow.flow_schema,
      flowId,
      flowRow: flow,
      incoming: null, // start
    });

    return json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error("chatbot-start error:", (error as Error).message);
    return json({ error: "Internal Server Error" }, 500);
  }
});
