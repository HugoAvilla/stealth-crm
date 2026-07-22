import * as React from "react"
import { Clock } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TimePickerProps {
    value: string
    onChange: (time: string) => void
    placeholder?: string
}

export function TimePicker({ value, onChange, placeholder = "Selecione a hora" }: TimePickerProps) {
    const [open, setOpen] = React.useState(false)
    const [hour, setHour] = React.useState<string>(value ? value.split(":")[0] : "")

    React.useEffect(() => {
        if (value) {
            setHour(value.split(":")[0])
        }
    }, [value])

    const hours = Array.from({ length: 24 }).map((_, i) => i.toString().padStart(2, "0"))
    const minutes = Array.from({ length: 60 }).map((_, i) => i.toString().padStart(2, "0"))

    const handleHourClick = (h: string) => {
        setHour(h)
        const m = value ? value.split(":")[1] : "00"
        onChange(`${h}:${m}`)
    }

    const handleMinuteClick = (m: string) => {
        const h = hour || (value ? value.split(":")[0] : "00")
        onChange(`${h}:${m}`)
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !value && "text-muted-foreground"
                    )}
                >
                    <Clock className="mr-2 h-4 w-4" />
                    {value || placeholder}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-0" align="start">
                <div className="flex h-56">
                    <div
                        className="w-1/2 overflow-y-auto border-r border-border nav-scrollbar"
                        onWheel={(e) => e.stopPropagation()}
                        onTouchMove={(e) => e.stopPropagation()}
                    >
                        <div className="p-1">
                            <div className="text-xs font-semibold text-center text-muted-foreground py-2 sticky top-0 bg-popover/90 backdrop-blur-sm">Hora</div>
                            {hours.map((h) => (
                                <div
                                    key={h}
                                    onClick={() => handleHourClick(h)}
                                    className={cn(
                                        "cursor-pointer rounded-sm px-2 py-1.5 text-center text-sm hover:bg-accent hover:text-accent-foreground",
                                        hour === h && "bg-primary text-primary-foreground font-semibold hover:bg-primary"
                                    )}
                                >
                                    {h}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div
                        className="w-1/2 overflow-y-auto nav-scrollbar"
                        onWheel={(e) => e.stopPropagation()}
                        onTouchMove={(e) => e.stopPropagation()}
                    >
                        <div className="p-1">
                            <div className="text-xs font-semibold text-center text-muted-foreground py-2 sticky top-0 bg-popover/90 backdrop-blur-sm">Min.</div>
                            {minutes.map((m) => {
                                const currentM = value ? value.split(":")[1] : ""
                                return (
                                    <div
                                        key={m}
                                        onClick={() => handleMinuteClick(m)}
                                        className={cn(
                                            "cursor-pointer rounded-sm px-2 py-1.5 text-center text-sm hover:bg-accent hover:text-accent-foreground",
                                            currentM === m && hour && "bg-primary text-primary-foreground font-semibold hover:bg-primary"
                                        )}
                                    >
                                        {m}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
