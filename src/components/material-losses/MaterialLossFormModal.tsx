import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateMaterialLoss, useUpdateMaterialLoss } from "@/hooks/useMaterialLosses";
import { Database } from "@/integrations/supabase/types";

type MaterialLoss = Database["public"]["Tables"]["material_losses"]["Row"];

const formSchema = z.object({
  material_id: z.string().min(1, "Selecione o material"),
  space_id: z.string().min(1, "Selecione a vaga em andamento"),
  installer_id: z.string().min(1, "Selecione o instalador"),
  lost_meters: z.number().positive("A quantidade de metros deve ser maior que zero"),
  reason: z.enum(['RETRABALHO', 'DEFEITO_FABRICA', 'DANO_INSTALACAO', 'SOBRA_INUTILIZAVEL', 'OUTRO'], {
    required_error: "Selecione o motivo",
  }),
  reason_details: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.reason === 'OUTRO' && (!data.reason_details || data.reason_details.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Detalhes do motivo são obrigatórios para 'OUTRO'",
      path: ["reason_details"],
    });
  }
});

type FormValues = z.infer<typeof formSchema>;

interface MaterialLossFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lossToEdit?: MaterialLoss | null;
  onSuccess?: () => void;
}

export function MaterialLossFormModal({ open, onOpenChange, lossToEdit, onSuccess }: MaterialLossFormModalProps) {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const isEditing = !!lossToEdit;

  const createMutation = useCreateMaterialLoss();
  const updateMutation = useUpdateMaterialLoss();

  // Buscar vagas em andamento
  const { data: spaces } = useQuery({
    queryKey: ['active-spaces', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('spaces')
        .select(`
          id, 
          client:clients(name),
          vehicle:vehicles(plate, model)
        `)
        .eq('company_id', companyId)
        .eq('has_exited', false)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!companyId && open,
  });

  // Buscar materiais fechados (is_open_roll = false) e com estoque
  const { data: materials } = useQuery({
    queryKey: ['closed-materials', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('materials')
        .select('id, name, current_stock, average_cost, unit, type')
        .eq('company_id', companyId)
        .eq('is_open_roll', false)
        .gt('current_stock', 0)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!companyId && open,
  });

  // Buscar instaladores da empresa
  const { data: installers } = useQuery({
    queryKey: ['company-installers', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('company_id', companyId)
        .in('role', ['PRODUCAO', 'ADMIN']);

      if (error) throw error;
      return data;
    },
    enabled: !!companyId && open,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      material_id: "",
      space_id: "",
      installer_id: "",
      lost_meters: 0,
      reason: "RETRABALHO",
      reason_details: "",
    },
  });

  // Setup form values when editing
  useEffect(() => {
    if (open) {
      if (isEditing && lossToEdit) {
        form.reset({
          material_id: lossToEdit.material_id.toString(),
          space_id: lossToEdit.space_id?.toString() || "",
          installer_id: lossToEdit.installer_id || "",
          lost_meters: Number(lossToEdit.lost_meters),
          reason: lossToEdit.reason as FormValues['reason'],
          reason_details: lossToEdit.reason_details || "",
        });
      } else {
        form.reset({
          material_id: "",
          space_id: "",
          installer_id: "",
          lost_meters: 0,
          reason: "RETRABALHO",
          reason_details: "",
        });
      }
    }
  }, [open, isEditing, lossToEdit, form]);

  const selectedMaterialId = form.watch("material_id");
  const selectedMaterial = materials?.find(m => m.id.toString() === selectedMaterialId);

  const onSubmit = async (values: FormValues) => {
    // Validate stock when creating
    if (selectedMaterial && values.lost_meters > selectedMaterial.current_stock && !isEditing) {
      form.setError("lost_meters", { 
        type: "manual", 
        message: `Estoque insuficiente. Disponível: ${selectedMaterial.current_stock} ${selectedMaterial.unit}` 
      });
      return;
    }
    
    const category = selectedMaterial?.type === 'INSULFILM' ? 'INSULFILM' : 'PPF';
    const cost = (selectedMaterial?.average_cost || 0) * values.lost_meters;
    const lost_m2 = values.lost_meters * 1.52; // Exemplo fixo de cálculo

    try {
      if (isEditing && lossToEdit) {
        await updateMutation.mutateAsync({
          id: lossToEdit.id,
          updates: {
            material_id: parseInt(values.material_id),
            space_id: parseInt(values.space_id),
            installer_id: values.installer_id,
            category,
            lost_meters: values.lost_meters,
            lost_m2,
            cost,
            reason: values.reason,
            reason_details: values.reason_details || null,
          }
        });
      } else {
        await createMutation.mutateAsync({
          material_id: parseInt(values.material_id),
          space_id: parseInt(values.space_id),
          installer_id: values.installer_id,
          category,
          lost_meters: values.lost_meters,
          lost_m2,
          cost,
          reason: values.reason,
          reason_details: values.reason_details || null,
          status: 'active',
          sale_id: null,
        });
      }
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Perda de Material" : "Registrar Perda de Material"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Modifique os dados da perda. O estoque será ajustado automaticamente com a diferença."
              : "Preencha os dados da perda. O estoque fechado será reduzido com a quantidade informada."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="space_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vaga (Veículo) *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a vaga" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {spaces?.map((space) => (
                          <SelectItem key={space.id} value={space.id.toString()}>
                            {space.vehicle?.plate || 'Sem placa'} - {space.client?.name || 'Sem cliente'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="installer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instalador *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o responsável" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {installers?.map((inst) => (
                          <SelectItem key={inst.id} value={inst.id}>
                            {inst.first_name} {inst.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="material_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material Perdido *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione (bobina fechada)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {materials?.map((mat) => (
                        <SelectItem key={mat.id} value={mat.id.toString()}>
                          {mat.name} (Disp: {mat.current_stock} {mat.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lost_meters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Metros Perdidos *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        {...field} 
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="RETRABALHO">Retrabalho</SelectItem>
                        <SelectItem value="DEFEITO_FABRICA">Defeito de Fábrica</SelectItem>
                        <SelectItem value="DANO_INSTALACAO">Dano na Instalação</SelectItem>
                        <SelectItem value="SOBRA_INUTILIZAVEL">Sobra Inutilizável</SelectItem>
                        <SelectItem value="OUTRO">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason_details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Motivo Detalhado {form.watch('reason') === 'OUTRO' ? '*' : '(Opcional)'}
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva o que ocorreu..." 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : isEditing ? "Salvar Alterações" : "Registrar Perda"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
