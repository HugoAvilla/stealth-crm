import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Loader2 } from "lucide-react";
import { type ReportType } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { generateReportPDF, type ReportPDFData } from "@/lib/pdfGenerator";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Account {
  id: number;
  name: string;
}

interface ReportConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportType | null;
}

export function ReportConfigModal({ open, onOpenChange, report }: ReportConfigModalProps) {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [generating, setGenerating] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      fetchCompanyData();
      // Set default dates (last 30 days)
      setEndDate(format(new Date(), 'yyyy-MM-dd'));
      setStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    }
  }, [open, user?.id]);

  const fetchCompanyData = async () => {
    if (!user?.id) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return;

    setCompanyId(profile.company_id);

    if (report?.id === 'extrato_conta') {
      const { data } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('company_id', profile.company_id)
        .eq('is_active', true);

      setAccounts(data || []);
    }
  };

  const generateDFCReport = async (): Promise<ReportPDFData> => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('company_id', companyId)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: true });

    const entradas = data?.filter(t => t.type === 'Entrada').reduce((s, t) => s + t.amount, 0) || 0;
    const saidas = data?.filter(t => t.type === 'Saida').reduce((s, t) => s + t.amount, 0) || 0;

    const rows = data?.map((t, i) => [
      (i + 1).toString(),
      format(new Date(t.transaction_date), 'dd/MM/yyyy'),
      t.name,
      t.type,
      `R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ]) || [];

    return {
      title: 'DFC - Demonstração de Fluxo de Caixa',
      period: { start: startDate, end: endDate },
      columns: ['#', 'Data', 'Descrição', 'Tipo', 'Valor'],
      rows,
      summary: [
        { label: 'Total Entradas', value: `R$ ${entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
        { label: 'Total Saídas', value: `R$ ${saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
        { label: 'Saldo do Período', value: `R$ ${(entradas - saidas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
      ],
    };
  };

  const generateDREReport = async (): Promise<ReportPDFData> => {
    const { data } = await supabase
      .from('transactions')
      .select('*, categories(name)')
      .eq('company_id', companyId)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    const entradas = data?.filter(t => t.type === 'Entrada').reduce((s, t) => s + t.amount, 0) || 0;
    const saidas = data?.filter(t => t.type === 'Saida').reduce((s, t) => s + t.amount, 0) || 0;

    // Group by category
    const categoryTotals: Record<string, { entradas: number; saidas: number }> = {};
    data?.forEach(t => {
      const catName = (t.categories as any)?.name || 'Sem categoria';
      if (!categoryTotals[catName]) categoryTotals[catName] = { entradas: 0, saidas: 0 };
      if (t.type === 'Entrada') categoryTotals[catName].entradas += t.amount;
      else categoryTotals[catName].saidas += t.amount;
    });

    const rows = Object.entries(categoryTotals).map(([cat, vals], i) => [
      (i + 1).toString(),
      cat,
      `R$ ${vals.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `R$ ${vals.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `R$ ${(vals.entradas - vals.saidas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ]);

    return {
      title: 'DRE - Demonstração de Resultado',
      period: { start: startDate, end: endDate },
      columns: ['#', 'Categoria', 'Receitas', 'Despesas', 'Resultado'],
      rows,
      summary: [
        { label: 'Receita Bruta', value: `R$ ${entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
        { label: 'Despesas Totais', value: `R$ ${saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
        { label: 'Resultado Líquido', value: `R$ ${(entradas - saidas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
      ],
    };
  };

  const generateVendasPeriodoReport = async (): Promise<ReportPDFData> => {
    const { data } = await supabase
      .from('sales')
      .select('*, clients(name), vehicles(brand, model, plate)')
      .eq('company_id', companyId)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)
      .order('sale_date', { ascending: false });

    const total = data?.reduce((s, sale) => s + sale.total, 0) || 0;

    const rows = data?.map((sale, i) => [
      (i + 1).toString(),
      format(new Date(sale.sale_date), 'dd/MM/yyyy'),
      (sale.clients as any)?.name || '-',
      (sale.vehicles as any) ? `${(sale.vehicles as any).brand} ${(sale.vehicles as any).model}` : '-',
      sale.status || 'Aberta',
      `R$ ${sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ]) || [];

    return {
      title: 'Vendas por Período',
      period: { start: startDate, end: endDate },
      columns: ['#', 'Data', 'Cliente', 'Veículo', 'Status', 'Total'],
      rows,
      summary: [
        { label: 'Total de Vendas', value: (data?.length || 0).toString() },
        { label: 'Valor Total', value: `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
      ],
    };
  };

  const generateVendasServicoReport = async (): Promise<ReportPDFData> => {
    const { data } = await supabase
      .from('sale_items')
      .select('*, services(name), sales!inner(sale_date)')
      .eq('company_id', companyId)
      .gte('sales.sale_date', startDate)
      .lte('sales.sale_date', endDate);

    // Group by service
    const serviceTotals: Record<string, { qty: number; total: number }> = {};
    data?.forEach(item => {
      const serviceName = (item.services as any)?.name || 'Serviço Avulso';
      if (!serviceTotals[serviceName]) serviceTotals[serviceName] = { qty: 0, total: 0 };
      serviceTotals[serviceName].qty += item.quantity || 1;
      serviceTotals[serviceName].total += item.total_price;
    });

    const rows = Object.entries(serviceTotals)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, vals], i) => [
        (i + 1).toString(),
        name,
        vals.qty.toString(),
        `R$ ${vals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ]);

    const total = Object.values(serviceTotals).reduce((s, v) => s + v.total, 0);

    return {
      title: 'Vendas por Serviço',
      period: { start: startDate, end: endDate },
      columns: ['#', 'Serviço', 'Quantidade', 'Total'],
      rows,
      summary: [
        { label: 'Total de Serviços', value: rows.length.toString() },
        { label: 'Valor Total', value: `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
      ],
    };
  };

  const generateVendasVendedorReport = async (): Promise<ReportPDFData> => {
    const { data } = await supabase
      .from('sales')
      .select('*, profiles:seller_id(name)')
      .eq('company_id', companyId)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate);

    // Group by seller
    const sellerTotals: Record<string, { qty: number; total: number }> = {};
    data?.forEach(sale => {
      const sellerName = (sale.profiles as any)?.name || 'Vendedor não identificado';
      if (!sellerTotals[sellerName]) sellerTotals[sellerName] = { qty: 0, total: 0 };
      sellerTotals[sellerName].qty += 1;
      sellerTotals[sellerName].total += sale.total;
    });

    const rows = Object.entries(sellerTotals)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, vals], i) => [
        (i + 1).toString(),
        name,
        vals.qty.toString(),
        `R$ ${vals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ]);

    return {
      title: 'Vendas por Vendedor',
      period: { start: startDate, end: endDate },
      columns: ['#', 'Vendedor', 'Vendas', 'Total'],
      rows,
      summary: [
        { label: 'Total de Vendedores', value: rows.length.toString() },
        { label: 'Valor Total', value: `R$ ${Object.values(sellerTotals).reduce((s, v) => s + v.total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
      ],
    };
  };

  const generateClientesAtivosReport = async (): Promise<ReportPDFData> => {
    const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd');
    
    const { data: sales } = await supabase
      .from('sales')
      .select('client_id, total, clients(name, phone)')
      .eq('company_id', companyId)
      .gte('sale_date', ninetyDaysAgo);

    // Group by client
    const clientTotals: Record<number, { name: string; phone: string; qty: number; total: number }> = {};
    sales?.forEach(sale => {
      if (!sale.client_id) return;
      if (!clientTotals[sale.client_id]) {
        clientTotals[sale.client_id] = { 
          name: (sale.clients as any)?.name || '-', 
          phone: (sale.clients as any)?.phone || '-',
          qty: 0, 
          total: 0 
        };
      }
      clientTotals[sale.client_id].qty += 1;
      clientTotals[sale.client_id].total += sale.total;
    });

    const rows = Object.values(clientTotals)
      .sort((a, b) => b.total - a.total)
      .map((client, i) => [
        (i + 1).toString(),
        client.name,
        client.phone,
        client.qty.toString(),
        `R$ ${client.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ]);

    return {
      title: 'Clientes Ativos (últimos 90 dias)',
      columns: ['#', 'Cliente', 'Telefone', 'Compras', 'Total'],
      rows,
      summary: [
        { label: 'Total de Clientes Ativos', value: rows.length.toString() },
      ],
    };
  };

  const generateClientesInativosReport = async (): Promise<ReportPDFData> => {
    const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd');
    
    // Get all clients
    const { data: allClients } = await supabase
      .from('clients')
      .select('id, name, phone')
      .eq('company_id', companyId);

    // Get clients with recent sales
    const { data: recentSales } = await supabase
      .from('sales')
      .select('client_id')
      .eq('company_id', companyId)
      .gte('sale_date', ninetyDaysAgo);

    const activeClientIds = new Set(recentSales?.map(s => s.client_id).filter(Boolean));
    const inactiveClients = allClients?.filter(c => !activeClientIds.has(c.id)) || [];

    const rows = inactiveClients.map((client, i) => [
      (i + 1).toString(),
      client.name,
      client.phone,
    ]);

    return {
      title: 'Clientes Inativos (+90 dias sem compras)',
      columns: ['#', 'Cliente', 'Telefone'],
      rows,
      summary: [
        { label: 'Total de Clientes Inativos', value: rows.length.toString() },
      ],
    };
  };

  const generateOcupacaoVagasReport = async (): Promise<ReportPDFData> => {
    const { data } = await supabase
      .from('spaces')
      .select('*, clients(name), vehicles(brand, model, plate)')
      .eq('company_id', companyId)
      .gte('entry_date', startDate)
      .lte('entry_date', endDate)
      .order('entry_date', { ascending: false });

    const rows = data?.map((space, i) => [
      (i + 1).toString(),
      space.name,
      (space.clients as any)?.name || '-',
      (space.vehicles as any) ? `${(space.vehicles as any).brand} ${(space.vehicles as any).model}` : '-',
      space.entry_date ? format(new Date(space.entry_date), 'dd/MM/yyyy') : '-',
      space.exit_date ? format(new Date(space.exit_date), 'dd/MM/yyyy') : 'Em uso',
      space.payment_status === 'paid' ? 'Pago' : 'Pendente'
    ]) || [];

    return {
      title: 'Ocupação de Vagas',
      period: { start: startDate, end: endDate },
      columns: ['#', 'Vaga', 'Cliente', 'Veículo', 'Entrada', 'Saída', 'Pagamento'],
      rows,
      summary: [
        { label: 'Total de Ocupações', value: rows.length.toString() },
      ],
    };
  };

  const generateEstoqueMovimentoReport = async (): Promise<ReportPDFData> => {
    const { data } = await supabase
      .from('stock_movements')
      .select('*, materials(name, unit)')
      .eq('company_id', companyId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    const rows = data?.map((mov, i) => [
      (i + 1).toString(),
      format(new Date(mov.created_at!), 'dd/MM/yyyy'),
      (mov.materials as any)?.name || '-',
      mov.movement_type,
      `${mov.quantity} ${(mov.materials as any)?.unit || 'un'}`,
      mov.reason || '-'
    ]) || [];

    return {
      title: 'Movimentação de Estoque',
      period: { start: startDate, end: endDate },
      columns: ['#', 'Data', 'Material', 'Tipo', 'Quantidade', 'Motivo'],
      rows,
      summary: [
        { label: 'Total de Movimentações', value: rows.length.toString() },
      ],
    };
  };

  const generateExtratoContaReport = async (): Promise<ReportPDFData> => {
    const account = accounts.find(a => a.id === parseInt(accountId));
    
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('company_id', companyId)
      .eq('account_id', parseInt(accountId))
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: true });

    const entradas = data?.filter(t => t.type === 'Entrada').reduce((s, t) => s + t.amount, 0) || 0;
    const saidas = data?.filter(t => t.type === 'Saida').reduce((s, t) => s + t.amount, 0) || 0;

    const rows = data?.map((t, i) => [
      (i + 1).toString(),
      format(new Date(t.transaction_date), 'dd/MM/yyyy'),
      t.name,
      t.type,
      `R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ]) || [];

    return {
      title: `Extrato - ${account?.name || 'Conta'}`,
      period: { start: startDate, end: endDate },
      columns: ['#', 'Data', 'Descrição', 'Tipo', 'Valor'],
      rows,
      summary: [
        { label: 'Entradas', value: `R$ ${entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
        { label: 'Saídas', value: `R$ ${saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
        { label: 'Saldo', value: `R$ ${(entradas - saidas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
      ],
    };
  };

  const handleGenerate = async () => {
    if (!report || !companyId) return;

    setGenerating(true);
    try {
      let pdfData: ReportPDFData;

      switch (report.id) {
        case 'dfc':
          pdfData = await generateDFCReport();
          break;
        case 'dre':
          pdfData = await generateDREReport();
          break;
        case 'vendas_periodo':
          pdfData = await generateVendasPeriodoReport();
          break;
        case 'vendas_servico':
          pdfData = await generateVendasServicoReport();
          break;
        case 'vendas_vendedor':
          pdfData = await generateVendasVendedorReport();
          break;
        case 'clientes_ativos':
          pdfData = await generateClientesAtivosReport();
          break;
        case 'clientes_inativos':
          pdfData = await generateClientesInativosReport();
          break;
        case 'ocupacao_vagas':
          pdfData = await generateOcupacaoVagasReport();
          break;
        case 'estoque_movimento':
          pdfData = await generateEstoqueMovimentoReport();
          break;
        case 'extrato_conta':
          if (!accountId) {
            toast.error("Selecione uma conta");
            return;
          }
          pdfData = await generateExtratoContaReport();
          break;
        default:
          toast.error("Relatório não implementado");
          return;
      }

      generateReportPDF(pdfData);
      toast.success(`Relatório ${report.name} gerado em PDF!`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setGenerating(false);
    }
  };

  if (!report) return null;

  const needsAccount = report.id === 'extrato_conta';
  const needsDateRange = !['clientes_ativos', 'clientes_inativos'].includes(report.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {report.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{report.description}</p>

          {needsDateRange && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {needsAccount && (
            <div className="space-y-2">
              <Label>Conta</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id.toString()}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" /> Gerar PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
