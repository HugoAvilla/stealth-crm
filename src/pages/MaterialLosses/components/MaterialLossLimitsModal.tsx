// @ts-nocheck
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMaterialLossLimits, useUpdateMaterialLossLimit } from "@/hooks/useMaterialLossLimits";
import { Database } from "@/integrations/supabase/types";

type MaterialLossLimit = Database["public"]["Tables"]["material_loss_limits"]["Row"];

const limitFormSchema = z.object({
  limit_type: z.enum(['cost', 'meters', 'count'], {
    required_error: "Selecione o critério",
  }),
  limit_value: z.number().positive("O valor deve ser maior que zero"),
});

type LimitFormValues = z.infer<typeof limitFormSchema>;

interface MaterialLossLimitsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaterialLossLimitsModal({ open, onOpenChange }: MaterialLossLimitsModalProps) {
  const [activeTab, setActiveTab] = useState<'PPF' | 'INSULFILM'>('PPF');
  const { data: limits, isLoading } = useMaterialLossLimits();
  const updateMutation = useUpdateMaterialLossLimit();

  const activeLimit = limits?.find((l: MaterialLossLimit) => l.category === activeTab);

  const form = useForm<LimitFormValues>({
    resolver: zodResolver(limitFormSchema),
    defaultValues: {
      limit_type: "cost",
      limit_value: 0,
    },
  });

  useEffect(() => {
    if (activeLimit) {
      form.reset({
        limit_type: activeLimit.limit_type as 'cost' | 'meters' | 'count',
        limit_value: Number(activeLimit.limit_value),
      });
    } else {
      form.reset({
        limit_type: "cost",
        limit_value: 0,
      });
    }
  }, [activeLimit, form, activeTab]);

  const onSubmit = async (values: LimitFormValues) => {
    try {
      await updateMutation.mutateAsync({
        id: activeLimit?.id,
        category: activeTab,
        limit_type: values.limit_type,
        limit_value: values.limit_value,
      });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    }
  };

  const isPending = updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Limites de Perda</DialogTitle>
          <DialogDescription>
            Configure os alertas de limite mensal de desperdício.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'PPF' | 'INSULFILM')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="PPF">PPF</TabsTrigger>
            <TabsTrigger value="INSULFILM">Insulfilm</TabsTrigger>
          </TabsList>
          
          <div className="mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="limit_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Critério de Medida</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o critério" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cost">Custo Financeiro (R$)</SelectItem>
                          <SelectItem value="meters">Metros (m)</SelectItem>
                          <SelectItem value="count">Quantidade de Registros</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="limit_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Valor Teto 
                        {form.watch('limit_type') === 'cost' ? ' (R$)' : ''}
                        {form.watch('limit_type') === 'meters' ? ' (m)' : ''}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step={form.watch('limit_type') === 'count' ? '1' : '0.01'}
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

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPending || isLoading}>
                    {isPending ? "Salvando..." : "Salvar Limite"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
