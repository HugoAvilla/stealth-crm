import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Smartphone, Wifi, WifiOff, MessageSquare, Columns3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversations } from "@/hooks/useConversations";
import { useWhatsAppSession } from "@/hooks/useWhatsAppSession";
import { ConversationList } from "./ConversationList";
import { ChatThread } from "./ChatThread";
import { KanbanBoard } from "./KanbanBoard";
import { ConnectWhatsAppDialog } from "@/components/atendimento/ConnectWhatsAppDialog";

export function InboxView() {
  const { data: conversations = [], isLoading } = useConversations();
  const { session, connected } = useWhatsAppSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [view, setView] = useState<"chat" | "funil">("chat");

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background">
      {/* Connection status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-3 text-sm">
          {connected ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-muted-foreground">Conectado</span>
              {session?.phone_number && <Badge variant="secondary" className="font-normal">{session.phone_number}</Badge>}
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">WhatsApp não conectado</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle: chat list vs funnel/kanban */}
          <div className="flex items-center rounded-lg border p-0.5 bg-background">
            <button
              onClick={() => setView("chat")}
              className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                view === "chat" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Conversas
            </button>
            <button
              onClick={() => setView("funil")}
              className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                view === "funil" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <Columns3 className="w-3.5 h-3.5" /> Funil
            </button>
          </div>
          <Button size="sm" variant={connected ? "outline" : "default"} className="gap-2" onClick={() => setConnectOpen(true)}>
            <Smartphone className="w-4 h-4" /> {connected ? "Reconectar" : "Conectar WhatsApp"}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {view === "funil" ? (
          <KanbanBoard onOpenConversation={(id) => { setSelectedId(id); setView("chat"); }} />
        ) : conversations.length === 0 && !isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground px-6">
            <Bot className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-medium text-foreground">Nenhuma conversa ainda</p>
            <p className="text-sm mt-1 max-w-sm">
              {connected
                ? "As conversas aparecerão aqui assim que seus clientes enviarem mensagens."
                : "Conecte um número via QR code para começar a receber conversas."}
            </p>
            {!connected && (
              <Button className="mt-4 gap-2" onClick={() => setConnectOpen(true)}>
                <Smartphone className="w-4 h-4" /> Conectar WhatsApp
              </Button>
            )}
          </div>
        ) : (
          <>
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={(c) => setSelectedId(c.id)}
              isLoading={isLoading}
            />
            {selected ? (
              <ChatThread conversation={selected} />
            ) : (
              <div className="flex-1 hidden md:flex flex-col items-center justify-center text-muted-foreground">
                <Bot className="w-12 h-12 mb-4 opacity-20" />
                <p>Selecione uma conversa</p>
              </div>
            )}
          </>
        )}
      </div>

      <ConnectWhatsAppDialog open={connectOpen} onOpenChange={setConnectOpen} />
    </div>
  );
}
