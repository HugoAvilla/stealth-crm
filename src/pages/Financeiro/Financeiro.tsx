import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Target } from "lucide-react";
import { HelpOverlay } from "@/components/help/HelpOverlay";
import { VisaoGeral } from "./sub-abas/VisaoGeral/VisaoGeral";
import { CacTab } from "./components/CacTab";

export default function Financeiro() {
  const [activeTab, setActiveTab] = useState("visao-geral");

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-[100vw] overflow-x-hidden">
      <HelpOverlay
        tabId="financeiro"
        title="Guia Financeiro"
        sections={[
          {
            title: "Registrar Movimentações",
            description: "Clique em 'Adicionar' para registrar: Nova Entrada (receita), Nova Saída (despesa), Transferência (entre contas) ou Nova Conta. Cada movimentação é associada a uma conta e categoria.",
            screenshotUrl: "/help/help-financeiro-adicionar.png"
          },
          {
            title: "Cards de Resumo",
            description: "Os 3 cards no topo mostram: Saldo Total (soma de todas as contas), Entradas do mês (total de receitas) com previsão de próximos 7 dias, e Saídas do mês (total de despesas) com previsão. Use o ícone 👁 para ocultar/mostrar valores.",
            screenshotUrl: "/help/help-financeiro-resumo.png"
          },
          {
            title: "Gráfico de Evolução",
            description: "O gráfico de área mostra a evolução cumulativa do seu saldo através dos dias. Representa efetivamente o dinheiro real disponível em caixa ao longo do tempo.",
            screenshotUrl: "/help/help-financeiro-grafico.png"
          },
          {
            title: "Gerenciar Contas e Categorias",
            description: "Na seção 'Minhas Contas' você vê o saldo de cada conta (corrente, poupança, carteira). Use 'Gerenciar Categorias' no menu para criar categorias como 'Aluguel', 'Material', etc.",
            screenshotUrl: "/help/help-financeiro-contas.png"
          },
        ]}
      />

      <h1 className="text-2xl font-bold">Financeiro</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px] mb-6">
          <TabsTrigger value="visao-geral" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="cac" className="gap-2">
            <Target className="h-4 w-4" />
            CAC / Aquisição
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="space-y-6 animate-in fade-in duration-500">
          <VisaoGeral />
        </TabsContent>

        <TabsContent value="cac">
          <CacTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
