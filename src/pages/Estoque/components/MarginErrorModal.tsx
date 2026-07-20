import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Scissors } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Material {
    id: number;
    name: string;
    unit: string;
    current_stock: number | null;
    company_id: number | null;
    is_open_roll: boolean | null;
}

interface MarginErrorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    material: Material | null;
    onSuccess?: () => void;
}

export function MarginErrorModal({ open, onOpenChange, material, onSuccess }: MarginErrorModalProps) {
    const { user } = useAuth();
    const [quantity, setQuantity] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!quantity || parseFloat(quantity) <= 0) {
            toast.error("Informe a quantidade");
            return;
        }

        if (!user?.id || !material) {
            toast.error("Dados inválidos");
            return;
        }

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

            const fullReason = notes ? `Perda/Desperdício: ${notes}` : "Perda/Desperdício (Margem de Erro)";
            let error = null;

            if (material.is_open_roll) {
                // Consome da bobina aberta (aumenta o acumulado)
                const { error: rpcError } = await supabase.rpc("consume_open_roll", {
                    p_material_id: material.id,
                    p_meters: parseFloat(quantity),
                    p_reason: fullReason,
                    p_user_id: user.id,
                    p_company_id: profile.company_id,
                });
                error = rpcError;
            } else if (material.unit === "Metros") {
                // Para metros em lotes, consome bobinas físicas sequencialmente
                const { data, error: rpcError } = await supabase.rpc("manual_exit_material_rolls", {
                    p_material_id: material.id,
                    p_meters: parseFloat(quantity),
                    p_reason: fullReason,
                    p_user_id: user.id,
                    p_company_id: profile.company_id,
                });

                if (rpcError) {
                    error = rpcError;
                } else if (data && data.warning) {
                    toast.error(`Estoque insuficiente. Disponível: ${data.available_meters}m`);
                    setLoading(false);
                    return;
                }
            } else {
                // Produtos normais
                const currentStock = material?.current_stock || 0;
                if (parseFloat(quantity) > currentStock) {
                    toast.error("Quantidade maior que o estoque disponível");
                    setLoading(false);
                    return;
                }

                const { error: insertError } = await supabase.from("stock_movements").insert({
                    material_id: material.id,
                    movement_type: "Saida",
                    quantity: parseFloat(quantity),
                    reason: fullReason,
                    user_id: user.id,
                    company_id: profile.company_id,
                });
                error = insertError;
            }

            if (error) throw error;

            toast.success(`Margem de erro de ${quantity} ${material.unit} registrada com sucesso!`);
            onOpenChange(false);
            setQuantity("");
            setNotes("");
            onSuccess?.();
        } catch (error) {
            console.error("Error registering waste:", error);
            toast.error("Erro ao registrar margem de erro");
        } finally {
            setLoading(false);
        }
    };

    if (!material) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-orange-500">
                        <Scissors className="h-5 w-5" /> Ajustar Margem de Erro
                    </DialogTitle>
                    <DialogDescription>
                        Lance a quantidade de material que foi perdida (por refilo, quebra etc) para igualar o estoque físico com o sistema.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    <div className="p-3 rounded-lg bg-muted/50 border border-orange-500/20">
                        <p className="font-medium">{material.name}</p>
                        {!material.is_open_roll && (
                            <p className="text-sm text-muted-foreground">
                                Estoque atual sistêmico: {material.current_stock || 0} {material.unit}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Quantidade de Perda *</Label>
                        <Input
                            type="number"
                            placeholder={`0 ${material.unit}`}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="border-orange-500/30 focus-visible:ring-orange-500/50"
                            max={!material.is_open_roll ? (material.current_stock || 0) : undefined}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Observação (Opcional)</Label>
                        <Textarea
                            placeholder="Ex: Refilo final da bobina, defeito de fábrica..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="resize-none h-20"
                        />
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button className="flex-1 bg-orange-600 hover:bg-orange-700 text-white" onClick={handleSubmit} disabled={loading}>
                            {loading ? "Processando..." : "Confirmar Baixa"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
