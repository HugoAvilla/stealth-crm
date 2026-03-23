import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface NewCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: 'entrada' | 'saida';
  onSuccess?: (categoryId: number) => void;
}

const COLORS = [
  { value: '#22c55e', label: 'Verde' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#eab308', label: 'Amarelo' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#a855f7', label: 'Roxo' },
  { value: '#6b7280', label: 'Cinza' },
];

export function NewCategoryModal({ open, onOpenChange, defaultType = 'entrada', onSuccess }: NewCategoryModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [type, setType] = useState<'entrada' | 'saida'>(defaultType);
  const [color, setColor] = useState(COLORS[0].value);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setType(defaultType);
    }
  }, [open, defaultType]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome da categoria");
      return;
    }

    if (!user?.id) return;

    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.company_id) {
        toast.error("Empresa não encontrada");
        return;
      }

      const { data, error } = await supabase
        .from("categories")
        .insert({
          name: name.trim(),
          type: type === 'entrada' ? 'Entrada' : 'Saida',
          color,
          company_id: profile.company_id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Categoria criada com sucesso!");
      onOpenChange(false);
      resetForm();
      onSuccess?.(data.id);
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error("Erro ao criar categoria");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setType(defaultType);
    setColor(COLORS[0].value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Categoria</DialogTitle>
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
                <RadioGroupItem value="entrada" id="entrada" />
                <Label htmlFor="entrada" className="cursor-pointer text-green-500 font-medium">Entrada</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="saida" id="saida" />
                <Label htmlFor="saida" className="cursor-pointer text-red-500 font-medium">Saída</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c.value}
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
              {loading ? "Criando..." : "Criar Categoria"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
