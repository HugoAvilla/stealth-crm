/**
 * Frontend metadata for the flow builder: icon, label, colour and default data
 * for each node type. Kept separate from the pure engine (which must stay
 * dependency-free). The BotEditor palette and NodeConfigPanel read from here.
 */
import {
  MessageSquare,
  HelpCircle,
  GitBranch,
  Clock,
  Zap,
  CornerDownRight,
  Flag,
  Play,
  type LucideIcon,
} from "lucide-react";
import type { FlowNodeType, FlowNodeData } from "@/lib/chatbot/engine";

export interface NodeMeta {
  type: FlowNodeType;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind accent colour token used by the custom node border/badge. */
  accent: string;
  /** Whether users can drag this node from the palette (trigger is added once). */
  draggable: boolean;
  defaultData: () => FlowNodeData;
}

let seq = 0;
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${(seq++).toString(36)}`;

export const NODE_CATALOG: Record<FlowNodeType, NodeMeta> = {
  trigger: {
    type: "trigger",
    label: "Gatilho",
    description: "Início do fluxo",
    icon: Play,
    accent: "emerald",
    draggable: false,
    defaultData: () => ({ triggerType: "new_conversation", keywords: [], matchMode: "contains" }),
  },
  message: {
    type: "message",
    label: "Mensagem",
    description: "Envia texto, botões e anexos",
    icon: MessageSquare,
    accent: "blue",
    draggable: true,
    defaultData: () => ({ text: "Olá! 👋", buttons: [], attachments: [] }),
  },
  question: {
    type: "question",
    label: "Pergunta",
    description: "Pergunta e guarda a resposta",
    icon: HelpCircle,
    accent: "violet",
    draggable: true,
    defaultData: () => ({ text: "Qual o seu nome?", variable: "nome", validation: "text" }),
  },
  condition: {
    type: "condition",
    label: "Condição",
    description: "Ramifica conforme regras",
    icon: GitBranch,
    accent: "amber",
    draggable: true,
    defaultData: () => ({
      rules: [{ id: uid("rule"), variable: "nome", operator: "exists", value: "" }],
    }),
  },
  wait: {
    type: "wait",
    label: "Espera",
    description: "Aguarda resposta ou tempo",
    icon: Clock,
    accent: "slate",
    draggable: true,
    defaultData: () => ({ mode: "reply", durationSeconds: 60 }),
  },
  action: {
    type: "action",
    label: "Ação",
    description: "Tag, etapa, responsável, nota…",
    icon: Zap,
    accent: "rose",
    draggable: true,
    defaultData: () => ({ actionType: "change_stage", params: {} }),
  },
  goto: {
    type: "goto",
    label: "Ir para",
    description: "Pula para outro nó",
    icon: CornerDownRight,
    accent: "cyan",
    draggable: true,
    defaultData: () => ({ targetNodeId: "" }),
  },
  end: {
    type: "end",
    label: "Fim",
    description: "Encerra ou entrega ao humano",
    icon: Flag,
    accent: "zinc",
    draggable: true,
    defaultData: () => ({ handoff: true }),
  },
};

export const PALETTE_NODES: NodeMeta[] = Object.values(NODE_CATALOG).filter((n) => n.draggable);

/** Tailwind class fragments per accent so custom nodes stay theme-aware. */
export const ACCENT_CLASSES: Record<string, { border: string; bg: string; text: string; ring: string }> = {
  emerald: { border: "border-emerald-500/40", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/30" },
  blue: { border: "border-blue-500/40", bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", ring: "ring-blue-500/30" },
  violet: { border: "border-violet-500/40", bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", ring: "ring-violet-500/30" },
  amber: { border: "border-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-500/30" },
  slate: { border: "border-slate-400/40", bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-300", ring: "ring-slate-500/30" },
  rose: { border: "border-rose-500/40", bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", ring: "ring-rose-500/30" },
  cyan: { border: "border-cyan-500/40", bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", ring: "ring-cyan-500/30" },
  zinc: { border: "border-zinc-400/40", bg: "bg-zinc-500/10", text: "text-zinc-600 dark:text-zinc-300", ring: "ring-zinc-500/30" },
};

export const ACTION_LABELS: Record<string, string> = {
  set_tag: "Adicionar tag",
  remove_tag: "Remover tag",
  change_stage: "Mudar etapa (Kanban)",
  assign_user: "Atribuir responsável",
  add_note: "Adicionar nota",
  set_field: "Preencher campo",
  send_webhook: "Enviar webhook",
};

export const OPERATOR_LABELS: Record<string, string> = {
  equals: "é igual a",
  not_equals: "é diferente de",
  contains: "contém",
  not_contains: "não contém",
  gt: "maior que",
  lt: "menor que",
  exists: "existe",
};

export const genId = uid;
