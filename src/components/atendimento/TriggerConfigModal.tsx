// @ts-nocheck
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, MessageCircle, KeyRound, Columns3, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useUpdateChatbotFlow } from "@/hooks/useChatbotFlows";
import { useChatbotStages } from "@/hooks/useChatbotStages";

/**
 * "Condição de execução" (estilo Kommo). Edita o nó de gatilho do fluxo — a
 * fonte de verdade que o motor usa (matchTrigger) — e salva no chatbot_flows.
 */
export function TriggerConfigModal({ flow, triggerElement }: { flow: any; triggerElement: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const updateFlow = useUpdateChatbotFlow();
  const { data: stages = [] } = useChatbotStages();

  const triggerNode = flow?.flow_schema?.nodes?.find((n: any) => n.type === "trigger");
  const [triggerType, setTriggerType] = useState("new_conversation");
  const [keywords, setKeywords] = useState("");
  const [matchMode, setMatchMode] = useState("contains");
  const [stageId, setStageId] = useState("");

  // (re)load from the flow whenever the modal opens
  useEffect(() => {
    if (!open) return;
    const d = triggerNode?.data ?? {};
    setTriggerType(d.triggerType ?? "new_conversation");
    setKeywords((d.keywords ?? []).join(", "));
    setMatchMode(d.matchMode ?? "contains");
    setStageId(d.stageId ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = async () => {
    const schema = flow.flow_schema ?? { nodes: [], edges: [] };
    const data = {
      triggerType,
      keywords: keywords.split(",").map((s) => s.trim()).filter(Boolean),
      matchMode,
      stageId,
    };
    let nodes = schema.nodes ?? [];
    const idx = nodes.findIndex((n: any) => n.type === "trigger");
    if (idx >= 0) {
      nodes = nodes.map((n: any, i: number) => (i === idx ? { ...n, data: { ...n.data, ...data } } : n));
    } else {
      nodes = [{ id: "trigger_1", type: "trigger", position: { x: 320, y: 40 }, data }, ...nodes];
    }
    try {
      await updateFlow.mutateAsync({ id: flow.id, updates: { flow_schema: { ...schema, nodes }, triggers: data } });
      toast({ title: "Gatilho salvo" });
      setOpen(false);
    } catch {
      /* hook already toasts */
    }
  };

  const OPTIONS = [
    { id: "new_conversation", icon: MessageCircle, title: "Nova conversa", desc: "Dispara quando um cliente inicia uma conversa." },
    { id: "keyword", icon: KeyRound, title: "Palavra-chave recebida", desc: "Dispara quando a mensagem contém certas palavras." },
    { id: "stage_entry", icon: Columns3, title: "Entrada na etapa do funil", desc: "Dispara quando a conversa entra numa etapa do Kanban." },
  ];

  const SOON = [
    "Tempo exato (agendado)",
    "Diariamente (agendado)",
    "Quando um formulário é enviado",
    "Quando um email é recebido",
    "Quando uma chamada é recebida",
    "Quando o site é visitado",
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerElement}</DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Condição de execução — {flow?.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">Lançar o bot automaticamente com base na regra abaixo.</p>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Quando isso acontece</p>
            <div className="space-y-2">
              {OPTIONS.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setTriggerType(o.id)}
                  className={cn(
                    "w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                    triggerType === o.id ? "border-primary bg-primary/5" : "hover:bg-accent",
                  )}
                >
                  <o.icon className={cn("w-5 h-5 mt-0.5 shrink-0", triggerType === o.id ? "text-primary" : "text-muted-foreground")} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{o.title}</div>
                    <div className="text-xs text-muted-foreground">{o.desc}</div>
                  </div>
                  {triggerType === o.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {triggerType === "keyword" && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
              <div className="space-y-1.5">
                <Label className="text-xs">Palavras-chave (separadas por vírgula)</Label>
                <Input value={keywords} placeholder="orçamento, preço, valor" onChange={(e) => setKeywords(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Correspondência</Label>
                <Select value={matchMode} onValueChange={setMatchMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Contém a palavra</SelectItem>
                    <SelectItem value="equals">Mensagem exata</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {triggerType === "stage_entry" && (
            <div className="space-y-1.5 rounded-lg border p-3 bg-muted/20">
              <Label className="text-xs">Etapa do funil</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger><SelectValue placeholder="Selecione uma etapa" /></SelectTrigger>
                <SelectContent>
                  {stages.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Outros gatilhos</p>
            <div className="space-y-1.5 opacity-60">
              {SOON.map((label) => (
                <div key={label} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <Badge variant="secondary" className="text-[10px]">Em breve</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={updateFlow.isPending} className="gap-2">
            {updateFlow.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar gatilho
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
