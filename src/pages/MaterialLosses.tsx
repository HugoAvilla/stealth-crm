import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanGate } from '@/hooks/usePlanGate';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useMaterialLosses } from '@/hooks/useMaterialLosses';
import { useMaterialLossLimits } from '@/hooks/useMaterialLossLimits';
import { MaterialLossFormModal } from '@/components/material-losses/MaterialLossFormModal';
import { MaterialLossLimitsModal } from '@/components/material-losses/MaterialLossLimitsModal';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, Settings, TrendingDown, DollarSign, Ruler, FileWarning, MoreHorizontal, Pencil, Trash2, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useDeleteMaterialLoss } from '@/hooks/useMaterialLosses';
import { generateReportPDF } from '@/lib/pdfGenerator';
import { cn } from '@/lib/utils';

const formatSafeDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return format(date, 'dd/MM/yyyy HH:mm');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

export default function MaterialLosses() {
  const { user, isLoading: authLoading } = useAuth();
  const gate = usePlanGate('perdas');
  const navigate = useNavigate();
  const [showFormModal, setShowFormModal] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [selectedLoss, setSelectedLoss] = useState<any>(null);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'PPF' | 'INSULFILM'>('ALL');

  useEffect(() => {
    if (!authLoading && !gate.hasAccess) {
      if (gate.message) {
        toast.error(gate.message);
      }
      if (gate.redirectTo) {
        navigate(gate.redirectTo, { replace: true });
      }
    }
  }, [authLoading, gate.hasAccess, gate.redirectTo, gate.message, navigate]);

  const { data: losses, isLoading } = useMaterialLosses({
    category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
  });
  
  const { data: limits } = useMaterialLossLimits();
  const deleteMutation = useDeleteMaterialLoss();

  const isAdmin = user?.role === 'ADMIN';

  // Calculations for cards
  const stats = useMemo(() => {
    if (!losses) return { meters: 0, m2: 0, count: 0, cost: 0 };
    return losses.reduce((acc, curr) => {
      if (curr.status === 'cancelled') return acc;
      acc.meters += Number(curr.lost_meters);
      acc.m2 += Number(curr.lost_m2);
      acc.cost += Number(curr.cost);
      acc.count += 1;
      return acc;
    }, { meters: 0, m2: 0, count: 0, cost: 0 });
  }, [losses]);

  // Alert calculations
  const alerts = useMemo(() => {
    if (!limits || !losses) return [];
    
    const triggered: string[] = [];
    
    // Group losses by category for limit checking
    const lossesByCategory = losses.reduce((acc, curr) => {
      if (curr.status === 'cancelled') return acc;
      if (!acc[curr.category]) acc[curr.category] = { cost: 0, meters: 0, count: 0 };
      acc[curr.category].cost += Number(curr.cost);
      acc[curr.category].meters += Number(curr.lost_meters);
      acc[curr.category].count += 1;
      return acc;
    }, {} as Record<string, { cost: number; meters: number; count: number }>);

    limits.forEach(limit => {
      const catStats = lossesByCategory[limit.category];
      if (!catStats) return;

      let valueToCheck = 0;
      let limitLabel = '';

      if (limit.limit_type === 'cost') {
        valueToCheck = catStats.cost;
        limitLabel = `R$ ${limit.limit_value}`;
      } else if (limit.limit_type === 'meters') {
        valueToCheck = catStats.meters;
        limitLabel = `${limit.limit_value}m`;
      } else if (limit.limit_type === 'count') {
        valueToCheck = catStats.count;
        limitLabel = `${limit.limit_value} registros`;
      }

      if (valueToCheck > Number(limit.limit_value)) {
        triggered.push(`Alerta de limite excedido: ${limit.category} ultrapassou o teto de ${limitLabel}. Atual: ${
          limit.limit_type === 'cost' ? `R$ ${valueToCheck.toFixed(2)}` :
          limit.limit_type === 'meters' ? `${valueToCheck.toFixed(2)}m` :
          valueToCheck
        }`);
      }
    });

    return triggered;
  }, [limits, losses]);

  if (authLoading || isLoading || !gate.hasAccess) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const exportToPDF = async () => {
    if (!losses) return;
    
    const columns = ['Data', 'Instalador', 'Material', 'Categoria', 'Metros', 'Motivo', 'Custo'];
    const rows = losses
      .filter(loss => loss.status !== 'cancelled')
      .map(loss => [
        formatSafeDate(loss.created_at),
        loss.installer?.name || 'Não identificado',
        loss.material?.name || '',
        loss.category,
        `${loss.lost_meters}m`,
        loss.reason,
        `R$ ${Number(loss.cost).toFixed(2)}`
      ]);

    const reportData = {
      title: 'Relatório de Perdas de Material',
      columns,
      rows,
      summary: [
        { label: 'Total de Metros Perdidos', value: `${stats.meters.toFixed(2)} m` },
        { label: 'Total de Área Perdida', value: `${stats.m2.toFixed(2)} m²` },
        { label: 'Custo Total Estimado', value: `R$ ${stats.cost.toFixed(2)}` },
        { label: 'Quantidade de Registros', value: String(stats.count) }
      ]
    };

    try {
      await generateReportPDF(reportData, user?.companyId ? Number(user.companyId) : undefined);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const exportToCSV = () => {
    if (!losses) return;
    
    const headers = ['Data', 'Instalador', 'Material', 'Categoria', 'Metros', 'Motivo', 'Custo'];
    const activeLosses = losses.filter(loss => loss.status !== 'cancelled');
    
    const csvRows = [
      headers.join(';'),
      ...activeLosses.map(loss => [
        formatSafeDate(loss.created_at),
        `"${loss.installer?.name || 'Não identificado'}"`,
        `"${loss.material?.name || ''}"`,
        loss.category,
        loss.lost_meters,
        loss.reason,
        Number(loss.cost).toFixed(2)
      ].join(';'))
    ];

    const csvContent = "\uFEFF" + csvRows.join("\n"); // UTF-8 BOM
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `perdas_material_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    if (!losses) return;
    
    const activeLosses = losses.filter(loss => loss.status !== 'cancelled');
    
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    html += `<head><meta charset="utf-8" /><style>table { border-collapse: collapse; } th { background-color: #333333; color: #ffffff; font-weight: bold; } th, td { border: 1px solid #dddddd; padding: 8px; text-align: left; } .number { text-align: right; }</style></head>`;
    html += `<body>`;
    html += `<h2>Relatório de Perdas de Material</h2>`;
    html += `<p>Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>`;
    html += `<table>`;
    html += `<thead><tr>`;
    html += `<th>Data</th><th>Instalador</th><th>Material</th><th>Categoria</th><th>Metros</th><th>Motivo</th><th>Custo</th>`;
    html += `</tr></thead><tbody>`;
    
    activeLosses.forEach(loss => {
      html += `<tr>`;
      html += `<td>${formatSafeDate(loss.created_at)}</td>`;
      html += `<td>${loss.installer?.name || 'Não identificado'}</td>`;
      html += `<td>${loss.material?.name || ''}</td>`;
      html += `<td>${loss.category}</td>`;
      html += `<td>${loss.lost_meters}m</td>`;
      html += `<td>${loss.reason}</td>`;
      html += `<td class="number">R$ ${Number(loss.cost).toFixed(2)}</td>`;
      html += `</tr>`;
    });
    
    html += `</tbody></table>`;
    
    // Resumo
    html += `<h3>Resumo</h3>`;
    html += `<ul>`;
    html += `<li><strong>Total de Metros Perdidos:</strong> ${stats.meters.toFixed(2)} m</li>`;
    html += `<li><strong>Total de Área Perdida:</strong> ${stats.m2.toFixed(2)} m²</li>`;
    html += `<li><strong>Custo Total Estimado:</strong> R$ ${stats.cost.toFixed(2)}</li>`;
    html += `<li><strong>Quantidade de Registros:</strong> ${stats.count}</li>`;
    html += `</ul>`;
    
    html += `</body></html>`;
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `perdas_material_${format(new Date(), 'yyyy-MM-dd')}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[100vw] overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-light">Perdas de <span className="font-semibold">Material</span></h1>
          <p className="text-muted-foreground">Monitore e registre o desperdício de insumos.</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => setShowLimitsModal(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Limites
            </Button>
          )}
          <Button onClick={() => setShowFormModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Perda
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((msg, i) => (
            <Alert variant="destructive" key={i}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Atenção</AlertTitle>
              <AlertDescription>{msg}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Metros Perdidos"
          value={`${stats.meters.toFixed(2)} m`}
          icon={<Ruler className="w-5 h-5" />}
          variant="warning"
        />
        <StatsCard
          title="Área Perdida"
          value={`${stats.m2.toFixed(2)} m²`}
          icon={<TrendingDown className="w-5 h-5" />}
          variant="destructive"
        />
        <StatsCard
          title="Custo Estimado"
          value={`R$ ${stats.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={<DollarSign className="w-5 h-5" />}
          variant="destructive"
        />
        <StatsCard
          title="Qtd. Registros"
          value={stats.count}
          icon={<FileWarning className="w-5 h-5" />}
          variant="info"
        />
      </div>

      {/* Filters and List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Select value={categoryFilter} onValueChange={(v: any) => setCategoryFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas Categorias</SelectItem>
                <SelectItem value="PPF">PPF</SelectItem>
                <SelectItem value="INSULFILM">Insulfilm</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={exportToPDF} disabled={!losses || losses.length === 0}>
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!losses || losses.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportToExcel} disabled={!losses || losses.length === 0}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
          </div>
            <div className="space-y-4">
          {/* 🖥️ Visualização Desktop: Tabela Completa */}
          <div className="hidden md:block rounded-md border bg-card overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Instalador</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Metros</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {losses?.map((loss: any) => (
                  <TableRow key={loss.id} className={loss.status === 'cancelled' ? 'opacity-50 line-through' : ''}>
                    <TableCell>{formatSafeDate(loss.created_at)}</TableCell>
                    <TableCell>{loss.installer?.name || 'Não identificado'}</TableCell>
                    <TableCell>{loss.material?.name}</TableCell>
                    <TableCell>{loss.category}</TableCell>
                    <TableCell>{loss.lost_meters}m</TableCell>
                    <TableCell>{loss.reason}</TableCell>
                    <TableCell className="text-right">
                      R$ {Number(loss.cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {loss.status !== 'cancelled' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedLoss(loss);
                              setShowFormModal(true);
                            }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={async () => {
                                  if (confirm('Tem certeza que deseja cancelar este registro de perda? O estoque será devolvido.')) {
                                    await deleteMutation.mutateAsync(loss.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Cancelar Registro
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && (!losses || losses.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                      Nenhum registro de perda encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* 📱 Visualização Mobile: Cards Empilhados */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {losses?.map((loss: any) => (
              <Card key={loss.id} className={cn("bg-card/50 border-border/50 p-4 space-y-3", loss.status === 'cancelled' ? 'opacity-50' : '')}>
                {/* Topo: Data, Categoria e Ações */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">{formatSafeDate(loss.created_at)}</span>
                    <h4 className="font-semibold text-sm text-foreground leading-tight">{loss.material?.name || 'Material não identificado'}</h4>
                  </div>
                  {loss.status !== 'cancelled' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedLoss(loss);
                          setShowFormModal(true);
                        }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {isAdmin && (
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={async () => {
                              if (confirm('Tem certeza que deseja cancelar este registro de perda? O estoque será devolvido.')) {
                                await deleteMutation.mutateAsync(loss.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Cancelar Registro
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Informações do Instalador e Motivo */}
                <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded space-y-1">
                  <p className="flex justify-between">
                    <span className="font-medium text-foreground">Instalador:</span>
                    <span>{loss.installer?.name || 'Não identificado'}</span>
                  </p>
                  <p className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground">Motivo:</span>
                    <span className="text-muted-foreground text-left">{loss.reason}</span>
                  </p>
                </div>

                {/* Métricas: Categoria, Metros, Custo */}
                <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-border/40 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-0.5">Categoria</span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">{loss.category}</Badge>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-0.5">Comprimento</span>
                    <span className="font-semibold text-foreground">{loss.lost_meters}m</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-0.5">Custo</span>
                    <span className="font-semibold text-destructive">
                      R$ {Number(loss.cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
            {!isLoading && (!losses || losses.length === 0) && (
              <div className="text-center py-8 text-muted-foreground bg-card border rounded-md">
                Nenhum registro de perda encontrado.
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      <MaterialLossFormModal 
        open={showFormModal} 
        onOpenChange={(open) => {
          setShowFormModal(open);
          if (!open) setSelectedLoss(null);
        }} 
        lossToEdit={selectedLoss}
      />
      
      {isAdmin && (
        <MaterialLossLimitsModal 
          open={showLimitsModal} 
          onOpenChange={setShowLimitsModal} 
        />
      )}
    </div>
  );
}
