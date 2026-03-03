import { useState, useEffect } from "react";
import { User, LogOut, Edit, Lock, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HelpOverlay } from "@/components/help/HelpOverlay";
import { EditInfoModal } from "@/components/perfil/EditInfoModal";
import { ChangePasswordModal } from "@/components/perfil/ChangePasswordModal";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Subscription {
  id: number;
  plan_name: string | null;
  expires_at: string | null;
  status: string;
}

export default function Perfil() {
  const { user, signOut } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from("subscriptions")
        .select("id, plan_name, expires_at, status")
        .eq("user_id", user.id)
        .single();

      if (data) setSubscription(data);
    };

    fetchSubscription();
  }, [user?.id]);

  const handleLogout = () => {
    signOut();
    toast.success("Você saiu da sua conta");
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const userName = user?.profile?.name || user?.email?.split('@')[0] || 'Usuário';
  const userAvatar = user?.profile?.avatar_url;

  // Calculate days remaining
  const daysRemaining = subscription?.expires_at
    ? Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'Administrador', variant: 'default' as const };
      case 'VENDEDOR':
        return { label: 'Vendedor', variant: 'secondary' as const };
      case 'PRODUCAO':
        return { label: 'Produção', variant: 'outline' as const };
      default:
        return { label: 'Pendente', variant: 'destructive' as const };
    }
  };

  const roleBadge = getRoleBadge(user?.role || 'NENHUM');

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      <HelpOverlay
        tabId="perfil"
        title="Guia do Perfil"
        sections={[
          {
            title: "Editar Informações",
            description: "Clique em 'Editar' no card principal para alterar seu nome e foto de perfil. Sua foto é exibida no topo do painel e nos documentos gerados pelo sistema.",
            screenshotUrl: "/help/help-perfil-editar.png"
          },
          {
            title: "Alterar Senha",
            description: "No card 'Senha', clique para alterar sua senha de acesso. Para sua segurança, é recomendado usar uma senha forte com letras, números e caracteres especiais.",
            screenshotUrl: "/help/help-perfil-senha.png"
          },
          {
            title: "Assinatura e Plano",
            description: "Na seção 'Assinatura' você vê seu plano atual, a data de expiração e quantos dias restam. Quando o plano estiver perto de expirar, o sistema emitirá um alerta.",
            screenshotUrl: "/help/help-perfil-assinatura.png"
          },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações e preferências</p>
      </div>

      {/* Profile Card */}
      <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-primary/30">
              <AvatarImage src={userAvatar || undefined} />
              <AvatarFallback className="text-xl bg-primary/20">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{userName}</h2>
              <p className="text-muted-foreground">{user?.email}</p>
              <Badge className="mt-2" variant={roleBadge.variant}>
                {roleBadge.label}
              </Badge>
            </div>
            <Button variant="outline" onClick={() => setShowEditModal(true)}>
              <Edit className="h-4 w-4 mr-2" /> Editar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4">
        {/* Logout */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <button
              onClick={handleLogout}
              className="flex items-center justify-between w-full group"
            >
              <div className="flex items-center gap-3">
                <LogOut className="h-5 w-5 text-red-500" />
                <div className="text-left">
                  <p className="font-medium">Sair da Conta</p>
                  <p className="text-xs text-muted-foreground">Encerrar sessão</p>
                </div>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Subscription */}
      {subscription && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" /> Assinatura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Plano {subscription.plan_name || 'WFE Evolution CRM'}</p>
                {subscription.expires_at && (
                  <p className="text-sm text-muted-foreground">
                    Expira em {format(new Date(subscription.expires_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                )}
              </div>
              <div className="text-right">
                {daysRemaining !== null && (
                  <>
                    <p className={`text-3xl font-bold ${daysRemaining > 0 ? 'text-primary' : 'text-destructive'}`}>
                      {daysRemaining > 0 ? daysRemaining : 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {daysRemaining > 0 ? 'dias restantes' : 'Expirado'}
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/50 cursor-pointer hover:bg-accent transition-colors" onClick={() => setShowEditModal(true)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Informações</p>
                <p className="font-medium">Alterar dados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 cursor-pointer hover:bg-accent transition-colors" onClick={() => setShowPasswordModal(true)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Senha</p>
                <p className="font-medium">Alterar senha</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 cursor-pointer hover:bg-accent transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Contrato</p>
                <p className="font-medium">Ver termos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <EditInfoModal open={showEditModal} onOpenChange={setShowEditModal} />
      <ChangePasswordModal open={showPasswordModal} onOpenChange={setShowPasswordModal} />
    </div>
  );
}
