import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ACCENT_CLASSES } from "@/lib/chatbot/nodeCatalog";
import type { LucideIcon } from "lucide-react";

interface NodeCardProps {
  icon: LucideIcon;
  title: string;
  accent: string;
  selected?: boolean;
  children?: ReactNode;
  className?: string;
}

/** Shared visual shell for every custom flow node (handles are added by each node). */
export function NodeCard({ icon: Icon, title, accent, selected, children, className }: NodeCardProps) {
  const a = ACCENT_CLASSES[accent] ?? ACCENT_CLASSES.blue;
  return (
    <div
      className={cn(
        "rounded-xl border bg-card shadow-sm w-[240px] overflow-hidden transition-shadow",
        a.border,
        selected && cn("ring-2 shadow-md", a.ring),
        className,
      )}
    >
      <div className={cn("flex items-center gap-2 px-3 py-2 border-b", a.bg, a.border)}>
        <Icon className={cn("w-4 h-4 shrink-0", a.text)} />
        <span className="text-xs font-semibold tracking-tight text-foreground truncate">{title}</span>
      </div>
      {children && <div className="p-3 text-xs text-muted-foreground space-y-2">{children}</div>}
    </div>
  );
}

/** Small labelled marker rendered next to a right-side source handle. */
export function HandleLabel({ children, top }: { children: ReactNode; top: number }) {
  return (
    <span
      className="absolute right-3 -translate-y-1/2 text-[10px] font-medium text-muted-foreground pointer-events-none"
      style={{ top: `${top}%` }}
    >
      {children}
    </span>
  );
}
