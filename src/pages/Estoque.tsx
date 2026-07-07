import { useState, useEffect } from "react";
import { Plus, Search, AlertTriangle, CheckCircle, Package, ArrowDown, ArrowUp, Tag, Trash2, StopCircle, History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanGate } from "@/hooks/usePlanGate";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { NewMaterialModal } from "@/components/estoque/NewMaterialModal";
import { StockEntryModal } from "@/components/estoque/StockEntryModal";
import { StockExitModal } from "@/components/estoque/StockExitModal";
import { ConsumptionRulesModal } from "@/components/estoque/ConsumptionRulesModal";
import { MaterialDetailsModal } from "@/components/estoque/MaterialDetailsModal";
import { ProductTypesTab } from "@/components/estoque/ProductTypesTab";
import { MaterialHistoryTab } from "@/components/estoque/MaterialHistoryTab";
import { CloseRollModal } from "@/components/estoque/CloseRollModal";
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
  width: number | null;
}

export default function Estoque() {
  const { user, isLoading: authLoading } = useAuth();
  const gate = usePlanGate('estoque');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("product-types");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewMaterial, setShowNewMaterial] = useState(false);
  const [showEntry, setShowEntry] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showCloseRoll, setShowCloseRoll] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);

  const fetchMaterials = async () => {
    if (!user?.id || !gate.hasAccess) return;

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

      setMaterials((data as any as Material[]) || []);
    } catch (error) {
      console.error("Error fetching materials:", error);
      toast.error("Erro ao carregar materiais");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id && gate.hasAccess) {
      fetchMaterials();
    }
  }, [user?.id, gate.hasAccess]);

  useEffect(() => {
    if (!authLoading && !gate.hasAccess) {
      if (gate.message) {
        toast.error(gate.message);
      }
      if (gate.redirectTo) {
        navigate(gate.redirectTo, { replace: true });
      }
    }
  }, [authLoading, gate.hasAccess, gate.redirectTo, gate.message, navigate]);

  const getStockStatus = (material: Material) => {
    const currentStock = material.current_stock || 0;
    const minStock = material.minimum_stock || 1;
    const ratio = currentStock / minStock;

    if (ratio <= 0.5) return { status: "critico", label: "Crítico", color: "text-red-500", bg: "bg-red-500/10" };
    if (ratio <= 1) return { status: "baixo", label: "Baixo", color: "text-yellow-500", bg: "bg-yellow-500/10" };
    return { status: "ok", label: "OK", color: "text-green-500", bg: "bg-green-500/10" };
  };

  const filteredMaterials = materials.filter(m => {
    let pass = true;

    if (search) {
      const lowerSearch = search.toLowerCase();
      if (!m.name.toLowerCase().includes(lowerSearch) &&
        !(m.type?.toLowerCase() || "").includes(lowerSearch)) {
        pass = false;
      }
    }

    if (typeFilter !== "todos" && m.type !== typeFilter) {
      pass = false;
    }

    if (statusFilter !== "todos") {
      if (statusFilter === "em_uso") {
        if (!m.is_open_roll) pass = false;
      } else {
        if (m.is_open_roll) {
          pass = false;
        } else {
          const status = getStockStatus(m).status;
          if (status !== statusFilter) pass = false;
        }
      }
    }

    return pass;
  });

  const openRolls = filteredMaterials.filter(m => m.is_open_roll);
  const regularMaterials = filteredMaterials.filter(m => !m.is_open_roll);
  const insulfilmMaterials = filteredMaterials.filter(m => m.type?.toUpperCase() === "INSULFILM");
  const ppfMaterials = filteredMaterials.filter(m => m.type?.toUpperCase() === "PPF");
  const otherMaterials = filteredMaterials.filter(m => m.type?.toUpperCase() !== "INSULFILM" && m.type?.toUpperCase() !== "PPF");

  const criticalCount = materials.filter(m => {
    if (m.is_open_roll) return false;
    const ratio = (m.current_stock || 0) / (m.minimum_stock || 1);
    return ratio <= 0.5;
  }).length;

  const lowCount = materials.filter(m => {
    if (m.is_open_roll) return false;
    const ratio = (m.current_stock || 0) / (m.minimum_stock || 1);
    return ratio > 0.5 && ratio <= 1;
  }).length;

  const openRollsCount = materials.filter(m => m.is_open_roll).length;

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

  const handleDetails = (material: Material) => {
    setSelectedMaterial(material);
    setShowDetails(true);
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
    setSelectedMaterial(material);
    setShowCloseRoll(true);
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

  const renderMaterialTable = (items: Material[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((material) => {
        const stockStatus = getStockStatus(material);
        const totalVal = (material.is_open_roll
          ? (material.open_roll_accumulated || 0)
          : (material.current_stock || 0)) * (material.average_cost || 0);

        return (
          <Card key={material.id} className="bg-card/50 border-border/50 p-4 flex flex-col justify-between space-y-3 hover:border-primary/30 transition-all duration-300">
            <div className="space-y-3">
              {/* Topo: Nome e Ações Rápidas (Excluir e Detalhes) */}
              <div className="flex items-start justify-between gap-2">
                <div
                  className="cursor-pointer hover:text-primary hover:underline transition-colors flex-1"
                  onClick={() => handleDetails(material)}
                >
                  <h4 className="font-semibold text-base text-foreground leading-tight">{material.name}</h4>
                  {material.brand && (
                    <span className="text-xs text-muted-foreground">{material.brand}</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(material)}
                  title="Excluir"
                  className="text-muted-foreground hover:text-destructive h-8 w-8 -mt-1 -mr-1 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Informações de Bobina / Transmissão */}
              {(material.unit === "Metros" && material.width) || material.product_types?.light_transmission || material.type ? (
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {material.type && (
                    <Badge variant="outline" className="text-[10px] py-0 px-2 font-normal">
                      {material.type}
                    </Badge>
                  )}
                  {material.product_types?.light_transmission && (
                    <Badge variant="outline" className="text-[10px] py-0 px-2 font-normal border-amber-500/20 text-amber-600 bg-amber-500/5">
                      VLT: {material.product_types.light_transmission}
                    </Badge>
                  )}
                  {material.unit === "Metros" && material.width && (
                    <Badge variant="outline" className="text-[10px] py-0 px-2 font-normal border-blue-500/20 text-blue-600 bg-blue-500/5">
                      Bobina: {Number(material.width).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}m
                    </Badge>
                  )}
                </div>
              ) : null}

              {/* Status e Indicadores Principais */}
              <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-border/40 text-center">
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Estoque</span>
                  <span className="font-semibold text-xs text-foreground block truncate">
                    {material.is_open_roll ? (
                      <span className="text-blue-500 font-semibold" title={`Aberta. Usado: ${material.open_roll_accumulated || 0}m`}>
                        Aberta
                      </span>
                    ) : (
                      `${material.current_stock || 0} ${material.unit}`
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Mínimo / Status</span>
                  <div className="flex flex-col items-center justify-center">
                    {material.is_open_roll ? (
                      <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/10 border-0 text-[10px] py-0 px-1.5 font-normal">Em Uso</Badge>
                    ) : (
                      <Badge className={cn(stockStatus.bg, stockStatus.color, "border-0 hover:bg-transparent text-[10px] py-0 px-1.5 font-normal")}>
                        {stockStatus.label}
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">
                    {material.is_open_roll ? "Consumido" : "Valor Total"}
                  </span>
                  <span className="font-semibold text-xs text-foreground block truncate" title={`R$ ${totalVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}>
                    R$ {totalVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Botões de Ações de Transação */}
            <div className="flex gap-2 pt-2">
              {!material.is_open_roll ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEntry(material)}
                    className="flex-1 h-9 text-xs border-green-500/20 hover:bg-green-500/5 hover:text-green-600"
                  >
                    <ArrowDown className="mr-1 h-3.5 w-3.5 text-green-500" /> Entrada
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExit(material)}
                    className="flex-1 h-9 text-xs border-red-500/20 hover:bg-red-500/5 hover:text-red-600"
                  >
                    <ArrowUp className="mr-1 h-3.5 w-3.5 text-red-500" /> Saída
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCloseOpenRoll(material)}
                  className="w-full h-9 text-xs border-blue-500/20 text-blue-600 hover:bg-blue-500/5"
                >
                  <StopCircle className="mr-1 h-3.5 w-3.5 text-blue-500" /> Encerrar Bobina
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );

  const renderCategorySections = (categoryName: string, items: Material[]) => {
    const openRolls = items.filter(m => m.is_open_roll);
    const regularMaterials = items.filter(m => !m.is_open_roll);

    if (items.length === 0) return null;

    return (
      <div className="space-y-6 border border-border/30 bg-card/20 p-5 rounded-2xl shadow-sm">
        {/* Cabeçalho da Categoria */}
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              {categoryName}
            </h3>
            <Badge variant="secondary" className="ml-2 font-mono text-[10px] py-0 px-2 font-normal border border-border/50">
              {items.length} {items.length === 1 ? 'item' : 'itens'}
            </Badge>
          </div>
        </div>

        {/* Subseções */}
        <div className="space-y-6">
          {openRolls.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-blue-500 dark:text-blue-400 flex items-center gap-1.5 pl-1">
                <StopCircle className="h-4 w-4 text-blue-500" /> Bobinas Abertas ({openRolls.length})
              </h4>
              {renderMaterialTable(openRolls)}
            </div>
          )}

          {regularMaterials.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-emerald-500 dark:text-emerald-400 flex items-center gap-1.5 pl-1">
                <Package className="h-4 w-4 text-emerald-500" /> Estoque Padrão (Fechado) ({regularMaterials.length})
              </h4>
              {renderMaterialTable(regularMaterials)}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading || authLoading || !gate.hasAccess) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

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

        {/* Aba Materiais */}
        <TabsContent value="materials" className="space-y-6">
          {/* Header da aba */}
          <div className="flex items-center justify-end gap-2">
            <Button onClick={() => setShowNewMaterial(true)}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar Metros
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Package className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bobinas Abertas</p>
                    <p className="text-2xl font-bold text-blue-500">{openRollsCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar material..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Tipos</SelectItem>
                  {Array.from(new Set(materials.map(m => m.type).filter(Boolean))).sort().map(tipo => (
                    <SelectItem key={tipo} value={tipo as string}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="ok">OK</SelectItem>
                  <SelectItem value="baixo">Baixo</SelectItem>
                  <SelectItem value="critico">Crítico</SelectItem>
                  <SelectItem value="em_uso">Em Uso</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <div className="space-y-8">
              {/* Categoria Insulfilm */}
              {renderCategorySections("Películas INSULFILM", insulfilmMaterials)}

              {/* Categoria PPF */}
              {renderCategorySections("Películas PPF", ppfMaterials)}

              {/* Outros Materiais */}
              {renderCategorySections("Outros Materiais", otherMaterials)}

              {filteredMaterials.length === 0 && (
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">
                      Nenhum material encontrado para os filtros atuais.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Aba Tipos de Produtos */}
        <TabsContent value="product-types">
          <ProductTypesTab companyId={companyId} />
        </TabsContent>

        {/* Aba Histórico de Materiais */}
        <TabsContent value="history">
          <MaterialHistoryTab companyId={companyId} />
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
      <MaterialDetailsModal
        open={showDetails}
        onOpenChange={setShowDetails}
        material={selectedMaterial}
      />
      <CloseRollModal
        open={showCloseRoll}
        onOpenChange={setShowCloseRoll}
        material={selectedMaterial}
        onSuccess={() => {
          setShowCloseRoll(false);
          fetchMaterials();
        }}
      />
    </div>
  );
}
