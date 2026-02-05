import { useState } from "react";
import { Clock, User, GripVertical, MessageSquare, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pipelineItems, sales, getClientById, getVehicleById, getServiceById, type PipelineItem } from "@/lib/mockData";
import { cn, openWhatsApp } from "@/lib/utils";
import { toast } from "sonner";

const STAGES = [
  { id: 'Agendados', label: 'Agendados', color: 'bg-blue-500' },
  { id: 'Recebidos', label: 'Recebidos', color: 'bg-purple-500' },
  { id: 'Em Execução', label: 'Em Execução', color: 'bg-yellow-500' },
  { id: 'Controle Qualidade', label: 'Controle Qualidade', color: 'bg-orange-500' },
  { id: 'Pronto', label: 'Pronto', color: 'bg-green-500' },
  { id: 'Entregue', label: 'Entregue', color: 'bg-emerald-500' }
] as const;

export default function Pipeline() {
  const [items, setItems] = useState<PipelineItem[]>(pipelineItems);
  const [draggedItem, setDraggedItem] = useState<PipelineItem | null>(null);

  const handleDragStart = (e: React.DragEvent, item: PipelineItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, stage: PipelineItem['stage']) => {
    e.preventDefault();
    if (!draggedItem) return;

    const oldStage = draggedItem.stage;
    
    setItems(prev => prev.map(item => 
      item.id === draggedItem.id ? { ...item, stage } : item
    ));

    // Notify client when moved to "Pronto"
    if (stage === 'Pronto' && oldStage !== 'Pronto') {
      const sale = sales.find(s => s.id === draggedItem.sale_id);
      const client = sale ? getClientById(sale.client_id) : null;
      if (client) {
        toast.success(`Notificação enviada para ${client.name}: Veículo pronto para retirada!`);
      }
    }

    setDraggedItem(null);
  };

  const getItemsByStage = (stage: PipelineItem['stage']) => 
    items.filter(item => item.stage === stage);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <p className="text-muted-foreground">Acompanhe o fluxo de produção no formato Kanban</p>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(stage => {
          const stageItems = getItemsByStage(stage.id);

          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-72"
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, stage.id)}
            >
              <Card className="bg-card/50 border-border/50 min-h-[500px]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", stage.color)} />
                      <CardTitle className="text-sm">{stage.label}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {stageItems.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stageItems.map(item => {
                    const sale = sales.find(s => s.id === item.sale_id);
                    const client = sale ? getClientById(sale.client_id) : null;
                    const vehicle = sale ? getVehicleById(sale.vehicle_id) : null;
                    const serviceNames = sale?.services.map(id => getServiceById(id)?.name).filter(Boolean);

                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={e => handleDragStart(e, item)}
                        className={cn(
                          "p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-all relative",
                          "bg-card hover:bg-accent",
                          item.is_urgent ? "border-red-500/50" : "border-border/50",
                          draggedItem?.id === item.id && "opacity-50"
                        )}
                      >
                        {/* WhatsApp button */}
                        {client && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              openWhatsApp(client.phone);
                            }}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}

                        <div className="flex items-start justify-between mb-2 pr-8">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            {vehicle && (
                              <div>
                                <p className="font-medium text-sm">{vehicle.model}</p>
                                <p className="text-xs text-muted-foreground">{vehicle.plate}</p>
                              </div>
                            )}
                          </div>
                          {item.is_urgent && (
                            <Badge variant="destructive" className="text-[10px]">Urgente</Badge>
                          )}
                        </div>

                        <div className="space-y-2 text-xs">
                          {client && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{client.name}</span>
                            </div>
                          )}

                          {item.scheduled_time && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{item.scheduled_time}</span>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1 mt-2">
                            {serviceNames?.slice(0, 2).map((name, idx) => (
                              <Badge key={idx} variant="outline" className="text-[10px]">
                                {name}
                              </Badge>
                            ))}
                            {(serviceNames?.length || 0) > 2 && (
                              <Badge variant="outline" className="text-[10px]">
                                +{(serviceNames?.length || 0) - 2}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {stage.id === 'Pronto' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full mt-3 text-xs"
                            onClick={() => {
                              if (client) {
                                openWhatsApp(client.phone, `Olá ${client.name}, seu veículo está pronto para retirada!`);
                              }
                            }}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Notificar Cliente
                          </Button>
                        )}
                      </div>
                    );
                  })}

                  {stageItems.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-8 border-2 border-dashed border-border/50 rounded-lg">
                      Arraste um card aqui
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
