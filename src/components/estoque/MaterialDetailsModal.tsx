import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, ArrowDown, ArrowUp, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface Material {
  id: number;
  name: string;
  type: string | null;
  brand: string | null;
  unit: string;
  current_stock: number | null;
  minimum_stock: number | null;
  average_cost: number | null;
  is_active: boolean | null;
  is_open_roll: boolean | null;
  open_roll_accumulated: number | null;
  company_id: number | null;
  product_type_id: number | null;
  product_types?: { light_transmission: string | null } | null;
}

interface MaterialDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: Material | null;
}

export function MaterialDetailsModal({ open, onOpenChange, material }: MaterialDetailsModalProps) {
  const { data: movements, isLoading } = useQuery({
    queryKey: ["stock-movements", material?.id],
    queryFn: async () => {
      if (!material?.id) return [];
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*")
        .eq("material_id", material.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!material?.id && open,
  });

  if (!material) return null;

  const getStockStatus = (material: Material) => {
    if (material.is_open_roll) {
      return { status: "em_uso", label: "Em Uso", color: "text-blue-500", bg: "bg-blue-500/10" };
    }
    const currentStock = material.current_stock || 0;
    const minStock = material.minimum_stock || 1;
    const ratio = currentStock / minStock;

    if (ratio <= 0.5) return { status: "critico", label: "Crítico", color: "text-red-500", bg: "bg-red-500/10" };
    if (ratio <= 1) return { status: "baixo", label: "Baixo", color: "text-yellow-500", bg: "bg-yellow-500/10" };
    return { status: "ok", label: "OK", color: "text-green-500", bg: "bg-green-500/10" };
  };

  const status = getStockStatus(material);
  const totalVal = (material.current_stock || 0) * (material.average_cost || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[90vw]">
        <DialogHeader className="mb-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Package className="h-6 w-6 text-primary" />
                {material.name}
              </DialogTitle>
              <DialogDescription className="text-base">
                Detalhes completos e histórico de movimentações
              </DialogDescription>
            </div>
            <Badge className={cn(status.bg, status.color, "border-0 shadow-none text-sm px-3 py-1 font-semibold tracking-wide uppercase")}>
              {status.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-muted/40 border p-4 rounded-xl flex flex-col justify-center">
            <span className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">
              {material.is_open_roll ? "Consumo Acumulado" : "Estoque Atual"}
            </span>
            <span className={cn("text-3xl font-bold mt-1", material.is_open_roll ? "text-blue-500" : "text-primary")}>
              {material.is_open_roll ? `${material.open_roll_accumulated || 0} ` : `${material.current_stock || 0} `}
              <span className="text-lg text-muted-foreground font-normal">{material.unit}</span>
            </span>
          </div>

          <div className="bg-muted/40 border p-4 rounded-xl flex flex-col justify-center">
            <span className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">
              {material.is_open_roll ? "Tipo de Rolagem" : "Estoque Mínimo"}
            </span>
            <span className="text-xl font-medium mt-1">
              {material.is_open_roll ? "Bobina Aberta" : `${material.minimum_stock || 0} ${material.unit}`}
            </span>
            {material.is_open_roll && (
              <span className="text-xs text-muted-foreground mt-1">Subtração manual necessária no fim.</span>
            )}
          </div>

          <div className="bg-muted/40 border p-4 rounded-xl flex flex-col justify-center">
            <span className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Marca / Tipo</span>
            <span className="text-xl font-medium mt-1 truncate" title={`${material.brand || '-'} / ${material.type || '-'}`}>
              {material.brand || "-"}
            </span>
            <span className="text-sm text-muted-foreground truncate">{material.type || "-"}</span>
          </div>

          <div className="bg-muted/40 border p-4 rounded-xl flex flex-col justify-center">
            <span className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Valor em Estoque</span>
            <span className="text-xl font-medium mt-1">
              {material.is_open_roll ? "-" : totalVal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
            {!material.is_open_roll && (
              <span className="text-xs text-muted-foreground mt-1">
                {(material.average_cost || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} / {material.unit}
              </span>
            )}
          </div>
        </div>

        <div className="mt-2 border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="bg-muted/50 p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Histórico de Movimentações ({movements?.length || 0})
            </h3>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-background sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-[180px]">Data e Hora</TableHead>
                  <TableHead className="w-[180px]">Tipo</TableHead>
                  <TableHead className="w-[150px]">Quantidade</TableHead>
                  <TableHead>Referência / Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-[200px]" /></TableCell>
                    </TableRow>
                  ))
                ) : movements && movements.length > 0 ? (
                  movements.map((mov) => {
                    const isEntry = mov.movement_type === "Entrada" || mov.movement_type === "Saldo Inicial";
                    const isExit = mov.movement_type === "Saida" || mov.movement_type === "Saída";
                    const isAdjustmentOpen = mov.movement_type === "Ajuste Bobina Aberta";
                    
                    return (
                      <TableRow key={mov.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="font-medium text-sm">
                            {format(new Date(mov.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(mov.created_at), "HH:mm")}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isEntry ? (
                            <Badge variant="outline" className="border-green-500 text-green-700 bg-green-500/10 font-medium whitespace-nowrap">
                              <ArrowDown className="h-3 w-3 mr-1" /> {mov.movement_type}
                            </Badge>
                          ) : isExit ? (
                            <Badge variant="outline" className="border-red-500 text-red-700 bg-red-500/10 font-medium whitespace-nowrap">
                              <ArrowUp className="h-3 w-3 mr-1" /> Consumo Geral
                            </Badge>
                          ) : isAdjustmentOpen ? (
                            <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-500/10 font-medium whitespace-nowrap">
                              <Activity className="h-3 w-3 mr-1" /> Bobina Aberta
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground whitespace-nowrap">
                              {mov.movement_type}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className={cn(
                            "font-semibold font-mono tabular-nums",
                            isEntry ? "text-green-600" : (isExit || isAdjustmentOpen) ? "text-foreground" : ""
                          )}>
                            {isEntry ? "+" : "-"}{mov.quantity} {material.unit}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm truncate max-w-[300px]" title={mov.reason || ""}>
                            {mov.reason || "-"}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col flex-center items-center justify-center gap-2">
                        <Activity className="h-8 w-8 text-muted-foreground/30" />
                        <p>Nenhuma movimentação registrada.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
