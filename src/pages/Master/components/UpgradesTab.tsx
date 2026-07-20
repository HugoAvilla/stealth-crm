// @ts-nocheck
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UpgradeRequest {
  id: number;
  subscription_id: number;
  user_id: string;
  company_id: number | null;
  current_plan_code: string | null;
  current_billing_period: string | null;
  target_plan_code: string;
  target_billing_period: string;
  target_price: number;
  credit_amount: number;
  amount_due: number;
  status: string;
  created_at: string;
  profile?: { name: string; email: string } | null;
  company?: { company_name: string } | null;
}

export default function UpgradesTab() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<UpgradeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedRequest, setSelectedRequest] = useState<UpgradeRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);

      // Busca upgrade_requests com joins disponíveis (sem FK para profiles)
      const { data: reqs, error } = await supabase
        .from('upgrade_requests')
        .select(`
          *,
          company:companies!upgrade_requests_company_id_fkey(company_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!reqs || reqs.length === 0) {
        setRequests([]);
        return;
      }

      // Busca profiles separadamente (não há FK direta)
      const userIds = [...new Set(reqs.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds);

      const enriched: UpgradeRequest[] = reqs.map((req) => ({
        ...req,
        credit_amount: req.credit_amount ?? 0,
        amount_due: req.amount_due ?? 0,
        profile: profiles?.find((p) => p.user_id === req.user_id) || null,
      }));

      setRequests(enriched);
    } catch (error) {
      console.error('Error fetching upgrade requests:', error);
      toast({ title: "Erro ao carregar solicitações", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !actionType) return;

    setIsSubmitting(true);
    try {
      const rpcName = actionType === 'approve' ? 'master_approve_upgrade' : 'master_reject_upgrade';
      const { error } = await supabase.rpc(rpcName, {
        p_request_id: selectedRequest.id,
        p_notes: notes || null
      });

      if (error) throw error;

      toast({ title: `Solicitação ${actionType === 'approve' ? 'aprovada' : 'rejeitada'} com sucesso!` });
      setNotes("");
      setSelectedRequest(null);
      setActionType(null);
      fetchRequests();
    } catch (error: any) {
      console.error('Error processing upgrade request:', error);
      toast({ title: "Erro ao processar solicitação", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1"/> Pendente</Badge>;
      case 'payment_submitted':
        return <Badge className="bg-yellow-500/20 text-yellow-600"><Clock className="w-3 h-3 mr-1"/> Pagamento Enviado</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-600"><CheckCircle2 className="w-3 h-3 mr-1"/> Aprovado</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-600"><XCircle className="w-3 h-3 mr-1"/> Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Split into pending (needs action) and historical
  const actionable = requests.filter(r => r.status === 'payment_submitted');
  const historical = requests.filter(r => r.status !== 'payment_submitted');

  const renderTable = (data: UpgradeRequest[], showActions: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Usuário</TableHead>
          <TableHead>Empresa</TableHead>
          <TableHead>Plano Atual</TableHead>
          <TableHead>Novo Plano</TableHead>
          <TableHead>A Pagar</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Status</TableHead>
          {showActions && <TableHead className="text-right">Ações</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showActions ? 8 : 7} className="text-center text-muted-foreground py-4">
              Nenhuma solicitação encontrada.
            </TableCell>
          </TableRow>
        ) : data.map((req) => (
          <TableRow key={req.id}>
            <TableCell>
              <p className="font-medium">{req.profile?.name || "—"}</p>
              <p className="text-xs text-muted-foreground">{req.profile?.email || "—"}</p>
            </TableCell>
            <TableCell>{req.company?.company_name || "—"}</TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span className="capitalize">{req.current_plan_code || "basic"}</span>
                <span className="text-xs text-muted-foreground capitalize">{req.current_billing_period === "annual" ? "Anual" : "Mensal"}</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span className="capitalize font-medium text-primary">{req.target_plan_code}</span>
                <span className="text-xs text-muted-foreground capitalize">{req.target_billing_period === "annual" ? "Anual" : "Mensal"}</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span className="font-mono">R$ {(req.amount_due ?? 0).toFixed(2)}</span>
                <span className="text-xs text-green-600">Crédito: R$ {(req.credit_amount ?? 0).toFixed(2)}</span>
              </div>
            </TableCell>
            <TableCell>{format(new Date(req.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
            <TableCell>{getStatusBadge(req.status)}</TableCell>
            {showActions && (
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-green-600 border-green-200 hover:bg-green-50"
                    onClick={() => { setSelectedRequest(req); setActionType('approve'); }}
                  >
                    Aprovar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => { setSelectedRequest(req); setActionType('reject'); }}
                  >
                    Rejeitar
                  </Button>
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Solicitações Pendentes (Pagamento Enviado)</h3>
        <div className="border rounded-md bg-card">
          {renderTable(actionable, true)}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-muted-foreground">Histórico de Solicitações</h3>
        <div className="border rounded-md bg-card">
          {renderTable(historical, false)}
        </div>
      </div>

      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Aprovar Upgrade' : 'Rejeitar Upgrade'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? `Você está prestes a aprovar o upgrade para o plano ${selectedRequest?.target_plan_code} (${selectedRequest?.target_billing_period}). O período será atualizado automaticamente.`
                : `Você está prestes a rejeitar esta solicitação. O usuário continuará no plano atual.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Observação (Opcional)</Label>
              <Textarea 
                id="notes" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="Ex: Comprovante verificado com sucesso..." 
                rows={3} 
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setSelectedRequest(null); setActionType(null); }}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className={actionType === 'reject' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
