import { BRAZIL_CALENDAR_EVENT_STYLES } from "@/lib/brazilCalendar";
import { cn } from "@/lib/utils";

export function BrazilCalendarLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {Object.entries(BRAZIL_CALENDAR_EVENT_STYLES).map(([kind, config]) => (
        <div key={kind} className="flex items-center gap-2">
          <div className={cn("h-3 w-3 rounded-sm", config.dotClass)} />
          <span>{config.legendLabel}</span>
        </div>
      ))}
    </div>
  );
}
