/**
 * Converts a Kommo/amoCRM Salesbot export into our React Flow `flow_schema`.
 *
 * Kommo stores two things in `model`:
 *   - `text`      the step logic (keyed by step number)
 *   - `positions` the visual graph: blocks with x/y, type, actions and links
 * We use `positions` since it already carries the layout + edges.
 *
 * Block → node mapping:
 *   start                        -> trigger (new_conversation)
 *   question + send_message      -> message (buttons come from send_message.buttons)
 *   question + wait              -> wait (delay)
 *   finish / _stop               -> end
 *   static (visual trigger tag)  -> skipped
 *
 * Edges come from each action's `links` (button branches carry a `data.regex`
 * whose text matches a button label) plus the block's `goto`. A buttons message
 * routes its `goto` to the fallback ("any other answer") handle. Kommo's
 * `no_answer` (timeout) has no equivalent in our engine and is skipped.
 */
import { FALLBACK_HANDLE, type FlowSchema, type FlowNode, type FlowEdge } from "@/lib/chatbot/engine";

function extractRegexLabel(regex: string): string {
  // "/Dúvida sobre produto/iu" -> "Dúvida sobre produto"
  const m = /^\/(.*)\/[a-z]*$/s.exec(regex ?? "");
  return (m ? m[1] : regex ?? "").trim();
}

export function kommoToFlowSchema(input: any): { name: string; schema: FlowSchema } {
  const model = input?.model ?? input ?? {};
  const name = model.name || "Bot importado";

  let blocks: any[] = [];
  try {
    blocks = typeof model.positions === "string" ? JSON.parse(model.positions) : model.positions ?? [];
  } catch {
    blocks = [];
  }

  const nid = (id: number | string) => `n${id}`;
  const nodes: FlowNode[] = [];
  const buttonsByBlock: Record<string, { id: string; label: string }[]> = {};

  for (const b of blocks) {
    if (!b || b.type === "static") continue;
    const action = (b.actions ?? [])[0] ?? {};
    const handler = action?.params?.handler;
    const p = action?.params?.params ?? {};
    const position = { x: b.x ?? 0, y: b.y ?? 0 };

    if (b.type === "start") {
      nodes.push({
        id: nid(b.id),
        type: "trigger",
        position,
        data: { triggerType: "new_conversation", keywords: [], matchMode: "contains" },
      });
    } else if (b.type === "finish" || handler === "_stop") {
      nodes.push({ id: nid(b.id), type: "end", position, data: { handoff: false } });
    } else if (handler === "wait") {
      nodes.push({
        id: nid(b.id),
        type: "wait",
        position,
        data: { mode: "delay", durationSeconds: p?.event?.delay ?? 0 },
      });
    } else if (handler === "send_message") {
      const buttons = (p.buttons ?? []).map((btn: any, i: number) => ({
        id: `btn_${b.id}_${i}`,
        label: btn?.text ?? `Botão ${i + 1}`,
      }));
      buttonsByBlock[b.id] = buttons;
      nodes.push({ id: nid(b.id), type: "message", position, data: { text: (p.text ?? "").trim(), buttons, attachments: [] } });
    } else {
      // unknown handler: keep it as a message so nothing is lost
      nodes.push({ id: nid(b.id), type: "message", position, data: { text: (p.text ?? b.name ?? "").trim(), buttons: [], attachments: [] } });
    }
  }

  const exists = (id: number) => nodes.some((n) => n.id === nid(id));
  const edges: FlowEdge[] = [];
  const addEdge = (src: number, tgt: number, handle: string | null) => {
    if (!exists(src) || !exists(tgt)) return;
    const id = `e-${src}-${tgt}-${handle ?? "d"}`;
    if (edges.some((e) => e.id === id)) return;
    edges.push({ id, source: nid(src), target: nid(tgt), sourceHandle: handle, targetHandle: null });
  };

  for (const b of blocks) {
    if (!b || b.type === "static") continue;
    const action = (b.actions ?? [])[0] ?? {};
    const links = action?.links ?? [];
    const buttons = buttonsByBlock[b.id] ?? [];

    for (const l of links) {
      if (l?.data?.regex != null) {
        const label = extractRegexLabel(l.data.regex).toLowerCase();
        const btn = buttons.find((x) => x.label.trim().toLowerCase() === label);
        addEdge(b.id, l.block, btn ? btn.id : FALLBACK_HANDLE);
      } else if (typeof l?.block === "number") {
        addEdge(b.id, l.block, null);
      }
    }

    if (b.goto?.block != null) {
      addEdge(b.id, b.goto.block, buttons.length > 0 ? FALLBACK_HANDLE : null);
    }
    // b.no_answer (timeout branch) has no engine equivalent -> skipped
  }

  return { name, schema: { nodes, edges } };
}
