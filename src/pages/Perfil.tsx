import { useState } from "react";
import { User, LogOut, Edit, Lock, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EditInfoModal } from "@/components/perfil/EditInfoModal";
import { ChangePasswordModal } from "@/components/perfil/ChangePasswordModal";
import { toast } from "sonner";

export default function Perfil() {
  const { user, signOut } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleLogout = () => {
    signOut();
    toast.success("Você saiu da sua conta");
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const userName = user?.profile?.name || user?.email?.split('@')[0] || 'Usuário';
  const userAvatar = user?.profile?.avatar_url;

  // Mock subscription data
  const subscription = {
    plan: "Pro",
    daysLeft: 25,
    expiresAt: "2026-02-20"
  };

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
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" /> Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Plano {subscription.plan}</p>
              <p className="text-sm text-muted-foreground">
                Expira em {format(new Date(subscription.expiresAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">{subscription.daysLeft}</p>
              <p className="text-xs text-muted-foreground">dias restantes</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
