// @ts-nocheck
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { usePlanGate } from "@/hooks/usePlanGate";
import { useToast } from "@/components/ui/use-toast";
import { MessageSquare, Plus, Bot, Loader2, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TriggerConfigModal } from "@/components/atendimento/TriggerConfigModal";
import { CreateBotDialog } from "@/components/atendimento/CreateBotDialog";
import { InboxView } from "@/components/atendimento/inbox/InboxView";
import {
  useChatbotFlows,
  useUpdateChatbotFlow,
  useDeleteChatbotFlow,
} from "@/hooks/useChatbotFlows";

const TRIGGER_LABELS: Record<string, string> = {
  keyword: "Palavra-chave",
  new_conversation: "Nova conversa",
  stage_entry: "Entrada na etapa",
  manual: "Manual",
};

function triggerLabel(flow: any): string {
  const trigger = flow?.flow_schema?.nodes?.find((n: any) => n.type === "trigger");
  const t = trigger?.data?.triggerType;
  return TRIGGER_LABELS[t] ?? "Sem gatilho";
}

export default function Atendimento() {
  const { hasAccess, redirectTo, message } = usePlanGate("ia");
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: flows = [], isLoading } = useChatbotFlows();
  const updateFlow = useUpdateChatbotFlow();
  const deleteFlow = useDeleteChatbotFlow();

  useEffect(() => {
    if (!hasAccess && redirectTo) {
      if (message) {
        toast({ title: "Acesso Restrito", description: message, variant: "destructive" });
      }
      navigate(redirectTo);
    }
  }, [hasAccess, redirectTo, message, navigate, toast]);

  if (!hasAccess) return null;

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Excluir o bot "${name}"? Esta ação não pode ser desfeita.`)) {
      deleteFlow.mutate(id);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Atendimento & Automação</h1>
          <p className="text-muted-foreground mt-1">Gerencie chats ao vivo e bots de automação</p>
        </div>
      </div>

      <Tabs defaultValue="inbox" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-fit mb-4">
          <TabsTrigger value="inbox">Inbox Ao Vivo</TabsTrigger>
          <TabsTrigger value="bots">Salesbots</TabsTrigger>
          <TabsTrigger value="templates">Modelos de Chat</TabsTrigger>
        </TabsList>

        {/* ---------------- INBOX (Fase 2) ---------------- */}
        <TabsContent value="inbox" className="flex-1 min-h-0 m-0">
          <InboxView />
        </TabsContent>

        {/* ---------------- SALESBOTS ---------------- */}
        <TabsContent value="bots" className="flex-1 min-h-0 m-0 bg-transparent">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold">Salesbots</h2>
              <p className="text-sm text-muted-foreground">
                Crie bots sem código para automatizar conversas e tarefas rotineiras.
              </p>
            </div>
            <CreateBotDialog
              triggerElement={
                <Button className="gap-2">
                  <Plus className="w-4 h-4" /> Criar Bot
                </Button>
              }
            />
          </div>

          <div className="rounded-md border bg-background overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NOME</TableHead>
                  <TableHead>GATILHO</TableHead>
                  <TableHead className="text-center">ATIVO</TableHead>
                  <TableHead className="text-right">TOTAL LANÇADO</TableHead>
                  <TableHead className="text-right">SESSÕES ATIVAS</TableHead>
                  <TableHead className="w-24 text-right">AÇÕES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Carregando bots…
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && flows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Bot className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="font-medium text-foreground">Nenhum bot ainda</p>
                      <p className="text-sm">Clique em "Criar Bot" para montar seu primeiro fluxo.</p>
                    </TableCell>
                  </TableRow>
                )}

                {flows.map((flow: any) => (
                  <TableRow key={flow.id}>
                    <TableCell
                      className="font-medium text-primary cursor-pointer hover:underline"
                      onClick={() => navigate(`/atendimento/editor/${flow.id}`)}
                    >
                      {flow.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="font-normal text-xs">
                          {triggerLabel(flow)}
                        </Badge>
                        <TriggerConfigModal
                          flow={flow}
                          triggerElement={
                            <Button variant="outline" size="icon" className="h-5 w-5 ml-1 bg-muted/50 hover:bg-muted">
                              <Plus className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          }
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={!!flow.is_active}
                        onCheckedChange={(v) => updateFlow.mutate({ id: flow.id, updates: { is_active: v } })}
                      />
                    </TableCell>
                    <TableCell className="text-right">{flow.total_launched ?? 0}</TableCell>
                    <TableCell className="text-right">{flow.active_sessions ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"
                          onClick={() => navigate(`/atendimento/editor/${flow.id}`)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-destructive/80 hover:text-destructive"
                          onClick={() => handleDelete(flow.id, flow.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ---------------- TEMPLATES (Fase 3) ---------------- */}
        <TabsContent
          value="templates"
          className="flex-1 min-h-0 m-0 bg-background border rounded-lg p-6 flex flex-col items-center justify-center text-center"
        >
          <MessageSquare className="w-16 h-16 mb-4 text-primary opacity-20" />
          <h2 className="text-2xl font-semibold mb-2">Modelos de Chat</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Modelos prontos e reutilizáveis para acelerar a criação de bots. Disponível em breve.
          </p>
          <CreateBotDialog triggerElement={<Button>Criar Bot do zero</Button>} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
