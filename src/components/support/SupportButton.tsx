import { useState } from "react";
import { Headphones, ExternalLink } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function SupportButton() {
    const [open, setOpen] = useState(false);

    const handleSupportClick = () => {
        // URL para o WhatsApp com o número fornecido
        const phoneNumber = "5517992573141";
        // window.open abre em uma nova aba
        window.open(`https://wa.me/${phoneNumber}`, "_blank");
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full bg-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center border border-gray-200"
                title="Suporte da Plataforma"
            >
                <Headphones className="w-6 h-6 text-black" />
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Headphones className="w-5 h-5" />
                            Suporte da Plataforma
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-base">
                            Você está precisando de ajuda?
                            <br /><br />
                            Este é o canal direto de suporte da plataforma. Nossa equipe está pronta para tirar suas dúvidas, resolver problemas técnicos ou te auxiliar no uso do sistema.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-3 mt-4">
                        <Button
                            onClick={handleSupportClick}
                            className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                            size="lg"
                        >
                            Chamar Suporte <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="w-full"
                        >
                            Cancelar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
