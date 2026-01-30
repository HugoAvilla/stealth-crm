import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Calendar,
  Shield,
  Building,
  Mail,
  Loader2,
  Search,
  Power,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Subscription {
  id: number;
  user_id: string;
  status: string;
  plan_name: string | null;
  plan_price: number | null;
  final_price: number | null;
  expires_at: string | null;
  created_at: string | null;
  company_id: number | null;
}

interface SubscriptionWithRelations extends Subscription {
  profile?: {
    email: string;
    name: string;
  } | null;
  company?: {
    company_name: string;
  } | null;
}

const SubscriptionsManager = () => {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<SubscriptionWithRelations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [newPrice, setNewPrice] = useState("");
  const [priceReason, setPriceReason] = useState("");
  const [newExpiry, setNewExpiry] = useState("");
  const [expiryReason, setExpiryReason] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      // Fetch subscriptions with related profile and company
      const { data: subs, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles and companies separately
      const userIds = subs?.map((s) => s.user_id) || [];
      const companyIds = subs?.map((s) => s.company_id).filter(Boolean) || [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, name")
        .in("user_id", userIds);

      const { data: companies } = await supabase
        .from("companies")
        .select("id, company_name")
        .in("id", companyIds as number[]);

      // Combine data
      const enrichedSubs: SubscriptionWithRelations[] = (subs || []).map((sub) => ({
        ...sub,
        profile: profiles?.find((p) => p.user_id === sub.user_id) || null,
        company: companies?.find((c) => c.id === sub.company_id) || null,
      }));

      setSubscriptions(enrichedSubs);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      toast({
        title: "Erro ao carregar assinaturas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !newPrice || !priceReason) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc("master_change_subscription_price", {
        subscription_id_input: selectedSub.id,
        new_price_input: parseFloat(newPrice),
        reason_input: priceReason,
      });

      if (error) throw error;

      toast({ title: "Preço alterado com sucesso!" });
      setShowPriceModal(false);
      resetForms();
      fetchSubscriptions();
    } catch (error) {
      console.error("Error changing price:", error);
      toast({ title: "Erro ao alterar preço", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeExpiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !newExpiry || !expiryReason) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc("master_change_expiry_date", {
        subscription_id_input: selectedSub.id,
        new_expiry_input: new Date(newExpiry).toISOString(),
        reason_input: expiryReason,
      });

      if (error) throw error;

      toast({ title: "Data de expiração alterada com sucesso!" });
      setShowExpiryModal(false);
      resetForms();
      fetchSubscriptions();
    } catch (error) {
      console.error("Error changing expiry:", error);
      toast({ title: "Erro ao alterar data de expiração", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !newStatus || !statusReason) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc("master_toggle_subscription_status", {
        subscription_id_input: selectedSub.id,
        new_status_input: newStatus,
        reason_input: statusReason,
      });

      if (error) throw error;

      toast({ title: "Status alterado com sucesso!" });
      setShowStatusModal(false);
      resetForms();
      fetchSubscriptions();
    } catch (error) {
      console.error("Error changing status:", error);
      toast({ title: "Erro ao alterar status", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForms = () => {
    setSelectedSub(null);
    setNewPrice("");
    setPriceReason("");
    setNewExpiry("");
    setExpiryReason("");
    setNewStatus("");
    setStatusReason("");
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Sem limite";
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success/20 text-success">Ativo</Badge>;
      case "expired":
        return <Badge variant="destructive">Expirado</Badge>;
      case "pending_payment":
        return <Badge className="bg-yellow-500/20 text-yellow-500">Aguardando Pagamento</Badge>;
      case "payment_submitted":
        return <Badge className="bg-blue-500/20 text-blue-500">Pagamento Enviado</Badge>;
      case "blocked":
        return <Badge variant="destructive">Bloqueado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const term = searchTerm.toLowerCase();
    return (
      sub.profile?.email?.toLowerCase().includes(term) ||
      sub.profile?.name?.toLowerCase().includes(term) ||
      sub.company?.company_name?.toLowerCase().includes(term)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Gerenciar Assinaturas
              </CardTitle>
              <CardDescription>
                Altere preços, datas de expiração e status das assinaturas
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email, nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{sub.profile?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {sub.profile?.email || "—"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      {sub.company?.company_name || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono">
                      R$ {(sub.final_price || sub.plan_price || 0).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(sub.expires_at)}</TableCell>
                  <TableCell>{getStatusBadge(sub.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedSub(sub);
                          setNewPrice((sub.plan_price || 0).toString());
                          setShowPriceModal(true);
                        }}
                        title="Alterar preço"
                      >
                        <DollarSign className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedSub(sub);
                          setShowExpiryModal(true);
                        }}
                        title="Alterar expiração"
                      >
                        <Calendar className="h-4 w-4 text-purple-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedSub(sub);
                          setNewStatus(sub.status);
                          setShowStatusModal(true);
                        }}
                        title="Alterar status"
                      >
                        <Power className="h-4 w-4 text-orange-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Alterar Preço */}
      <Dialog open={showPriceModal} onOpenChange={setShowPriceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Preço da Assinatura</DialogTitle>
            <DialogDescription>
              {selectedSub?.profile?.email} - Preço atual: R${" "}
              {(selectedSub?.plan_price || 0).toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePrice} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPrice">Novo Preço (R$) *</Label>
              <Input
                id="newPrice"
                type="number"
                step="0.01"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceReason">Motivo da Alteração *</Label>
              <Textarea
                id="priceReason"
                value={priceReason}
                onChange={(e) => setPriceReason(e.target.value)}
                placeholder="Ex: Desconto promocional, ajuste comercial..."
                required
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPriceModal(false);
                  resetForms();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Alterar Expiração */}
      <Dialog open={showExpiryModal} onOpenChange={setShowExpiryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Data de Expiração</DialogTitle>
            <DialogDescription>
              {selectedSub?.profile?.email} - Expira em:{" "}
              {formatDate(selectedSub?.expires_at || null)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangeExpiry} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newExpiry">Nova Data de Expiração *</Label>
              <Input
                id="newExpiry"
                type="datetime-local"
                value={newExpiry}
                onChange={(e) => setNewExpiry(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryReason">Motivo *</Label>
              <Textarea
                id="expiryReason"
                value={expiryReason}
                onChange={(e) => setExpiryReason(e.target.value)}
                placeholder="Ex: Prorrogação por atraso, extensão promocional..."
                required
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowExpiryModal(false);
                  resetForms();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Alterar Status */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status da Assinatura</DialogTitle>
            <DialogDescription>
              {selectedSub?.profile?.email} - Status atual: {selectedSub?.status}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangeStatus} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newStatus">Novo Status *</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="pending_payment">Aguardando Pagamento</SelectItem>
                  <SelectItem value="payment_submitted">Pagamento Enviado</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="statusReason">Motivo *</Label>
              <Textarea
                id="statusReason"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Ex: Liberação manual, bloqueio por inadimplência..."
                required
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowStatusModal(false);
                  resetForms();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionsManager;
