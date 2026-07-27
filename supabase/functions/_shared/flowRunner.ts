/**
 * Runs the chatbot engine for a conversation, sends the resulting messages via
 * the provider, applies side-effects and persists the flow state.
 * Shared by the webhook (auto) and chatbot-start (manual, e.g. Kanban drop).
 */
import { advance, startFlow, type FlowSchema, type OutboundAction } from "./chatbotEngine.ts";
import { getWhatsAppProvider } from "./whatsappProvider.ts";

interface RunArgs {
  supabase: any;
  companyId: number;
  session: any; // whatsapp_sessions row (needs instance_token)
  conversation: any; // chatbot_conversations row
  schema: FlowSchema;
  flowId: string;
  flowRow?: { total_launched?: number } | null;
  incoming: { text: string; buttonId?: string } | null; // null => start the flow
}

export async function runAndPersist({
  supabase,
  companyId,
  session,
  conversation,
  schema,
  flowId,
  flowRow,
  incoming,
}: RunArgs) {
  const provider = getWhatsAppProvider();
  const instanceToken = session?.instance_token ?? "";
  const isStart = incoming == null;

  const result = isStart
    ? startFlow(schema)
    : advance(
        schema,
        { currentNodeId: conversation.current_node_id ?? null, vars: conversation.flow_vars ?? {} },
        incoming,
      );

  let botPaused = false;
  let newStageId: string | null = null;
  let assignedUser: string | null = null;

  for (const action of result.outbound as OutboundAction[]) {
    switch (action.kind) {
      case "send_message": {
        let outText = action.text || "";
        if (action.buttons?.length) outText += "\n\n" + action.buttons.map((b) => `▶ ${b.label}`).join("\n");
        const sent = await provider.sendText(instanceToken, conversation.chat_id, outText);
        await supabase.from("mensagens_whatsapp").insert({
          company_id: companyId,
          conversation_id: conversation.id,
          chat_id: conversation.chat_id,
          sender_type: "bot",
          content: outText,
          content_type: "text",
          direction: "out",
          from_me: true,
          sent_by_bot: true,
          status: sent.ok ? "sent" : "failed",
          wa_message_id: sent.messageId,
        });
        break;
      }
      case "change_stage":
        newStageId = action.stageId;
        break;
      case "assign_user":
        assignedUser = action.userId;
        break;
      case "handoff":
        botPaused = true;
        break;
      case "send_webhook":
        fetch(action.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...action.payload, conversation: conversation.id, chat_id: conversation.chat_id }),
        }).catch((e) => console.warn("send_webhook failed:", e.message));
        break;
      // set_tag / remove_tag / add_note / set_field / wait_delay -> CRM wiring / scheduler (later)
      default:
        break;
    }
  }

  const updates: Record<string, unknown> = {
    active_flow_id: result.ended ? null : flowId,
    current_node_id: result.state.currentNodeId,
    flow_vars: result.state.vars,
    last_message_at: new Date().toISOString(),
    // When parked on a timed delay, record when the scheduler should resume.
    waiting_until: result.waitingForTimer
      ? new Date(Date.now() + (result.delaySeconds ?? 0) * 1000).toISOString()
      : null,
  };
  if (botPaused) updates.bot_paused = true;
  if (newStageId) updates.stage_id = newStageId;
  if (assignedUser) updates.assigned_user_id = assignedUser;
  const lastMsg = [...result.outbound].reverse().find((a: any) => a.kind === "send_message") as any;
  if (lastMsg) updates.last_message_preview = lastMsg.text;

  await supabase.from("chatbot_conversations").update(updates).eq("id", conversation.id);

  // Report metric: count a launch when a fresh run starts.
  if (isStart && flowRow) {
    await supabase
      .from("chatbot_flows")
      .update({ total_launched: (flowRow.total_launched ?? 0) + 1 })
      .eq("id", flowId);
  }

  return result;
}
