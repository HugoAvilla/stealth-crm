import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { usePlanGate } from "@/hooks/usePlanGate";
import { useToast } from "@/components/ui/use-toast";
import { MessageSquare, Plus, Bot, Power, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { TriggerConfigModal } from "@/components/atendimento/TriggerConfigModal";
import { CreateBotDialog } from "@/components/atendimento/CreateBotDialog";

export default function Atendimento() {
    const { hasAccess, redirectTo, message } = usePlanGate("ia");
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        if (!hasAccess && redirectTo) {
            if (message) {
                toast({ title: "Acesso Restrito", description: message, variant: "destructive" });
            }
            navigate(redirectTo);
        }
    }, [hasAccess, redirectTo, message, navigate, toast]);

    if (!hasAccess) return null;

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Atendimento & Automação</h1>
                    <p className="text-muted-foreground mt-1">Gerencie chats ao vivo e modelos de inteligência</p>
                </div>
            </div>

            <Tabs defaultValue="inbox" className="flex-1 flex flex-col min-h-0">
                <TabsList className="w-fit mb-4">
                    <TabsTrigger value="inbox">Inbox Ao Vivo</TabsTrigger>
                    <TabsTrigger value="bots">Salesbots</TabsTrigger>
                    <TabsTrigger value="templates">Modelos de Chat</TabsTrigger>
                </TabsList>

                <TabsContent value="inbox" className="flex-1 min-h-0 m-0">
                    <div className="flex h-full gap-6">
                        <div className="w-1/3 bg-background border rounded-lg overflow-hidden flex flex-col">
                            <div className="p-4 border-b bg-muted/30 font-medium flex justify-between items-center">
                                Pipeline
                            </div>
                            <div className="flex-1 p-4 overflow-y-auto">
                                <div className="text-center text-sm text-muted-foreground mt-4">
                                    Nenhuma conversa no momento.
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 bg-background border rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                            <Bot className="w-12 h-12 mb-4 opacity-20" />
                            <p>Selecione uma conversa para assumir o atendimento</p>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="bots" className="flex-1 min-h-0 m-0 bg-transparent p-6 pt-2">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-semibold">Salesbots</h2>
                            <p className="text-sm text-muted-foreground">Crie bots sem código para automatizar chats e tarefas rotineiras.</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline">Importar</Button>
                            <CreateBotDialog triggerElement={
                                <Button className="gap-2"><Plus className="w-4 h-4" /> Criar Bot</Button>
                            } />
                        </div>
                    </div>

                    <div className="rounded-md border bg-background overflow-hidden flex flex-col shadow-sm">
                        <div className="flex gap-4 p-2.5 border-b bg-muted/5 border-border/50">
                            <Button variant="ghost" size="sm" className="h-8 gap-2 text-destructive/80 hover:text-destructive hover:bg-destructive/10">
                                <Power className="w-4 h-4" /> Desligar
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-foreground">
                                <RotateCcw className="w-4 h-4" /> Resetar estatísticas
                            </Button>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12"><Checkbox /></TableHead>
                                    <TableHead>NOME</TableHead>
                                    <TableHead>GATILHOS</TableHead>
                                    <TableHead className="text-right">TAXA DE CONVERSÃO</TableHead>
                                    <TableHead className="text-right">TOTAL LANÇADO</TableHead>
                                    <TableHead className="text-right">SESSÕES ATIVAS</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell><Checkbox /></TableCell>
                                    <TableCell className="font-medium text-primary cursor-pointer hover:underline" onClick={() => navigate('/atendimento/editor/robo-de-nps')}>
                                        Robô de NPS
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Badge variant="secondary" className="font-normal text-xs">Conversa fechada</Badge>
                                            <span className="text-muted-foreground ml-1 font-bold">...</span>
                                            <TriggerConfigModal
                                                botName="Robô de NPS"
                                                triggerElement={
                                                    <Button variant="outline" size="icon" className="h-5 w-5 ml-1 bg-muted/50 hover:bg-muted">
                                                        <Plus className="h-3 w-3 text-muted-foreground" />
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">0%</TableCell>
                                    <TableCell className="text-right">0</TableCell>
                                    <TableCell className="text-right">0</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Checkbox /></TableCell>
                                    <TableCell className="font-medium text-primary cursor-pointer hover:underline" onClick={() => navigate('/atendimento/editor/bot-de-boas-vindas')}>
                                        Bot de boas-vindas
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Badge variant="secondary" className="font-normal text-xs">Contato inicial</Badge>
                                            <span className="text-muted-foreground ml-1 font-bold">...</span>
                                            <TriggerConfigModal
                                                botName="Bot de boas-vindas"
                                                triggerElement={
                                                    <Button variant="outline" size="icon" className="h-5 w-5 ml-1 bg-muted/50 hover:bg-muted">
                                                        <Plus className="h-3 w-3 text-muted-foreground" />
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">45%</TableCell>
                                    <TableCell className="text-right">12</TableCell>
                                    <TableCell className="text-right">2</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="templates" className="flex-1 min-h-0 m-0 bg-background border rounded-lg p-6 flex flex-col items-center justify-center text-center">
                    <MessageSquare className="w-16 h-16 mb-4 text-primary opacity-20" />
                    <h2 className="text-2xl font-semibold mb-2">Modelos de Chat</h2>
                    <p className="text-muted-foreground mb-6 max-w-md">
                        Crie modelos para enviar mensagens mais rápido e manter a consistência na comunicação via WhatsApp.
                    </p>
                    <div className="flex gap-4">
                        <Button>Conectar WhatsApp Business</Button>
                        <Button variant="outline">Adicionar Novo Modelo Geral</Button>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
