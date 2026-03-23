import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Category {
  id: number;
  name: string;
  type: string;
  color: string | null;
}

interface EditCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  onSuccess?: () => void;
}

const COLORS = [
  { value: '#22c55e', label: 'Verde' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#eab308', label: 'Amarelo' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#a855f7', label: 'Roxo' },
  { value: '#6b7280', label: 'Cinza' },
];

export function EditCategoryModal({ open, onOpenChange, category, onSuccess }: EditCategoryModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<'entrada' | 'saida'>('entrada');
  const [color, setColor] = useState(COLORS[0].value);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setType(category.type.toLowerCase() === 'entrada' ? 'entrada' : 'saida');
      setColor(category.color || COLORS[0].value);
    }
  }, [category, open]);

  const handleSubmit = async () => {
    if (!category) return;
    if (!name.trim()) {
      toast.error("Informe o nome da categoria");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("categories")
        .update({
          name: name.trim(),
          type: type === 'entrada' ? 'Entrada' : 'Saida',
          color,
        })
        .eq("id", category.id);

      if (error) throw error;

      toast.success("Categoria atualizada com sucesso!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Erro ao atualizar categoria");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Categoria</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              placeholder="Ex: Vendas Online"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo *</Label>
            <RadioGroup value={type} onValueChange={(v) => setType(v as 'entrada' | 'saida')} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="entrada" id="edit-entrada" />
                <Label htmlFor="edit-entrada" className="cursor-pointer text-green-500 font-medium">Entrada</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="saida" id="edit-saida" />
                <Label htmlFor="edit-saida" className="cursor-pointer text-red-500 font-medium">Saída</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={`edit-${c.value}`}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c.value ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
