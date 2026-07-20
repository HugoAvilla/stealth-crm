import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type MaterialLossLimit = Database["public"]["Tables"]["material_loss_limits"]["Row"];

export function useMaterialLossLimits() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: ['material-loss-limits', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('material_loss_limits')
        .select('*')
        .eq('company_id', companyId);

      if (error) {
        console.error('Error fetching material loss limits:', error);
        throw error;
      }

      return data;
    },
    enabled: !!companyId,
  });
}

export function useUpdateMaterialLossLimit() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      id, 
      category, 
      limit_type, 
      limit_value 
    }: { 
      id?: number; 
      category: 'PPF' | 'INSULFILM';
      limit_type: 'cost' | 'meters' | 'count'; 
      limit_value: number;
    }) => {
      if (!user?.companyId) throw new Error("Usuário sem empresa vinculada");

      if (id) {
        const { data, error } = await supabase
          .from('material_loss_limits')
          .update({ limit_type, limit_value })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('material_loss_limits')
          .insert([{ 
            company_id: user.companyId,
            category,
            limit_type,
            limit_value
          }])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-loss-limits'] });
      toast({ title: "Limites atualizados com sucesso" });
    },
    onError: (error: any) => {
      console.error('Error updating material loss limit:', error);
      toast({ 
        title: "Erro ao atualizar limites", 
        description: error.message || "Não foi possível atualizar os limites.", 
        variant: "destructive" 
      });
    }
  });
}
