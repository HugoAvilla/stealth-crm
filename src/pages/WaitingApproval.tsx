import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, ArrowLeft, Send } from 'lucide-react';

export default function WaitingApproval() {
  const { user, refreshUser, signOut } = useAuth();
  const navigate = useNavigate();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user?.subscriptionStatus === 'active') {
      if (user.companyId) {
        navigate('/');
      } else {
        navigate('/empresa/cadastro');
      }
      return;
    }

    if (user?.subscriptionStatus === 'pending_payment') {
      navigate('/assinatura');
      return;
    }

    if (user?.subscriptionStatus === 'blocked') {
      navigate('/login');
      return;
    }

    intervalRef.current = setInterval(async () => {
      await refreshUser();
    }, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, refreshUser, navigate]);

  useEffect(() => {
    if (user?.subscriptionStatus === 'active') {
      if (user.companyId) {
        navigate('/');
      } else {
        navigate('/empresa/cadastro');
      }
    }
  }, [user?.subscriptionStatus, user?.companyId, navigate]);


  const userName = user?.profile?.name || user?.email?.split('@')[0] || '';
  const userEmail = user?.email || '';

  const whatsappMessage = encodeURIComponent(
    `Olá, fiz o pagamento da plataforma CRM WFE, segue o comprovante do pagamento e aguardo a liberação para uso da plataforma.\nNome: ${userName}\nEmail: ${userEmail}`
  );
  const whatsappUrl = `https://wa.me/5517992573141?text=${whatsappMessage}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para login
          </Button>
          <div className="mx-auto mb-4">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <Clock className="h-10 w-10 text-primary animate-pulse" />
            </div>
          </div>
          <CardTitle className="text-2xl">Aguardando liberação</CardTitle>
          <CardDescription>
            A liberação da plataforma é feita manualmente pelo nosso suporte. Envie seu comprovante de pagamento para agilizar o processo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Progress Steps */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-sm">Pagamento informado</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Clock className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <span className="text-sm text-muted-foreground">Aguardando liberação pelo suporte</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xs text-muted-foreground">3</span>
              </div>
              <span className="text-sm text-muted-foreground">Cadastrar empresa</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-4">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-10 rounded-md bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
            >
              <Send className="h-4 w-4" />
              Enviar Comprovante via WhatsApp
            </a>
          </div>

          {/* Info */}
          <p className="text-xs text-center text-muted-foreground">
            Após enviar o comprovante, aguarde a liberação pelo nosso suporte via WhatsApp.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
