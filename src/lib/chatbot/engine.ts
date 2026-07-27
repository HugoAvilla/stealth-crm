/**
 * Chatbot flow engine (pure, dependency-free).
 *
 * This module is the single source of truth for how a Salesbot-style flow is
 * executed. It is intentionally free of any framework / Deno / browser imports
 * so it can run in three places:
 *   - the in-app FlowSimulator (client-side preview)
 *   - vitest unit tests (`@/lib/chatbot/engine`)
 *   - the WhatsApp webhook edge function (Fase 2, via relative import)
 *
 * The flow is stored as a React Flow graph (`{ nodes, edges }`) in
 * `chatbot_flows.flow_schema`. Buttons and condition rules become named source
 * handles on a node, and each edge connects a `sourceHandle` to the next node.
 */

// ---------------------------------------------------------------------------
// Flow schema types
// ---------------------------------------------------------------------------

export type FlowNodeType =
  | "trigger"
  | "message"
  | "question"
  | "condition"
  | "wait"
  | "action"
  | "goto"
  | "end";

export type TriggerType = "keyword" | "new_conversation" | "stage_entry" | "manual";

export interface FlowButton {
  /** Stable id; used as the edge `sourceHandle` for this button. */
  id: string;
  label: string;
  /** When set, this is a URL button (opens a link) instead of a branching reply. */
  url?: string;
  /** Alternative texts that also match this button (Kommo-style synonyms). */
  synonyms?: string[];
}

export type AttachmentType = "image" | "document" | "video" | "audio";

export interface FlowAttachment {
  type: AttachmentType;
  url: string;
  caption?: string;
}

export interface TriggerNodeData {
  triggerType: TriggerType;
  /** keyword trigger */
  keywords?: string[];
  matchMode?: "contains" | "equals";
  /** stage_entry trigger */
  stageId?: string;
}

export interface MessageNodeData {
  text: string;
  buttons?: FlowButton[];
  attachments?: FlowAttachment[];
}

export type ValidationType = "text" | "number" | "email" | "phone";

export interface QuestionNodeData {
  text: string;
  /** variable name the answer is stored under (available to later condition nodes) */
  variable: string;
  validation?: ValidationType;
}

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "gt"
  | "lt"
  | "exists";

export interface ConditionRule {
  /** Stable id; used as the edge `sourceHandle` for this rule. */
  id: string;
  variable: string;
  operator: ConditionOperator;
  value?: string;
}

export interface ConditionNodeData {
  rules: ConditionRule[];
}

export interface WaitNodeData {
  mode: "reply" | "delay";
  durationSeconds?: number;
}

export type ActionType =
  | "set_tag"
  | "remove_tag"
  | "change_stage"
  | "assign_user"
  | "add_note"
  | "set_field"
  | "send_webhook";

export interface ActionNodeData {
  actionType: ActionType;
  params: Record<string, any>;
}

export interface GotoNodeData {
  targetNodeId: string;
}

export interface EndNodeData {
  /** When true, pauses the bot and hands the conversation to a human. */
  handoff?: boolean;
}

