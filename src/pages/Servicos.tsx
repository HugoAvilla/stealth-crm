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
        title="Gestão de Serviços"
        description="Aqui você gerencia os serviços oferecidos pela empresa e as regras de consumo de material por serviço."
        steps={[
          { title: "Serviços", description: "Cadastre as regiões/áreas do veículo onde os serviços são aplicados (ex: Para-brisa, Capô)" },
          { title: "Regras de Consumo", description: "Defina quantos metros de material são consumidos por serviço e tamanho de veículo" },
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
