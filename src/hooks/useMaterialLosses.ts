import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type MaterialLoss = Database["public"]["Tables"]["material_losses"]["Row"];
type MaterialLossInsert = Database["public"]["Tables"]["material_losses"]["Insert"];
type MaterialLossUpdate = Database["public"]["Tables"]["material_losses"]["Update"];

export function useMaterialLosses(filters?: { 
  startDate?: string; 
  endDate?: string; 
  category?: 'PPF' | 'INSULFILM'; 
  materialId?: number;
  saleId?: number;
  installerId?: string;
}) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: ['material-losses', companyId, filters],
    queryFn: async () => {
      if (!companyId) return [];

      let query = supabase
        .from('material_losses')
        .select(`
          *,
          material:materials(id, name, unit),
          installer:profiles(id, first_name, last_name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.materialId) {
        query = query.eq('material_id', filters.materialId);
      }
      if (filters?.saleId) {
        query = query.eq('sale_id', filters.saleId);
      }
      if (filters?.installerId) {
        query = query.eq('installer_id', filters.installerId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching material losses:', error);
        throw error;
      }

      return data;
    },
    enabled: !!companyId,
  });
}

export function useCreateMaterialLoss() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (lossData: Omit<MaterialLossInsert, 'company_id'>) => {
      if (!user?.companyId) throw new Error("Usuário sem empresa vinculada");

      const { data, error } = await supabase
        .from('material_losses')
        .insert([{ ...lossData, company_id: user.companyId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-losses'] });
      // Invalidate materials and stock movements as well because triggers update stock
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast({ title: "Perda de material registrada com sucesso" });
    },
    onError: (error: any) => {
      console.error('Error creating material loss:', error);
      toast({ 
        title: "Erro ao registrar perda", 
        description: error.message || "Não foi possível registrar a perda de material.", 
        variant: "destructive" 
      });
    }
  });
}

export function useUpdateMaterialLoss() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: MaterialLossUpdate }) => {
      const { data, error } = await supabase
        .from('material_losses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-losses'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast({ title: "Registro atualizado com sucesso" });
    },
    onError: (error: any) => {
      console.error('Error updating material loss:', error);
      toast({ 
        title: "Erro ao atualizar registro", 
        description: error.message || "Não foi possível atualizar o registro.", 
        variant: "destructive" 
      });
    }
  });
}

export function useDeleteMaterialLoss() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      // Deletion is a soft delete according to design: update status to 'cancelled'
      const { error } = await supabase
        .from('material_losses')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-losses'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast({ title: "Registro cancelado com sucesso" });
    },
    onError: (error: any) => {
      console.error('Error deleting material loss:', error);
      toast({ 
        title: "Erro ao cancelar registro", 
        description: error.message || "Não foi possível cancelar o registro.", 
        variant: "destructive" 
      });
    }
  });
}
