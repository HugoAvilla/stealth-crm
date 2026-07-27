import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, X } from "lucide-react";
import { NODE_CATALOG, ACTION_LABELS, OPERATOR_LABELS, genId } from "@/lib/chatbot/nodeCatalog";
import type { FlowNode } from "@/lib/chatbot/engine";

interface Props {
  node: FlowNode | null;
  allNodes: FlowNode[];
  onChange: (id: string, data: any) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function NodeConfigPanel({ node, allNodes, onChange, onDelete, onClose }: Props) {
  if (!node) return null;
  const meta = NODE_CATALOG[node.type];
  const d: any = node.data || {};
  const set = (patch: any) => onChange(node.id, { ...d, ...patch });

  return (
    <div className="w-80 shrink-0 border-l bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          {meta && <meta.icon className="w-4 h-4 text-muted-foreground" />}
          <h3 className="text-sm font-semibold">{meta?.label ?? node.type}</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ---------------- TRIGGER ---------------- */}
        {node.type === "trigger" && (
          <>
            <Field label="Tipo de gatilho">
              <Select value={d.triggerType} onValueChange={(v) => set({ triggerType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_conversation">Nova conversa</SelectItem>
                  <SelectItem value="keyword">Palavra-chave</SelectItem>
                  <SelectItem value="stage_entry">Entrada na etapa</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {d.triggerType === "keyword" && (
              <>
                <Field label="Palavras-chave (separadas por vírgula)">
                  <Input
                    value={(d.keywords ?? []).join(", ")}
                    onChange={(e) => set({ keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    placeholder="orçamento, preço, valor"
                  />
                </Field>
                <Field label="Correspondência">
                  <Select value={d.matchMode ?? "contains"} onValueChange={(v) => set({ matchMode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Contém a palavra</SelectItem>
                      <SelectItem value="equals">Mensagem exata</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </>
            )}
            {d.triggerType === "stage_entry" && (
              <Field label="ID da etapa (Kanban)">
                <Input value={d.stageId ?? ""} onChange={(e) => set({ stageId: e.target.value })} />
              </Field>
            )}
          </>
        )}

        {/* ---------------- MESSAGE ---------------- */}
        {node.type === "message" && (
          <>
            <Field label="Texto da mensagem">
              <Textarea rows={4} value={d.text ?? ""} onChange={(e) => set({ text: e.target.value })} />
            </Field>
            <Separator />
            <div className="flex items-center justify-between">
              <Label className="text-xs">Botões de resposta rápida</Label>
              <Button
                variant="ghost" size="sm" className="h-7 gap-1 text-xs"
                onClick={() => set({ buttons: [...(d.buttons ?? []), { id: genId("btn"), label: "" }] })}
              >
                <Plus className="w-3 h-3" /> Botão
              </Button>
            </div>
            <div className="space-y-2">
              {(d.buttons ?? []).map((b: any, i: number) => (
                <div key={b.id} className="flex items-center gap-1.5">
                  <Input
                    className="h-8 text-xs"
                    value={b.label}
                    placeholder={`Botão ${i + 1}`}
                    onChange={(e) => {
                      const buttons = [...d.buttons];
                      buttons[i] = { ...b, label: e.target.value };
                      set({ buttons });
                    }}
                  />
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground"
                    onClick={() => set({ buttons: d.buttons.filter((_: any, j: number) => j !== i) })}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {(d.buttons?.length ?? 0) === 0 && (
                <p className="text-[11px] text-muted-foreground">Sem botões: a mensagem segue direto para o próximo nó.</p>
              )}
            </div>
            <Separator />
            <Field label="Anexo (URL, opcional)">
              <Input
                value={d.attachments?.[0]?.url ?? ""}
                placeholder="https://…/imagem.jpg"
                onChange={(e) =>
                  set({ attachments: e.target.value ? [{ type: "image", url: e.target.value }] : [] })
                }
              />
            </Field>
          </>
        )}

        {/* ---------------- QUESTION ---------------- */}
        {node.type === "question" && (
          <>
            <Field label="Pergunta">
              <Textarea rows={3} value={d.text ?? ""} onChange={(e) => set({ text: e.target.value })} />
            </Field>
            <Field label="Guardar resposta na variável">
              <Input value={d.variable ?? ""} placeholder="nome" onChange={(e) => set({ variable: e.target.value })} />
            </Field>
            <Field label="Validação">
              <Select value={d.validation ?? "text"} onValueChange={(v) => set({ validation: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </>
        )}

        {/* ---------------- CONDITION ---------------- */}
        {node.type === "condition" && (
          <>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Regras (avaliadas em ordem)</Label>
              <Button
                variant="ghost" size="sm" className="h-7 gap-1 text-xs"
                onClick={() => set({ rules: [...(d.rules ?? []), { id: genId("rule"), variable: "", operator: "equals", value: "" }] })}
              >
                <Plus className="w-3 h-3" /> Regra
              </Button>
            </div>
            <div className="space-y-3">
              {(d.rules ?? []).map((r: any, i: number) => (
                <div key={r.id} className="rounded-lg border p-2.5 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground">Regra {i + 1}</span>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground"
                      onClick={() => set({ rules: d.rules.filter((_: any, j: number) => j !== i) })}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <Input
                    className="h-8 text-xs" placeholder="variável" value={r.variable}
                    onChange={(e) => updateRule(d, set, i, { variable: e.target.value })}
                  />
                  <Select value={r.operator} onValueChange={(v) => updateRule(d, set, i, { operator: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(OPERATOR_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {r.operator !== "exists" && (
                    <Input
                      className="h-8 text-xs" placeholder="valor" value={r.value ?? ""}
                      onChange={(e) => updateRule(d, set, i, { value: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ---------------- WAIT ---------------- */}
        {node.type === "wait" && (
          <>
            <Field label="Modo">
              <Select value={d.mode} onValueChange={(v) => set({ mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reply">Aguardar resposta do cliente</SelectItem>
                  <SelectItem value="delay">Aguardar tempo</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {d.mode === "delay" && (
              <Field label="Segundos">
                <Input
                  type="number" value={d.durationSeconds ?? 0}
                  onChange={(e) => set({ durationSeconds: Number(e.target.value) })}
                />
              </Field>
            )}
          </>
        )}

        {/* ---------------- ACTION ---------------- */}
        {node.type === "action" && (
          <>
            <Field label="Tipo de ação">
              <Select value={d.actionType} onValueChange={(v) => set({ actionType: v, params: {} })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTION_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <ActionParams actionType={d.actionType} params={d.params || {}} onParams={(params) => set({ params })} />
          </>
        )}

        {/* ---------------- GOTO ---------------- */}
        {node.type === "goto" && (
          <Field label="Ir para o nó">
            <Select value={d.targetNodeId ?? ""} onValueChange={(v) => set({ targetNodeId: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione um nó" /></SelectTrigger>
              <SelectContent>
                {allNodes.filter((n) => n.id !== node.id && n.type !== "trigger").map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {NODE_CATALOG[n.type]?.label} · {(n.data as any)?.text?.slice(0, 24) || n.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        {/* ---------------- END ---------------- */}
        {node.type === "end" && (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-xs">Entregar ao atendente</Label>
              <p className="text-[11px] text-muted-foreground">Pausa o bot para atendimento humano.</p>
            </div>
            <Switch checked={!!d.handoff} onCheckedChange={(v) => set({ handoff: v })} />
          </div>
        )}
      </div>

      <div className="p-4 border-t">
        {node.type !== "trigger" && (
          <Button variant="outline" className="w-full gap-2 text-destructive" onClick={() => onDelete(node.id)}>
            <Trash2 className="w-4 h-4" /> Excluir nó
          </Button>
        )}
      </div>
    </div>
  );
}

function updateRule(d: any, set: (p: any) => void, i: number, patch: any) {
  const rules = [...d.rules];
  rules[i] = { ...rules[i], ...patch };
  set({ rules });
}

function ActionParams({
  actionType,
  params,
  onParams,
}: {
  actionType: string;
  params: any;
  onParams: (p: any) => void;
}) {
  const p = params || {};
  const set = (patch: any) => onParams({ ...p, ...patch });
  switch (actionType) {
    case "set_tag":
    case "remove_tag":
      return <Field label="Tag"><Input value={p.tag ?? ""} onChange={(e) => set({ tag: e.target.value })} /></Field>;
    case "change_stage":
      return <Field label="ID da etapa (Kanban)"><Input value={p.stageId ?? ""} onChange={(e) => set({ stageId: e.target.value })} /></Field>;
    case "assign_user":
      return <Field label="ID do responsável"><Input value={p.userId ?? ""} onChange={(e) => set({ userId: e.target.value })} /></Field>;
    case "add_note":
      return <Field label="Texto da nota"><Textarea rows={3} value={p.text ?? ""} onChange={(e) => set({ text: e.target.value })} /></Field>;
    case "set_field":
      return (
        <>
          <Field label="Campo"><Input value={p.field ?? ""} onChange={(e) => set({ field: e.target.value })} /></Field>
          <Field label="Valor"><Input value={p.value ?? ""} onChange={(e) => set({ value: e.target.value })} /></Field>
        </>
      );
    case "send_webhook":
      return <Field label="URL do webhook"><Input value={p.url ?? ""} placeholder="https://…" onChange={(e) => set({ url: e.target.value })} /></Field>;
    default:
      return null;
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
