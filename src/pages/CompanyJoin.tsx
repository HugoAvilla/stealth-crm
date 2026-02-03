import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Send, Clock, Building2, ArrowLeft, LogOut, RefreshCw } from 'lucide-react';

export default function CompanyJoin() {
  const { user, refreshUser, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [companyCode, setCompanyCode] = useState('');
  const [selectedRole, setSelectedRole] = useState<'VENDEDOR' | 'PRODUCAO'>('VENDEDOR');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingRequest, setIsCheckingRequest] = useState(true);
  const [requestSent, setRequestSent] = useState(false);
  const [foundCompany, setFoundCompany] = useState<{ id: number; company_name: string } | null>(null);
  const [pendingRequest, setPendingRequest] = useState<any>(null);

  useEffect(() => {
    // Redirect if user already has company
    if (user?.companyId) {
      navigate('/');
      return;
    }
    // Check for existing pending request
    checkExistingRequest();
  }, [user, navigate]);

  // Supabase Realtime subscription for approval updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('join-request-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'company_join_requests',
          filter: `requester_user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newStatus = (payload.new as any).status;
          if (newStatus === 'approved') {
            toast({
              title: 'Solicitação aprovada!',
              description: 'Você foi aceito na empresa. Redirecionando...',
            });
            // Wait a moment then refresh
            setTimeout(async () => {
              await refreshUser();
              navigate('/');
            }, 1500);
          } else if (newStatus === 'rejected') {
            toast({
              title: 'Solicitação rejeitada',
              description: (payload.new as any).rejected_reason || 'Sua solicitação foi rejeitada.',
              variant: 'destructive',
            });
            setPendingRequest(null);
            setRequestSent(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refreshUser, navigate, toast]);

  const checkExistingRequest = async () => {
    if (!user) return;
    
    setIsCheckingRequest(true);
    try {
      const { data, error } = await supabase
        .from('company_join_requests')
        .select(`
          *,
          companies:company_id (company_name)
        `)
        .eq('requester_user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (!error && data) {
        setPendingRequest(data);
      }
    } catch (error) {
      console.error('Error checking existing request:', error);
    } finally {
      setIsCheckingRequest(false);
    }
  };

  const handleCodeChange = async (value: string) => {
    const code = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCompanyCode(code);
    setFoundCompany(null);

    if (code.length === 6) {
      // Search for company by code
      const { data, error } = await supabase
        .rpc('get_company_by_code', { code_input: code });

      if (!error && data && data.length > 0) {
        setFoundCompany({ id: data[0].id, company_name: data[0].company_name });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !foundCompany) return;

    setIsLoading(true);

    try {
      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from('company_join_requests')
        .select('id, status')
        .eq('requester_user_id', user.id)
        .eq('company_id', foundCompany.id)
        .maybeSingle();

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          toast({
            title: 'Solicitação já existe',
            description: 'Você já possui uma solicitação pendente para esta empresa.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
        if (existingRequest.status === 'rejected') {
          toast({
            title: 'Solicitação rejeitada anteriormente',
            description: 'Sua solicitação anterior foi rejeitada. Entre em contato com o administrador.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
      }

      // Create join request
      const { error } = await supabase
        .from('company_join_requests')
        .insert({
          company_id: foundCompany.id,
          requester_user_id: user.id,
          requester_name: user.profile?.name || user.email,
          requester_email: user.email,
          requested_role: selectedRole,
          status: 'pending',
        });

      if (error) throw error;

      setRequestSent(true);
      toast({
        title: 'Solicitação enviada!',
        description: 'O administrador da empresa será notificado.',
      });

    } catch (error: any) {
      console.error('Error creating join request:', error);
      toast({
        title: 'Erro ao enviar solicitação',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!pendingRequest) return;

    try {
      await supabase
        .from('company_join_requests')
        .delete()
        .eq('id', pendingRequest.id);

      setPendingRequest(null);
      setRequestSent(false);
      toast({
        title: 'Solicitação cancelada',
      });
    } catch (error) {
      console.error('Error canceling request:', error);
    }
  };

  const handleBackToLogin = async () => {
    await signOut();
    navigate('/login');
  };

  if (isCheckingRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show pending request screen
  if (pendingRequest || requestSent) {
    const companyName = pendingRequest?.companies?.company_name || foundCompany?.company_name;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 py-8 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Aguardando Aprovação</CardTitle>
              <CardDescription>
                Sua solicitação para entrar em <strong>{companyName}</strong> foi enviada.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Aguardando resposta em tempo real...</span>
              </div>
              <p className="text-sm text-muted-foreground">
                O administrador da empresa receberá sua solicitação e poderá aprová-la ou rejeitá-la.
                Você será redirecionado automaticamente quando aprovado.
              </p>
              <div className="space-y-2 pt-4">
                <Button
                  variant="outline"
                  onClick={handleCancelRequest}
                  className="w-full"
                >
                  Cancelar Solicitação
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleBackToLogin}
                  className="w-full text-muted-foreground"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair e Voltar ao Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 py-8 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center relative">
            <div className="mx-auto mb-4 w-16 h-16 rounded-xl bg-primary flex items-center justify-center mt-2">
              <Users className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Entrar em uma Empresa</CardTitle>
            <CardDescription>
              Digite o código fornecido pelo administrador da empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Code */}
              <div className="space-y-2">
                <Label htmlFor="companyCode">Código da Empresa *</Label>
                <Input
                  id="companyCode"
                  value={companyCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="ABC123"
                  className="text-center font-mono text-2xl tracking-widest"
                  maxLength={6}
                  required
                />
                {companyCode.length === 6 && !foundCompany && (
                  <p className="text-sm text-destructive">Código não encontrado</p>
                )}
                {foundCompany && (
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <Building2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">
                      {foundCompany.company_name}
                    </span>
                  </div>
                )}
              </div>

              {/* Role Selection */}
              <div className="space-y-3">
                <Label>Solicitar acesso como *</Label>
                <RadioGroup
                  value={selectedRole}
                  onValueChange={(value) => setSelectedRole(value as 'VENDEDOR' | 'PRODUCAO')}
                  className="space-y-3"
                >
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="VENDEDOR" id="vendedor" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="vendedor" className="font-medium cursor-pointer">
                        Vendedor
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Acesso a vendas, clientes, financeiro e dashboard
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="PRODUCAO" id="producao" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="producao" className="font-medium cursor-pointer">
                        Produção
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Acesso ao estoque e movimentação de materiais
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading || !foundCompany}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Solicitação
                  </>
                )}
              </Button>
            </form>

            {/* Navigation buttons */}
            <div className="mt-6 space-y-2">
              <Button
                variant="outline"
                onClick={() => navigate('/empresa/cadastro')}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Criar Minha Própria Empresa
              </Button>
              <Button
                variant="ghost"
                onClick={handleBackToLogin}
                className="w-full text-muted-foreground"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair e Voltar ao Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
