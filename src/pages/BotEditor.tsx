import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { usePlanGate } from "@/hooks/usePlanGate";
import { ChevronLeft, Save, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const initialNodes = [
    { id: '1', position: { x: 250, y: 50 }, data: { label: 'Início (Gatilho: Funil X)' }, type: 'input' },
    { id: '2', position: { x: 250, y: 150 }, data: { label: '🤖 Oi, posso ajudar?' } },
    { id: '3', position: { x: 250, y: 250 }, data: { label: 'Ação: Aguarda 5 min' } },
];

const initialEdges = [
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-3', source: '2', target: '3' }
];

export default function BotEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasAccess } = usePlanGate("ia");

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback(
        (params: any) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    if (!hasAccess) return null;

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-muted/10 relative">
            <div className="flex justify-between items-center bg-background border-b px-6 py-4 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/atendimento')} className="h-8 w-8">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            Editando: <span className="text-primary">{id === 'new' ? 'Novo Robô' : id?.replace(/-/g, ' ')}</span>
                        </h1>
                        <p className="text-xs text-muted-foreground mt-1">Chatbot Flow Builder</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="h-9 gap-1 text-muted-foreground">
                        <MousePointer2 className="w-4 h-4" /> Componentes
                    </Button>
                    <Button size="sm" className="h-9 gap-2">
                        <Save className="w-4 h-4" /> Salvar Fluxo
                    </Button>
                </div>
            </div>

            <div className="flex-1 w-full h-full relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    fitView
                >
                    <Controls />
                    <MiniMap />
                    <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                </ReactFlow>
            </div>
        </div>
    );
}
