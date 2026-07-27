import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RotateCcw, Send, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  advance,
  startFlow,
  type FlowSchema,
  type EngineState,
  type OutboundAction,
  type FlowButton,
} from "@/lib/chatbot/engine";

interface ChatItem {
  role: "bot" | "user" | "system";
  text: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schema: FlowSchema;
}

const ACTION_NOTE: Record<string, (a: any) => string> = {
  change_stage: (a) => `➡️ Etapa alterada para "${a.stageId}"`,
  set_tag: (a) => `🏷️ Tag adicionada: ${a.tag}`,
  remove_tag: (a) => `🏷️ Tag removida: ${a.tag}`,
  assign_user: (a) => `👤 Atribuído a ${a.userId}`,
  add_note: (a) => `📝 Nota: ${a.text}`,
  set_field: (a) => `✏️ Campo ${a.field} = ${a.value}`,
  send_webhook: (a) => `🔗 Webhook → ${a.url}`,
  wait_delay: (a) => `⏳ Aguardando ${a.seconds}s…`,
  handoff: () => "🤝 Transferido para atendimento humano",
};

export function FlowSimulator({ open, onOpenChange, schema }: Props) {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [state, setState] = useState<EngineState | null>(null);
  const [pendingButtons, setPendingButtons] = useState<FlowButton[]>([]);
  const [waiting, setWaiting] = useState(false);
  const [ended, setEnded] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const applyResult = (res: ReturnType<typeof advance>) => {
    const newItems: ChatItem[] = [];
    let lastButtons: FlowButton[] = [];
    for (const a of res.outbound as OutboundAction[]) {
      if (a.kind === "send_message") {
        newItems.push({ role: "bot", text: a.text || "(mensagem vazia)" });
        lastButtons = a.buttons ?? [];
      } else {
        const note = ACTION_NOTE[a.kind]?.(a) ?? a.kind;
        newItems.push({ role: "system", text: note });
      }
    }
    setItems((prev) => [...prev, ...newItems]);
    setState(res.state);
    setWaiting(res.waitingForReply);
    setEnded(res.ended);
    setPendingButtons(res.waitingForReply ? lastButtons : []);
  };

  const reset = () => {
    setItems([]);
    setPendingButtons([]);
    setEnded(false);
    if (!schema.nodes.length) {
      setItems([{ role: "system", text: "Fluxo vazio — adicione nós para testar." }]);
      setWaiting(false);
      setState(null);
      return;
    }
    const res = startFlow(schema);
    applyResult(res);
    if (res.ended) setItems((prev) => [...prev, { role: "system", text: "— fim do fluxo —" }]);
  };

  // (re)start whenever the simulator is opened
  useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [items]);

  const send = (text: string, buttonId?: string) => {
    if (!state || ended || !waiting) return;
    const label = text.trim();
    if (!label && !buttonId) return;
    setItems((prev) => [...prev, { role: "user", text: label || pendingButtons.find((b) => b.id === buttonId)?.label || "" }]);
    setInput("");
    setPendingButtons([]);
    const res = advance(schema, state, { text: label, buttonId });
    applyResult(res);
    if (res.ended) setItems((prev) => [...prev, { role: "system", text: "— fim do fluxo —" }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden h-[600px] flex flex-col">
        <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0 bg-muted/30">
          <DialogTitle className="text-sm flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" /> Testar fluxo
          </DialogTitle>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs mr-6" onClick={reset}>
            <RotateCcw className="w-3.5 h-3.5" /> Reiniciar
          </Button>
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
          {items.map((m, i) => {
            if (m.role === "system") {
              return (
                <div key={i} className="text-center">
                  <span className="text-[11px] text-muted-foreground bg-muted/50 rounded-full px-2.5 py-1">{m.text}</span>
                </div>
              );
            }
            return (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm",
                  )}
                >
                  {m.text}
                </div>
              </div>
            );
          })}
        </div>

        {pendingButtons.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {pendingButtons.map((b) => (
              <Button key={b.id} variant="outline" size="sm" className="h-8 text-xs" onClick={() => send(b.label, b.id)}>
                {b.label || "Botão"}
              </Button>
            ))}
          </div>
        )}

        <div className="p-3 border-t flex items-center gap-2 bg-background">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder={ended ? "Fluxo encerrado — reinicie" : waiting ? "Digite uma resposta…" : "Aguarde…"}
            disabled={ended || !waiting}
          />
          <Button size="icon" className="shrink-0" onClick={() => send(input)} disabled={ended || !waiting}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
