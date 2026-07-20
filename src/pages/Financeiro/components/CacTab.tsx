import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Target, Users, DollarSign, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { RoasEntryModal } from "./RoasEntryModal";

import { useCacData } from "../hooks/useCacData";
import { CacKpiCards } from "./cac/CacKpiCards";
import { NewVsReturningCard } from "./cac/NewVsReturningCard";
import { SellerExpenseForm } from "./cac/SellerExpenseForm";

export function CacTab() {
  const [isRoasModalOpen, setIsRoasModalOpen] = useState(false);

  const {
    currentMonth,
    navigateMonth,
    setMonth,
    targetRoas,
    handleTargetRoasChange,
    totalCac,
    marketingCost,
    salesCost,
    newPayingClients,
    cohortRevenue,
    avgCac,
    globalRoas,
    roasProgress,
    channelStats,
    cacTransactions,
    sellerRanking,
    sellers,
    accounts,
    newClientSales,
    returningClientSales,
    newClientRevenue,
    returningClientRevenue,
    fetchCacData,
    handleDeleteCacTransaction,
    userCompanyId
  } = useCacData();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header and Filters */}
      <div className="flex flex-col gap-4 p-4 bg-muted/30 rounded-xl border">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Custo de Aquisição de Clientes</h2>
          <p className="text-sm text-muted-foreground mt-1">Analise o retorno dos seus investimentos em marketing e vendas.</p>
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <Button size="sm" variant="outline" className="h-8 gap-1 bg-background w-full sm:w-auto" onClick={() => setIsRoasModalOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Registrar Gasto em Ads
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 bg-background border-blue-500/30 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 transition-all w-full sm:w-auto"
              onClick={() => {
                const element = document.getElementById("quick-seller-expense-card");
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "center" });
                  element.classList.add("ring-2", "ring-blue-500");
                  setTimeout(() => {
                    element.classList.remove("ring-2", "ring-blue-500");
                  }, 1500);
                }
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Registrar Gasto com Vendedor
            </Button>
          </div>
        </div>
        <div className="space-y-1.5 w-full sm:max-w-[280px]">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Período de Análise</Label>
          <div className="flex items-center gap-1.5 sm:gap-2 w-full justify-center">
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-background" onClick={() => navigateMonth('PREV')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="relative flex-1 min-w-0 h-9 bg-background border rounded-md flex items-center justify-center">
              <span className="text-sm font-semibold capitalize text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <Input
                type="month"
                value={format(currentMonth, "yyyy-MM")}
                onChange={(e) => setMonth(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-background" onClick={() => navigateMonth('NEXT')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <CacKpiCards
        totalCac={totalCac}
        marketingCost={marketingCost}
        salesCost={salesCost}
        newPayingClients={newPayingClients}
        avgCac={avgCac}
        cohortRevenue={cohortRevenue}
        globalRoas={globalRoas}
        targetRoas={targetRoas}
        roasProgress={roasProgress}
        onTargetRoasChange={handleTargetRoasChange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <NewVsReturningCard
          newClientSales={newClientSales}
          returningClientSales={returningClientSales}
          newClientRevenue={newClientRevenue}
          returningClientRevenue={returningClientRevenue}
        />

        <SellerExpenseForm
          companyId={userCompanyId}
          sellers={sellers}
          accounts={accounts}
          onSuccess={fetchCacData}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table representation */}
        <Card className="lg:col-span-2 p-1">
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Performance por Canal
            </h3>
            <p className="text-sm text-muted-foreground">Custo direto + custo 'Geral' rateado.</p>
          </div>
          <div className="hidden sm:block w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                  <TableHead className="text-center">Pagantes</TableHead>
                  <TableHead className="text-right">CAC</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right text-primary">ROAS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channelStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                      Sem dados o suficiente no período.
                    </TableCell>
                  </TableRow>
                ) : channelStats.map((stat) => (
                  <TableRow key={stat.origem}>
                    <TableCell className="font-medium">{stat.origem}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stat.custoTotal)}
                    </TableCell>
                    <TableCell className="text-center font-semibold">{stat.clientesPagantes}</TableCell>
                    <TableCell className="text-right text-info">
                      {stat.clientesPagantes === 0 ? 'N/A' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stat.cac)}
                    </TableCell>
                    <TableCell className="text-right text-green-500">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stat.receita)}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${stat.custoTotal === 0 ? 'text-primary' : (stat.roas >= targetRoas ? 'text-green-500' : 'text-red-500')}`}>
                      {stat.custoTotal === 0 ? 'N/A' : `${stat.roas.toFixed(2)}x`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="block sm:hidden p-3 space-y-3">
            {channelStats.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">Sem dados o suficiente no período.</p>
            ) : channelStats.map((stat) => (
              <div key={stat.origem} className="p-3 rounded-lg border text-sm space-y-2 bg-card">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-semibold">{stat.origem}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stat.custoTotal === 0 ? 'bg-primary/10 text-primary' : (stat.roas >= targetRoas ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500')}`}>
                    {stat.custoTotal === 0 ? 'N/A' : `ROAS ${stat.roas.toFixed(2)}x`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Custo Total</span>
                    <span className="font-medium text-xs">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stat.custoTotal)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Pagantes</span>
                    <span className="font-semibold text-xs">{stat.clientesPagantes}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">CAC</span>
                    <span className="font-medium text-xs text-info">{stat.clientesPagantes === 0 ? 'N/A' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stat.cac)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1 text-xs">
                  <span className="text-muted-foreground">Receita:</span>
                  <span className="font-semibold text-green-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stat.receita)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Chart representation */}
        <Card className="p-5 flex flex-col">
          <h3 className="font-semibold mb-4">Eficiência de Conversão (CAC)</h3>
          <div className="flex-1 min-h-[300px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelStats.filter(s => s.clientesPagantes > 0)} margin={{ top: 20, right: 0, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888833" />
                <XAxis dataKey="origem" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.7 }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value}`} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.7 }} width={75} />
                <Tooltip cursor={{ fill: '#88888811' }} contentStyle={{ borderRadius: '8px', border: '1px solid #88888833', backgroundColor: 'var(--background)' }} formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                <Bar dataKey="cac" name="CAC Médio" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card className="lg:col-span-2 p-1">
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-orange-500" />
              Despesas de CAC Mapeadas no Período
            </h3>
            <p className="text-sm text-muted-foreground">Transações de saída que estão compondo o investimento total exibido acima.</p>
          </div>
          <div className="hidden sm:block w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nome da Transação</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Canal Marcado</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cacTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-16 text-muted-foreground">
                      Nenhuma despesa marcada como CAC no período.
                    </TableCell>
                  </TableRow>
                ) : cacTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{format(parseISO(tx.transaction_date), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="font-medium">{tx.name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider ${tx.cac_bucket === 'marketing' ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'}`}>
                        {tx.cac_bucket}
                      </span>
                    </TableCell>
                    <TableCell>{tx.cac_origin || 'Não classificado'}</TableCell>
                    <TableCell className="text-right text-red-500">
                      -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCacTransaction(tx.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-red-500 transition-colors"
                        title="Excluir despesa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="block sm:hidden p-3 space-y-3">
            {cacTransactions.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">Nenhuma despesa marcada como CAC no período.</p>
            ) : cacTransactions.map((tx) => (
              <div key={tx.id} className="p-3 rounded-lg border text-sm space-y-2 bg-card">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-semibold truncate max-w-[55%]">{tx.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${tx.cac_bucket === 'marketing' ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'}`}>
                      {tx.cac_bucket}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCacTransaction(tx.id)}
                      className="h-6 w-6 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Data</span>
                    <span className="font-medium text-xs">{format(parseISO(tx.transaction_date), "dd/MM/yy")}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Canal</span>
                    <span className="font-medium text-xs">{tx.cac_origin || 'N/C'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-red-400 block">Valor</span>
                    <span className="font-semibold text-xs text-red-500">-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Ranking de Vendedores */}
        <Card className="lg:col-span-1 p-1 flex flex-col justify-between">
          <div>
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2 text-foreground">
                <Users className="w-4 h-4 text-blue-500" />
                Eficiência Comercial
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Ranking de vendas por faturamento no período.</p>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[350px]">
              {sellerRanking.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">
                  Nenhuma venda comercial registrada no período.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {sellerRanking.map((seller, index) => (
                    <div key={seller.id} className="p-3 flex items-center justify-between text-xs hover:bg-muted/20 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${index === 0 ? 'bg-amber-500/20 text-amber-500' :
                          index === 1 ? 'bg-slate-400/20 text-slate-400' :
                            index === 2 ? 'bg-amber-700/20 text-amber-700' : 'bg-muted text-muted-foreground'
                          }`}>
                          {index + 1}
                        </span>
                        <div>
                          <span className="font-medium text-foreground block">{seller.name}</span>
                          <span className="text-[10px] text-muted-foreground">{seller.vendasCount} {seller.vendasCount === 1 ? 'venda' : 'vendas'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-foreground block">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(seller.faturamentoTotal)}
                        </span>
                        <span className="text-[10px] text-blue-500">
                          Comissão: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(seller.comissaoTotal)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <RoasEntryModal
        open={isRoasModalOpen}
        onOpenChange={setIsRoasModalOpen}
        onSuccess={fetchCacData}
      />
    </div>
  );
}
