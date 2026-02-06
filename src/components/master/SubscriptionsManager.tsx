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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DollarSign,
  Calendar,
  Shield,
  Building,
  Mail,
  Loader2,
  Search,
  Power,
  Users,
  Trash2,
  Tag,
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
    id: number;
    company_name: string;
    max_members: number;
  } | null;
  userRole?: string | null;
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
  const [showMemberLimitModal, setShowMemberLimitModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<SubscriptionWithRelations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [newPrice, setNewPrice] = useState("");
  const [priceReason, setPriceReason] = useState("");
  const [newExpiry, setNewExpiry] = useState("");
  const [expiryReason, setExpiryReason] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [newMemberLimit, setNewMemberLimit] = useState("");
  const [memberLimitReason, setMemberLimitReason] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [couponDiscountType, setCouponDiscountType] = useState("percentage");
  const [couponDiscountValue, setCouponDiscountValue] = useState("");
  const [couponDescription, setCouponDescription] = useState("");

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

      // Fetch profiles, companies and roles separately
      const userIds = subs?.map((s) => s.user_id) || [];
      const companyIds = subs?.map((s) => s.company_id).filter(Boolean) || [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, name")
        .in("user_id", userIds);

      const { data: companies } = await supabase
        .from("companies")
        .select("id, company_name, max_members")
        .in("id", companyIds as number[]);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      // Combine data
      const enrichedSubs: SubscriptionWithRelations[] = (subs || []).map((sub) => ({
        ...sub,
        profile: profiles?.find((p) => p.user_id === sub.user_id) || null,
        company: companies?.find((c) => c.id === sub.company_id) || null,
        userRole: roles?.find((r) => r.user_id === sub.user_id)?.role || null,
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

  const handleChangeMemberLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub?.company?.id || !newMemberLimit || !memberLimitReason) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc("master_change_member_limit", {
        company_id_input: selectedSub.company.id,
        new_limit_input: parseInt(newMemberLimit),
        reason_input: memberLimitReason,
      });

      if (error) throw error;

      toast({ title: "Limite de membros alterado com sucesso!" });
      setShowMemberLimitModal(false);
      resetForms();
      fetchSubscriptions();
    } catch (error) {
      console.error("Error changing member limit:", error);
      toast({ title: "Erro ao alterar limite de membros", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedSub || !deleteReason) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc("master_delete_user", {
        user_id_input: selectedSub.user_id,
        reason_input: deleteReason,
      });

      if (error) throw error;

      toast({ title: "Usuário excluído com sucesso!" });
      setShowDeleteModal(false);
      resetForms();
      fetchSubscriptions();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({ 
        title: "Erro ao excluir usuário", 
        description: error.message || "Tente novamente",
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !couponDiscountValue) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("master_create_individual_coupon", {
        p_user_id: selectedSub.user_id,
        p_discount_type: couponDiscountType,
        p_discount_value: parseFloat(couponDiscountValue),
        p_description: couponDescription || null,
      });

      if (error) throw error;

      toast({ 
        title: "Cupom criado com sucesso!", 
        description: `Código: ${data}`,
      });
      setShowCouponModal(false);
      resetForms();
    } catch (error: any) {
      console.error("Error creating coupon:", error);
      toast({ 
        title: "Erro ao criar cupom", 
        description: error.message || "Tente novamente",
        variant: "destructive" 
      });
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
    setNewMemberLimit("");
    setMemberLimitReason("");
    setDeleteReason("");
    setCouponDiscountType("percentage");
    setCouponDiscountValue("");
    setCouponDescription("");
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

  const getRoleBadge = (role: string | null | undefined) => {
    switch (role) {
      case "ADMIN":
        return <Badge className="bg-purple-500/20 text-purple-400">Admin</Badge>;
      case "VENDEDOR":
        return <Badge className="bg-blue-500/20 text-blue-400">Vendedor</Badge>;
      case "PRODUCAO":
        return <Badge className="bg-orange-500/20 text-orange-400">Produção</Badge>;
      case "NENHUM":
        return <Badge className="bg-gray-500/20 text-gray-400">Pendente</Badge>;
      default:
        return <Badge variant="secondary">—</Badge>;
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
                <TableHead>Categoria</TableHead>
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
                    {getRoleBadge(sub.userRole)}
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
                      {sub.company && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedSub(sub);
                            setNewMemberLimit((sub.company?.max_members || 5).toString());
                            setShowMemberLimitModal(true);
                          }}
                          title="Limite de membros"
                        >
                          <Users className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedSub(sub);
                          setShowCouponModal(true);
                        }}
                        title="Criar cupom individual"
                      >
                        <Tag className="h-4 w-4 text-cyan-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedSub(sub);
                          setShowDeleteModal(true);
                        }}
                        title="Excluir usuário"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Modal Alterar Limite de Membros */}
      <Dialog open={showMemberLimitModal} onOpenChange={setShowMemberLimitModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Limite de Membros</DialogTitle>
            <DialogDescription>
              {selectedSub?.company?.company_name} - Limite atual:{" "}
              {selectedSub?.company?.max_members || 5} membros
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangeMemberLimit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newMemberLimit">Novo Limite de Membros *</Label>
              <Input
                id="newMemberLimit"
                type="number"
                min="1"
                max="50"
                value={newMemberLimit}
                onChange={(e) => setNewMemberLimit(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Mínimo 1, máximo 50 membros</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberLimitReason">Motivo *</Label>
              <Textarea
                id="memberLimitReason"
                value={memberLimitReason}
                onChange={(e) => setMemberLimitReason(e.target.value)}
                placeholder="Ex: Solicitação do cliente, upgrade de plano..."
                required
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowMemberLimitModal(false);
                  resetForms();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedSub?.company?.id}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Criar Cupom Individual */}
      <Dialog open={showCouponModal} onOpenChange={setShowCouponModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Cupom Individual</DialogTitle>
            <DialogDescription>
              Criar cupom exclusivo para {selectedSub?.profile?.name} ({selectedSub?.profile?.email})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCoupon} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="couponDiscountType">Tipo de Desconto *</Label>
              <Select value={couponDiscountType} onValueChange={setCouponDiscountType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                  <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="couponDiscountValue">
                Valor do Desconto *{" "}
                {couponDiscountType === "percentage" ? "(%)" : "(R$)"}
              </Label>
              <Input
                id="couponDiscountValue"
                type="number"
                step={couponDiscountType === "percentage" ? "1" : "0.01"}
                min="0"
                max={couponDiscountType === "percentage" ? "100" : undefined}
                value={couponDiscountValue}
                onChange={(e) => setCouponDiscountValue(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="couponDescription">Descrição (opcional)</Label>
              <Textarea
                id="couponDescription"
                value={couponDescription}
                onChange={(e) => setCouponDescription(e.target.value)}
                placeholder="Ex: Cupom de fidelidade, desconto especial..."
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCouponModal(false);
                  resetForms();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar Cupom
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Exclusão */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Excluir Usuário Permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a excluir o usuário{" "}
                <strong>{selectedSub?.profile?.name}</strong> ({selectedSub?.profile?.email}).
              </p>
              <p className="font-semibold text-destructive">
                Esta ação é IRREVERSÍVEL e excluirá:
              </p>
              <ul className="list-disc list-inside text-sm">
                <li>Perfil do usuário</li>
                <li>Assinatura e histórico de pagamentos</li>
                <li>Permissões e roles</li>
                <li>Conta de autenticação</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="deleteReason">Motivo da exclusão *</Label>
            <Textarea
              id="deleteReason"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Ex: Solicitação do usuário, conta duplicada..."
              required
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteModal(false);
              resetForms();
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isSubmitting || !deleteReason}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubscriptionsManager;
