// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { usePlanGate } from "@/hooks/usePlanGate";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PurchaseKPIs } from "@/components/compras/PurchaseKPIs";
import { PurchasesTable, PurchaseRow, PurchaseFilters } from "@/components/compras/PurchasesTable";
import { NewPurchaseModal } from "@/components/compras/NewPurchaseModal";
import { PurchaseDetailDrawer } from "@/components/compras/PurchaseDetailDrawer";
import { MonthBillsModal } from "@/components/compras/MonthBillsModal";
import { fetchPurchaseMetrics } from "@/lib/purchaseService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Compras() {
  const { user } = useAuth();
  const gate = usePlanGate('compras');
  const navigate = useNavigate();

  useEffect(() => {
    if (!gate.hasAccess) {
      if (gate.message) toast.error(gate.message);
      if (gate.redirectTo) navigate(gate.redirectTo, { replace: true });
    }
  }, [gate.hasAccess, gate.redirectTo, gate.message, navigate]);


  const [metrics, setMetrics] = useState({ totalMonthDue: 0, monthBillsCount: 0, totalOpenPurchases: 0, totalOverduePurchases: 0, chartData: [] as { name: string, valor: number }[] });
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false);
  const [isBillsModalOpen, setIsBillsModalOpen] = useState(false);
  const [detailPurchaseId, setDetailPurchaseId] = useState<number | null>(null);

  const [filters, setFilters] = useState<PurchaseFilters>({ search: "", status: "all", paymentMethod: "all", filterMonth: format(new Date(), "yyyy-MM") });

  useEffect(() => {
    if (user?.companyId) {
      loadData();
    }
  }, [user?.companyId]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      fetchMetrics(),
      fetchPurchases(),
      fetchAccountsAndCategories()
    ]);
    setLoading(false);
  };

  const fetchMetrics = async () => {
    if (!user?.companyId) return;
    const data = await fetchPurchaseMetrics(user.companyId);
    setMetrics(data);
  };

  const fetchPurchases = async () => {
    if (!user?.companyId) return;
    const { data } = await supabase
      .from("purchases")
      .select("*, purchase_installments(id, status)")
      .eq("company_id", user.companyId)
      .order("created_at", { ascending: false });

    if (data) {
      const formatted = data.map(p => ({
        ...p,
        supplier_name: p.supplier_name_snapshot
      })) as unknown as PurchaseRow[];
      setPurchases(formatted);
    }
  };

  const fetchAccountsAndCategories = async () => {
    if (!user?.companyId) return;
    const [accRes, catRes] = await Promise.all([
      supabase.from("accounts").select("*").eq("company_id", user.companyId).eq("is_active", true),
      supabase.from("categories").select("*").eq("type", "Saida").order("name")
    ]);

    if (accRes.data) setAccounts(accRes.data);

    if (catRes.data) {
      let existingCats = catRes.data;
      // Auto create 'Compras de material' if it doesn't exist
      const hasCompraCat = existingCats.some(c => c.name === "Compras de material");
      if (!hasCompraCat) {
        const { data: newCat } = await supabase.from("categories").insert({
          name: "Compras de material",
          type: "Saida",
          color: "#f59e0b"
        }).select().single();
        if (newCat) existingCats = [...existingCats, newCat];
      }
      setCategories(existingCats);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir esta compra? Isso reverterá pagamentos.")) {
      const { deletePurchase } = await import("@/lib/purchaseService");
      const success = await deletePurchase(id, user!.companyId!);
      if (success) {
        loadData();
      }
    }
  };

  // Dados do gráfico agora vêm de metrics.chartData

  if (!gate.hasAccess) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Compras e Despesas</h2>
          <p className="text-muted-foreground">Gerencie suas compras de material, fornecedores e contas a pagar.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsNewPurchaseOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Compra
          </Button>
        </div>
      </div>

      <PurchaseKPIs
        metrics={metrics}
        loading={loading}
        monthlyAverage={metrics.totalMonthDue || 0}
        onBillsClick={() => setIsBillsModalOpen(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PurchasesTable
            purchases={purchases}
            loading={loading}
            onViewDetails={setDetailPurchaseId}
            onDelete={handleDelete}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Previsão de Compromissos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(value) => `R$${value / 1000}k`} />
                    <RechartsTooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Valor']} />
                    <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <NewPurchaseModal
        open={isNewPurchaseOpen}
        onOpenChange={setIsNewPurchaseOpen}
        onSuccess={loadData}
        accounts={accounts}
        categories={categories}
      />

      <PurchaseDetailDrawer
        purchaseId={detailPurchaseId}
        open={!!detailPurchaseId}
        onOpenChange={(v) => !v && setDetailPurchaseId(null)}
        onUpdate={loadData}
      />

      <MonthBillsModal
        open={isBillsModalOpen}
        onOpenChange={setIsBillsModalOpen}
        companyId={user?.companyId || 0}
        onSuccess={loadData}
      />
    </div>
  );
}
