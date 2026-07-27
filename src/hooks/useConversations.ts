// @ts-nocheck
import { useEffect, useId } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Conversation {
  id: string;
  company_id: number;
  chat_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  stage_id: string | null;
  assigned_user_id: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
  bot_paused: boolean;
  active_flow_id: string | null;
}

/** List of conversations for the inbox, kept live via Realtime. */
export function useConversations() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const qc = useQueryClient();
  const channelId = useId();

  const query = useQuery({
    queryKey: ["chatbot-conversations", companyId],
    queryFn: async () => {
      if (!companyId) return [] as Conversation[];
      const { data, error } = await supabase
        .from("chatbot_conversations")
        .select("*")
        .eq("company_id", companyId)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Conversation[];
    },
    enabled: !!companyId,
  });

  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel(`conversations_${companyId}_${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chatbot_conversations", filter: `company_id=eq.${companyId}` },
        () => qc.invalidateQueries({ queryKey: ["chatbot-conversations", companyId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, qc]);

  return query;
}

/** Update a conversation (take over / release bot, move stage, mark read, assign). */
export function useUpdateConversation() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Conversation> }) => {
      const { data, error } = await supabase
        .from("chatbot_conversations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Conversation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chatbot-conversations", companyId] }),
  });
}
