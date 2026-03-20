import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X, Clock, Users, UserPlus, AlertCircle, AlertTriangle, UserMinus } from 'lucide-react';
import { HelpOverlay } from '@/components/help/HelpOverlay';
import { RejectRequestModal } from '@/components/team/RejectRequestModal';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface JoinRequest {
  id: number;
  requester_name: string;
  requester_email: string;
  requester_user_id: string;
  requested_role: string;
  status: string;
  created_at: string;
  rejected_reason: string | null;
  approved_at: string | null;
}

interface CompanyLimits {
  max_members: number;
  current_members: number;
}

export default function TeamRequests() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [limits, setLimits] = useState<CompanyLimits>({ max_members: 5, current_members: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [unlinkModalOpen, setUnlinkModalOpen] = useState(false);
  const [memberToUnlink, setMemberToUnlink] = useState<JoinRequest | null>(null);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<JoinRequest | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user?.companyId) return;

    setIsLoading(true);
    try {
      // Fetch requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('company_join_requests')
        .select('*')
        .eq('company_id', user.companyId)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      setRequests(requestsData || []);

      // Fetch company limits
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('max_members')
        .eq('id', user.companyId)
        .single();

      if (companyError) throw companyError;

      // Count current members
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.companyId);

      if (countError) throw countError;

      setLimits({
        max_members: companyData?.max_members || 5,
        current_members: count || 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro ao carregar dados',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isLimitReached = limits.current_members >= limits.max_members;

  const handleApprove = async (requestId: number) => {
    if (isLimitReached) {
      toast({
        title: 'Limite atingido',
        description: `Sua empresa já possui ${limits.current_members} de ${limits.max_members} membros.`,
        variant: 'destructive',
      });
      return;
    }

    setProcessingId(requestId);
    try {
      const { error } = await supabase.rpc('approve_company_join_request', {
        request_id_input: requestId,
      });

      if (error) throw error;

      toast({
        title: 'Solicitação aprovada!',
        description: 'O usuário agora tem acesso ao sistema.',
      });

      fetchData();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: 'Erro ao aprovar',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (reason: string) => {
    if (!selectedRequest) return;

    try {
      const { error } = await supabase.rpc('reject_company_join_request', {
        request_id_input: selectedRequest.id,
        reason_input: reason || null,
      });

      if (error) throw error;

      toast({
        title: 'Solicitação rejeitada',
      });

      fetchData();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Erro ao rejeitar',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    }
  };

  const openRejectModal = (request: JoinRequest) => {
    setSelectedRequest(request);
    setRejectModalOpen(true);
  };

  const openUnlinkModal = (request: JoinRequest) => {
    setMemberToUnlink(request);
    setUnlinkModalOpen(true);
  };

  const openDeleteModal = (request: JoinRequest) => {
    setRequestToDelete(request);
    setDeleteModalOpen(true);
  };

  const handleUnlinkMember = async () => {
    if (!memberToUnlink) return;

    setUnlinkLoading(true);
    try {
      const { error } = await supabase.rpc('unlink_company_member', {
        target_user_id: memberToUnlink.requester_user_id,
      });

      if (error) throw error;

      toast({
        title: 'Membro desvinculado',
        description: `${memberToUnlink.requester_name} foi removido da empresa.`,
      });

      setUnlinkModalOpen(false);
      setMemberToUnlink(null);
      fetchData();
    } catch (error: any) {
      console.error('Error unlinking member:', error);
      toast({
        title: 'Erro ao desvincular',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setUnlinkLoading(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!requestToDelete) return;

    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('company_join_requests')
        .delete()
        .eq('id', requestToDelete.id);

      if (error) throw error;

      toast({
        title: 'Registro apagado',
        description: 'A solicitação foi removida do histórico.',
      });

      setDeleteModalOpen(false);
      setRequestToDelete(null);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting request:', error);
      toast({
        title: 'Erro ao apagar',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HelpOverlay
        tabId="solicitacoes"
        title="Guia de Solicitações"
        sections={[
          {
            title: "Vídeo Aula — Solicitações",
            description: "Assista ao vídeo tutorial completo para aprender a gerenciar as solicitações de acesso da sua equipe.",
            videoUrl: "/help/video-aula-solicitacoes.mov"
          },
          {
            title: "Aprovar Solicitações",
            description: "Quando um colaborador usa o código da empresa para solicitar acesso, a solicitação aparece na seção 'Pendentes'. Clique em 'Aprovar' para dar acesso ao sistema. Verifique o nome e cargo solicitado antes de aprovar.",
            screenshotUrl: "/help/help-solicitacoes-aprovar.png"
          },
          {
            title: "Rejeitar Solicitações",
            description: "Se a pessoa não deveria ter acesso, clique em 'Rejeitar'. Você pode informar um motivo para a rejeição. A pessoa será notificada que seu acesso foi negado.",
            screenshotUrl: "/help/help-solicitacoes-rejeitar.png"
          },
          {
            title: "Desvincular Membros",
            description: "No histórico de solicitações aprovadas, use o botão 'Desvincular' para remover um membro que não faz mais parte da equipe. O membro perderá acesso ao sistema imediatamente.",
            screenshotUrl: "/help/help-solicitacoes-desvincular.png"
          },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserPlus className="h-6 w-6" />
          Solicitações de Acesso
        </h1>
        <p className="text-muted-foreground">
          Gerencie as solicitações para entrar na sua equipe ({limits.current_members}/{limits.max_members} membros)
        </p>
      </div>

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-yellow-500" />
            Pendentes
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingRequests.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Solicitações aguardando sua aprovação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Limit Warning */}
          {isLimitReached && pendingRequests.length > 0 && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm">
                Limite de membros atingido ({limits.current_members}/{limits.max_members}).
                Aumente o limite em <span className="font-medium">Empresa &gt; Configurar</span> para aprovar novas solicitações.
              </p>
            </div>
          )}
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Nenhuma solicitação pendente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{request.requester_name}</span>
                      <Badge
                        variant={request.requested_role === 'VENDEDOR' ? 'default' : 'secondary'}
                      >
                        {request.requested_role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {request.requester_email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Solicitado em {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id || isLimitReached}
                      title={isLimitReached ? 'Limite de membros atingido' : 'Aprovar solicitação'}
                    >
                      {processingId === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Aprovar
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openRejectModal(request)}
                      disabled={processingId === request.id}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {processedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico</CardTitle>
            <CardDescription>
              Solicitações já processadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processedRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{request.requester_name}</span>
                      <Badge variant="outline">
                        {request.requested_role}
                      </Badge>
                      <Badge
                        variant={request.status === 'approved' ? 'default' : 'destructive'}
                        className={request.status === 'approved' ? 'bg-green-500' : ''}
                      >
                        {request.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {request.requester_email}
                    </p>
                    {request.rejected_reason && (
                      <div className="flex items-start gap-1 mt-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>Motivo: {request.rejected_reason}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {request.status === 'approved' && request.approved_at
                        ? `Aprovado em ${format(new Date(request.approved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
                        : `Processado em ${format(new Date(request.created_at), "dd/MM/yyyy", { locale: ptBR })}`
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Unlink button for approved members */}
                    {request.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => openUnlinkModal(request)}
                      >
                        <UserMinus className="h-4 w-4 mr-1" />
                        Desvincular
                      </Button>
                    )}
                    
                    {/* Delete button (ex: to clean up rejected history) */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => openDeleteModal(request)}
                      title="Apagar do histórico"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reject Modal */}
      <RejectRequestModal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setSelectedRequest(null);
        }}
        onConfirm={handleReject}
        requesterName={selectedRequest?.requester_name || ''}
      />

      {/* Unlink Confirmation Dialog */}
      <AlertDialog open={unlinkModalOpen} onOpenChange={setUnlinkModalOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desvincular <strong>{memberToUnlink?.requester_name}</strong> da empresa?
              <br /><br />
              O usuário perderá acesso ao sistema e precisará solicitar nova entrada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border" disabled={unlinkLoading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlinkMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={unlinkLoading}
            >
              {unlinkLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Desvinculando...
                </>
              ) : (
                'Desvincular'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar registro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar a solicitação de <strong>{requestToDelete?.requester_name}</strong> do histórico?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border" disabled={deleteLoading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRequest}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Apagando...
                </>
              ) : (
                'Apagar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
