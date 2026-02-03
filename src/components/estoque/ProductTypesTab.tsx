import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProductCategory, ProductType } from "@/lib/database.types";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductTypesTabProps {
  companyId: number | null;
}

export function ProductTypesTab({ companyId }: ProductTypesTabProps) {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<ProductCategory>("INSULFILM");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductType | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    category: "INSULFILM" as ProductCategory,
    brand: "",
    name: "",
    model: "",
    light_transmission: "",
    description: "",
    cost_per_meter: 0,
    unit_price: 0,
  });

  const { data: productTypes, isLoading } = useQuery({
    queryKey: ["product-types", activeCategory, companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("product_types")
        .select("*")
        .eq("company_id", companyId)
        .eq("category", activeCategory)
        .order("brand")
        .order("name");

      if (error) throw error;
      return data as ProductType[];
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Criar tipo de produto
      const { data: result, error } = await supabase
        .from("product_types")
        .insert({
          ...data,
          company_id: companyId,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Criar material vinculado automaticamente
      const materialName = `${data.brand} ${data.name}${data.model ? ` - ${data.model}` : ''}`;
      const { error: materialError } = await supabase.from("materials").insert({
        name: materialName,
        type: data.category,
        brand: data.brand,
        unit: "Metros",
        minimum_stock: 0,
        current_stock: 0,
        average_cost: data.cost_per_meter || 0,
        company_id: companyId,
        product_type_id: result.id,
        is_active: true,
      });

      if (materialError) {
        console.error("Erro ao criar material vinculado:", materialError);
        // Não bloqueia, apenas loga o erro
      }

      return result;
    },
    onSuccess: () => {
      toast.success("Tipo de produto criado e material adicionado ao estoque!");
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      handleCloseModal();
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar produto: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const { data: result, error } = await supabase
        .from("product_types")
        .update(data)
        .eq("id", id)
        .eq("company_id", companyId)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success("Tipo de produto atualizado!");
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
      handleCloseModal();
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar produto: " + error.message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: number; currentStatus: boolean }) => {
      const { error } = await supabase
        .from("product_types")
        .update({ is_active: !currentStatus })
        .eq("id", id)
        .eq("company_id", companyId);

      if (error) throw error;
      return { id, newStatus: !currentStatus };
    },
    onSuccess: (data) => {
      toast.success(data.newStatus ? "Produto ativado!" : "Produto desativado!");
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao alterar status: " + error.message);
    },
  });

  const handleOpenModal = (product?: ProductType) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        category: product.category,
        brand: product.brand,
        name: product.name,
        model: product.model || "",
        light_transmission: product.light_transmission || "",
        description: product.description || "",
        cost_per_meter: product.cost_per_meter,
        unit_price: product.unit_price,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        category: activeCategory,
        brand: "",
        name: "",
        model: "",
        light_transmission: "",
        description: "",
        cost_per_meter: 0,
        unit_price: 0,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({
      category: activeCategory,
      brand: "",
      name: "",
      model: "",
      light_transmission: "",
      description: "",
      cost_per_meter: 0,
      unit_price: 0,
    });
  };

  const handleSubmit = () => {
    if (!formData.brand.trim()) {
      toast.error("Marca é obrigatória");
      return;
    }
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs e botão */}
      <div className="flex items-center justify-between">
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as ProductCategory)}>
          <TabsList>
            <TabsTrigger value="INSULFILM">INSULFILM</TabsTrigger>
            <TabsTrigger value="PPF">PPF</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button onClick={() => handleOpenModal()}>
          <Plus className="h-4 w-4 mr-2" /> Novo Tipo de Produto
        </Button>
      </div>

      {/* Tabela */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          {productTypes?.length === 0 ? (
            <div className="p-12 text-center">
              <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum tipo de produto cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Cadastre tipos de produtos para {activeCategory}
              </p>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="h-4 w-4 mr-2" /> Cadastrar Primeiro Produto
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marca</TableHead>
                  <TableHead>Nome/Modelo</TableHead>
                  {activeCategory === "INSULFILM" && <TableHead>Transmissão</TableHead>}
                  <TableHead className="text-right">Custo/Metro</TableHead>
                  <TableHead className="text-right">Preço Venda</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productTypes?.map((product) => (
                  <TableRow
                    key={product.id}
                    className={!product.is_active ? "opacity-50" : ""}
                  >
                    <TableCell className="font-medium">{product.brand}</TableCell>
                    <TableCell>
                      <div>
                        <span>{product.name}</span>
                        {product.model && (
                          <span className="text-muted-foreground ml-1">- {product.model}</span>
                        )}
                      </div>
                    </TableCell>
                    {activeCategory === "INSULFILM" && (
                      <TableCell>{product.light_transmission || "-"}</TableCell>
                    )}
                    <TableCell className="text-right">
                      {formatCurrency(product.cost_per_meter)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(product.unit_price)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={product.is_active ? "default" : "destructive"}
                        className={product.is_active ? "bg-green-500" : ""}
                      >
                        {product.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenModal(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={product.is_active}
                          onCheckedChange={() =>
                            toggleMutation.mutate({
                              id: product.id,
                              currentStatus: product.is_active,
                            })
                          }
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de criar/editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Editar Tipo de Produto" : "Novo Tipo de Produto"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v as ProductCategory })}
                disabled={!!editingProduct}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INSULFILM">INSULFILM</SelectItem>
                  <SelectItem value="PPF">PPF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marca *</Label>
                <Input
                  placeholder="Ex: 3M, XPEL"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  placeholder="Ex: G70, Ultimate"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input
                  placeholder="Ex: Crystalline, Premium"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </div>
              {formData.category === "INSULFILM" && (
                <div className="space-y-2">
                  <Label>Transmissão de Luz</Label>
                  <Input
                    placeholder="Ex: 5%, 20%, 70%"
                    value={formData.light_transmission}
                    onChange={(e) =>
                      setFormData({ ...formData, light_transmission: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Custo por Metro (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_per_meter}
                  onChange={(e) =>
                    setFormData({ ...formData, cost_per_meter: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Preço de Venda por Metro (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_price}
                  onChange={(e) =>
                    setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descrição adicional do produto..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingProduct ? "Salvar Alterações" : "Criar Produto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
