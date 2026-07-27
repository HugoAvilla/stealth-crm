import { PALETTE_NODES, ACCENT_CLASSES } from "@/lib/chatbot/nodeCatalog";
import { cn } from "@/lib/utils";

/**
 * Left rail of draggable node types. Drag a card onto the canvas to add a node.
 * The BotEditor reads `application/reactflow` from the drag payload on drop.
 */
export function NodePalette() {
  return (
    <div className="w-56 shrink-0 border-r bg-background flex flex-col">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Componentes</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Arraste para o fluxo</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {PALETTE_NODES.map((n) => {
          const a = ACCENT_CLASSES[n.accent] ?? ACCENT_CLASSES.blue;
          const Icon = n.icon;
          return (
            <div
              key={n.type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/reactflow", n.type);
                e.dataTransfer.effectAllowed = "move";
              }}
              className={cn(
                "flex items-start gap-2.5 p-2.5 rounded-lg border bg-card cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow",
                a.border,
              )}
            >
              <div className={cn("mt-0.5 p-1.5 rounded-md shrink-0", a.bg)}>
                <Icon className={cn("w-4 h-4", a.text)} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground">{n.label}</div>
                <div className="text-[10px] text-muted-foreground leading-tight">{n.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
