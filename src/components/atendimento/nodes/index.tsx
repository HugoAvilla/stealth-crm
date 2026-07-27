import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { NodeCard, HandleLabel } from "./NodeCard";
import { useNodeEdit } from "./NodeEditContext";
import { NODE_CATALOG, ACTION_LABELS, OPERATOR_LABELS, genId } from "@/lib/chatbot/nodeCatalog";
import { X, Plus, Link2, MousePointerClick, Pause, Paperclip } from "lucide-react";
import {
  FALLBACK_HANDLE,
  ELSE_HANDLE,
  OK_HANDLE,
  INVALID_HANDLE,
  type TriggerNodeData,
  type MessageNodeData,
  type QuestionNodeData,
  type ConditionNodeData,
  type WaitNodeData,
  type ActionNodeData,
  type GotoNodeData,
  type EndNodeData,
} from "@/lib/chatbot/engine";

const HANDLE_CLS = "!w-3 !h-3 !bg-primary !border-2 !border-background";
const ROW_HANDLE = "!w-3 !h-3 !border-2 !border-background !absolute !right-[-6px] !top-1/2 !-translate-y-1/2";

interface NP {
  id: string;
  data: any;
  selected?: boolean;
}

const distribute = (i: number, n: number) => ((i + 1) / (n + 1)) * 100;

const TRIGGER_LABELS: Record<string, string> = {
  keyword: "Palavra-chave",
  new_conversation: "Nova conversa",
  stage_entry: "Entrada na etapa",
  manual: "Manual",
};

