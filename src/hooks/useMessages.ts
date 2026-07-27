// @ts-nocheck
import { useEffect, useId } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  chat_id: string;
  sender_type: string; // 'cliente' | 'atendente' | 'bot'
  content: string;
  content_type: string;
  direction: string | null; // 'in' | 'out'
  from_me: boolean;
  sent_by_bot: boolean;
  status: string | null;
  media_url: string | null;
  timestamp: string;
}

/** Messages of a conversation, kept live via Realtime. */
export function useMessages(conversationId?: string) {
  const qc = useQueryClient();
  const channelId = useId();

  const query = useQuery({
    queryKey: ["chatbot-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [] as WhatsAppMessage[];
      const { data, error } = await supabase
        .from("mensagens_whatsapp")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("timestamp", { ascending: true });
      if (error) throw error;
      return (data ?? []) as WhatsAppMessage[];
    },
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages_${conversationId}_${channelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens_whatsapp", filter: `conversation_id=eq.${conversationId}` },
        () => qc.invalidateQueries({ queryKey: ["chatbot-messages", conversationId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, qc]);

  return query;
}

/** Send a manual reply via the whatsapp-send edge function. */
export function useSendMessage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, text }: { conversationId: string; text: string }) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: { conversationId, text },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["chatbot-messages", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["chatbot-conversations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    },
  });
}
