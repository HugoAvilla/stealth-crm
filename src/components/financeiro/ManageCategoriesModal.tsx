import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { NewCategoryModal } from "./NewCategoryModal";

interface Category {
  id: number;
  name: string;
  type: string;
  color: string | null;
}

interface ManageCategoriesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoriesChange?: () => void;
}

const COLORS = [
  { value: '#22c55e', label: 'Verde' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#eab308', label: 'Amarelo' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#a855f7', label: 'Roxo' },
  { value: '#6b7280', label: 'Cinza' },
];

export function ManageCategoriesModal({ open, onOpenChange, onCategoriesChange }: ManageCategoriesModalProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open, user?.id]);

  const fetchCategories = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.company_id) return;

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("type")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color || COLORS[0].value);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
  };

  const saveEdit = async (category: Category) => {
    if (!editName.trim()) {
      toast.error("O nome não pode estar vazio");
      return;
    }

    try {
      const { error } = await supabase
        .from("categories")
        .update({ name: editName.trim(), color: editColor })
        .eq("id", category.id);

      if (error) throw error;

      toast.success("Categoria atualizada!");
      setEditingId(null);
      fetchCategories();
      onCategoriesChange?.();
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Erro ao atualizar categoria");
    }
  };

  const deleteCategory = async (category: Category) => {
    try {
      // Check if category has transactions
      const { count } = await supabase
        .from("transactions")
        .select("*", { count: 'exact', head: true })
        .eq("category_id", category.id);

      if (count && count > 0) {
        toast.error(`Esta categoria possui ${count} transação(ões). Não pode ser excluída.`);
        return;
      }

      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", category.id);

      if (error) throw error;

      toast.success("Categoria excluída!");
      fetchCategories();
      onCategoriesChange?.();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Erro ao excluir categoria");
    }
  };

  const entradas = categories.filter(c => c.type === 'Entrada');
  const saidas = categories.filter(c => c.type === 'Saida');

  const renderCategoryItem = (category: Category) => {
    const isEditing = editingId === category.id;

    if (isEditing) {
      return (
        <div key={category.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: editColor }}
          />
          <Input
            value={editName}
            onChange={e => setEditName(e.target.value)}
            className="flex-1 h-8"
            autoFocus
          />
          <div className="flex gap-1">
            {COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setEditColor(c.value)}
                className={`w-5 h-5 rounded-full border transition-all ${
                  editColor === c.value ? 'border-foreground scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit(category)}>
            <Check className="h-4 w-4 text-green-500" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEditing}>
            <X className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      );
    }

    return (
      <div key={category.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg group">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: category.color || '#6b7280' }}
          />
          <span>{category.name}</span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEditing(category)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteCategory(category)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Categorias</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <Button onClick={() => setNewCategoryModalOpen(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Nova Categoria
            </Button>

            {loading ? (
              <div className="text-center py-4 text-muted-foreground">Carregando...</div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma categoria cadastrada</p>
                <p className="text-sm">Crie sua primeira categoria para começar</p>
              </div>
            ) : (
              <>
                {/* Entradas */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-green-500 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Entradas ({entradas.length})
                  </h3>
                  <div className="space-y-1 pl-4">
                    {entradas.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">Nenhuma categoria de entrada</p>
                    ) : (
                      entradas.map(renderCategoryItem)
                    )}
                  </div>
                </div>

                {/* Saídas */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-red-500 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    Saídas ({saidas.length})
                  </h3>
                  <div className="space-y-1 pl-4">
                    {saidas.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">Nenhuma categoria de saída</p>
                    ) : (
                      saidas.map(renderCategoryItem)
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <NewCategoryModal
        open={newCategoryModalOpen}
        onOpenChange={setNewCategoryModalOpen}
        onSuccess={() => {
          fetchCategories();
          onCategoriesChange?.();
        }}
      />
    </>
  );
}
