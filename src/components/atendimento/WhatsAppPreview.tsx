import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotateCcw, Send, X, Check } from "lucide-react";
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

const CHANNELS = [
  { id: "whatsapp", label: "WhatsApp Business", color: "#25D366" },
  { id: "whatsapp_lite", label: "WhatsApp Lite", color: "#25D366" },
  { id: "facebook", label: "Facebook", color: "#1877F2" },
  { id: "instagram", label: "Instagram", color: "#E1306C" },
  { id: "telegram", label: "Telegram", color: "#229ED9" },
  { id: "tiktok", label: "TikTok", color: "#000000" },
];

const ACTION_NOTE: Record<string, (a: any) => string> = {
  change_stage: (a) => `➡️ Etapa alterada para "${a.stageId}"`,
  set_tag: (a) => `🏷️ Tag: ${a.tag}`,
  remove_tag: (a) => `🏷️ Tag removida: ${a.tag}`,
  assign_user: (a) => `👤 Atribuído a ${a.userId}`,
  add_note: (a) => `📝 Nota: ${a.text}`,
  set_field: (a) => `✏️ ${a.field} = ${a.value}`,
  send_webhook: (a) => `🔗 Webhook → ${a.url}`,
  wait_delay: (a) => `⏳ Aguardando ${a.seconds}s…`,
  handoff: () => "🤝 Transferido para atendimento humano",
};

/** Live WhatsApp-style preview panel that runs the flow engine client-side. */
export function WhatsAppPreview({ schema, onClose }: { schema: FlowSchema; onClose: () => void }) {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [state, setState] = useState<EngineState | null>(null);
  const [pendingButtons, setPendingButtons] = useState<FlowButton[]>([]);
  const [waiting, setWaiting] = useState(false);
  const [ended, setEnded] = useState(false);
  const [input, setInput] = useState("");
  const [channel, setChannel] = useState("whatsapp");
  const scrollRef = useRef<HTMLDivElement>(null);

  const applyResult = (res: ReturnType<typeof advance>) => {
    const newItems: ChatItem[] = [];
    let lastButtons: FlowButton[] = [];
    for (const a of res.outbound as OutboundAction[]) {
      if (a.kind === "send_message") {
        newItems.push({ role: "bot", text: a.text || "(mensagem vazia)" });
        lastButtons = a.buttons ?? [];
      } else {
        newItems.push({ role: "system", text: ACTION_NOTE[a.kind]?.(a) ?? a.kind });
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
    const res = startFlow(schema, {}, { skipDelay: true });
    applyResult(res);
    if (res.ended) setItems((prev) => [...prev, { role: "system", text: "— fim do fluxo —" }]);
  };

  // Restart whenever the panel mounts or the schema identity changes materially.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const res = advance(schema, state, { text: label, buttonId }, { skipDelay: true });
    applyResult(res);
    if (res.ended) setItems((prev) => [...prev, { role: "system", text: "— fim do fluxo —" }]);
  };

  const channelColor = CHANNELS.find((c) => c.id === channel)?.color ?? "#25D366";

  return (
    <div className="w-96 shrink-0 border-l bg-background flex flex-col h-full">
      {/* Header + channel selector */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b">
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger className="h-8 w-52 text-xs">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: channelColor }} />
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            {CHANNELS.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs">
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={reset} title="Reiniciar">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} title="Fechar preview">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Phone chat */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
        style={{ backgroundColor: "#e5ddd5", backgroundImage: "radial-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)", backgroundSize: "16px 16px" }}
      >
        {items.map((m, i) => {
          if (m.role === "system") {
            return (
              <div key={i} className="text-center my-1">
                <span className="text-[11px] text-gray-600 bg-white/70 rounded-full px-2.5 py-1 shadow-sm">{m.text}</span>
              </div>
            );
          }
          const isUser = m.role === "user";
          return (
            <div key={i} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-2.5 py-1.5 text-sm whitespace-pre-wrap shadow-sm relative text-gray-900",
                  isUser ? "bg-[#dcf8c6] rounded-tr-none" : "bg-white rounded-tl-none",
                )}
              >
                {m.text}
                {isUser && <Check className="inline w-3 h-3 ml-1 text-blue-500 align-text-bottom" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick-reply buttons */}
      {pendingButtons.length > 0 && (
        <div className="px-3 py-2 flex flex-wrap gap-2 border-t bg-[#ece5dd]">
          {pendingButtons.map((b) => (
            <button
              key={b.id}
              onClick={() => send(b.label, b.id)}
              className="px-3 py-1.5 rounded-full bg-white text-[#009688] text-xs font-medium shadow-sm border border-[#009688]/20 hover:bg-[#009688]/5"
            >
              {b.label || "Botão"}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="p-2 border-t flex items-center gap-2 bg-background">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder={ended ? "Fluxo encerrado — reinicie" : waiting ? "Digite uma resposta…" : "Aguarde…"}
          disabled={ended || !waiting}
          className="h-9"
        />
        <Button size="icon" className="shrink-0 h-9 w-9" onClick={() => send(input)} disabled={ended || !waiting}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
