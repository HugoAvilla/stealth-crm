import { useState, useEffect } from "react";
import { Plus, Search, AlertTriangle, CheckCircle, Package, ArrowDown, ArrowUp, Tag, Trash2, StopCircle, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  open_roll_accumulated?: number | null;
  company_id: number | null;
  product_type_id: number | null;
  product_types: { light_transmission: string | null } | null;
  width: number | null;
}

interface Roll {
  id: number;
  material_id: number;
  status: string;
}

interface ReuseItem {
  id: number;
  material_id: number;
  length_meters: number;
  width_meters: number | null;
  status: string;
  reason: string | null;
  notes: string | null;
  created_at: string;
  materials: {
    name: string;
    unit: string;
  } | null;
}

export default function Estoque() {
  const { user, isLoading: authLoading } = useAuth();
  const gate = usePlanGate('estoque');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("materials");
  const [activeSubTab, setActiveSubTab] = useState("principal");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [reuseItems, setReuseItems] = useState<ReuseItem[]>([]);
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

      // 1. Fetch materials (Estoque unificado)
      const { data: materialsData, error: materialsError } = await supabase
        .from("materials")
        .select("*, product_types(light_transmission)")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .order("name");

      if (materialsError) throw materialsError;

      // 2. Fetch rolls ativas (tabela pode não existir ainda)
      let rollsData: Roll[] = [];
      try {
        const { data, error: rollsError } = await supabase
          .from("material_rolls" as any)
          .select("id, material_id, status")
          .in("status", ["aberta", "fechada"])
          .eq("company_id", profile.company_id);

        if (!rollsError) {
          rollsData = (data as any) || [];
        } else {
          console.warn("material_rolls table not available:", rollsError.message);
        }
      } catch {
        console.warn("material_rolls query failed, skipping.");
      }

      // 3. Fetch aproveitamentos (tabela pode não existir ainda)
      let reuseData: ReuseItem[] = [];
      try {
        const { data, error: reuseError } = await supabase
          .from("stock_reuse_items" as any)
          .select("*, materials(name, unit)")
          .eq("company_id", profile.company_id)
          .eq("status", "disponivel")
          .order("created_at", { ascending: false });

        if (!reuseError) {
          reuseData = (data as any) || [];
        } else {
          console.warn("stock_reuse_items table not available:", reuseError.message);
        }
      } catch {
        console.warn("stock_reuse_items query failed, skipping.");
      }

      setMaterials(materialsData || []);
      setRolls(rollsData);
      setReuseItems(reuseData);
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

  const principalMaterials = materials.filter(m => !m.is_open_roll);
  const aproveitamentoMaterials = materials.filter(m => m.is_open_roll);

  const filteredMaterials = principalMaterials.filter(m => {
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
      const status = getStockStatus(m).status;
      if (status !== statusFilter) pass = false;
    }

    return pass;
  });

  const filteredAproveitamentos = aproveitamentoMaterials.filter(m => {
    if (!search) return true;
    const lowerSearch = search.toLowerCase();
    return m.name.toLowerCase().includes(lowerSearch) || 
           (m.type?.toLowerCase() || "").includes(lowerSearch);
  });

  const criticalCount = materials.filter(m => {
    const ratio = (m.current_stock || 0) / (m.minimum_stock || 1);
    return ratio <= 0.5;
  }).length;

  const lowCount = materials.filter(m => {
    const ratio = (m.current_stock || 0) / (m.minimum_stock || 1);
    return ratio > 0.5 && ratio <= 1;
  }).length;

  const openRollsCount = rolls.filter(r => r.status === "aberta").length;
  const closedRollsCount = rolls.filter(r => r.status === "fechada").length;

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

  const handleCloseReuseItem = async (itemId: number) => {
    if (!confirm("Deseja encerrar este aproveitamento? Ele não ficará mais disponível para uso.")) return;
    try {
      const { error } = await supabase
        .from("stock_reuse_items")
        .update({ status: "encerrado", closed_at: new Date().toISOString() })
        .eq("id", itemId);

      if (error) throw error;
      toast.success("Aproveitamento encerrado!");
      fetchMaterials();
    } catch (error) {
      console.error("Error closing reuse item:", error);
      toast.error("Erro ao encerrar aproveitamento");
    }
  };

  const handleMaterialCreated = () => {
    fetchMaterials();
    setShowNewMaterial(false);
  };

  const handleMovementCompleted = () => {
    fetchMaterials();
    setShowEntry(false);
    setShowExit(false);
    setSelectedMaterial(null);
  };

  const renderMaterialTable = (items: Material[]) => (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-center">Transmissão</TableHead>
              <TableHead className="text-center">Bobinas Ativas</TableHead>
              <TableHead className="text-center">Estoque Total</TableHead>
              <TableHead className="text-center">Mínimo</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((material) => {
              const stockStatus = getStockStatus(material);
              const totalVal = (material.current_stock || 0) * (material.average_cost || 0);

              const materialRolls = rolls.filter(r => r.material_id === material.id);
              const openCount = materialRolls.filter(r => r.status === "aberta").length;
              const closedCount = materialRolls.filter(r => r.status === "fechada").length;

              return (
                <TableRow key={material.id}>
                  <TableCell className="font-medium">
                    <div 
                      className="cursor-pointer hover:text-primary hover:underline transition-colors"
                      onClick={() => handleDetails(material)}
                      title="Ver detalhes e histórico"
                    >
                      <p>{material.name}</p>
                      <div className="flex flex-col gap-0.5">
                        {material.brand && (
                          <p className="text-xs text-muted-foreground hover:no-underline">{material.brand}</p>
                        )}
                        {material.unit === "Metros" && (
                          <p className="text-[11px] font-normal text-blue-500 hover:no-underline">
                            Bobina: {material.width ? Number(material.width).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "1,52"}m de largura
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{material.type || "-"}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {material.product_types?.light_transmission || "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {material.unit === "Metros" ? (
                      <div className="flex gap-1.5 justify-center">
                        <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/15 border-0 text-[10px]">
                          🟢 {openCount} abertas
                        </Badge>
                        <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/15 border-0 text-[10px]">
                          🔵 {closedCount} fechadas
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {material.current_stock || 0} {material.unit}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {material.minimum_stock || 0} {material.unit}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn(stockStatus.bg, stockStatus.color, "border-0")}>
                      {stockStatus.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    R$ {totalVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => handleEntry(material)} title="Entrada">
                        <ArrowDown className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleExit(material)} title="Saída">
                        <ArrowUp className="h-4 w-4 text-red-500" />
                      </Button>
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
  );

  const renderAproveitamentoTable = (items: Material[]) => (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material Relacionado</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-center">Largura</TableHead>
              <TableHead className="text-center">Consumo Acumulado</TableHead>
              <TableHead className="w-[180px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.name}
                  {item.brand && <div className="text-xs text-muted-foreground">{item.brand}</div>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-indigo-500/5 text-indigo-500 border-indigo-500/20">
                    {item.type || "Diversos"}
                  </Badge>
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {item.width ? `${item.width}m` : "-"}
                </TableCell>
                <TableCell className="text-center font-semibold text-blue-500">
                  {item.open_roll_accumulated || 0}m consumidos
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedMaterial(item);
                        setShowCloseRoll(true);
                      }}
                      className="h-8 gap-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Finalizar</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item)}
                      title="Excluir"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  Nenhum material de aproveitamento cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

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
        title="Guia de Estoque por Bobinas e Aproveitamento"
        sections={[
          {
            title: "Vídeo Aula — Estoque por Bobinas",
            description: "Assista ao vídeo tutorial completo para aprender como funciona o consumo físico de bobinas por prioridade e aproveitamentos de retalhos.",
            videoUrl: "/help/video-aula-estoque.mp4"
          },
          {
            title: "Sistema de Bobinas Físicas",
            description: "Cada material do estoque agora representa bobinas físicas reais. O consumo é sequencial e inteligente: consome automaticamente primeiro as bobinas que já estão abertas antes de abrir novas bobinas fechadas.",
            screenshotUrl: "/help/help-estoque-materiais.png"
          },
          {
            title: "Aproveitamento de Estoque",
            description: "Cadastre sobras ou retalhos úteis gerados durante a aplicação. Eles ficam isolados e disponíveis na aba 'Aproveitamento de Estoque' para uso ou descarte manual.",
            screenshotUrl: "/help/help-estoque-movimentacoes.png"
          },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Estoque</h1>
          <p className="text-muted-foreground">Controle de materiais por bobinas físicas e aproveitamento de sobras</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowNewMaterial(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo Material
          </Button>
        </div>
      </div>

      {/* Stats Premium 5 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total de Materiais</p>
                <p className="text-xl font-bold">{materials.length}</p>
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
                <p className="text-xs text-muted-foreground">Valor em Estoque</p>
                <p className="text-xl font-bold">
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
                <p className="text-xs text-muted-foreground">Alertas (Crítico / Baixo)</p>
                <p className="text-xl font-bold text-yellow-500">
                  {criticalCount} <span className="text-xs text-muted-foreground font-normal">críticos</span> / {lowCount} <span className="text-xs text-muted-foreground font-normal">baixos</span>
                </p>
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
                <p className="text-xs text-muted-foreground">Bobinas Ativas</p>
                <p className="text-xl font-bold text-blue-500">
                  {openRollsCount} <span className="text-xs text-muted-foreground font-normal">abertas</span> / {closedRollsCount} <span className="text-xs text-muted-foreground font-normal">fechadas</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10">
                <StopCircle className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aproveitamentos</p>
                <p className="text-xl font-bold text-indigo-500">{aproveitamentoMaterials.length} <span className="text-xs text-muted-foreground font-normal">materiais</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sistema de Abas Principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="product-types" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Tipos de Produtos</span>
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Estoque</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
        </TabsList>

        {/* Aba Materiais e Aproveitamento */}
        <TabsContent value="materials" className="space-y-6">
          {/* Sub-abas internas para Estoque Principal vs Aproveitamento */}
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-2">
              <TabsList className="bg-muted/80">
                <TabsTrigger value="principal">Estoque Principal</TabsTrigger>
                <TabsTrigger value="aproveitamento">Aproveitamento de Estoque ({aproveitamentoMaterials.length})</TabsTrigger>
              </TabsList>

              {(activeSubTab === "principal" || activeSubTab === "aproveitamento") && (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
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
                      <SelectTrigger className="w-[130px]">
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
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos Status</SelectItem>
                        <SelectItem value="ok">OK</SelectItem>
                        <SelectItem value="baixo">Baixo</SelectItem>
                        <SelectItem value="critico">Crítico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <TabsContent value="principal" className="space-y-4 pt-2">
              {filteredMaterials.length === 0 ? (
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="p-12 text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhum material no estoque</h3>
                    <p className="text-muted-foreground mb-4">
                      Cadastre os seus materiais e bobinas para iniciar o monitoramento
                    </p>
                    <Button onClick={() => setShowNewMaterial(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Cadastrar Primeiro Material
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                renderMaterialTable(filteredMaterials)
              )}
            </TabsContent>

            <TabsContent value="aproveitamento" className="space-y-4 pt-2">
              {renderAproveitamentoTable(filteredAproveitamentos)}
            </TabsContent>
          </Tabs>
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
        onSuccess={handleMovementCompleted}
      />
    </div>
  );
}
