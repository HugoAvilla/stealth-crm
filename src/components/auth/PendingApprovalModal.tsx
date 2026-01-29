import { AlertCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import wfeLogo from '@/assets/wfe-logo.png';

export function PendingApprovalModal() {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center space-y-6">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img 
            src={wfeLogo} 
            alt="WFE Evolution" 
            className="h-16 w-auto object-contain"
          />
        </div>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-warning" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold">
          Conta Pendente de Aprovação
        </h1>

        {/* Description */}
        <div className="space-y-2 text-muted-foreground">
          <p>
            Sua conta foi criada com sucesso, mas está aguardando aprovação de um administrador.
          </p>
          <p>
            Você receberá acesso ao sistema assim que sua conta for aprovada.
          </p>
        </div>

        {/* User info */}
        {user?.email && (
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Conta registrada:</p>
            <p className="font-medium">{user.email}</p>
          </div>
        )}

        {/* Logout button */}
        <Button
          variant="outline"
          onClick={signOut}
          className="w-full"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );
}
