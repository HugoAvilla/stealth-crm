// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { FlowSchema } from "@/lib/chatbot/engine";

export interface ChatbotFlow {
  id: string;
  company_id: number;
  name: string;
  triggers: Record<string, any>;
  flow_schema: FlowSchema;
  total_launched: number;
  active_sessions: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const emptySchema: FlowSchema = { nodes: [], edges: [] };

/** List all bots for the current company. */
export function useChatbotFlows() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: ["chatbot-flows", companyId],
    queryFn: async () => {
      if (!companyId) return [] as ChatbotFlow[];
      const { data, error } = await supabase
        .from("chatbot_flows")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ChatbotFlow[];
    },
    enabled: !!companyId,
  });
}

/** Load a single bot (for the editor). */
export function useChatbotFlow(id?: string) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: ["chatbot-flow", id],
    queryFn: async () => {
      if (!id || id === "new") return null;
      const { data, error } = await supabase
        .from("chatbot_flows")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as ChatbotFlow | null;
    },
    enabled: !!id && id !== "new" && !!companyId,
  });
}

/** Create a bot and return its row (so the caller can navigate to the editor). */
export function useCreateChatbotFlow() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input?: { name?: string; flow_schema?: FlowSchema; triggers?: Record<string, any> }) => {
      if (!user?.companyId) throw new Error("Usuário sem empresa vinculada");
      const { data, error } = await supabase
        .from("chatbot_flows")
        .insert([
          {
            company_id: user.companyId,
            name: input?.name || "Novo bot",
            flow_schema: input?.flow_schema || emptySchema,
            triggers: input?.triggers || {},
          },
        ])
        .select()
        .single();
      if (error) throw error;
      return data as ChatbotFlow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-flows"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar bot",
        description: error.message || "Não foi possível criar o bot.",
        variant: "destructive",
      });
    },
  });
}

/** Update name / schema / triggers / active flag. */
export function useUpdateChatbotFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<ChatbotFlow, "name" | "flow_schema" | "triggers" | "is_active">>;
    }) => {
      const { data, error } = await supabase
        .from("chatbot_flows")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as ChatbotFlow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-flows"] });
      queryClient.invalidateQueries({ queryKey: ["chatbot-flow", data?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar o bot.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteChatbotFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chatbot_flows").delete().eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-flows"] });
      toast({ title: "Bot excluído" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir o bot.",
        variant: "destructive",
      });
    },
  });
}
