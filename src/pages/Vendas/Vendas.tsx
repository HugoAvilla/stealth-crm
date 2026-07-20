import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Download, Trash2 } from "lucide-react";
import { HelpOverlay } from "@/components/help/HelpOverlay";
import { DownloadedPDFsTab } from "@/components/shared/DownloadedPDFsTab";
import { Principal } from "./sub-abas/Principal/Principal";
import { Lixeira } from "./sub-abas/Lixeira/Lixeira";

const Vendas = () => {
  const [activeTab, setActiveTab] = useState("vendas");

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[100vw] overflow-x-hidden">
      <HelpOverlay
        tabId="vendas"
        title="Guia de Vendas"
        sections={[
          {
            title: "Vídeo Aula — Vendas",
            description: "Assista ao vídeo tutorial completo para aprender a usar todas as funcionalidades da gestão de vendas.",
            videoUrl: "/help/video-aula-vendas.mp4"
          },
          {
            title: "Registrar Nova Venda",
            description: "Clique no botão 'Nova venda' no topo da página. Selecione o cliente, o veículo, adicione os serviços realizados e escolha a forma de pagamento. A venda será registrada no calendário na data selecionada.",
            screenshotUrl: "/help/help-vendas-nova.png"
          },
          {
            title: "Alternar entre Calendário e Lista",
            description: "Use os botões 'Calendário' e 'Lista' no topo para alternar a visualização. No modo calendário, cada dia mostra a quantidade de vendas e o valor total. No modo lista, você vê todas as vendas em ordem cronológica.",
            screenshotUrl: "/help/help-vendas-visualizacao.png"
          },
          {
            title: "Detalhes do Dia",
            description: "Clique em um dia no calendário que possua vendas para abrir o drawer lateral com todos os detalhes: cliente, veículo, serviços realizados e valor total de cada venda do dia.",
            screenshotUrl: "/help/help-vendas-dia.png"
          },
          {
            title: "Gráficos e Indicadores (KPIs)",
            description: "A barra de KPIs mostra o resumo rápido (total de vendas, ticket médio, etc). Clique em 'Ver gráficos' para análises detalhadas com gráficos de barras e evolução temporal.",
            screenshotUrl: "/help/help-vendas-graficos.png"
          },
        ]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-2 pb-1">
          <TabsTrigger value="vendas" className="gap-2">
            <Calendar className="h-4 w-4" />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="pdfs" className="gap-2">
            <Download className="h-4 w-4" />
            PDFs Baixados
          </TabsTrigger>
          <TabsTrigger value="excluidas" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Lixeira / Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="space-y-6 mt-4">
          <Principal />
        </TabsContent>

        <TabsContent value="pdfs" className="mt-4">
          <DownloadedPDFsTab module="vendas" />
        </TabsContent>

        <TabsContent value="excluidas" className="mt-4 space-y-6">
          <Lixeira />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Vendas;
