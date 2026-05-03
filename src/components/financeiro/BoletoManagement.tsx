import { useState, useEffect } from "react";
import { 
  Receipt, 
  Search, 
  Filter, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MoreVertical,
  Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Boleto {
  id: string;
  sale_id: number;
  customer_name: string;
  total_amount: number;
  installments_count: number;
  status: string;
  created_at: string;
  sales: {
    clients: {
      name: string;
    }
  }
}

interface Installment {
  id: string;
  boleto_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: string;
  paid_at: string | null;
}

export function BoletoManagement() {
  const { user } = useAuth();
  const [boletos, setBoletos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedBoleto, setExpandedBoleto] = useState<string | null>(null);
  const [installments, setInstallments] = useState<Record<string, Installment[]>>({});

  useEffect(() => {
    if (user?.id) fetchBoletos();
  }, [user?.id]);

  const fetchBoletos = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user?.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from("boletos")
        .select(`
          *,
          sales:sale_id (
            clients:client_id (
              name
            )
          )
        `)
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBoletos(data || []);
    } catch (error) {
      console.error("Error fetching boletos:", error);
      toast.error("Erro ao carregar boletos");
    } finally {
      setLoading(false);
    }
  };

  const fetchInstallments = async (boletoId: string) => {
    try {
      const { data, error } = await supabase
        .from("boleto_installments")
        .select("*")
        .eq("boleto_id", boletoId)
        .order("installment_number");

      if (error) throw error;
      setInstallments(prev => ({ ...prev, [boletoId]: data || [] }));
    } catch (error) {
      console.error("Error fetching installments:", error);
    }
  };

  const toggleExpand = (boletoId: string) => {
    if (expandedBoleto === boletoId) {
      setExpandedBoleto(null);
    } else {
      setExpandedBoleto(boletoId);
      if (!installments[boletoId]) {
        fetchInstallments(boletoId);
      }
    }
  };

  const updateInstallmentStatus = async (inst: Installment, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("boleto_installments")
        .update({ 
          status: newStatus,
          paid_at: newStatus === 'paid' ? new Date().toISOString() : null
        })
        .eq("id", inst.id);

      if (error) throw error;
      
      toast.success("Status atualizado");
      fetchInstallments(inst.boleto_id);
      
      // Update boleto status if all installments are paid (optional logic)
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge className="bg-green-500 hover:bg-green-600">Pago</Badge>;
      case 'pending': return <Badge variant="outline" className="text-amber-600 border-amber-600">Pendente</Badge>;
      case 'overdue': return <Badge variant="destructive">Atrasado</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredBoletos = boletos.filter(b => {
    const clientName = b.sales?.clients?.name || "";
    const saleId = b.sale_id?.toString() || "";
    const search = searchTerm.toLowerCase();
    
    return clientName.toLowerCase().includes(search) || saleId.includes(searchTerm);
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por cliente ou venda..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" /> Filtros
          </Button>
        </div>
      </div>

      <Card className="border-border/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Venda</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Parcelas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBoletos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  Nenhum boleto encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredBoletos.map(boleto => (
                <>
                  <TableRow key={boleto.id} className="cursor-pointer hover:bg-muted/30" onClick={() => toggleExpand(boleto.id)}>
                    <TableCell>
                      {expandedBoleto === boleto.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </TableCell>
                    <TableCell className="font-medium">#{boleto.sale_id}</TableCell>
                    <TableCell>{boleto.sales?.clients?.name || 'Cliente N/A'}</TableCell>
                    <TableCell>R$ {boleto.total_amount.toFixed(2)}</TableCell>
                    <TableCell>{boleto.installments_count}x</TableCell>
                    <TableCell>{getStatusBadge(boleto.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(boleto.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2">
                            <ExternalLink className="h-4 w-4" /> Ver Venda
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  
                  {expandedBoleto === boleto.id && (
                    <TableRow className="bg-muted/10 border-b">
                      <TableCell colSpan={8} className="p-0">
                        <div className="p-4 bg-muted/5 animate-in slide-in-from-top-2 duration-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            {!installments[boleto.id] ? (
                              <div className="col-span-4 py-4 text-center text-xs text-muted-foreground">Carregando parcelas...</div>
                            ) : (
                              installments[boleto.id].map(inst => (
                                <Card key={inst.id} className="bg-background border-border/40">
                                  <CardContent className="p-3 space-y-2">
                                    <div className="flex justify-between items-start">
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Parcela {inst.installment_number}</span>
                                      {getStatusBadge(inst.status)}
                                    </div>
                                    <div className="text-lg font-bold">R$ {inst.amount.toFixed(2)}</div>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <Calendar className="h-3 w-3" />
                                      Venc: {format(new Date(inst.due_date), "dd/MM/yyyy")}
                                    </div>
                                    
                                    {inst.status !== 'paid' ? (
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="w-full h-8 text-xs gap-1 mt-1 border-green-500/50 text-green-600 hover:bg-green-500/10"
                                        onClick={() => updateInstallmentStatus(inst, 'paid')}
                                      >
                                        <Check className="h-3 w-3" /> Baixar Parcela
                                      </Button>
                                    ) : (
                                      <div className="text-[10px] text-green-600 flex items-center gap-1 mt-1 italic">
                                        <CheckCircle2 className="h-3 w-3" /> Pago em {inst.paid_at ? format(new Date(inst.paid_at), "dd/MM/yy") : ''}
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              ))
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
