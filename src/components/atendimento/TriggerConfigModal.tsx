import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Trash2, ChevronDown, Calendar, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const ActionLink = ({
    label,
    options,
    customInput = false,
    selected,
    onChange
}: {
    label: string,
    options: string[],
    customInput?: boolean,
    selected?: string,
    onChange?: (val: string) => void
}) => {
    const selectedValue = selected || label;
    const [h, setH] = useState("");
    const [m, setM] = useState("");

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="text-[#427DFA] hover:underline cursor-pointer outline-none">{label}</DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[150px]">
                {options.map((opt) => (
                    <DropdownMenuItem
                        key={opt}
                        className="flex items-center gap-2 cursor-pointer focus:bg-[#d2f300] focus:text-black"
                        onClick={() => {
                            if (onChange) onChange(opt);
                        }}
                    >
                        <div className="w-4 flex items-center justify-center">
                            {opt === selectedValue && <Check className="w-4 h-4" />}
                        </div>
                        <span>{opt}</span>
                    </DropdownMenuItem>
                ))}
                {customInput && (
                    <div
                        className="flex items-center gap-1.5 px-2 py-1.5 mt-1 text-[13px] rounded-sm cursor-default"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span className="mr-1 text-muted-foreground shrink-0">Selecione o intervalo</span>
                        <input
                            type="number"
                            className="w-9 border border-input rounded text-center h-[26px] text-[13px] bg-background outline-none focus:ring-1 focus:ring-primary shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                            min="0" max="23" placeholder="h"
                            value={h} onChange={(e) => setH(e.target.value)}
                        />
                        <input
                            type="number"
                            className="w-9 border border-input rounded text-center h-[26px] text-[13px] bg-background outline-none focus:ring-1 focus:ring-primary shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                            min="0" max="59" placeholder="m"
                            value={m} onChange={(e) => setM(e.target.value)}
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-[26px] w-[26px] shrink-0 text-black hover:bg-black/5"
                            onClick={() => {
                                if (h && m && onChange) {
                                    const formatted = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
                                    onChange(formatted);
                                }
                            }}
                        >
                            <Check className="w-4 h-4 text-foreground/70" />
                        </Button>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export function TriggerConfigModal({ botName, triggerElement }: { botName: string, triggerElement: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [selectedStages, setSelectedStages] = useState<string[]>([]);
    const [activeHours, setActiveHours] = useState<{ id: string, days: string[], startTime: string, endTime: string }[]>([
        { id: Math.random().toString(), days: [], startTime: "10:00", endTime: "19:00" }
    ]);

    const STAGES = [
        { id: "leads_entrada", name: "Leads de entrada", color: "#b8b9ba" },
        { id: "contato_inicial", name: "Contato inicial", color: "#99ccff" },
        { id: "discussoes", name: "Discussões", color: "#ffff99" },
        { id: "tomada_decisao", name: "Tomada de decisão", color: "#ffcc66" },
        { id: "discussao_contrato", name: "Discussão de contrato", color: "#ffcccc" },
        { id: "fechado_ganho", name: "Fechado - ganho", color: "#ccff66" },
        { id: "fechado_perdido", name: "Fechado - perdido", color: "#d8d8d8" },
    ];

    const toggleStage = (id: string, checked: boolean | 'indeterminate') => {
        if (checked === true) {
            setSelectedStages(prev => [...prev, id]);
        } else if (checked === false) {
            setSelectedStages(prev => prev.filter(s => s !== id));
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {triggerElement}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-normal">Condição de execução <span className="font-semibold">{botName}</span></DialogTitle>
                    <DialogDescription>
                        Lançar bots automaticamente com base nas regras definidas abaixo
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-5 py-4">
                    <div className="space-y-2">
                        <Label>Quando isso acontece:</Label>
                        <Popover modal={true}>
                            <PopoverTrigger asChild>
                                <div className="border rounded-md px-3 py-2 text-sm max-w-full hover:bg-muted/50 cursor-pointer flex justify-between items-center transition-colors bg-background">
                                    <span className="font-medium">Na transição / Entrada no funil</span>
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-[500px] p-0 max-h-[400px] overflow-y-auto" align="start">
                                <div className="bg-muted/50 text-xs font-bold text-muted-foreground px-3 py-2 uppercase tracking-wide">
                                    Gatilhos do pipeline
                                </div>
                                <div className="flex flex-col text-sm">
                                    <div className="px-3 py-2 hover:bg-muted transition-colors border-b border-border/50">
                                        <ActionLink label="Imediatamente" options={["Imediatamente", "Depois de 5 minutos", "Depois de 10 minutos", "Um dia"]} customInput={true} /> quando criado em uma etapa de funil
                                    </div>
                                    <div className="px-3 py-2 hover:bg-muted transition-colors border-b border-border/50">
                                        <ActionLink label="Imediatamente" options={["Imediatamente", "Depois de 5 minutos", "Depois de 10 minutos", "Um dia"]} customInput={true} /> quando lead passa para um etapa de funil
                                    </div>
                                    <div className="px-3 py-2 hover:bg-muted transition-colors border-b border-border/50">
                                        <ActionLink label="Imediatamente" options={["Imediatamente", "Depois de 5 minutos", "Depois de 10 minutos", "Um dia"]} customInput={true} /> quando lead movido ou criado em uma etapa de funil
                                    </div>
                                    <div className="px-3 py-2 hover:bg-muted transition-colors border-b border-border/50">
                                        Quando o usuário responsável é alterado em lead
                                    </div>
                                    <div className="px-3 py-2 hover:bg-muted transition-colors border-b border-border/50 flex flex-wrap items-center gap-1">
                                        Quando um usuário <ActionLink label="adiciona" options={["adiciona", "remove"]} /> uma tag em <ActionLink label="lead" options={["lead", "contato", "empresa"]} /> : <Badge variant="outline" className="text-[10px] h-5 py-0 px-1 font-normal bg-background/50">#adicionar tags</Badge>
                                    </div>
                                    <div className="px-3 py-2 hover:bg-muted transition-colors">
                                        Quando um campo em <ActionLink label="produtos" selected="Produtos" options={["Produtos", "contato", "empresa", "lead"]} /> é atualizado: <ActionLink label="SKU" options={["SKU", "Grupo", "Preço", "Descrição", "External ID", "Unidade"]} />
                                    </div>
                                </div>

                                <div className="bg-muted/50 text-xs font-bold text-muted-foreground px-3 py-2 uppercase tracking-wide border-t">
                                    Gatilhos programados
                                </div>
                                <div className="flex flex-col text-sm">
                                    <div className="px-3 py-2 hover:bg-muted transition-colors border-b border-border/50 flex flex-wrap items-center gap-2">
                                        <input type="number" defaultValue="0" className="w-12 h-7 border rounded text-center text-sm bg-background border-border" />
                                        <span>horas</span> <ActionLink label="antes" options={["antes", "depois"]} /> <ActionLink label="selecionar campo" options={["selecionar campo", "data de criação", "data de modificação"]} />
                                    </div>
                                    <div className="px-3 py-2 hover:bg-muted transition-colors border-b border-border/50 flex items-center gap-2 flex-wrap">
                                        <span>Tempo exato</span>
                                        <div className="flex items-center border rounded h-7 px-2 gap-1 bg-background">
                                            <Calendar className="w-3 h-3 text-muted-foreground" />
                                            <input type="text" defaultValue="20/07/2026" className="w-20 text-xs bg-transparent outline-none border-none" />
                                        </div>
                                        <span>às</span>
                                        <div className="border rounded h-7 px-1 bg-background flex items-center">
                                            <select className="bg-transparent text-xs outline-none">
                                                <option>14:24</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="px-3 py-2 hover:bg-muted transition-colors flex items-center gap-2">
                                        <ActionLink label="Diariamente" options={["Diariamente", "Uma vez por semana", "Uma vez por mês", "Uma vez por ano"]} /> <span>às</span>
                                        <div className="border rounded h-7 px-1 bg-background flex items-center">
                                            <select className="bg-transparent text-xs outline-none">
                                                <option>14:24</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/50 text-xs font-bold text-muted-foreground px-3 py-2 uppercase tracking-wide border-t">
                                    Gatilhos baseados em ações
                                </div>
                                <div className="flex flex-col text-sm pb-2">
                                    <div className="px-3 py-2 hover:bg-muted transition-colors border-b border-border/50">
                                        Quando um formulário é enviado
                                    </div>
                                    <div className="px-3 py-2 hover:bg-muted transition-colors border-b border-border/50">
                                        Quando um email é recebido
                                    </div>
                                    <div className="px-3 py-2 hover:bg-muted transition-colors border-b border-border/50">
                                        Quando uma chamada é recebida
                                    </div>
                                    <div className="px-3 py-2 hover:bg-muted transition-colors">
                                        <ActionLink label="Imediatamente" options={["Imediatamente", "Depois de 5 minutos", "Depois de 10 minutos", "Um dia"]} customInput={true} /> quando o website selecionado é visitado
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-muted-foreground font-normal text-base">Para todos os leads com:</Label>
                        <div className="flex gap-2 items-start">
                            <Popover modal={true}>
                                <PopoverTrigger asChild>
                                    <div className="flex-1 flex flex-col gap-2 border border-blue-400 rounded-md p-2 min-h-[46px] cursor-pointer hover:bg-muted/10 transition-colors">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-muted-foreground text-[13px] font-normal pl-1">Status:</span>

                                            {selectedStages.length === 0 && (
                                                <span className="text-destructive font-normal text-[13px] hover:underline underline-offset-2">campo obrigatório</span>
                                            )}

                                            {selectedStages.map(stageId => {
                                                const stage = STAGES.find(s => s.id === stageId);
                                                if (!stage) return null;
                                                return (
                                                    <div key={stage.id} className="inline-flex border border-black/10 rounded text-xs items-center h-[26px] bg-background shadow-sm truncate max-w-[250px] overflow-hidden">
                                                        <span className="px-2 text-muted-foreground border-r shrink-0 flex items-center h-full bg-white">Funil de vendas</span>
                                                        <span className="px-2 font-normal text-black/80 truncate h-full flex items-center" style={{ backgroundColor: stage.color }}>{stage.name}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-[300px] p-0 border-muted">
                                    <div className="flex flex-col">
                                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer border-b border-border/50">
                                            <Checkbox className="bg-white data-[state=checked]:bg-primary" />
                                            <span className="text-muted-foreground">Funil de vendas</span>
                                        </label>
                                        {STAGES.map(stage => (
                                            <label key={stage.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:opacity-90 transition-opacity" style={{ backgroundColor: stage.color }}>
                                                <Checkbox
                                                    checked={selectedStages.includes(stage.id)}
                                                    onCheckedChange={(c) => toggleStage(stage.id, c)}
                                                    className="bg-white data-[state=checked]:bg-primary border-black/20"
                                                />
                                                <span className="text-black/80 font-normal">{stage.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive/40 hover:text-destructive shrink-0 mt-0 hover:bg-destructive/10" onClick={() => setSelectedStages([])}>
                                <Trash2 className="h-[18px] w-[18px]" />
                            </Button>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <div className="border border-dashed rounded-md p-3 text-sm text-primary cursor-pointer hover:bg-muted/50 transition-colors">
                                    Adicionar uma condição
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-[300px] max-h-[300px] overflow-y-auto">
                                {[
                                    "Tags", "Usuário responsável", "Venda", "Fonte", "Sem tags",
                                    "utm_content", "utm_medium", "utm_campaign", "utm_source",
                                    "utm_term", "utm_referrer", "referrer", "gclientid",
                                    "gclid", "fbclid"
                                ].map(option => (
                                    <DropdownMenuItem key={option} className="cursor-pointer font-normal text-sm">
                                        {option}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-muted-foreground font-normal text-base">Horário ativo:</Label>
                        <div className="overflow-hidden bg-background border border-input rounded-md flex flex-col shadow-sm">
                            <div className="px-3 py-2 bg-background border-b border-border text-[13px] flex items-center gap-2 cursor-pointer hover:bg-accent transition-colors" onClick={() => setActiveHours([{ id: Math.random().toString(), days: [], startTime: "10:00", endTime: "19:00" }])}>
                                <Check className={`w-3.5 h-3.5 text-primary ${!activeHours.some(ah => ah.days.length > 0) ? 'opacity-100' : 'opacity-0'}`} />
                                <span className="text-foreground">sempre</span>
                            </div>

                            {activeHours.some(ah => ah.days.length > 0) && (
                                <div className="px-3 py-2 bg-background border-b border-border text-[13px] text-foreground flex items-center gap-2">
                                    <span className="ml-[22px]">
                                        {activeHours.filter(ah => ah.days.length > 0).map(ah => `${ah.days.join(', ')} de ${ah.startTime} às ${ah.endTime}`).join('; ')};
                                    </span>
                                </div>
                            )}

                            <div className="flex flex-col bg-muted/20 pb-2 pt-1 border-t border-border">
                                {activeHours.map((ah, i) => (
                                    <div key={ah.id} className="px-3 py-2 flex items-center gap-0 flex-wrap group">
                                        <div className="w-5 flex items-center justify-center shrink-0 ml-[-2px] mr-1">
                                            {activeHours.length > 1 && ah.days.length > 0 && (
                                                <Check className="w-3.5 h-3.5 text-foreground" />
                                            )}
                                        </div>

                                        <div className="flex border border-input rounded-[4px] overflow-hidden shrink-0 select-none shadow-[0_1px_2px_rgba(0,0,0,0.02)] bg-background">
                                            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(day => {
                                                const isSelected = ah.days.includes(day);
                                                return (
                                                    <div
                                                        key={day}
                                                        onClick={() => {
                                                            setActiveHours(prev => {
                                                                const newRanges = prev.map(r => r.id === ah.id ? { ...r, days: isSelected ? r.days.filter(d => d !== day) : [...r.days, day] } : r);
                                                                if (i === prev.length - 1 && !isSelected) {
                                                                    newRanges.push({ id: Math.random().toString(), days: [], startTime: "10:00", endTime: "19:00" });
                                                                }
                                                                return newRanges;
                                                            });
                                                        }}
                                                        className={`px-3 py-[5px] text-[13px] border-r border-input last:border-0 cursor-pointer transition-colors ${isSelected ? 'bg-[#d2f300] text-black font-medium' : 'bg-background hover:bg-accent text-foreground'}`}
                                                    >
                                                        {day}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="flex items-center gap-1 text-[13px] ml-3">
                                            <span className="mx-1 text-muted-foreground mr-1.5">de</span>
                                            <ActionLink label={ah.startTime} onChange={(val) => {
                                                setActiveHours(prev => prev.map(r => r.id === ah.id ? { ...r, startTime: val } : r));
                                            }} options={["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "12:00", "13:00"]} customInput={true} />
                                            <span className="mx-2 text-muted-foreground">às</span>
                                            <ActionLink label={ah.endTime} onChange={(val) => {
                                                setActiveHours(prev => prev.map(r => r.id === ah.id ? { ...r, endTime: val } : r));
                                            }} options={["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"]} customInput={true} />

                                            {i === activeHours.length - 1 && activeHours.some(r => r.days.length > 0) && (
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    className="h-[24px] text-[13px] px-3 ml-3 rounded-md bg-[#427DFA] text-white hover:bg-[#3466d3] font-normal shadow-sm"
                                                >Ok</Button>
                                            )}

                                            {i < activeHours.length - 1 && (
                                                <Button variant="ghost" size="icon" className="h-[22px] w-[22px] text-destructive/50 hover:text-destructive hover:bg-destructive/10 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                                                    setActiveHours(prev => prev.filter(r => r.id !== ah.id));
                                                }}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <Label className="font-normal text-base text-muted-foreground">Deixar mensagem sem resposta</Label>
                            <Switch />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            As mensagens às quais o Salesbot responde serão marcadas como não respondidas
                        </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <Checkbox id="apply-all" />
                        <Label htmlFor="apply-all" className="font-normal text-muted-foreground">
                            Aplicar o gatilho à todos os leads já nesta etapa
                        </Label>
                    </div>
                </div>

                <DialogFooter className="sm:justify-start gap-2 border-t pt-4">
                    <Button onClick={() => setOpen(false)} className="w-[100px]">Pronto</Button>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
