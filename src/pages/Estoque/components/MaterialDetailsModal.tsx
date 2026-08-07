/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, ArrowDown, ArrowUp, Activity, TrendingUp, TrendingDown, Minus, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import { Bar, BarChart, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";

const brl = (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Cores de status: custo subiu = vermelho (ruim), custo caiu = verde (bom), primeira/estável = primária
const PRICE_UP = "#ef4444";
const PRICE_DOWN = "#10b981";

function PriceTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-2 shadow-md text-xs">
      <div className="font-medium">{d.fullDate}</div>
      <div className="mt-1">
        Preço: <span className="font-semibold">{brl(d.price)}</span>
      </div>
      {d.prev != null && (
        <div className={d.delta > 0 ? "text-red-500" : d.delta < 0 ? "text-emerald-500" : "text-muted-foreground"}>
          {d.delta > 0 ? "▲ subiu " : d.delta < 0 ? "▼ caiu " : "— estável "}
          {brl(Math.abs(d.delta))}
        </div>
      )}
    </div>
  );
}

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
  product_types?: { light_transmission: string | null; cost_per_meter: number | null } | null;
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

  const { data: closedRollsCount } = useQuery({
    queryKey: ["closed-rolls-count", material?.id],
    queryFn: async () => {
      if (!material?.id) return 0;
      const { count, error } = await supabase
        .from("material_rolls")
        .select("*", { count: "exact", head: true })
        .eq("material_id", material.id)
        .eq("status", "fechada");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!material?.id && open && material?.unit === "Metros" && !material?.is_open_roll,
  });

  // Série de preços por entrada (ordenada da mais antiga para a mais recente)
  const priceHistory = useMemo(() => {
    if (!movements) return [];
    const entries = movements
      .filter((m: any) => (m.movement_type === "Entrada" || m.movement_type === "Saldo Inicial") && m.unit_cost != null && Number(m.unit_cost) > 0)
      .slice()
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return entries.map((m: any, i: number, arr: any[]) => {
      const price = Number(m.unit_cost);
      const prev = i > 0 ? Number(arr[i - 1].unit_cost) : null;
      const delta = prev != null ? price - prev : 0;
      return {
        key: m.id,
        date: format(new Date(m.created_at), "dd/MM/yy", { locale: ptBR }),
        fullDate: format(new Date(m.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
        price,
        prev,
        delta,
        direction: prev == null ? "first" : delta > 0 ? "up" : delta < 0 ? "down" : "same",
      };
    });
  }, [movements]);

  const priceStats = useMemo(() => {
    if (!priceHistory.length) return null;
    const prices = priceHistory.map((p) => p.price);
    const avg = prices.reduce((s, v) => s + v, 0) / prices.length;
    const last = priceHistory[priceHistory.length - 1];
    const variation = last.prev != null ? last.price - last.prev : 0;
    const variationPct = last.prev ? (variation / last.prev) * 100 : 0;
    return {
      current: prices[prices.length - 1],
      avg,
      min: Math.min(...prices),
      max: Math.max(...prices),
      variation,
      variationPct,
      direction: last.direction,
      count: priceHistory.length,
    };
  }, [priceHistory]);

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
  // Custo por metro informado no material (average_cost) tem prioridade sobre o custo genérico do tipo de produto
  const currentCost = material.average_cost || material.product_types?.cost_per_meter || 0;
  const totalVal = (material.is_open_roll
    ? (material.open_roll_accumulated || 0)
    : (material.current_stock || 0)) * currentCost;

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

        <div className={cn("grid grid-cols-2 gap-4 mb-8", material.unit === "Metros" && !material.is_open_roll ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
          {material.unit === "Metros" && !material.is_open_roll && (
            <div className="bg-muted/40 border p-4 rounded-xl flex flex-col justify-center">
              <span className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">
                Bobinas Fechadas
              </span>
              <span className="text-3xl font-bold mt-1 text-primary">
                {closedRollsCount ?? 0}
              </span>
              <span className="text-xs text-muted-foreground mt-1">Bobinas em estoque</span>
            </div>
          )}
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
              <span className="text-xs text-muted-foreground mt-1">Consumo acumulado até encerramento.</span>
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
            <span className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">
              {material.is_open_roll ? "Valor Consumido" : "Valor em Estoque"}
            </span>
            <span className="text-xl font-medium mt-1">
              {totalVal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              {currentCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} / {material.unit}
            </span>
          </div>
        </div>

        {/* Histórico de Preços */}
        <div className="mt-2 mb-6 border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="bg-muted/50 p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Histórico de Preços
            </h3>
            {priceStats && (
              <span className="text-xs text-muted-foreground">{priceStats.count} entrada(s) com preço</span>
            )}
          </div>

          <div className="p-4">
            {priceStats ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                  <div className="bg-muted/40 border p-3 rounded-xl">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Último Preço</span>
                    <div className="text-xl font-bold mt-1">{brl(priceStats.current)}</div>
                    <span className="text-[10px] text-muted-foreground">última compra / {material.unit}</span>
                  </div>

                  <div className="bg-muted/40 border p-3 rounded-xl">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Preço Médio</span>
                    <div className="text-xl font-bold mt-1">{brl(priceStats.avg)}</div>
                    <span className="text-[10px] text-muted-foreground">média das compras</span>
                  </div>

                  <div className="bg-muted/40 border p-3 rounded-xl">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Variação (última)</span>
                    <div className={cn(
                      "text-xl font-bold mt-1 flex items-center gap-1",
                      priceStats.direction === "up" ? "text-red-500" : priceStats.direction === "down" ? "text-emerald-500" : "text-muted-foreground"
                    )}>
                      {priceStats.direction === "up" ? <TrendingUp className="h-4 w-4" /> : priceStats.direction === "down" ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                      {priceStats.direction === "up" ? "+" : priceStats.direction === "down" ? "-" : ""}{brl(Math.abs(priceStats.variation))}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {priceStats.count < 2
                        ? "primeira entrada"
                        : `${priceStats.variationPct > 0 ? "+" : ""}${priceStats.variationPct.toFixed(1)}% vs. anterior`}
                    </span>
                  </div>

                  <div className="bg-muted/40 border p-3 rounded-xl">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Menor / Maior</span>
                    <div className="text-sm font-semibold mt-1">
                      {brl(priceStats.min)} <span className="text-muted-foreground">–</span> {brl(priceStats.max)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">faixa registrada</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: PRICE_UP }} /> Subiu</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: PRICE_DOWN }} /> Caiu</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-primary" /> 1ª / estável</span>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priceHistory} margin={{ top: 24, right: 16, left: 8, bottom: 4 }} barCategoryGap="25%">
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                      <YAxis tickFormatter={(v: number) => brl(v)} tick={{ fontSize: 11 }} width={72} tickLine={false} axisLine={false} />
                      <RTooltip content={<PriceTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
                      <ReferenceLine
                        y={priceStats.avg}
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="4 4"
                        label={{ value: `Média ${brl(priceStats.avg)}`, position: "insideTopRight", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Bar dataKey="price" radius={[4, 4, 0, 0]} maxBarSize={72}>
                        <LabelList dataKey="price" position="top" formatter={(v: number) => brl(v)} style={{ fontSize: 10, fontWeight: 600, fill: "hsl(var(--foreground))" }} />
                        {priceHistory.map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={entry.direction === "up" ? PRICE_UP : entry.direction === "down" ? PRICE_DOWN : "hsl(var(--primary))"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="py-10 text-center">
                <DollarSign className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Nenhum preço de entrada registrado ainda.
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Ao registrar entradas informando o custo, a evolução dos preços aparece aqui.
                </p>
              </div>
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
                    const isOpenRollUse = mov.movement_type === "open_roll_use";
                    const isOpenRollClosure = mov.movement_type === "open_roll_closure";

                    // Bobinas abertas acumulam uso (somam), estoque fechado subtrai
                    const isAccumulation = isOpenRollUse;
                    const showPositive = isEntry || isAccumulation;

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
                          ) : isOpenRollUse ? (
                            <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-500/10 font-medium whitespace-nowrap">
                              <ArrowUp className="h-3 w-3 mr-1" /> Uso de Bobina Aberta
                            </Badge>
                          ) : isOpenRollClosure ? (
                            <Badge variant="outline" className="border-orange-500 text-orange-700 bg-orange-500/10 font-medium whitespace-nowrap">
                              <Activity className="h-3 w-3 mr-1" /> Encerramento de Bobina
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
                            isEntry ? "text-green-600" : isOpenRollUse ? "text-blue-600" : isOpenRollClosure ? "text-orange-600" : (isExit || isAdjustmentOpen) ? "text-foreground" : ""
                          )}>
                            {showPositive ? "+" : "-"}{mov.quantity} {material.unit}
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
