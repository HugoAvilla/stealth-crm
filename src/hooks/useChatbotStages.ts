// @ts-nocheck
import { useEffect, useId } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface ChatbotStage {
  id: string;
  company_id: number;
  name: string;
  position: number;
  color: string;
  bot_flow_id: string | null;
  is_default: boolean;
}

const STAGE_COLORS = ["#3b82f6", "#f59e0b", "#a855f7", "#22c55e", "#ef4444", "#06b6d4", "#ec4899"];

/** Kanban columns (conversation stages) for the current company, live via Realtime. */
export function useChatbotStages() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const qc = useQueryClient();
  const channelId = useId();

  const query = useQuery({
    queryKey: ["chatbot-stages", companyId],
    queryFn: async () => {
      if (!companyId) return [] as ChatbotStage[];
      const { data, error } = await supabase
        .from("chatbot_stages")
        .select("*")
        .eq("company_id", companyId)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChatbotStage[];
    },
    enabled: !!companyId,
  });

  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel(`stages_${companyId}_${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chatbot_stages", filter: `company_id=eq.${companyId}` },
        () => qc.invalidateQueries({ queryKey: ["chatbot-stages", companyId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, qc]);

  return query;
}

export function useCreateStage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, position }: { name: string; position: number }) => {
      if (!user?.companyId) throw new Error("Sem empresa");
      const { data, error } = await supabase
        .from("chatbot_stages")
        .insert({
          company_id: user.companyId,
          name,
          position,
          color: STAGE_COLORS[position % STAGE_COLORS.length],
        })
        .select()
        .single();
      if (error) throw error;
      return data as ChatbotStage;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chatbot-stages", user?.companyId] }),
    onError: (e: any) => toast({ title: "Erro ao criar etapa", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateStage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ChatbotStage> }) => {
      const { data, error } = await supabase.from("chatbot_stages").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as ChatbotStage;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chatbot-stages", user?.companyId] }),
    onError: (e: any) => toast({ title: "Erro ao salvar etapa", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteStage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chatbot_stages").delete().eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chatbot-stages", user?.companyId] }),
    onError: (e: any) => toast({ title: "Erro ao excluir etapa", description: e.message, variant: "destructive" }),
  });
}
