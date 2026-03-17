import { useState } from "react";
import { Wrench, Calculator } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { VehicleRegionsTab } from "@/components/estoque/VehicleRegionsTab";
import { ConsumptionRulesTab } from "@/components/estoque/ConsumptionRulesTab";
import { HelpOverlay } from "@/components/help/HelpOverlay";

export default function Servicos() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("services");
  const companyId = user?.companyId || null;

  return (
    <div className="space-y-6 p-6">
      <HelpOverlay
        tabId="servicos"
        title="Guia de Serviços"
        sections={[
          {
            title: "Vídeo Aula — Serviços",
            description: "Assista ao vídeo tutorial completo para aprender a usar todas as funcionalidades da gestão de serviços.",
            videoUrl: "/help/video-aula-servico.mov"
          },
          {
            title: "Cadastrar Regiões/Serviços",
            description: "Na aba 'Serviços', cadastre as regiões do veículo onde os serviços são aplicados (ex: Para-brisa Dianteiro, Laterais, Capô). Essas regiões são usadas ao registrar vendas para identificar onde cada película foi instalada.",
            screenshotUrl: "/help/help-servicos-regioes.png"
          },
          {
            title: "Regras de Consumo",
            description: "Na aba 'Regras de Consumo', defina quantos metros de material são consumidos por serviço e tamanho de veículo. Ex: Para um 'Para-brisa' de um veículo 'Grande', são necessários 1.5m de película.",
            screenshotUrl: "/help/help-servicos-regras.png"
          },
          {
            title: "Como Funciona na Prática",
            description: "Quando você registrar uma venda, o sistema vai usar as regras de consumo para calcular automaticamente quanto de material será descontado do estoque. Isso evita erros de cálculo manual.",
            screenshotUrl: "/help/help-servicos-pratica.png"
          },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Gestão de Serviços</h1>
        <p className="text-muted-foreground">Gerencie serviços e regras de consumo de materiais</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Serviços</span>
          </TabsTrigger>
          <TabsTrigger value="consumption-rules" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Regras de Consumo</span>
          </TabsTrigger>
        </TabsList>

        {/* Aba Serviços (antiga Regiões do Veículo) */}
        <TabsContent value="services">
          <VehicleRegionsTab companyId={companyId} />
        </TabsContent>

        {/* Aba Regras de Consumo */}
        <TabsContent value="consumption-rules">
          <ConsumptionRulesTab companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
