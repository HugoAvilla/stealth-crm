import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Tag, History } from "lucide-react";
import { HelpOverlay } from "@/components/help/HelpOverlay";

import { Principal } from "./sub-abas/Principal/Principal";
import { ProductTypesTab as ProductTypes } from "./sub-abas/ProductTypes/ProductTypes";
import { MaterialHistoryTab as HistoryTab } from "./sub-abas/History/History";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function Estoque() {
    const [activeTab, setActiveTab] = useState("materials");
    const { user } = useAuth();
    const [companyId, setCompanyId] = useState<number | null>(null);

    useEffect(() => {
        async function fetchCompanyId() {
            if (!user?.id) return;
            const { data } = await supabase
                .from("profiles")
                .select("company_id")
                .eq("user_id", user.id)
                .single();
            if (data?.company_id) {
                setCompanyId(data.company_id);
            }
        }
        fetchCompanyId();
    }, [user?.id]);

    return (
        <div className="space-y-6 p-6 max-w-[100vw] overflow-x-hidden">
            <HelpOverlay
                tabId="estoque"
                title="Guia de Estoque"
                sections={[
                    {
                        title: "Vídeo Aula — Estoque",
                        description: "Assista ao vídeo tutorial completo para aprender a usar todas as funcionalidades da gestão de estoque.",
                        videoUrl: "/help/video-aula-estoque.mp4"
                    },
                    {
                        title: "Tipos de Materiais",
                        description: "Na aba 'Tipos de Materiais', cadastre os tipos de películas e materiais com detalhes como marca, modelo e transmissão de luz. Esses tipos são usados para identificar qual película foi aplicada em cada serviço.",
                        screenshotUrl: "/help/help-estoque-tipos.png"
                    },
                    {
                        title: "Cadastrar Metragem de Materiais",
                        description: "Na aba 'Metragem de Materiais', clique em 'Novo Material' para cadastrar um item. Defina o nome, tipo, marca, unidade de medida, estoque mínimo e custo médio. O sistema alertará quando o estoque ficar baixo ou crítico.",
                        screenshotUrl: "/help/help-estoque-materiais.png"
                    },
                    {
                        title: "Entradas e Saídas",
                        description: "Use as setas ↓ (entrada) e ↑ (saída) na tabela para registrar movimentações de estoque. O saldo é atualizado automaticamente. Cards no topo mostram o valor total em estoque e alertas de itens baixos/críticos.",
                        screenshotUrl: "/help/help-estoque-movimentacoes.png"
                    },
                ]}
            />

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Gestão de Estoque</h1>
                <p className="text-muted-foreground">Controle de metragem de materiais e tipos de materiais</p>
            </div>

            {/* Sistema de Abas Principal */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid grid-cols-3 w-full max-w-lg">
                    <TabsTrigger value="product-types" className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        <span className="hidden sm:inline">Tipos de Materiais</span>
                    </TabsTrigger>
                    <TabsTrigger value="materials" className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span className="hidden sm:inline">Metragem de Materiais</span>
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <History className="h-4 w-4" />
                        <span className="hidden sm:inline">Histórico</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="materials" className="space-y-6">
                    <Principal />
                </TabsContent>

                <TabsContent value="product-types">
                    <ProductTypes companyId={companyId} />
                </TabsContent>

                <TabsContent value="history">
                    <HistoryTab companyId={companyId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

