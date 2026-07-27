// @ts-nocheck
import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCorners,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MoreVertical, Trash2, Pencil, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useConversations, useUpdateConversation, type Conversation } from "@/hooks/useConversations";
import { useChatbotStages, useCreateStage, useUpdateStage, useDeleteStage } from "@/hooks/useChatbotStages";
import { useChatbotFlows } from "@/hooks/useChatbotFlows";

function Card({ conv, onOpen }: { conv: Conversation; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `conv:${conv.id}` });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium truncate">{conv.contact_name || conv.contact_phone || conv.chat_id}</span>
        {!conv.bot_paused && conv.active_flow_id && <Bot className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
      </div>
      <p className="text-xs text-muted-foreground truncate mt-1">{conv.last_message_preview || "—"}</p>
      {conv.unread_count > 0 && (
        <Badge className="h-4 min-w-4 px-1 rounded-full text-[10px] mt-2">{conv.unread_count}</Badge>
      )}
    </div>
  );
}

function Column({
  stage,
  conversations,
  flows,
  onOpen,
  onLinkBot,
  onRename,
  onDelete,
}: any) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage:${stage.id}` });
  const linkedBot = flows.find((f: any) => f.id === stage.bot_flow_id);
  return (
    <div className="w-72 shrink-0 flex flex-col bg-muted/30 rounded-xl border max-h-full">
      <div className="p-3 border-b" style={{ borderTopColor: stage.color, borderTopWidth: 3 }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: stage.color }} />
            <span className="text-sm font-semibold truncate">{stage.name}</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] shrink-0">{conversations.length}</Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"><MoreVertical className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRename(stage)}><Pencil className="w-4 h-4 mr-2" /> Renomear</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(stage)}>
                <Trash2 className="w-4 h-4 mr-2" /> Excluir etapa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Bot linked to this column */}
        <div className="mt-2">
          <Select value={stage.bot_flow_id ?? "none"} onValueChange={(v) => onLinkBot(stage, v === "none" ? null : v)}>
            <SelectTrigger className="h-7 text-[11px]">
              <SelectValue placeholder="Vincular bot…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem bot</SelectItem>
              {flows.map((f: any) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {linkedBot && (
            <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
              <Bot className="w-3 h-3" /> Dispara "{linkedBot.name}" ao entrar
            </p>
          )}
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn("flex-1 overflow-y-auto p-2 space-y-2 min-h-[80px] transition-colors", isOver && "bg-primary/5")}
      >
        {conversations.map((c: Conversation) => (
          <Card key={c.id} conv={c} onOpen={() => onOpen(c.id)} />
        ))}
        {conversations.length === 0 && (
          <p className="text-center text-[11px] text-muted-foreground py-6">Arraste conversas para cá</p>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({ onOpenConversation }: { onOpenConversation: (id: string) => void }) {
  const { data: stages = [] } = useChatbotStages();
  const { data: conversations = [] } = useConversations();
  const { data: flows = [] } = useChatbotFlows();
  const updateConversation = useUpdateConversation();
  const createStage = useCreateStage();
  const updateStage = useUpdateStage();
  const deleteStage = useDeleteStage();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const activeConv = activeId ? conversations.find((c) => c.id === activeId) : null;

  const onDragEnd = (event: any) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const convId = String(active.id).replace("conv:", "");
    const stageId = String(over.id).replace("stage:", "");
    const conv = conversations.find((c) => c.id === convId);
    if (!conv || conv.stage_id === stageId) return;

    updateConversation.mutate({ id: convId, updates: { stage_id: stageId } });

    // If the destination column has a bot linked, start it (stage-entry trigger).
    const stage = stages.find((s) => s.id === stageId);
    if (stage?.bot_flow_id && !conv.bot_paused) {
      supabase.functions
        .invoke("chatbot-start", { body: { conversationId: convId, flowId: stage.bot_flow_id } })
        .then(({ error }) => {
          if (!error) toast({ title: `Bot iniciado para ${conv.contact_name || conv.chat_id}` });
        });
    }
  };

  const handleAddColumn = () => {
    const name = window.prompt("Nome da nova etapa:");
    if (name?.trim()) createStage.mutate({ name: name.trim(), position: stages.length });
  };

  return (
    <div className="flex-1 overflow-x-auto p-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => setActiveId(String(e.active.id).replace("conv:", ""))}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex gap-4 h-full items-start">
          {stages.map((stage) => (
            <Column
              key={stage.id}
              stage={stage}
              conversations={conversations.filter((c) => c.stage_id === stage.id)}
              flows={flows}
              onOpen={onOpenConversation}
              onLinkBot={(s: any, flowId: string | null) => updateStage.mutate({ id: s.id, updates: { bot_flow_id: flowId } })}
              onRename={(s: any) => {
                const name = window.prompt("Renomear etapa:", s.name);
                if (name?.trim()) updateStage.mutate({ id: s.id, updates: { name: name.trim() } });
              }}
              onDelete={(s: any) => {
                if (window.confirm(`Excluir a etapa "${s.name}"? As conversas ficarão sem etapa.`)) deleteStage.mutate(s.id);
              }}
            />
          ))}
          <Button variant="outline" className="shrink-0 h-10 gap-2 border-dashed" onClick={handleAddColumn}>
            <Plus className="w-4 h-4" /> Etapa
          </Button>
        </div>

        <DragOverlay>
          {activeConv ? (
            <div className="rounded-lg border bg-card p-3 shadow-lg w-64">
              <span className="text-sm font-medium">{activeConv.contact_name || activeConv.chat_id}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
