import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCheck, Download } from "lucide-react";
import { HelpOverlay } from "@/components/help/HelpOverlay";
import { DownloadedPDFsTab } from "@/components/shared/DownloadedPDFsTab";
import { Principal } from "./sub-abas/Principal/Principal";

const Garantias = () => {
    const [activeTab, setActiveTab] = useState("garantias");

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-[100vw] overflow-x-hidden">
            <HelpOverlay
                tabId="garantias"
                title="Guia de Garantias"
                sections={[
                    {
                        title: "Vídeo Aula — Garantias",
                        description: "Assista ao vídeo tutorial completo para aprender a usar todas as funcionalidades da gestão de garantias.",
                        videoUrl: "/help/video-aula-garantia.mp4"
                    },
                    {
                        title: "Emitir Garantia",
                        description: "Clique em 'Emitir Garantia' para criar um certificado. Selecione o cliente, o veículo, o tipo de serviço e a validade. O certificado é gerado automaticamente com número único.",
                        screenshotUrl: "/help/help-garantias-emitir.png"
                    },
                    {
                        title: "Criar Modelo de Garantia",
                        description: "Use 'Criar Garantia Produto' para criar modelos reutilizáveis. Defina nome, validade em meses, cobertura e termos. Esses modelos agilizam a emissão de garantias futuras.",
                        screenshotUrl: "/help/help-garantias-modelo.png"
                    },
                    {
                        title: "Gerenciar Garantias Emitidas",
                        description: "A tabela mostra todas as garantias com status (Ativa, Vencendo, Expirada). Use a busca para encontrar por tipo, cliente ou placa. Cards no topo mostram totais e modelos disponíveis.",
                        screenshotUrl: "/help/help-garantias-tabela.png"
                    },
                    {
                        title: "Enviar por WhatsApp ou PDF",
                        description: "No menu '⋯' de cada garantia, escolha 'Enviar WhatsApp' para mandar o certificado diretamente ao cliente ou 'Baixar PDF' para gerar um documento profissional.",
                        screenshotUrl: "/help/help-garantias-enviar.png"
                    },
                ]}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="garantias" className="gap-2">
                        <FileCheck className="h-4 w-4" />
                        Garantias
                    </TabsTrigger>
                    <TabsTrigger value="pdfs" className="gap-2">
                        <Download className="h-4 w-4" />
                        PDFs Baixados
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="garantias" className="space-y-6 mt-4">
                    <Principal />
                </TabsContent>

                <TabsContent value="pdfs" className="mt-4">
                    <DownloadedPDFsTab module="garantias" />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Garantias;
