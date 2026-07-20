/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ProductCategory, ProductType } from "@/lib/database.types";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ProductTypesTabProps {
  companyId: number | null;
}

export function ProductTypesTab({ companyId }: ProductTypesTabProps) {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] =
    useState<ProductCategory>("INSULFILM");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductType | null>(null);

  const [formData, setFormData] = useState({
    category: "INSULFILM" as ProductCategory,
    brand: "",
    name: "",
    light_transmission: "",
    description: "",
    ppf_material_type: "",
  });

  const { data: productTypes = [], isLoading } = useQuery({
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

  const invalidateStockQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["product-types"] });
    queryClient.invalidateQueries({ queryKey: ["materials"] });
    queryClient.invalidateQueries({ queryKey: ["history-materials"] });
    queryClient.invalidateQueries({ queryKey: ["history-movements"] });
    queryClient.invalidateQueries({ queryKey: ["history-analytics-consumption"] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: result, error } = await supabase
        .from("product_types")
        .insert({
          category: data.category,
          brand: data.brand,
          name: data.name,
          model: null,
          light_transmission: data.light_transmission,
          description: data.description,
          cost_per_meter: 0,
          ppf_material_type:
            data.category === "PPF" && data.ppf_material_type
              ? data.ppf_material_type
              : null,
          unit_price: 0,
          company_id: companyId,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success("Tipo de produto criado com sucesso!");
      invalidateStockQueries();
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
        .update({
          category: data.category,
          brand: data.brand,
          name: data.name,
          model: null,
          light_transmission: data.light_transmission,
          description: data.description,
          cost_per_meter: 0,
          ppf_material_type:
            data.category === "PPF" && data.ppf_material_type
              ? data.ppf_material_type
              : null,
        })
        .eq("id", id)
        .eq("company_id", companyId)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success("Tipo de produto atualizado!");
      invalidateStockQueries();
      handleCloseModal();
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar produto: " + error.message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      id,
      currentStatus,
    }: {
      id: number;
      currentStatus: boolean;
    }) => {
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
      invalidateStockQueries();
    },
    onError: (error: Error) => {
      toast.error("Erro ao alterar status: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { count } = await supabase
        .from("service_items_detailed")
        .select("*", { count: "exact", head: true })
        .eq("product_type_id", id);

      if (count && count > 0) {
        const { error } = await supabase
          .from("product_types")
          .update({ is_active: false })
          .eq("id", id)
          .eq("company_id", companyId);

        if (error) throw error;

        await supabase
          .from("materials")
          .update({ is_active: false })
          .eq("product_type_id", id);

        return "soft";
      }

      await supabase.from("materials").delete().eq("product_type_id", id);

      const { error } = await supabase
        .from("product_types")
        .delete()
        .eq("id", id)
        .eq("company_id", companyId);

      if (error) throw error;
      return "hard";
    },
    onSuccess: (type) => {
      if (type === "soft") {
        toast.success("Produto desativado (possui servicos vinculados)");
      } else {
        toast.success("Tipo de produto excluido com sucesso!");
      }
      invalidateStockQueries();
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir produto: " + error.message);
    },
  });

  const handleDelete = (product: ProductType) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir "${product.brand} ${product.name}"?`
      )
    ) {
      return;
    }

    deleteMutation.mutate(product.id);
  };

  const handleOpenModal = (product?: ProductType) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        category: product.category,
        brand: product.brand,
        name: product.name,
        light_transmission: product.light_transmission || "",
        description: product.description || "",
        ppf_material_type: product.ppf_material_type || "",
      });
    } else {
      setEditingProduct(null);
      setFormData({
        category: activeCategory,
        brand: "",
        name: "",
        light_transmission: "",
        description: "",
        ppf_material_type: "",
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
      light_transmission: "",
      description: "",
      ppf_material_type: "",
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Nome e obrigatorio");
      return;
    }

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formData });
      return;
    }

    createMutation.mutate(formData);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

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
      <div className="flex items-center justify-between">
        <Tabs
          value={activeCategory}
          onValueChange={(value) => setActiveCategory(value as ProductCategory)}
        >
          <TabsList>
            <TabsTrigger value="INSULFILM">INSULFILM</TabsTrigger>
            <TabsTrigger value="PPF">PPF</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" /> Novo Tipo de Material
        </Button>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          {productTypes?.length === 0 ? (
            <div className="p-12 text-center">
              <Tag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">
                Nenhum tipo de material cadastrado
              </h3>
              <p className="mb-4 text-muted-foreground">
                Cadastre tipos de materiais para {activeCategory}
              </p>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="mr-2 h-4 w-4" /> Cadastrar Primeiro Material
              </Button>
            </div>
          ) : (
            <>
              {/* ðŸ–¥ï¸ VisualizaÃ§Ã£o Desktop: Tabela Completa */}
              <div className="hidden md:block w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Marca</TableHead>
                      <TableHead>Nome</TableHead>
                      {activeCategory === "INSULFILM" && (
                        <TableHead>Transmissao</TableHead>
                      )}
                      {activeCategory === "PPF" && (
                        <TableHead>Tipo Material</TableHead>
                      )}
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="w-[100px]">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productTypes.map((product) => (
                      <TableRow
                        key={product.id}
                        className={!product.is_active ? "opacity-50" : ""}
                      >
                        <TableCell className="font-medium">{product.brand}</TableCell>
                        <TableCell>
                          <div>
                            <span>{product.name}</span>
                          </div>
                        </TableCell>
                        {activeCategory === "INSULFILM" && (
                          <TableCell>{product.light_transmission || "-"}</TableCell>
                        )}
                        {activeCategory === "PPF" && (
                          <TableCell>
                            {product.ppf_material_type ? (
                              <Badge variant="outline">
                                {product.ppf_material_type}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        )}
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(product)}
                              className="text-muted-foreground hover:text-destructive"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
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
              </div>

              {/* ðŸ“± VisualizaÃ§Ã£o Mobile: Cards Empilhados */}
              <div className="flex md:hidden flex-col gap-4">
                {productTypes.map((product) => (
                  <div key={product.id} className={cn("p-4 text-sm space-y-3", !product.is_active && "opacity-50")}>
                    {/* 1. TÃ­tulo e Status */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-base leading-none block">{product.name}</span>
                        {product.brand && (
                          <span className="text-xs text-muted-foreground mt-1 block">
                            {product.brand}
                          </span>
                        )}
                      </div>
                      <Badge
                        variant={product.is_active ? "default" : "destructive"}
                        className={cn("text-[10px] py-0 px-1.5 h-5", product.is_active ? "bg-green-500" : "")}
                      >
                        {product.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>

                    {/* 2. InformaÃ§Ãµes EspecÃ­ficas */}
                    {(activeCategory === "INSULFILM" && product.light_transmission) ||
                      (activeCategory === "PPF" && product.ppf_material_type) ? (
                      <div className="flex gap-2">
                        {activeCategory === "INSULFILM" && product.light_transmission && (
                          <Badge variant="outline" className="text-[10px] font-normal border-amber-500/20 text-amber-600 bg-amber-500/5">
                            TransmissÃ£o: {product.light_transmission}
                          </Badge>
                        )}
                        {activeCategory === "PPF" && product.ppf_material_type && (
                          <Badge variant="outline" className="text-[10px] font-normal">
                            Tipo: {product.ppf_material_type}
                          </Badge>
                        )}
                      </div>
                    ) : null}

                    {/* 3. RodapÃ©: AÃ§Ãµes */}
                    <div className="flex items-center justify-end pt-2 border-t mt-3">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenModal(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(product)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Switch
                          className="ml-2 data-[state=checked]:bg-green-500"
                          checked={product.is_active}
                          onCheckedChange={() =>
                            toggleMutation.mutate({
                              id: product.id,
                              currentStatus: product.is_active,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] sm:w-full p-4 sm:p-6 max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct
                ? "Editar Tipo de Material"
                : "Novo Tipo de Material"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    category: value as ProductCategory,
                  })
                }
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input
                  placeholder="Ex: 3M, XPEL"
                  value={formData.brand}
                  onChange={(event) =>
                    setFormData({ ...formData, brand: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  placeholder="Ex: G70, Ultimate"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({ ...formData, name: event.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {formData.category === "INSULFILM" && (
                <div className="space-y-2">
                  <Label>Transmissao de Luz</Label>
                  <Input
                    placeholder="Ex: 5%, 20%, 70%"
                    value={formData.light_transmission}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        light_transmission: event.target.value,
                      })
                    }
                  />
                </div>
              )}
            </div>

            {formData.category === "PPF" && (
              <div className="space-y-2">
                <Label>Tipo de Material PPF</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["TPU", "TPH", "PVC"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, ppf_material_type: type })
                      }
                      className={cn(
                        "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                        formData.ppf_material_type === type
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* cost_per_meter relocated to NewMaterialModal */}

            <div className="space-y-2">
              <Label>Descricao</Label>
              <Textarea
                placeholder="Descricao adicional do produto..."
                value={formData.description}
                onChange={(event) =>
                  setFormData({ ...formData, description: event.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" className="w-full sm:w-auto" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingProduct ? "Salvar Alteracoes" : "Criar Produto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

