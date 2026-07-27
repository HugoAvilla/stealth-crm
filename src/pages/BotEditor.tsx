// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { usePlanGate } from "@/hooks/usePlanGate";
import { ChevronLeft, Save, Play, Loader2, Lock, Code2, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { kommoToFlowSchema } from "@/lib/chatbot/kommoImport";
import { toast } from "@/hooks/use-toast";
import { nodeTypes } from "@/components/atendimento/nodes";
import { NodeEditContext } from "@/components/atendimento/nodes/NodeEditContext";
import { NodePalette } from "@/components/atendimento/NodePalette";
import { NodeConfigPanel } from "@/components/atendimento/NodeConfigPanel";
import { WhatsAppPreview } from "@/components/atendimento/WhatsAppPreview";
import { NODE_CATALOG, PALETTE_NODES, genId } from "@/lib/chatbot/nodeCatalog";
import {
  useChatbotFlow,
  useCreateChatbotFlow,
  useUpdateChatbotFlow,
} from "@/hooks/useChatbotFlows";

const seedTrigger = () => [
  {
    id: "trigger_1",
    type: "trigger",
    position: { x: 320, y: 40 },
    data: NODE_CATALOG.trigger.defaultData(),
  },
];

const defaultEdgeOptions = {
  markerEnd: { type: MarkerType.ArrowClosed },
  style: { strokeWidth: 1.5 },
};

function EditorInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasAccess } = usePlanGate("ia");

  const { data: flow, isLoading } = useChatbotFlow(id);
  const createFlow = useCreateChatbotFlow();
  const updateFlow = useUpdateChatbotFlow();
  const { screenToFlowPosition } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState(seedTrigger());
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("Novo bot");
  const [isActive, setIsActive] = useState(false);
  const [flowId, setFlowId] = useState<string | null>(id && id !== "new" ? id : null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [addMenu, setAddMenu] = useState<any>(null);
  const initialized = useRef(false);

  // Load an existing flow once
  useEffect(() => {
    if (initialized.current) return;
    if (flow) {
      const schema = flow.flow_schema || { nodes: [], edges: [] };
      setNodes(schema.nodes?.length ? schema.nodes : seedTrigger());
      setEdges(schema.edges ?? []);
      setName(flow.name ?? "Bot");
      setIsActive(!!flow.is_active);
      setFlowId(flow.id);
      initialized.current = true;
    } else if (id === "new" && !isLoading) {
      initialized.current = true;
    }
  }, [flow, id, isLoading, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds)),
    [setEdges],
  );

  // Kommo-style "Adicionar próximo passo": drag from an output to empty canvas
  // opens a node-type menu; the chosen node is created already connected.
  const onConnectEnd = useCallback(
    (event: any, connectionState: any) => {
      if (connectionState?.isValid) return; // landed on a real target
      const source = connectionState?.fromNode?.id;
      if (!source) return;
      const point = "changedTouches" in event ? event.changedTouches[0] : event;
      const position = screenToFlowPosition({ x: point.clientX, y: point.clientY });
      setAddMenu({
        x: point.clientX,
        y: point.clientY,
        position,
        source,
        sourceHandle: connectionState?.fromHandle?.id ?? null,
      });
    },
    [screenToFlowPosition],
  );

  const addStepFromMenu = useCallback(
    (type: string) => {
      setAddMenu((menu: any) => {
        if (!menu) return null;
        const newNode = { id: genId(type), type, position: menu.position, data: NODE_CATALOG[type].defaultData() };
        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) =>
          addEdge(
            { source: menu.source, sourceHandle: menu.sourceHandle, target: newNode.id, targetHandle: null, ...defaultEdgeOptions },
            eds,
          ),
        );
        setSelectedId(newNode.id);
        return null;
      });
    },
    [setNodes, setEdges],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !NODE_CATALOG[type]) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNode = { id: genId(type), type, position, data: NODE_CATALOG[type].defaultData() };
      setNodes((nds) => nds.concat(newNode));
      setSelectedId(newNode.id);
    },
    [screenToFlowPosition, setNodes],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const updateNodeData = useCallback(
    (nodeId: string, data: any) => {
      setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data } : n)));
    },
    [setNodes],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedId(null);
    },
    [setNodes, setEdges],
  );

  // Inline node editing (Kommo-style): nodes edit themselves via context.
  const nodeEdit = useMemo(
    () => ({
      updateData: (nodeId: string, patch: any) =>
        setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n))),
      remove: deleteNode,
    }),
    [setNodes, deleteNode],
  );

  const currentSchema = useMemo(
    () => ({
      nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
      })),
    }),
    [nodes, edges],
  );

  const handleSave = async () => {
    try {
      if (flowId) {
        await updateFlow.mutateAsync({
          id: flowId,
          updates: { name, flow_schema: currentSchema, is_active: isActive },
        });
      } else {
        const created = await createFlow.mutateAsync({ name, flow_schema: currentSchema });
        setFlowId(created.id);
        navigate(`/atendimento/editor/${created.id}`, { replace: true });
      }
      toast({ title: "Fluxo salvo com sucesso" });
    } catch {
      /* mutation hooks already toast the error */
    }
  };

  const toggleActive = async (v: boolean) => {
    setIsActive(v);
    if (flowId) {
      await updateFlow.mutateAsync({ id: flowId, updates: { is_active: v } }).catch(() => setIsActive(!v));
    }
  };

  const handleImport = () => {
    let parsed: any;
    try {
      parsed = JSON.parse(importText);
    } catch {
      toast({ title: "JSON inválido", variant: "destructive" });
      return;
    }
    let schema: any = null;
    let importedName: string | null = null;
    if (parsed?.model?.positions || parsed?.positions) {
      const r = kommoToFlowSchema(parsed);
      schema = r.schema;
      importedName = r.name;
    } else if (Array.isArray(parsed?.nodes)) {
      schema = { nodes: parsed.nodes, edges: parsed.edges ?? [] };
    }
    if (!schema) {
      toast({
        title: "Formato não reconhecido",
        description: "Use um export do Kommo ou um flow_schema { nodes, edges }.",
        variant: "destructive",
      });
      return;
    }
    setNodes(schema.nodes?.length ? schema.nodes : seedTrigger());
    setEdges(schema.edges ?? []);
    if (importedName) setName(importedName);
    setImportOpen(false);
    setImportText("");
    toast({ title: "Fluxo importado", description: "Revise e clique em Salvar Fluxo." });
  };

  const handleExport = () => {
    const json = JSON.stringify(currentSchema, null, 2);
    try {
      navigator.clipboard?.writeText(json);
    } catch {
      /* ignore */
    }
    try {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name || "bot"}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
    toast({ title: "Fluxo exportado", description: "JSON copiado e baixado." });
  };

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;
  const saving = createFlow.isPending || updateFlow.isPending;

  if (!hasAccess) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-muted/10">
      <div className="flex justify-between items-center bg-background border-b px-4 py-3 z-10 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/atendimento")} className="h-8 w-8 shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 font-semibold w-56 border-transparent hover:border-input focus:border-input"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="active" checked={isActive} onCheckedChange={toggleActive} />
            <Label htmlFor="active" className="text-xs text-muted-foreground cursor-pointer">
              {isActive ? "Ativo" : "Inativo"}
            </Label>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Code2 className="w-4 h-4" /> JSON
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setImportOpen(true)}>
                <Upload className="w-4 h-4 mr-2" /> Importar JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" /> Exportar JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant={previewOpen ? "default" : "outline"}
            size="sm"
            className="h-9 gap-2"
            onClick={() => {
              setSelectedId(null);
              setPreviewOpen((v) => !v);
            }}
          >
            <Play className="w-4 h-4" /> Pré-visualizar
          </Button>
          <Button size="sm" className="h-9 gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Fluxo
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <NodePalette />

        <div className="flex-1 relative" ref={wrapperRef}>
          {previewOpen && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-background border shadow px-3 py-1.5 text-xs text-muted-foreground">
              <Lock className="w-3.5 h-3.5" /> Área de trabalho bloqueada durante a pré-visualização
            </div>
          )}
          <NodeEditContext.Provider value={nodeEdit}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onConnectEnd={onConnectEnd}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={(_, n) => setSelectedId(n.id)}
              onPaneClick={() => setSelectedId(null)}
              defaultEdgeOptions={defaultEdgeOptions}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Controls />
              <MiniMap pannable zoomable />
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            </ReactFlow>
          </NodeEditContext.Provider>

          {addMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAddMenu(null)} />
              <div
                className="fixed z-50 w-56 rounded-lg border bg-popover text-popover-foreground shadow-lg overflow-hidden"
                style={{ left: Math.min(addMenu.x, window.innerWidth - 240), top: Math.min(addMenu.y, window.innerHeight - 320) }}
              >
                <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground border-b">
                  Adicionar próximo passo
                </div>
                <div className="max-h-72 overflow-y-auto py-1">
                  {PALETTE_NODES.map((n) => (
                    <button
                      key={n.type}
                      onClick={() => addStepFromMenu(n.type)}
                      className="w-full flex items-start gap-2.5 px-3 py-1.5 text-left hover:bg-accent"
                    >
                      <n.icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{n.label}</span>
                        <span className="block text-[11px] text-muted-foreground leading-tight">{n.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {previewOpen ? (
          <WhatsAppPreview schema={currentSchema} onClose={() => setPreviewOpen(false)} />
        ) : selectedNode ? (
          <NodeConfigPanel
            node={selectedNode}
            allNodes={nodes}
            onChange={updateNodeData}
            onDelete={deleteNode}
            onClose={() => setSelectedId(null)}
          />
        ) : null}
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar fluxo (JSON)</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cole um export do Kommo ou um flow_schema no formato {"{ nodes, edges }"}.
          </p>
          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={10}
            className="font-mono text-xs"
            placeholder='{"model":{"positions":"..."}}  ou  {"nodes":[...],"edges":[...]}'
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button onClick={handleImport} disabled={!importText.trim()}>Importar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BotEditor() {
  return (
    <ReactFlowProvider>
      <EditorInner />
    </ReactFlowProvider>
  );
}