function TriggerNode({ data, selected }: NP) {
  const d = data as TriggerNodeData;
  return (
    <NodeCard icon={NODE_CATALOG.trigger.icon} title="Gatilho" accent="emerald" selected={selected}>
      <div className="font-medium text-foreground">{TRIGGER_LABELS[d.triggerType] ?? d.triggerType}</div>
      {d.triggerType === "keyword" && (d.keywords?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1">
          {d.keywords!.map((k, i) => (
            <span key={i} className="px-1.5 py-0.5 rounded bg-muted text-[10px]">{k}</span>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className={HANDLE_CLS} />
    </NodeCard>
  );
}

// ---------------------------------------------------------------------------
// Message node — Kommo style, inline editable (text + buttons)
// ---------------------------------------------------------------------------
function MessageNode({ id, data, selected }: NP) {
  const { updateData, remove } = useNodeEdit();
  const d = data as MessageNodeData & { buttons?: any[] };
  const buttons = d.buttons ?? [];
  const hasBranch = buttons.some((b) => b.url === undefined);

  const setButtons = (next: any[]) => updateData(id, { buttons: next });
  const addAction = () => setButtons([...buttons, { id: genId("btn"), label: "" }]);
  const addUrl = () => setButtons([...buttons, { id: genId("url"), label: "", url: "" }]);
  const patchButton = (i: number, patch: any) => setButtons(buttons.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const removeButton = (i: number) => setButtons(buttons.filter((_, idx) => idx !== i));

  return (
    <div
      className={cn(
        "w-[300px] rounded-xl border bg-card shadow-sm border-blue-500/40",
        selected && "ring-2 ring-blue-500/40 shadow-md",
      )}
    >
      <Handle type="target" position={Position.Top} className={HANDLE_CLS} />

      {/* header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-blue-500/30 bg-blue-500/10 rounded-t-xl">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <NODE_CATALOG.message.icon className="w-4 h-4" />
          <span className="text-xs font-semibold text-foreground">Mensagem</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(d.attachments?.length ?? 0) > 0 && <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />}
          <button className="nodrag text-muted-foreground hover:text-destructive" onClick={() => remove(id)} title="Excluir">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* text */}
      <div className="px-3 pt-3 pb-2">
        <textarea
          className="nodrag nowheel w-full resize-none text-sm bg-transparent outline-none border rounded-md p-2 focus:border-blue-400 min-h-[54px] leading-snug"
          value={d.text ?? ""}
          placeholder="Escreva a mensagem…"
          rows={2}
          onChange={(e) => updateData(id, { text: e.target.value })}
        />
      </div>

      {/* buttons */}
      {buttons.length > 0 && (
        <div className="pb-1">
          {buttons.map((b, i) => (
            <div key={b.id} className="relative flex items-center gap-1.5 px-3 py-1">
              <div className="flex-1 rounded-md border bg-muted/30 px-2 py-1">
                <div className="flex items-center gap-1.5">
                  {b.url !== undefined ? (
                    <Link2 className="w-3 h-3 text-cyan-500 shrink-0" />
                  ) : (
                    <MousePointerClick className="w-3 h-3 text-blue-500 shrink-0" />
                  )}
                  <input
                    className="nodrag flex-1 min-w-0 bg-transparent text-xs outline-none"
                    value={b.label}
                    placeholder={b.url !== undefined ? "Texto do botão (link)" : "Texto do botão"}
                    onChange={(e) => patchButton(i, { label: e.target.value })}
                  />
                  <button className="nodrag text-muted-foreground hover:text-destructive" onClick={() => removeButton(i)}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {b.url !== undefined && (
                  <input
                    className="nodrag w-full bg-transparent text-[10px] text-muted-foreground outline-none border-t mt-1 pt-1"
                    value={b.url}
                    placeholder="https://…"
                    onChange={(e) => patchButton(i, { url: e.target.value })}
                  />
                )}
              </div>
              {b.url === undefined && (
                <Handle id={b.id} type="source" position={Position.Right} className={cn(ROW_HANDLE, "!bg-blue-500")} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* add buttons */}
      <div className="px-3 pb-2 flex flex-col gap-1.5">
        <button
          className="nodrag flex items-center justify-center gap-1 rounded-md border border-dashed text-xs text-blue-600 dark:text-blue-400 py-1 hover:bg-blue-500/5"
          onClick={addAction}
        >
          <Plus className="w-3 h-3" /> Botão de ação
        </button>
        <button
          className="nodrag flex items-center justify-center gap-1 rounded-md border border-dashed text-xs text-cyan-600 dark:text-cyan-400 py-1 hover:bg-cyan-500/5"
          onClick={addUrl}
        >
          <Plus className="w-3 h-3" /> Botão de URL
        </button>
      </div>

      {/* branches: fallback ("Outra resposta") when there are action buttons; else a single bottom output */}
      {hasBranch ? (
        <div className="relative flex items-center justify-end gap-1.5 px-3 py-1.5 border-t bg-muted/20 rounded-b-xl">
          <span className="text-[10px] text-muted-foreground">Outra resposta</span>
          <Handle id={FALLBACK_HANDLE} type="source" position={Position.Right} className={cn(ROW_HANDLE, "!bg-muted-foreground")} />
        </div>
      ) : (
        <Handle type="source" position={Position.Bottom} className={HANDLE_CLS} />
      )}
    </div>
  );
}

function QuestionNode({ data, selected }: NP) {
  const d = data as QuestionNodeData;
  return (
    <div className="relative">
      <NodeCard icon={NODE_CATALOG.question.icon} title="Pergunta" accent="violet" selected={selected}>
        <Handle type="target" position={Position.Top} className={HANDLE_CLS} />
        <p className="text-foreground/90 line-clamp-3">{d.text || "(pergunta)"}</p>
        <div className="text-[10px] text-muted-foreground">
          → guarda em <span className="font-mono text-foreground">{d.variable || "?"}</span>
          {d.validation && d.validation !== "text" ? ` · ${d.validation}` : ""}
        </div>
      </NodeCard>
      <HandleLabel top={35}>✓</HandleLabel>
      <Handle id={OK_HANDLE} type="source" position={Position.Right} className={HANDLE_CLS} style={{ top: "35%" }} />
      <HandleLabel top={70}>✗</HandleLabel>
      <Handle
        id={INVALID_HANDLE}
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-destructive !border-2 !border-background"
        style={{ top: "70%" }}
      />
    </div>
  );
}

function ConditionNode({ data, selected }: NP) {
  const d = data as ConditionNodeData;
  const rules = d.rules ?? [];
  const total = rules.length + 1; // + else
  return (
    <div className="relative">
      <NodeCard icon={NODE_CATALOG.condition.icon} title="Condição" accent="amber" selected={selected}>
        <Handle type="target" position={Position.Top} className={HANDLE_CLS} />
        <div className="space-y-1">
          {rules.map((r) => (
            <div key={r.id} className="text-[11px] text-foreground/90 truncate">
              <span className="font-mono">{r.variable}</span> {OPERATOR_LABELS[r.operator] ?? r.operator}{" "}
              {r.operator !== "exists" && <span className="font-medium">{r.value}</span>}
            </div>
          ))}
          <div className="text-[10px] text-muted-foreground">senão…</div>
        </div>
      </NodeCard>
      {rules.map((r, i) => (
        <Handle
          key={r.id}
          id={r.id}
          type="source"
          position={Position.Right}
          className={HANDLE_CLS}
          style={{ top: `${distribute(i, total)}%` }}
        />
      ))}
      <Handle
        id={ELSE_HANDLE}
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
        style={{ top: `${distribute(rules.length, total)}%` }}
      />
    </div>
  );
}

function WaitNode({ data, selected }: NP) {
  const d = data as WaitNodeData;
  return (
    <NodeCard icon={NODE_CATALOG.wait.icon} title="Espera" accent="slate" selected={selected}>
      <Handle type="target" position={Position.Top} className={HANDLE_CLS} />
      <div className="text-foreground/90">
        {d.mode === "reply" ? "Aguarda resposta do cliente" : `Aguarda ${d.durationSeconds ?? 0}s`}
      </div>
      <Handle type="source" position={Position.Bottom} className={HANDLE_CLS} />
    </NodeCard>
  );
}

function ActionNode({ data, selected }: NP) {
  const d = data as ActionNodeData;
  const p = d.params || {};
  const summary = p.stageId || p.tag || p.userId || p.field || p.url || (p.text ? `"${p.text}"` : "") || "";
  return (
    <NodeCard icon={NODE_CATALOG.action.icon} title="Ação" accent="rose" selected={selected}>
      <Handle type="target" position={Position.Top} className={HANDLE_CLS} />
      <div className="font-medium text-foreground">{ACTION_LABELS[d.actionType] ?? d.actionType}</div>
      {summary && <div className="text-[10px] truncate">{summary}</div>}
      <Handle type="source" position={Position.Bottom} className={HANDLE_CLS} />
    </NodeCard>
  );
}

function GotoNode({ data, selected }: NP) {
  const d = data as GotoNodeData;
  return (
    <NodeCard icon={NODE_CATALOG.goto.icon} title="Ir para" accent="cyan" selected={selected}>
      <Handle type="target" position={Position.Top} className={HANDLE_CLS} />
      <div className="text-foreground/90 truncate">→ {d.targetNodeId || "(selecione)"}</div>
    </NodeCard>
  );
}

// End node — Kommo "Parar robô" red card
function EndNode({ id, data, selected }: NP) {
  const { remove } = useNodeEdit();
  const d = data as EndNodeData;
  return (
    <div
      className={cn(
        "w-[260px] rounded-xl border-2 border-dashed border-rose-400/60 bg-rose-500/5",
        selected && "ring-2 ring-rose-500/30",
      )}
    >
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-rose-500 !border-2 !border-background" />
      <div className="flex items-center justify-between px-3 py-2 border-b border-rose-400/40">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
          <Pause className="w-4 h-4" />
          <span className="text-xs font-semibold text-foreground">Parar robô</span>
        </div>
        <button className="nodrag text-muted-foreground hover:text-destructive" onClick={() => remove(id)} title="Excluir">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="p-2">
        <div className="rounded-md px-2 py-1.5 bg-background border text-xs text-foreground">
          {d.handoff ? "🤝 Entregar ao atendente" : "✔ Marcar como conversa fechada"}
        </div>
      </div>
    </div>
  );
}

export const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  question: QuestionNode,
  condition: ConditionNode,
  wait: WaitNode,
  action: ActionNode,
  goto: GotoNode,
  end: EndNode,
};
