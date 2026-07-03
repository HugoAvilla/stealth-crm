import { useState, useEffect } from "react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  ArrowLeftRight,
  Phone,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/logger";
import UpgradesTab from "./UpgradesTab";
import PlanPricesTab from "./PlanPricesTab";

interface Subscription {
  id: number;
  user_id: string;
  status: string;
  plan_code: string | null;
  billing_period: string | null;
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
    phone?: string | null;
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
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);

  const [showGlobalExpirationModal, setShowGlobalExpirationModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<SubscriptionWithRelations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [newPrice, setNewPrice] = useState("");
  const [priceReason, setPriceReason] = useState("");
  const [individualExpirationPeriod, setIndividualExpirationPeriod] = useState("1");
  const [expiryReason, setExpiryReason] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [expirationPeriod, setExpirationPeriod] = useState("1");
  const [newMemberLimit, setNewMemberLimit] = useState("");
  const [memberLimitReason, setMemberLimitReason] = useState("");
  const [deleteReason, setDeleteReason] = useState("");

  // Trocar plano
  const [newPlanCode, setNewPlanCode] = useState("basic");
  const [newBillingPeriod, setNewBillingPeriod] = useState("monthly");
  const [changePlanReason, setChangePlanReason] = useState("");

  const [globalExpirationPeriod, setGlobalExpirationPeriod] = useState("1");
  const [globalExpirationReason, setGlobalExpirationReason] = useState("");

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const { data: subs, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = subs?.map((s) => s.user_id) || [];
      const companyIds = subs?.map((s) => s.company_id).filter(Boolean) || [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, name, phone")
        .in("user_id", userIds);

      const { data: companies } = await supabase
        .from("companies")
        .select("id, company_name, max_members")
        .in("id", companyIds as number[]);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const enrichedSubs: SubscriptionWithRelations[] = (subs || []).map((sub) => ({
        ...sub,
        profile: profiles?.find((p) => p.user_id === sub.user_id) || null,
        company: companies?.find((c) => c.id === sub.company_id) || null,
        userRole: roles?.find((r) => r.user_id === sub.user_id)?.role || null,
      }));

      setSubscriptions(enrichedSubs);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      toast({ title: "Erro ao carregar assinaturas", variant: "destructive" });
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
    } catch (error: any) {
      console.error("Error changing price:", error);
      toast({ title: "Erro ao alterar preço", description: getFriendlyErrorMessage(error, "Não foi possível alterar o preço."), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGlobalPriceChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalPrice || !globalPriceReason) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc("master_change_global_price", {
        new_price_input: parseFloat(globalPrice),
        reason_input: globalPriceReason,
      });
      if (error) throw error;
      toast({ title: "Preço global alterado com sucesso para todas as assinaturas!" });
      setShowGlobalPriceModal(false);
      setGlobalPrice("");
      setGlobalPriceReason("");
      fetchSubscriptions();
    } catch (error: any) {
      console.error("Error changing global price:", error);
      toast({ title: "Erro ao alterar preço global", description: getFriendlyErrorMessage(error, "Não foi possível alterar o preço global."), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGlobalExpirationChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalExpirationReason) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc("master_change_global_expiration", {
        months_input: parseInt(globalExpirationPeriod),
        reason_input: globalExpirationReason,
      });
      if (error) throw error;
      toast({ title: "Expiração global alterada com sucesso para todos os usuários ativos!" });
      setShowGlobalExpirationModal(false);
      setGlobalExpirationPeriod("1");
      setGlobalExpirationReason("");
      fetchSubscriptions();
    } catch (error: any) {
      console.error("Error changing global expiration:", error);
      toast({ title: "Erro ao alterar expiração global", description: getFriendlyErrorMessage(error, "Não foi possível alterar a expiração global."), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeExpiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !individualExpirationPeriod || !expiryReason) return;

    setIsSubmitting(true);
    try {
      const expiresAt = addMonths(new Date(), parseInt(individualExpirationPeriod));
      const { error } = await supabase.rpc("master_change_expiry_date", {
        subscription_id_input: selectedSub.id,
        new_expiry_input: expiresAt.toISOString(),
        reason_input: expiryReason,
      });
      if (error) throw error;
      toast({ title: "Data de expiração alterada com sucesso!" });
      setShowExpiryModal(false);
      resetForms();
      fetchSubscriptions();
    } catch (error: any) {
      console.error("Error changing expiry:", error);
      toast({ title: "Erro ao alterar data de expiração", description: getFriendlyErrorMessage(error, "Não foi possível alterar a expiração."), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !newStatus || !statusReason) return;

    setIsSubmitting(true);
    try {
      // Change status
      const { error } = await supabase.rpc("master_toggle_subscription_status", {
        subscription_id_input: selectedSub.id,
        new_status_input: newStatus,
        reason_input: statusReason,
      });
      if (error) throw error;

      // If activating, auto-set expiration based on period
      if (newStatus === 'active') {
        const months = selectedSub.billing_period === 'annual' ? 12 : 1;
        const expiresAt = addMonths(new Date(), months);

        const { error: expiryError } = await supabase.rpc("master_change_expiry_date", {
          subscription_id_input: selectedSub.id,
          new_expiry_input: expiresAt.toISOString(),
          reason_input: `Ativação automática - período de ${months} mês(es)`,
        });
        if (expiryError) console.error("Error setting expiry:", expiryError);
      }

      toast({ title: "Status alterado com sucesso!" });
      setShowStatusModal(false);
      resetForms();
      fetchSubscriptions();
    } catch (error: any) {
      console.error("Error changing status:", error);
      toast({ title: "Erro ao alterar status", description: getFriendlyErrorMessage(error, "Não foi possível alterar o status."), variant: "destructive" });
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
    } catch (error: any) {
      console.error("Error changing member limit:", error);
      toast({ title: "Erro ao alterar limite de membros", description: getFriendlyErrorMessage(error, "Não foi possível alterar o limite de membros."), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Limites padrão por plano (dono + adicionais)
  // Basic: dono + 1 vendedor + 1 produção = 3 total
  // Ultra: dono + 2 vendedores + 2 produção = 5 total
  const getPlanDefaultLimit = (planCode: string | null) => {
    if (planCode === 'ultra') return 5; // dono + 2 vendedores + 2 produção
    return 3; // basic: dono + 1 vendedor + 1 produção
  };

  const handleChangePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !changePlanReason) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc("master_change_plan", {
        p_subscription_id: selectedSub.id,
        p_new_plan_code: newPlanCode,
        p_new_billing_period: newBillingPeriod,
        p_reason: changePlanReason,
      });
      if (error) throw error;
      toast({ title: "Plano alterado com sucesso!", description: `Plano atualizado para ${newPlanCode} (${newBillingPeriod === 'annual' ? 'Anual' : 'Mensal'}).` });
      setShowChangePlanModal(false);
      resetForms();
      fetchSubscriptions();
    } catch (error: any) {
      console.error("Error changing plan:", error);
      toast({ title: "Erro ao alterar plano", description: getFriendlyErrorMessage(error, "Não foi possível alterar o plano."), variant: "destructive" });
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
      toast({ title: "Erro ao excluir usuário", description: getFriendlyErrorMessage(error, "Não foi possível excluir o usuário."), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };



  const resetForms = () => {
    setSelectedSub(null);
    setNewPrice("");
    setPriceReason("");
    setIndividualExpirationPeriod("1");
    setExpiryReason("");
    setNewStatus("");
    setStatusReason("");
    setExpirationPeriod("1");
    setNewMemberLimit("");
    setMemberLimitReason("");
    setDeleteReason("");
    setNewPlanCode("basic");
    setNewBillingPeriod("monthly");
    setChangePlanReason("");
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
      sub.profile?.phone?.toLowerCase().includes(term) ||
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
    <Tabs defaultValue="subscriptions" className="space-y-4">
      <TabsList>
        <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
        <TabsTrigger value="upgrades">Upgrades</TabsTrigger>
        <TabsTrigger value="prices">Preços dos Planos</TabsTrigger>
      </TabsList>

      <TabsContent value="subscriptions" className="space-y-4">
        <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Gerenciar Assinaturas
              </CardTitle>
              <CardDescription>
                Altere preços, datas de expiração e status das assinaturas
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGlobalExpirationModal(true)}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Expiração Global
              </Button>
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por email, nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Plano / Ciclo</TableHead>
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
                        <p className="text-xs text-muted-foreground">{sub.profile?.email || "—"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {sub.profile?.phone ? (
                      <a
                        href={`https://wa.me/${sub.profile.phone.replace(/\D/g, "").startsWith("55") ? sub.profile.phone.replace(/\D/g, "") : `55${sub.profile.phone.replace(/\D/g, "")}`}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-emerald-500 transition-colors"
                      >
                        <Phone className="h-3 w-3 text-emerald-500" />
                        {sub.profile.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>{getRoleBadge(sub.userRole)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      {sub.company?.company_name || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium capitalize">{sub.plan_code || "Básico"}</span>
                      <span className="text-xs text-muted-foreground capitalize">{sub.billing_period === "annual" ? "Anual" : "Mensal"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono">R$ {(sub.final_price || sub.plan_price || 0).toFixed(2)}</span>
                  </TableCell>
                  <TableCell>{formatDate(sub.expires_at)}</TableCell>
                  <TableCell>{getStatusBadge(sub.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedSub(sub); setNewPlanCode(sub.plan_code || 'basic'); setNewBillingPeriod(sub.billing_period || 'monthly'); setShowChangePlanModal(true); }} title="Trocar plano">
                        <ArrowLeftRight className="h-4 w-4 text-indigo-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedSub(sub); setNewPrice((sub.plan_price || 0).toString()); setShowPriceModal(true); }} title="Alterar preço">
                        <DollarSign className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedSub(sub); setShowExpiryModal(true); }} title="Alterar expiração">
                        <Calendar className="h-4 w-4 text-purple-500" />
                      </Button>
                      {sub.company && (
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedSub(sub); setNewMemberLimit((sub.company?.max_members || getPlanDefaultLimit(sub.plan_code)).toString()); setShowMemberLimitModal(true); }} title="Ajustar limite de membros">
                          <Users className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedSub(sub); setNewStatus(sub.status); setShowStatusModal(true); }} title="Alterar status">
                        <Power className="h-4 w-4 text-orange-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedSub(sub); setShowDeleteModal(true); }} title="Excluir usuário">
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

      {/* Modal Trocar Plano */}
      <Dialog open={showChangePlanModal} onOpenChange={setShowChangePlanModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Trocar Plano do Usuário
            </DialogTitle>
            <DialogDescription>
              {selectedSub?.profile?.name} ({selectedSub?.profile?.email})<br />
              Plano atual: <strong className="capitalize">{selectedSub?.plan_code || 'basic'}</strong> • {selectedSub?.billing_period === 'annual' ? 'Anual' : 'Mensal'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePlan} className="space-y-4">
            <div className="space-y-2">
              <Label>Novo Plano *</Label>
              <Select value={newPlanCode} onValueChange={setNewPlanCode}>
                <SelectTrigger><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Básico</SelectItem>
                  <SelectItem value="ultra">Ultra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nova Periodicidade *</Label>
              <Select value={newBillingPeriod} onValueChange={setNewBillingPeriod}>
                <SelectTrigger><SelectValue placeholder="Selecione a periodicidade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border text-sm">
              <p className="font-medium mb-1">Efeitos desta ação:</p>
              <ul className="text-muted-foreground space-y-1 text-xs list-disc list-inside">
                <li>Plano e periodicidade serão atualizados imediatamente</li>
                <li>Preço será ajustado conforme tabela de planos</li>
                <li>Limite de membros: {newPlanCode === 'ultra' ? '5 (dono + 2 vendedores + 2 produção)' : '3 (dono + 1 vendedor + 1 produção)'}</li>
                <li>Ação registrada em auditoria</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="changePlanReason">Motivo *</Label>
              <Textarea id="changePlanReason" value={changePlanReason} onChange={(e) => setChangePlanReason(e.target.value)} placeholder="Ex: Upgrade manual solicitado, correção de plano..." required rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowChangePlanModal(false); resetForms(); }}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar Troca
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Expiração Global */}
      <Dialog open={showGlobalExpirationModal} onOpenChange={setShowGlobalExpirationModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Expiração Global
            </DialogTitle>
            <DialogDescription>
              Define o período de expiração para TODOS os usuários com status ativo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGlobalExpirationChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="globalExpirationPeriod">Período *</Label>
              <Select value={globalExpirationPeriod} onValueChange={setGlobalExpirationPeriod}>
                <SelectTrigger><SelectValue placeholder="Selecione o período" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Mensal (1 mês)</SelectItem>
                  <SelectItem value="2">Bimestral (2 meses)</SelectItem>
                  <SelectItem value="3">Trimestral (3 meses)</SelectItem>
                  <SelectItem value="6">Semestral (6 meses)</SelectItem>
                  <SelectItem value="12">Anual (12 meses)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Nova expiração: {format(addMonths(new Date(), parseInt(globalExpirationPeriod)), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="globalExpirationReason">Motivo *</Label>
              <Textarea id="globalExpirationReason" value={globalExpirationReason} onChange={(e) => setGlobalExpirationReason(e.target.value)} placeholder="Ex: Renovação geral, extensão promocional..." required rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowGlobalExpirationModal(false); setGlobalExpirationPeriod("1"); setGlobalExpirationReason(""); }}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Aplicar para Todos Ativos
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Alterar Preço */}
      <Dialog open={showPriceModal} onOpenChange={setShowPriceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Preço da Assinatura</DialogTitle>
            <DialogDescription>{selectedSub?.profile?.email} - Preço atual: R$ {(selectedSub?.plan_price || 0).toFixed(2)}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePrice} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPrice">Novo Preço (R$) *</Label>
              <Input id="newPrice" type="number" step="0.01" min="0" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceReason">Motivo da Alteração *</Label>
              <Textarea id="priceReason" value={priceReason} onChange={(e) => setPriceReason(e.target.value)} placeholder="Ex: Desconto promocional, ajuste comercial..." required rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowPriceModal(false); resetForms(); }}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Confirmar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Alterar Expiração */}
      <Dialog open={showExpiryModal} onOpenChange={setShowExpiryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Data de Expiração</DialogTitle>
            <DialogDescription>{selectedSub?.profile?.email} - Expira em: {formatDate(selectedSub?.expires_at || null)}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangeExpiry} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="individualExpirationPeriod">Período *</Label>
              <Select value={individualExpirationPeriod} onValueChange={setIndividualExpirationPeriod}>
                <SelectTrigger><SelectValue placeholder="Selecione o período" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Mensal (1 mês)</SelectItem>
                  <SelectItem value="2">Bimestral (2 meses)</SelectItem>
                  <SelectItem value="3">Trimestral (3 meses)</SelectItem>
                  <SelectItem value="6">Semestral (6 meses)</SelectItem>
                  <SelectItem value="12">Anual (12 meses)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Nova expiração: {format(addMonths(new Date(), parseInt(individualExpirationPeriod)), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryReason">Motivo *</Label>
              <Textarea id="expiryReason" value={expiryReason} onChange={(e) => setExpiryReason(e.target.value)} placeholder="Ex: Prorrogação por atraso, extensão promocional..." required rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowExpiryModal(false); resetForms(); }}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Confirmar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Alterar Status */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status da Assinatura</DialogTitle>
            <DialogDescription>{selectedSub?.profile?.email} - Status atual: {selectedSub?.status}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangeStatus} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newStatus">Novo Status *</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="pending_payment">Aguardando Pagamento</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Período de expiração - só aparece quando ativando */}
            {newStatus === 'active' && (
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
                <p className="text-sm font-medium">Ativação de Assinatura</p>
                <p className="text-xs text-muted-foreground">
                  A expiração será calculada automaticamente a partir de agora com base na periodicidade ({selectedSub?.billing_period === 'annual' ? 'Anual' : 'Mensal'}): {format(addMonths(new Date(), selectedSub?.billing_period === 'annual' ? 12 : 1), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="statusReason">Motivo *</Label>
              <Textarea id="statusReason" value={statusReason} onChange={(e) => setStatusReason(e.target.value)} placeholder="Ex: Liberação manual, bloqueio por inadimplência..." required rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowStatusModal(false); resetForms(); }}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Confirmar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Ajustar Limite de Membros */}
      <Dialog open={showMemberLimitModal} onOpenChange={setShowMemberLimitModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Limite de Membros</DialogTitle>
            <DialogDescription>
              {selectedSub?.company?.company_name} — Limite atual: {selectedSub?.company?.max_members || getPlanDefaultLimit(selectedSub?.plan_code || null)} membros
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangeMemberLimit} className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg border text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Limite padrão por plano:</p>
              <p>• <strong>Básico:</strong> 3 membros (dono + 1 vendedor + 1 produção) — padrão automático ao trocar plano</p>
              <p>• <strong>Ultra:</strong> 5 membros (dono + 2 vendedores + 2 produção) — padrão automático ao trocar plano</p>
              <p className="mt-1 text-yellow-500">Este campo é para ajustes pontuais. Use "Trocar Plano" para mudanças permanentes.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newMemberLimit">Limite de Membros (override manual) *</Label>
              <Input id="newMemberLimit" type="number" min="1" max="50" value={newMemberLimit} onChange={(e) => setNewMemberLimit(e.target.value)} required />
              <p className="text-xs text-muted-foreground">Padrão do plano atual ({selectedSub?.plan_code || 'basic'}): {getPlanDefaultLimit(selectedSub?.plan_code || null)} membros</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberLimitReason">Motivo do Ajuste *</Label>
              <Textarea id="memberLimitReason" value={memberLimitReason} onChange={(e) => setMemberLimitReason(e.target.value)} placeholder="Ex: Exceção comercial aprovada, conta especial..." required rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowMemberLimitModal(false); resetForms(); }}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting || !selectedSub?.company?.id}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Confirmar Override</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>



      {/* Modal Confirmar Exclusão */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Excluir Usuário Permanentemente</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Você está prestes a excluir o usuário <strong>{selectedSub?.profile?.name}</strong> ({selectedSub?.profile?.email}).</p>
              <p className="font-semibold text-destructive">Esta ação é IRREVERSÍVEL e excluirá:</p>
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
            <Textarea id="deleteReason" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="Ex: Solicitação do usuário, conta duplicada..." required rows={3} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowDeleteModal(false); resetForms(); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isSubmitting || !deleteReason} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </TabsContent>
      <TabsContent value="upgrades">
        <UpgradesTab />
      </TabsContent>
      <TabsContent value="prices">
        <PlanPricesTab />
      </TabsContent>
    </Tabs>
  );
};

export default SubscriptionsManager;
