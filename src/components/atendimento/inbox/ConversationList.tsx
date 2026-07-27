import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/hooks/useConversations";

interface Props {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (c: Conversation) => void;
  isLoading?: boolean;
}

function initials(name?: string | null, phone?: string | null) {
  const base = (name || phone || "?").trim();
  const parts = base.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || base.slice(0, 2).toUpperCase();
}

function timeLabel(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function ConversationList({ conversations, selectedId, onSelect, isLoading }: Props) {
  const [q, setQ] = useState("");
  const filtered = conversations.filter((c) =>
    (c.contact_name || c.contact_phone || c.chat_id).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="w-full md:w-80 shrink-0 border-r bg-background flex flex-col h-full">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar conversa…" className="pl-8 h-9" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && <p className="text-center text-sm text-muted-foreground py-8">Carregando…</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8 px-4">Nenhuma conversa.</p>
        )}
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 border-b text-left hover:bg-accent/50 transition-colors",
              selectedId === c.id && "bg-accent",
            )}
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
              {initials(c.contact_name, c.contact_phone)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">{c.contact_name || c.contact_phone || c.chat_id}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{timeLabel(c.last_message_at)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground truncate">{c.last_message_preview || "—"}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {!c.bot_paused && c.active_flow_id && <Bot className="w-3.5 h-3.5 text-emerald-500" />}
                  {c.unread_count > 0 && (
                    <Badge className="h-5 min-w-5 px-1.5 rounded-full text-[10px]">{c.unread_count}</Badge>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