export type FlowNodeData =
  | TriggerNodeData
  | MessageNodeData
  | QuestionNodeData
  | ConditionNodeData
  | WaitNodeData
  | ActionNodeData
  | GotoNodeData
  | EndNodeData
  | Record<string, any>;

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
  data: FlowNodeData;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface FlowSchema {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/** Handle id used for the "any other answer / default" branch. */
export const FALLBACK_HANDLE = "__fallback";
/** Handle id used for the condition node's "else" branch. */
export const ELSE_HANDLE = "__else";
/** Handle ids for question validation outcomes. */
export const OK_HANDLE = "__ok";
export const INVALID_HANDLE = "__invalid";

// ---------------------------------------------------------------------------
// Execution model
// ---------------------------------------------------------------------------

export interface EngineState {
  /** Node the conversation is currently parked at (waiting for a reply). null = not started / ended. */
  currentNodeId: string | null;
  /** Collected variables (from question nodes). */
  vars: Record<string, any>;
}

export interface IncomingMessage {
  text: string;
  /** id of the button the user tapped, if any (maps to a message node's button). */
  buttonId?: string;
}

export type OutboundAction =
  | { kind: "send_message"; text: string; buttons?: FlowButton[]; attachments?: FlowAttachment[] }
  | { kind: "change_stage"; stageId: string }
  | { kind: "assign_user"; userId: string }
  | { kind: "add_note"; text: string }
  | { kind: "set_tag"; tag: string }
  | { kind: "remove_tag"; tag: string }
  | { kind: "set_field"; field: string; value: string }
  | { kind: "send_webhook"; url: string; payload: any }
  | { kind: "wait_delay"; seconds: number }
  | { kind: "handoff" };

export interface AdvanceResult {
  state: EngineState;
  outbound: OutboundAction[];
  /** true once the flow reached an `end` node or ran out of nodes. */
  ended: boolean;
  /** true when the flow is parked waiting for the next user message. */
  waitingForReply: boolean;
  /** true when the flow is parked on a timed `wait` (delay) node. */
  waitingForTimer?: boolean;
  /** seconds to wait before resuming, when `waitingForTimer` is true. */
  delaySeconds?: number;
}

/** Options controlling how the engine walks the flow. */
export interface AdvanceOptions {
  /** When true, timed delays are skipped inline (used by the in-app preview). */
  skipDelay?: boolean;
}

/** Guard against infinite loops from goto/condition cycles. */
const MAX_STEPS = 200;

// ---------------------------------------------------------------------------
// Graph helpers
// ---------------------------------------------------------------------------

function getNode(schema: FlowSchema, id: string | null): FlowNode | undefined {
  if (!id) return undefined;
  return schema.nodes.find((n) => n.id === id);
}

function outgoing(schema: FlowSchema, nodeId: string): FlowEdge[] {
  return schema.edges.filter((e) => e.source === nodeId);
}

/** Next node following the node's default (unlabelled) output, or its only output. */
function defaultNext(schema: FlowSchema, nodeId: string): string | null {
  const edges = outgoing(schema, nodeId);
  if (edges.length === 0) return null;
  const plain = edges.find((e) => !e.sourceHandle);
  if (plain) return plain.target;
  // fall back to the first edge so a single labelled output still flows
  return edges[0].target;
}

function nextByHandle(schema: FlowSchema, nodeId: string, handle: string): string | null {
  const edge = outgoing(schema, nodeId).find((e) => e.sourceHandle === handle);
  return edge ? edge.target : null;
}

/** The entry node = the node the trigger points to (or the trigger itself has no successor). */
export function entryNodeId(schema: FlowSchema): string | null {
  const trigger = schema.nodes.find((n) => n.type === "trigger");
  if (trigger) return defaultNext(schema, trigger.id);
  // no explicit trigger: start at the first node with no incoming edge
  const withIncoming = new Set(schema.edges.map((e) => e.target));
  const root = schema.nodes.find((n) => !withIncoming.has(n.id));
  return root ? root.id : schema.nodes[0]?.id ?? null;
}

// ---------------------------------------------------------------------------
// Validation & condition evaluation
// ---------------------------------------------------------------------------

export function validateAnswer(value: string, validation?: ValidationType): boolean {
  const v = (value ?? "").trim();
  if (!validation || validation === "text") return v.length > 0;
  if (validation === "number") return /^-?\d+([.,]\d+)?$/.test(v);
  if (validation === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  if (validation === "phone") return /^\+?[\d\s().-]{8,}$/.test(v);
  return true;
}

function evalRule(rule: ConditionRule, vars: Record<string, any>): boolean {
  const raw = vars[rule.variable];
  const left = raw == null ? "" : String(raw).trim().toLowerCase();
  const right = (rule.value ?? "").trim().toLowerCase();
  switch (rule.operator) {
    case "equals":
      return left === right;
    case "not_equals":
      return left !== right;
    case "contains":
      return left.includes(right);
    case "not_contains":
      return !left.includes(right);
    case "gt":
      return parseFloat(left) > parseFloat(right);
    case "lt":
      return parseFloat(left) < parseFloat(right);
    case "exists":
      return raw != null && String(raw).trim().length > 0;
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Trigger matching (used by the webhook in Fase 2 to pick which flow to start)
// ---------------------------------------------------------------------------

export interface TriggerContext {
  text?: string;
  event?: "new_conversation" | "stage_entry" | "message";
  stageId?: string;
}

export function matchTrigger(schema: FlowSchema, ctx: TriggerContext): boolean {
  const trigger = schema.nodes.find((n) => n.type === "trigger");
  if (!trigger) return false;
  const data = trigger.data as TriggerNodeData;
  switch (data.triggerType) {
    case "manual":
      return false;
    case "new_conversation":
      return ctx.event === "new_conversation";
    case "stage_entry":
      return ctx.event === "stage_entry" && (!data.stageId || data.stageId === ctx.stageId);
    case "keyword": {
      const text = (ctx.text ?? "").toLowerCase();
      const keywords = (data.keywords ?? []).map((k) => k.toLowerCase()).filter(Boolean);
      if (keywords.length === 0) return false;
      if (data.matchMode === "equals") return keywords.some((k) => text.trim() === k);
      return keywords.some((k) => text.includes(k));
    }
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Core: advance the flow
// ---------------------------------------------------------------------------

function actionToOutbound(node: FlowNode): OutboundAction | null {
  const d = node.data as ActionNodeData;
  const p = d.params || {};
  switch (d.actionType) {
    case "set_tag":
      return { kind: "set_tag", tag: p.tag };
    case "remove_tag":
      return { kind: "remove_tag", tag: p.tag };
    case "change_stage":
      return { kind: "change_stage", stageId: p.stageId };
    case "assign_user":
      return { kind: "assign_user", userId: p.userId };
    case "add_note":
      return { kind: "add_note", text: p.text };
    case "set_field":
      return { kind: "set_field", field: p.field, value: p.value };
    case "send_webhook":
      return { kind: "send_webhook", url: p.url, payload: p.payload ?? {} };
    default:
      return null;
  }
}

/**
 * Resolve the node the conversation is parked at, using the user's reply, and
 * return the id of the next node to walk to.
 */
function resolveWaiting(
  schema: FlowSchema,
  node: FlowNode,
  vars: Record<string, any>,
  incoming: IncomingMessage,
): string | null {
  switch (node.type) {
    case "message": {
      // Message with buttons: pick the edge for the tapped button (by id or label).
      const data = node.data as MessageNodeData;
      const buttons = data.buttons ?? [];
      let handle = incoming.buttonId;
      if (!handle && incoming.text) {
        const t = incoming.text.trim().toLowerCase();
        const match = buttons.find(
          (b) =>
            b.label.trim().toLowerCase() === t ||
            (b.synonyms ?? []).some((s) => s.trim().toLowerCase() === t),
        );
        if (match) handle = match.id;
      }
      const target = handle ? nextByHandle(schema, node.id, handle) : null;
      return target ?? nextByHandle(schema, node.id, FALLBACK_HANDLE) ?? defaultNext(schema, node.id);
    }
    case "question": {
      const data = node.data as QuestionNodeData;
      const valid = validateAnswer(incoming.text, data.validation);
      if (valid && data.variable) vars[data.variable] = incoming.text;
      const handle = valid ? OK_HANDLE : INVALID_HANDLE;
      return nextByHandle(schema, node.id, handle) ?? defaultNext(schema, node.id);
    }
    case "wait":
      return defaultNext(schema, node.id);
    default:
      return defaultNext(schema, node.id);
  }
}

function isWaitingNode(node: FlowNode): boolean {
  if (node.type === "question") return true;
  if (node.type === "wait" && (node.data as WaitNodeData).mode === "reply") return true;
  if (node.type === "message" && ((node.data as MessageNodeData).buttons?.length ?? 0) > 0) return true;
  return false;
}

/**
 * Advance the flow.
 * - Pass `incoming = null` to start the flow (from the trigger's entry node).
 * - Pass an `IncomingMessage` to resume from the parked node with the user's reply.
 */
export function advance(
  schema: FlowSchema,
  state: EngineState,
  incoming: IncomingMessage | null,
  opts: AdvanceOptions = {},
): AdvanceResult {
  const outbound: OutboundAction[] = [];
  const vars: Record<string, any> = { ...(state.vars || {}) };

  let cursor: string | null;
  if (state.currentNodeId == null) {
    cursor = entryNodeId(schema);
  } else {
    const parked = getNode(schema, state.currentNodeId);
    cursor = parked ? resolveWaiting(schema, parked, vars, incoming ?? { text: "" }) : entryNodeId(schema);
  }

  let steps = 0;
  while (cursor && steps++ < MAX_STEPS) {
    const node = getNode(schema, cursor);
    if (!node) break;

    switch (node.type) {
      case "trigger":
        cursor = defaultNext(schema, node.id);
        break;

      case "message": {
        const d = node.data as MessageNodeData;
        outbound.push({
          kind: "send_message",
          text: d.text ?? "",
          buttons: d.buttons,
          attachments: d.attachments,
        });
        if ((d.buttons?.length ?? 0) > 0) {
          return { state: { currentNodeId: node.id, vars }, outbound, ended: false, waitingForReply: true };
        }
        cursor = defaultNext(schema, node.id);
        break;
      }

      case "question": {
        const d = node.data as QuestionNodeData;
        outbound.push({ kind: "send_message", text: d.text ?? "" });
        return { state: { currentNodeId: node.id, vars }, outbound, ended: false, waitingForReply: true };
      }

      case "wait": {
        const d = node.data as WaitNodeData;
        if (d.mode === "reply") {
          return { state: { currentNodeId: node.id, vars }, outbound, ended: false, waitingForReply: true };
        }
        // timed delay: park until a scheduler resumes, unless skipping (preview)
        if (opts.skipDelay) {
          outbound.push({ kind: "wait_delay", seconds: d.durationSeconds ?? 0 });
          cursor = defaultNext(schema, node.id);
          break;
        }
        return {
          state: { currentNodeId: node.id, vars },
          outbound,
          ended: false,
          waitingForReply: false,
          waitingForTimer: true,
          delaySeconds: d.durationSeconds ?? 0,
        };
      }

      case "condition": {
        const d = node.data as ConditionNodeData;
        let next: string | null = null;
        for (const rule of d.rules ?? []) {
          if (evalRule(rule, vars)) {
            next = nextByHandle(schema, node.id, rule.id);
            break;
          }
        }
        cursor = next ?? nextByHandle(schema, node.id, ELSE_HANDLE) ?? defaultNext(schema, node.id);
        break;
      }

      case "action": {
        const action = actionToOutbound(node);
        if (action) outbound.push(action);
        cursor = defaultNext(schema, node.id);
        break;
      }

      case "goto": {
        cursor = (node.data as GotoNodeData).targetNodeId ?? null;
        break;
      }

      case "end": {
        if ((node.data as EndNodeData).handoff) outbound.push({ kind: "handoff" });
        return { state: { currentNodeId: null, vars }, outbound, ended: true, waitingForReply: false };
      }

      default:
        cursor = defaultNext(schema, node.id);
    }
  }

  // Ran out of nodes (or hit the step cap): treat as ended.
  return { state: { currentNodeId: null, vars }, outbound, ended: true, waitingForReply: false };
}

/** Convenience wrapper to start a fresh run. */
export function startFlow(
  schema: FlowSchema,
  initialVars: Record<string, any> = {},
  opts: AdvanceOptions = {},
): AdvanceResult {
  return advance(schema, { currentNodeId: null, vars: initialVars }, null, opts);
}

export { isWaitingNode };
