import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, User, Hand, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMessages, useSendMessage } from "@/hooks/useMessages";
import { useUpdateConversation, type Conversation } from "@/hooks/useConversations";
import { MessageComposer } from "./MessageComposer";

function bubbleTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function ChatThread({ conversation }: { conversation: Conversation }) {
  const { data: messages = [], isLoading } = useMessages(conversation.id);
  const sendMessage = useSendMessage();
  const updateConversation = useUpdateConversation();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mark as read when opened / when new messages arrive
  useEffect(() => {
    if (conversation.unread_count > 0) {
      updateConversation.mutate({ id: conversation.id, updates: { unread_count: 0 } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, conversation.unread_count]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const paused = conversation.bot_paused;

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-muted/10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
        <div className="min-w-0">
          <h3 className="font-semibold truncate">
            {conversation.contact_name || conversation.contact_phone || conversation.chat_id}
          </h3>
          <p className="text-xs text-muted-foreground">{conversation.contact_phone || conversation.chat_id}</p>
        </div>
        <div className="flex items-center gap-2">
          {paused ? (
            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/40">
              <Hand className="w-3 h-3" /> Atendimento humano
            </Badge>
          ) : (
            conversation.active_flow_id && (
              <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-500/40">
                <Bot className="w-3 h-3" /> Bot ativo
              </Badge>
            )
          )}
          {paused ? (
            <Button
              size="sm" variant="outline" className="gap-1.5"
              onClick={() => updateConversation.mutate({ id: conversation.id, updates: { bot_paused: false } })}
            >
              <Play className="w-3.5 h-3.5" /> Reativar bot
            </Button>
          ) : (
            <Button
              size="sm" variant="outline" className="gap-1.5"
              onClick={() => updateConversation.mutate({ id: conversation.id, updates: { bot_paused: true } })}
            >
              <Hand className="w-3.5 h-3.5" /> Assumir
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading && <p className="text-center text-sm text-muted-foreground">Carregando mensagens…</p>}
        {messages.map((m) => {
          const inbound = m.direction === "in" || m.sender_type === "cliente";
          const isBot = m.sender_type === "bot" || m.sent_by_bot;
          return (
            <div key={m.id} className={cn("flex", inbound ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap shadow-sm",
                  inbound
                    ? "bg-background border rounded-bl-sm"
                    : isBot
                      ? "bg-emerald-600 text-white rounded-br-sm"
                      : "bg-primary text-primary-foreground rounded-br-sm",
                )}
              >
                {!inbound && (
                  <span className="flex items-center gap-1 text-[10px] opacity-80 mb-0.5">
                    {isBot ? <><Bot className="w-3 h-3" /> Bot</> : <><User className="w-3 h-3" /> Atendente</>}
                  </span>
                )}
                {m.content}
                <span className={cn("block text-[10px] mt-0.5 text-right", inbound ? "text-muted-foreground" : "opacity-70")}>
                  {bubbleTime(m.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
        {!isLoading && messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhuma mensagem ainda.</p>
        )}
      </div>

      <MessageComposer
        sending={sendMessage.isPending}
        onSend={(text) => sendMessage.mutate({ conversationId: conversation.id, text })}
        placeholder={paused ? "Escreva uma mensagem…" : "Escreva… (assumir pausa o bot automaticamente)"}
      />
    </div>
  );
}
