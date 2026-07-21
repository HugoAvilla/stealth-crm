import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Workflow } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BotTemplatesDialog } from "@/components/atendimento/BotTemplatesDialog";

export function CreateBotDialog({ triggerElement }: { triggerElement: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const navigate = useNavigate();

    const handleSelect = (type: "salesbot" | "ia") => {
        if (type === 'salesbot') {
            setShowTemplates(true);
        } else {
            setOpen(false);
            navigate('/atendimento/editor/new?type=ia');
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    {triggerElement}
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden [&>button.absolute]:hidden gap-0">
                    <DialogHeader className="px-8 pt-8 pb-5">
                        <div className="flex justify-between items-center w-full">
                            <DialogTitle className="text-[22px] font-normal text-muted-foreground">
                                Criar bot ou agente de IA
                            </DialogTitle>
                            <Button
                                variant="ghost"
                                className="text-muted-foreground font-semibold hover:bg-transparent hover:text-foreground text-[15px] p-0 h-auto"
                                onClick={() => setOpen(false)}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </DialogHeader>

                    <div className="p-8 pt-0 space-y-5 bg-background">
                        <div className="pt-6 border-t border-border/50 space-y-5">
                            <div
                                className="flex gap-5 p-6 border rounded-[8px] cursor-pointer bg-card hover:bg-accent hover:border-accent-foreground/20 transition-colors shadow-sm"
                                onClick={() => handleSelect('salesbot')}
                            >
                                <div className="mt-0 opacity-60 shrink-0 text-foreground">
                                    <Workflow className="w-[34px] h-[34px]" strokeWidth={1.5} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <h3 className="font-bold text-[16px] text-foreground">Salesbot</h3>
                                    <p className="text-muted-foreground text-[15px] leading-[1.6]">
                                        Automatiza a comunicação com o cliente com base em um cenário definido. Ideal para diálogos simples e previsíveis.
                                    </p>
                                </div>
                            </div>

                            <div
                                className="flex gap-5 p-6 border rounded-[8px] bg-card shadow-sm opacity-50 cursor-not-allowed"
                            // onClick={() => handleSelect('ia')} -> Indisponível no momento
                            >
                                <div className="mt-0 opacity-60 shrink-0 text-foreground">
                                    <Sparkles className="w-[34px] h-[34px]" strokeWidth={1.5} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-bold text-[16px] text-foreground">Agente de IA</h3>
                                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/10 border-none font-semibold h-[24px] px-2.5 rounded-[5px] text-[12px]">
                                            Recomendado
                                        </Badge>
                                    </div>
                                    <p className="text-muted-foreground text-[15px] leading-[1.6]">
                                        Identifica as intenções do cliente, conduz a pré-venda e preenche o cartão de lead. Ideal para cenários flexíveis que exigem um diálogo natural.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <BotTemplatesDialog
                open={showTemplates}
                onOpenChange={(val) => {
                    setShowTemplates(val);
                    if (!val) setOpen(false);
                }}
            />
        </>
    );
}
