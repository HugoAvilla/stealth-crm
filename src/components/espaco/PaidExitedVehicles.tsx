import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Car,
  CheckCircle,
  Calendar,
  Clock,
  Search,
  DollarSign,
  User,
  FileText,
  Loader2,
  Trash2,
  Undo2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { reverseAllSaleTransactions } from "@/lib/financialTransactions";

interface PaidExitedVehicle {
  id: number;
  name: string;
  client_id: number | null;
  vehicle_id: number | null;
  sale_id: number | null;
  entry_date: string | null;
  entry_time: string | null;
  exit_date: string | null;
  exit_time: string | null;
  payment_status: string | null;
  observations: string | null;
  client?: {
    id: number;
    name: string;
    phone: string;
  } | null;
  vehicle?: {
    id: number;
    brand: string;
    model: string;
    plate: string | null;
    year: number | null;
  } | null;
  sale?: {
    id: number;
    total: number;
  } | null;
}

interface PaidExitedVehiclesProps {
  refreshTrigger?: number;
}

const PaidExitedVehicles = ({ refreshTrigger }: PaidExitedVehiclesProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<PaidExitedVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Custom dialog states
  const [revertSpace, setRevertSpace] = useState<PaidExitedVehicle | null>(null);
  const [isReverting, setIsReverting] = useState(false);
  const [deleteSpaceId, setDeleteSpaceId] = useState<number | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  const companyId = user?.companyId;

  useEffect(() => {
    if (companyId) {
      fetchPaidExitedVehicles();
    }
  }, [companyId, refreshTrigger]);

  const fetchPaidExitedVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("spaces")
        .select(`
          id, name, client_id, vehicle_id, sale_id, entry_date, entry_time, exit_date, exit_time, payment_status, observations, company_id,
          client:clients(id, name, phone),
          vehicle:vehicles(id, brand, model, plate, year),
          sale:sales(id, total)
        `)
        .eq("company_id", companyId)
        .eq("payment_status", "paid")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setVehicles((data || []) as unknown as PaidExitedVehicle[]);
    } catch (error) {
      logger.error("Erro ao buscar veículos pagos:", error);
      toast({
        title: "Erro ao carregar veículos pagos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevertConfirm = async () => {
    if (!revertSpace) return;
    setIsReverting(true);

    try {
      // 1) First update the space — clears sale_id FK and resets status
      const { error: spaceError } = await supabase
        .from("spaces")
        .update({
          payment_status: "pending",
          sale_id: null,
          has_exited: false,
          exit_date: null,
          exit_time: null
        })
        .eq("id", revertSpace.id);

      if (spaceError) throw spaceError;

      // 2) If there was a linked sale, delete all dependent records then the sale
      if (revertSpace.sale_id) {
        // Delete service_items_detailed linked to the sale
        const { error: sidError } = await supabase
          .from("service_items_detailed")
          .delete()
          .eq("sale_id", revertSpace.sale_id);
        if (sidError) logger.error("Erro ao deletar service_items_detailed:", sidError);

        // Delete sale_items linked to the sale
        const { error: siError } = await supabase
          .from("sale_items")
          .delete()
          .eq("sale_id", revertSpace.sale_id);
        if (siError) logger.error("Erro ao deletar sale_items:", siError);

        // Delete sale_commissions linked to the sale
        const { error: scError } = await supabase
          .from("sale_commissions")
          .delete()
          .eq("sale_id", revertSpace.sale_id);
        if (scError) logger.error("Erro ao deletar sale_commissions:", scError);

        // Delete transactions linked to the sale via centralized service
        // The trigger handles balance correction on DELETE
        const { count: reversedTxs } = await reverseAllSaleTransactions(revertSpace.sale_id, "delete");
        if (reversedTxs > 0) {
          logger.log(`[PaidExited] Reversed ${reversedTxs} transactions for sale ${revertSpace.sale_id}`);
        }

        // Delete warranties linked to the sale
        const { error: wError } = await supabase
          .from("warranties")
          .delete()
          .eq("sale_id", revertSpace.sale_id);
        if (wError) logger.error("Erro ao deletar warranties:", wError);

        // Finally delete the sale itself
        const { error: saleError } = await supabase
          .from("sales")
          .delete()
          .eq("id", revertSpace.sale_id);

        if (saleError) {
          logger.error("Erro ao deletar venda vinculada:", saleError);
          // Sale deletion failed but space was already reverted — log but don't throw
        }
      }

      toast({
        title: "Vaga revertida com sucesso!",
        description: "A vaga retornou para o status original na aba de espaços ativos.",
      });
      fetchPaidExitedVehicles();
      setRevertSpace(null);
    } catch (error) {
      logger.error("Erro ao reverter vaga:", error);
      toast({
        title: "Erro ao reverter",
        description: "Não foi possível reverter a vaga.",
        variant: "destructive",
      });
    } finally {
      setIsReverting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteSpaceId) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase.rpc('soft_delete_space', {
        p_space_id: deleteSpaceId,
        p_reason: deleteReason.trim() || "Nenhum motivo informado."
      });

      if (error) throw error;

      toast({
        title: "Vaga movida para a lixeira com sucesso!",
      });
      fetchPaidExitedVehicles();
      setDeleteSpaceId(null);
      setDeleteReason("");
    } catch (error) {
      logger.error("Erro ao excluir registro:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível mover o registro para a lixeira.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  const filteredVehicles = vehicles.filter((v) => {
    const term = searchTerm.toLowerCase();
    return (
      v.client?.name?.toLowerCase().includes(term) ||
      v.vehicle?.brand?.toLowerCase().includes(term) ||
      v.vehicle?.model?.toLowerCase().includes(term) ||
      v.vehicle?.plate?.toLowerCase().includes(term)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com busca */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Veículos Pagos
          </h3>
          <p className="text-sm text-muted-foreground">
            {filteredVehicles.length} registro(s)
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, veículo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Lista de veículos */}
      {filteredVehicles.length === 0 ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {searchTerm
                ? "Nenhum veículo encontrado com esse termo"
                : "Nenhum veículo pago ainda"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredVehicles.map((space) => (
            <Card
              key={space.id}
              className="bg-card/50 border-border/50 hover:bg-card/80 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    {/* Cliente */}
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-info" />
                      <span className="font-medium">
                        {space.client?.name || "Cliente não informado"}
                      </span>
                    </div>

                    {/* Veículo */}
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {space.vehicle
                          ? `${space.vehicle.brand} ${space.vehicle.model} - ${space.vehicle.plate || "Sem placa"}`
                          : "Veículo não informado"}
                      </span>
                    </div>

                    {/* Datas */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Entrada: {formatDate(space.entry_date)}{" "}
                        {space.entry_time && `às ${space.entry_time}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Saída: {formatDate(space.exit_date)}{" "}
                        {space.exit_time && `às ${space.exit_time}`}
                      </span>
                    </div>

                    {/* Observações */}
                    {space.observations && (
                      <div className="flex items-start gap-2 mt-2">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <p className="text-sm text-muted-foreground">
                          {space.observations}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Status e Valor */}
                  <div className="flex flex-col items-end gap-2">
                    <Badge className="bg-success/20 text-success border-success/30">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Pago
                    </Badge>
                    {space.sale && (
                      <span className="text-lg font-bold text-success flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        R$ {space.sale.total.toFixed(2)}
                      </span>
                    )}
                    <div className="flex gap-2 mt-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                        onClick={() => setRevertSpace(space)}
                      >
                        <Undo2 className="h-4 w-4 mr-2" />
                        Reverter
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteSpaceId(space.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Confirmação de Reversão */}
      <Dialog open={!!revertSpace} onOpenChange={(open) => !open && setRevertSpace(null)}>
        <DialogContent className="w-[95vw] max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Undo2 className="h-5 w-5 text-amber-500" />
              Reverter Vaga
            </DialogTitle>
            <DialogDescription>
              Deseja reverter esta vaga para não paga? Caso esteja vinculada a uma venda, a venda será excluída e os serviços retornarão para a vaga.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-row gap-2 justify-end sm:justify-end mt-4">
            <Button variant="outline" onClick={() => setRevertSpace(null)} disabled={isReverting}>
              Cancelar
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
              onClick={handleRevertConfirm}
              disabled={isReverting}
            >
              {isReverting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Undo2 className="h-4 w-4" />
              )}
              Reverter Vaga
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão (Mover para Lixeira) */}
      <Dialog open={!!deleteSpaceId} onOpenChange={(open) => !open && (setDeleteSpaceId(null), setDeleteReason(""))}>
        <DialogContent className="w-[95vw] max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Mover para a Lixeira
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja mover esta vaga para a lixeira operacional?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="delete-reason" className="text-xs font-semibold">Motivo da Exclusão</Label>
            <Input
              id="delete-reason"
              placeholder="Digite o motivo da exclusão..."
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="w-full"
            />
          </div>

          <DialogFooter className="flex-row gap-2 justify-end sm:justify-end mt-4">
            <Button variant="outline" onClick={() => (setDeleteSpaceId(null), setDeleteReason(""))} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-white gap-2"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Mover para Lixeira
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaidExitedVehicles;
