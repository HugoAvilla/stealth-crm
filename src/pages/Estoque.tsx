import { useState } from "react";
import { Plus, Search, AlertTriangle, CheckCircle, Package, ArrowDown, ArrowUp, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { materials, type Material } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { NewMaterialModal } from "@/components/estoque/NewMaterialModal";
import { StockEntryModal } from "@/components/estoque/StockEntryModal";
import { StockExitModal } from "@/components/estoque/StockExitModal";
import { ConsumptionRulesModal } from "@/components/estoque/ConsumptionRulesModal";

export default function Estoque() {
  const [search, setSearch] = useState("");
  const [showNewMaterial, setShowNewMaterial] = useState(false);
  const [showEntry, setShowEntry] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  const getStockStatus = (material: Material) => {
    const ratio = material.current_stock / material.min_stock;
    if (ratio <= 0.5) return { status: 'critico', label: 'Crítico', color: 'text-red-500', bg: 'bg-red-500/10' };
    if (ratio <= 1) return { status: 'baixo', label: 'Baixo', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    return { status: 'ok', label: 'OK', color: 'text-green-500', bg: 'bg-green-500/10' };
  };

  const criticalCount = materials.filter(m => m.current_stock / m.min_stock <= 0.5).length;
  const lowCount = materials.filter(m => {
    const ratio = m.current_stock / m.min_stock;
    return ratio > 0.5 && ratio <= 1;
  }).length;
  const totalValue = materials.reduce((sum, m) => sum + (m.current_stock * m.cost_per_unit), 0);

  const handleEntry = (material: Material) => {
    setSelectedMaterial(material);
    setShowEntry(true);
  };

  const handleExit = (material: Material) => {
    setSelectedMaterial(material);
    setShowExit(true);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estoque</h1>
          <p className="text-muted-foreground">Controle de materiais e insumos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowRules(true)}>
            <Settings className="h-4 w-4 mr-2" /> Regras de Consumo
          </Button>
          <Button onClick={() => setShowNewMaterial(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo Material
          </Button>
        </div>
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
                  R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-center">Estoque Atual</TableHead>
                <TableHead className="text-center">Mínimo</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Custo Unit.</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map(material => {
                const stockStatus = getStockStatus(material);
                const totalValue = material.current_stock * material.cost_per_unit;

                return (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">{material.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{material.category}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {material.current_stock} {material.unit}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {material.min_stock} {material.unit}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn(stockStatus.bg, stockStatus.color, "border-0")}>
                        {stockStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {material.cost_per_unit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEntry(material)} title="Entrada">
                          <ArrowDown className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleExit(material)} title="Saída">
                          <ArrowUp className="h-4 w-4 text-red-500" />
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

      {/* Modals */}
      <NewMaterialModal open={showNewMaterial} onOpenChange={setShowNewMaterial} />
      <StockEntryModal open={showEntry} onOpenChange={setShowEntry} material={selectedMaterial} />
      <StockExitModal open={showExit} onOpenChange={setShowExit} material={selectedMaterial} />
      <ConsumptionRulesModal open={showRules} onOpenChange={setShowRules} />
    </div>
  );
}
