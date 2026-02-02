import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, GripVertical, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProductCategory, VehicleRegion } from "@/lib/database.types";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface VehicleRegionsTabProps {
  companyId: number | null;
}

interface SortableRegionCardProps {
  region: VehicleRegion;
  onEdit: (region: VehicleRegion) => void;
  onDelete: (region: VehicleRegion) => void;
}

function SortableRegionCard({ region, onEdit, onDelete }: SortableRegionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: region.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab hover:text-primary touch-none"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      <div className="flex-1">
        <p className="font-medium">{region.name}</p>
        {region.description && (
          <p className="text-sm text-muted-foreground">{region.description}</p>
        )}
      </div>

      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => onEdit(region)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(region)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function VehicleRegionsTab({ companyId }: VehicleRegionsTabProps) {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<ProductCategory>("INSULFILM");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<VehicleRegion | null>(null);
  const [deletingRegion, setDeletingRegion] = useState<VehicleRegion | null>(null);
  const [localRegions, setLocalRegions] = useState<VehicleRegion[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    category: "INSULFILM" as ProductCategory,
    name: "",
    description: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: regions, isLoading } = useQuery({
    queryKey: ["vehicle-regions", activeCategory, companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("vehicle_regions")
        .select("*")
        .eq("company_id", companyId)
        .eq("category", activeCategory)
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data as VehicleRegion[];
    },
    enabled: !!companyId,
  });

  useEffect(() => {
    if (regions) {
      setLocalRegions(regions);
    }
  }, [regions]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Buscar próximo sort_order
      const { data: maxOrderData } = await supabase
        .from("vehicle_regions")
        .select("sort_order")
        .eq("company_id", companyId)
        .eq("category", data.category)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = (maxOrderData?.sort_order || 0) + 1;

      const { data: result, error } = await supabase
        .from("vehicle_regions")
        .insert({
          ...data,
          company_id: companyId,
          sort_order: nextOrder,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success("Região criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["vehicle-regions"] });
      handleCloseModal();
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar região: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof formData> }) => {
      const { data: result, error } = await supabase
        .from("vehicle_regions")
        .update(data)
        .eq("id", id)
        .eq("company_id", companyId)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success("Região atualizada!");
      queryClient.invalidateQueries({ queryKey: ["vehicle-regions"] });
      handleCloseModal();
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar região: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("vehicle_regions")
        .delete()
        .eq("id", id)
        .eq("company_id", companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Região excluída!");
      queryClient.invalidateQueries({ queryKey: ["vehicle-regions"] });
      setIsDeleteAlertOpen(false);
      setDeletingRegion(null);
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir região: " + error.message);
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (reorderedRegions: VehicleRegion[]) => {
      const updates = reorderedRegions.map((region, index) => ({
        id: region.id,
        sort_order: index,
        company_id: region.company_id,
        category: region.category,
        name: region.name,
        description: region.description,
        is_active: region.is_active,
      }));

      const { error } = await supabase.from("vehicle_regions").upsert(updates);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ordem atualizada!");
      queryClient.invalidateQueries({ queryKey: ["vehicle-regions"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar ordem: " + error.message);
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalRegions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const reordered = arrayMove(items, oldIndex, newIndex);
        updateOrderMutation.mutate(reordered);
        return reordered;
      });
    }
  };

  const handleOpenModal = (region?: VehicleRegion) => {
    if (region) {
      setEditingRegion(region);
      setFormData({
        category: region.category,
        name: region.name,
        description: region.description || "",
      });
    } else {
      setEditingRegion(null);
      setFormData({
        category: activeCategory,
        name: "",
        description: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRegion(null);
    setFormData({
      category: activeCategory,
      name: "",
      description: "",
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Nome da região é obrigatório");
      return;
    }

    if (editingRegion) {
      updateMutation.mutate({
        id: editingRegion.id,
        data: { name: formData.name, description: formData.description },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDeleteClick = (region: VehicleRegion) => {
    setDeletingRegion(region);
    setIsDeleteAlertOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
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
          <Plus className="h-4 w-4 mr-2" /> Nova Região
        </Button>
      </div>

      {/* Lista de regiões */}
      {localRegions.length === 0 ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-12 text-center">
            <Car className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma região cadastrada</h3>
            <p className="text-muted-foreground mb-4">
              Cadastre as regiões do veículo para {activeCategory}
            </p>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" /> Cadastrar Primeira Região
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localRegions.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {localRegions.map((region) => (
                <SortableRegionCard
                  key={region.id}
                  region={region}
                  onEdit={handleOpenModal}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Modal de criar/editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRegion ? "Editar Região" : "Nova Região"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v as ProductCategory })}
                disabled={!!editingRegion}
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

            <div className="space-y-2">
              <Label>Nome da Região *</Label>
              <Input
                placeholder="Ex: Para-brisa, Capô"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descrição da região..."
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
              {editingRegion ? "Salvar Alterações" : "Criar Região"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert de confirmação de exclusão */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a região
              "{deletingRegion?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingRegion && deleteMutation.mutate(deletingRegion.id)}
              disabled={deleteMutation.isPending}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
