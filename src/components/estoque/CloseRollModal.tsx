import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Car, Ruler, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";

interface Material {
  id: number;
  name: string;
  open_roll_accumulated: number | null;
  unit: string;
}

interface CloseRollModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: Material | null;
  onSuccess: () => void;
}

interface RollStats {
  totalCars: number;
  sizeP: number;
  sizeM: number;
  sizeG: number;
}

export function CloseRollModal({ open, onOpenChange, material, onSuccess }: CloseRollModalProps) {
  const { user } = useAuth();
  const [isClosing, setIsClosing] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);

  // Get company ID
  useEffect(() => {
    if (user && open) {
      supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.company_id) setCompanyId(data.company_id);
        });
    }
  }, [user, open]);

  // Fetch stats when modal opens
  const { data: stats, isLoading } = useQuery({
    queryKey: ["roll-stats", material?.id],
    queryFn: async (): Promise<RollStats> => {
      if (!material?.id) return { totalCars: 0, sizeP: 0, sizeM: 0, sizeG: 0 };

      const { data, error } = await supabase
        .from("stock_movements")
        .select("reason")
        .eq("material_id", material.id)
        .eq("movement_type", "Saida")
        .like("reason", "Consumo automático - Venda%");

      if (error) {
        console.error("Error fetching roll stats:", error);
        return { totalCars: 0, sizeP: 0, sizeM: 0, sizeG: 0 };
      }

      let totalCars = 0;
      let sizeP = 0;
      let sizeM = 0;
      let sizeG = 0;

      data?.forEach((movement) => {
        if (!movement.reason) return;
        totalCars++;
        
        // Extract size from reason string (e.g. "... - P)", "... - M)", "... - G)")
        const match = movement.reason.match(/- ([PMG])\)$/i);
        if (match && match[1]) {
          const size = match[1].toUpperCase();
          if (size === "P") sizeP++;
          if (size === "M") sizeM++;
          if (size === "G") sizeG++;
        }
      });

      return { totalCars, sizeP, sizeM, sizeG };
    },
    enabled: !!material?.id && open,
  });

  const handleClose = async () => {
    if (!material || !user?.id || !companyId) return;

    setIsClosing(true);
    try {
      const { error } = await supabase.rpc("close_open_roll", {
        p_material_id: material.id,
        p_reason: "Fechamento manual de bobina",
        p_user_id: user.id,
        p_company_id: companyId
      });

      if (error) throw error;
      
      toast.success("Bobina encerrada com sucesso");
      onSuccess();
    } catch (error) {
      console.error("Error closing open roll:", error);
      toast.error("Erro ao encerrar bobina");
    } finally {
      setIsClosing(false);
    }
  };

  if (!material) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Encerrar Bobina</DialogTitle>
          <DialogDescription>
            Confira as estatísticas de uso desta bobina antes de encerrá-la. Ao encerrar, ela será inativada do estoque atual.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex items-center gap-2 text-primary font-medium">
            <AlertTriangle className="h-4 w-4" />
            <span>{material.name}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-muted/50">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2">
                <Ruler className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Usado</p>
                  <p className="text-2xl font-bold">
                    {material.open_roll_accumulated || 0}
                    <span className="text-sm font-normal text-muted-foreground ml-1">{material.unit}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2">
                <Car className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Carros Feitos</p>
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats?.totalCars || 0}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {!isLoading && stats && stats.totalCars > 0 && (
            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground mb-2 font-medium">Distribuição por tamanho:</p>
              <div className="flex justify-between px-2">
                <div className="text-center">
                  <span className="block font-bold">{stats.sizeP}</span>
                  <span className="text-xs text-muted-foreground">Pequeno (P)</span>
                </div>
                <div className="text-center">
                  <span className="block font-bold">{stats.sizeM}</span>
                  <span className="text-xs text-muted-foreground">Médio (M)</span>
                </div>
                <div className="text-center">
                  <span className="block font-bold">{stats.sizeG}</span>
                  <span className="text-xs text-muted-foreground">Grande (G)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isClosing}>
            Cancelar
          </Button>
          <Button onClick={handleClose} disabled={isClosing} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isClosing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar e Encerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
