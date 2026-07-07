// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlanPrice {
  id: number;
  plan_code: string;
  billing_period: string;
  price: number;
}

export default function PlanPricesTab() {
  const { toast } = useToast();
  const [prices, setPrices] = useState<PlanPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('plan_prices')
        .select('*')
        .order('plan_code');

      if (error) throw error;
      
      setPrices(data as PlanPrice[]);
      
      // Initialize form data
      const initialData: Record<string, string> = {};
      data.forEach((p) => {
        initialData[`${p.plan_code}_${p.billing_period}`] = p.price.toString();
      });
      setFormData(initialData);

    } catch (error) {
      console.error('Error fetching plan prices:', error);
      toast({ title: "Erro ao carregar preços", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePriceChange = (plan_code: string, billing_period: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [`${plan_code}_${billing_period}`]: value
    }));
  };

  const handleSave = async (plan_code: string, billing_period: string) => {
    const key = `${plan_code}_${billing_period}`;
    const newPrice = parseFloat(formData[key]);
    
    if (isNaN(newPrice) || newPrice < 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }

    const reason = window.prompt(`Informe o motivo da alteração para o plano ${plan_code} (${billing_period}):`);
    if (!reason) return; // cancelled or empty

    setIsSubmitting(prev => ({ ...prev, [key]: true }));

    try {
      const { error } = await supabase.rpc('master_update_plan_price', {
        p_plan_code: plan_code,
        p_billing_period: billing_period,
        p_new_price: newPrice,
        p_notes: reason
      });

      if (error) throw error;

      toast({ title: "Preço atualizado com sucesso!" });
      fetchPrices();
    } catch (error: any) {
      console.error('Error updating plan price:', error);
      toast({ title: "Erro ao atualizar preço", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(prev => ({ ...prev, [key]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Group prices by plan_code for rendering
  const plans = ['basic', 'ultra', 'premium'];
  const periods = ['monthly', 'annual'];

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <p className="text-muted-foreground">
          Gerencie os preços base de cada plano. As alterações afetarão apenas as <strong>novas assinaturas</strong> e solicitações de upgrade futuras.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan_code) => {
          const isPremium = plan_code === 'premium';
          return (
            <Card key={plan_code} className={isPremium ? 'opacity-70' : ''}>
              <CardHeader>
                <CardTitle className="capitalize">Plano {plan_code}</CardTitle>
                <CardDescription>
                  {isPremium ? 'Plano personalizado (não editável aqui)' : `Configuração de preços do plano ${plan_code}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {periods.map(period => {
                  const key = `${plan_code}_${period}`;
                  // If we don't have it in the DB, skip or show empty. We should have it.
                  if (formData[key] === undefined && !isPremium) return null;

                  return (
                    <div key={period} className="space-y-2">
                      <Label className="capitalize">{period === 'annual' ? 'Anual' : 'Mensal'}</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-9"
                            value={formData[key] || ''}
                            onChange={(e) => handlePriceChange(plan_code, period, e.target.value)}
                            disabled={isPremium || isSubmitting[key]}
                          />
                        </div>
                        <Button 
                          size="icon" 
                          disabled={isPremium || isSubmitting[key] || formData[key] === prices.find(p => p.plan_code === plan_code && p.billing_period === period)?.price.toString()}
                          onClick={() => handleSave(plan_code, period)}
                          title="Salvar preço"
                        >
                          {isSubmitting[key] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
