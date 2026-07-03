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
  lost_width: z.number().positive("A largura deve ser maior que zero").nullable().optional(),
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
          name,
          client:clients(name),
          vehicle:vehicles(brand, model, plate)
        `)
        .eq('company_id', companyId)
        .eq('has_exited', false)
        .is('deleted_at', null)
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
        .select('id, name, current_stock, average_cost, unit, type, width')
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

      // Buscar perfis ativos da empresa
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, user_id')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (profilesError) throw profilesError;
      if (!profilesData || profilesData.length === 0) return [];

      // Buscar roles associadas aos usuários
      const userIds = profilesData.map(p => p.user_id);
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) throw rolesError;

      const rolesMap = new Map((rolesData || []).map(r => [r.user_id, r.role]));

      // Filtrar e mapear apenas membros PRODUCAO ou ADMIN
      return profilesData
        .filter(p => {
          const role = rolesMap.get(p.user_id);
          return role === 'PRODUCAO' || role === 'ADMIN';
        })
        .map(p => ({
          id: p.user_id, // installer_id uuid do auth.users(id)
          name: p.name
        }));
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
      lost_width: null,
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
          lost_width: lossToEdit.lost_width ? Number(lossToEdit.lost_width) : null,
          reason: lossToEdit.reason as FormValues['reason'],
          reason_details: lossToEdit.reason_details || "",
        });
      } else {
        form.reset({
          material_id: "",
          space_id: "",
          installer_id: "",
          lost_meters: 0,
          lost_width: null,
          reason: "RETRABALHO",
          reason_details: "",
        });
      }
    }
  }, [open, isEditing, lossToEdit, form]);

  const selectedMaterialId = form.watch("material_id");
  const selectedMaterial = materials?.find(m => m.id.toString() === selectedMaterialId);

  const lostMetersVal = form.watch("lost_meters") || 0;
  const lostWidthVal = form.watch("lost_width");
  
  const widthVal = selectedMaterial && 'width' in selectedMaterial ? (selectedMaterial.width as number || 1.52) : 1.52;
  const activeWidth = lostWidthVal !== null && lostWidthVal !== undefined ? lostWidthVal : widthVal;
  
  const previewM2 = lostMetersVal * activeWidth;
  const previewCost = lostMetersVal * (selectedMaterial?.average_cost || 0);

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
    
    // Calcula área e custo proporcional baseados na largura física real da bobina cadastrada no material (ou na largura da peça se informada)
    const bobbinWidth = selectedMaterial && 'width' in selectedMaterial ? (selectedMaterial.width as number || 1.52) : 1.52;
    const activeWidthSubmit = values.lost_width !== null && values.lost_width !== undefined ? values.lost_width : bobbinWidth;
    const lost_m2 = values.lost_meters * activeWidthSubmit;
    const cost = values.lost_meters * (selectedMaterial?.average_cost || 0);

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
            lost_width: values.lost_width,
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
          lost_width: values.lost_width,
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
                        {spaces?.map((space) => {
                          const spaceName = space.name || 'Vaga';
                          const vehicleDetails = space.vehicle
                            ? `${space.vehicle.brand || ''} ${space.vehicle.model || ''}`.trim()
                            : 'Sem veículo';
                          const plate = space.vehicle?.plate ? `(${space.vehicle.plate})` : '';
                          const clientName = space.client?.name || 'Sem cliente';

                          return (
                            <SelectItem key={space.id} value={space.id.toString()}>
                              {spaceName}: {vehicleDetails} {plate} — {clientName}
                            </SelectItem>
                          );
                        })}
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
                            {inst.name}
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
                        placeholder="0"
                        {...field} 
                        value={field.value || ""}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lost_width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Largura da Peça (m) <span className="text-[10px] text-muted-foreground">(Opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder={selectedMaterial ? `${widthVal.toFixed(2)}m (largura bobina)` : "Ex: 0.90"}
                        value={field.value ?? ""} 
                        onChange={e => {
                          const val = e.target.value;
                          field.onChange(val === "" ? null : parseFloat(val));
                        }} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            {selectedMaterial && (
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-xs space-y-1.5 animate-in fade-in duration-300">
                <p className="font-semibold text-blue-600 flex items-center gap-1.5">
                  <span>⚡ Resumo Proporcional da Perda:</span>
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Largura da Peça</p>
                    <p className="font-medium text-foreground">
                      {activeWidth.toFixed(2)}m
                      {lostWidthVal !== null && lostWidthVal !== undefined && (
                        <span className="text-[9px] text-blue-600 ml-1 font-bold">(personalizada)</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Área Total</p>
                    <p className="font-semibold text-blue-600">
                      {previewM2.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m²
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Custo Proporcional</p>
                    <p className="font-semibold text-destructive">
                      R$ {previewCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            )}

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
