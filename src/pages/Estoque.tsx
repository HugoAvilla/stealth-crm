import { useState, useEffect } from "react";
import { Plus, Search, AlertTriangle, CheckCircle, Package, ArrowDown, ArrowUp, Tag, Trash2, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { NewMaterialModal } from "@/components/estoque/NewMaterialModal";
import { StockEntryModal } from "@/components/estoque/StockEntryModal";
import { StockExitModal } from "@/components/estoque/StockExitModal";
import { ConsumptionRulesModal } from "@/components/estoque/ConsumptionRulesModal";
import { ProductTypesTab } from "@/components/estoque/ProductTypesTab";
import { HelpOverlay } from "@/components/help/HelpOverlay";
import { toast } from "sonner";

interface Material {
  id: number;
  name: string;
  type: string | null;
  brand: string | null;
  unit: string;
  current_stock: number | null;
  minimum_stock: number | null;
  average_cost: number | null;
  is_active: boolean | null;
  is_open_roll: boolean | null;
  open_roll_accumulated: number | null;
  company_id: number | null;
  product_type_id: number | null;
  product_types: { light_transmission: string | null } | null;
}

export default function Estoque() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("materials");
  const [search, setSearch] = useState("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewMaterial, setShowNewMaterial] = useState(false);
  const [showEntry, setShowEntry] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);

  const fetchMaterials = async () => {
    if (!user?.id) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.company_id) {
        setLoading(false);
        return;
      }

      setCompanyId(profile.company_id);

      const { data, error } = await supabase
        .from("materials")
        .select("*, product_types(light_transmission)")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      setMaterials(data || []);
    } catch (error) {
      console.error("Error fetching materials:", error);
      toast.error("Erro ao carregar materiais");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [user?.id]);

  const filteredMaterials = materials.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.type?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const getStockStatus = (material: Material) => {
    const currentStock = material.current_stock || 0;
    const minStock = material.minimum_stock || 1;
    const ratio = currentStock / minStock;

    if (ratio <= 0.5) return { status: "critico", label: "Crítico", color: "text-red-500", bg: "bg-red-500/10" };
    if (ratio <= 1) return { status: "baixo", label: "Baixo", color: "text-yellow-500", bg: "bg-yellow-500/10" };
    return { status: "ok", label: "OK", color: "text-green-500", bg: "bg-green-500/10" };
  };

  const criticalCount = materials.filter(m => {
    const ratio = (m.current_stock || 0) / (m.minimum_stock || 1);
    return ratio <= 0.5;
  }).length;

  const lowCount = materials.filter(m => {
    const ratio = (m.current_stock || 0) / (m.minimum_stock || 1);
    return ratio > 0.5 && ratio <= 1;
  }).length;

  const totalValue = materials.reduce(
    (sum, m) => sum + ((m.current_stock || 0) * (m.average_cost || 0)),
    0
  );

  const handleEntry = (material: Material) => {
    setSelectedMaterial(material);
    setShowEntry(true);
  };

  const handleExit = (material: Material) => {
    setSelectedMaterial(material);
    setShowExit(true);
  };

  const handleDelete = async (material: Material) => {
    if (!confirm(`Tem certeza que deseja excluir "${material.name}"?`)) return;

    try {
      // Verifica se existem movimentações
      const { count } = await supabase
        .from("stock_movements")
        .select("*", { count: "exact", head: true })
        .eq("material_id", material.id);

      if (count && count > 0) {
        // Soft delete - apenas desativa
        const { error } = await supabase
          .from("materials")
          .update({ is_active: false })
          .eq("id", material.id);

        if (error) throw error;
      } else {
        // Hard delete - remove completamente
        const { error } = await supabase
          .from("materials")
          .delete()
          .eq("id", material.id);

        if (error) throw error;
      }

      toast.success("Material excluído com sucesso");
      fetchMaterials();
    } catch (error) {
      console.error("Error deleting material:", error);
      toast.error("Erro ao excluir material");
    }
  };

  const handleCloseOpenRoll = async (material: Material) => {
    if (!user?.id || !companyId) return;
    if (!confirm(`Deseja encerrar a bobina "${material.name}"? O consumo acumulado total foi de ${material.open_roll_accumulated || 0}m. A bobina será inativada.`)) return;

    try {
      const { error } = await supabase.rpc("close_open_roll", {
        p_material_id: material.id,
        p_reason: "Fechamento manual de bobina",
        p_user_id: user.id,
        p_company_id: companyId
      });

      if (error) throw error;
      toast.success("Bobina encerrada com sucesso");
      fetchMaterials();
    } catch (error) {
      console.error("Error closing open roll:", error);
      toast.error("Erro ao encerrar bobina");
    }
  };

  const handleMaterialCreated = () => {
    fetchMaterials();
    setShowNewMaterial(false);
    toast.success("Material criado com sucesso!");
  };

  const handleMovementCompleted = () => {
    fetchMaterials();
    setShowEntry(false);
    setShowExit(false);
    setSelectedMaterial(null);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
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
            title: "Tipos de Produtos",
            description: "Na aba 'Tipos de Produtos', cadastre os tipos de películas e materiais com detalhes como marca, modelo e transmissão de luz. Esses tipos são usados para identificar qual película foi aplicada em cada serviço.",
            screenshotUrl: "/help/help-estoque-tipos.png"
          },
          {
            title: "Cadastrar Materiais",
            description: "Na aba 'Materiais', clique em 'Novo Material' para cadastrar um item. Defina o nome, tipo, marca, unidade de medida, estoque mínimo e custo médio. O sistema alertará quando o estoque ficar baixo ou crítico.",
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
        <p className="text-muted-foreground">Controle de materiais e tipos de produtos</p>
      </div>

      {/* Sistema de Abas Principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="product-types" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Tipos de Produtos</span>
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Materiais</span>
          </TabsTrigger>
        </TabsList>

        {/* Aba Materiais */}
        <TabsContent value="materials" className="space-y-6">
          {/* Header da aba */}
          <div className="flex items-center justify-end gap-2">
            <Button onClick={() => setShowNewMaterial(true)}>
              <Plus className="h-4 w-4 mr-2" /> Novo Material
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Itens</p>
                    <p className="text-2xl font-bold">{materials.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor em Estoque</p>
                    <p className="text-2xl font-bold">
                      R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                    <p className="text-2xl font-bold text-yellow-500">{lowCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estoque Crítico</p>
                    <p className="text-2xl font-bold text-red-500">{criticalCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar material..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Empty State or Table */}
          {materials.length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum material cadastrado</h3>
                <p className="text-muted-foreground mb-4">
                  Comece adicionando os materiais utilizados nos seus serviços
                </p>
                <Button onClick={() => setShowNewMaterial(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Cadastrar Primeiro Material
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Transmissão</TableHead>
                      <TableHead className="text-center">Estoque Atual</TableHead>
                      <TableHead className="text-center">Mínimo</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterials.map((material) => {
                      const stockStatus = getStockStatus(material);
                      const totalVal = (material.current_stock || 0) * (material.average_cost || 0);

                      return (
                        <TableRow key={material.id}>
                          <TableCell className="font-medium">
                            <div>
                              <p>{material.name}</p>
                              {material.brand && (
                                <p className="text-xs text-muted-foreground">{material.brand}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{material.type || "-"}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {material.product_types?.light_transmission || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {material.is_open_roll ? (
                              <Badge variant="outline" className="border-blue-500 text-blue-500">
                                Aberta (Usado: {material.open_roll_accumulated || 0}m)
                              </Badge>
                            ) : (
                              `${material.current_stock || 0} ${material.unit}`
                            )}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {material.is_open_roll ? "-" : `${material.minimum_stock || 0} ${material.unit}`}
                          </TableCell>
                          <TableCell className="text-center">
                            {material.is_open_roll ? (
                              <Badge className="bg-blue-500/10 text-blue-500 border-0">Em Uso</Badge>
                            ) : (
                              <Badge className={cn(stockStatus.bg, stockStatus.color, "border-0")}>
                                {stockStatus.label}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            R$ {totalVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-end">
                              {!material.is_open_roll ? (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => handleEntry(material)} title="Entrada">
                                    <ArrowDown className="h-4 w-4 text-green-500" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleExit(material)} title="Saída">
                                    <ArrowUp className="h-4 w-4 text-red-500" />
                                  </Button>
                                </>
                              ) : (
                                <Button variant="ghost" size="icon" onClick={() => handleCloseOpenRoll(material)} title="Encerrar Bobina">
                                  <StopCircle className="h-4 w-4 text-blue-500" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(material)}
                                title="Excluir"
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Aba Tipos de Produtos */}
        <TabsContent value="product-types">
          <ProductTypesTab companyId={companyId} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <NewMaterialModal
        open={showNewMaterial}
        onOpenChange={setShowNewMaterial}
        onSuccess={handleMaterialCreated}
      />
      <StockEntryModal
        open={showEntry}
        onOpenChange={setShowEntry}
        material={selectedMaterial}
        onSuccess={handleMovementCompleted}
      />
      <StockExitModal
        open={showExit}
        onOpenChange={setShowExit}
        material={selectedMaterial}
        onSuccess={handleMovementCompleted}
      />
      <ConsumptionRulesModal open={showRules} onOpenChange={setShowRules} />
    </div>
  );
}
