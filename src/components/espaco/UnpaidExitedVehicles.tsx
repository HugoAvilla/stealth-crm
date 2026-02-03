import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Car,
  Calendar,
  Clock,
  Search,
  DollarSign,
  User,
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UnpaidExitedVehicle {
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
    is_open: boolean;
  } | null;
}

interface UnpaidExitedVehiclesProps {
  refreshTrigger?: number;
}

const UnpaidExitedVehicles = ({ refreshTrigger }: UnpaidExitedVehiclesProps) => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<UnpaidExitedVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [markingPaidId, setMarkingPaidId] = useState<number | null>(null);
  
  const companyId = user?.companyId;

  useEffect(() => {
    if (companyId) {
      fetchUnpaidExitedVehicles();
    }
  }, [companyId, refreshTrigger]);

  const fetchUnpaidExitedVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("spaces")
        .select(`
          *,
          client:clients(*),
          vehicle:vehicles(*),
          sale:sales(id, total, is_open)
        `)
        .eq("company_id", companyId)
        .eq("has_exited", true)
        .or("payment_status.neq.paid,payment_status.is.null")
        .order("exit_date", { ascending: false });

      if (error) throw error;

      setVehicles((data || []) as unknown as UnpaidExitedVehicle[]);
    } catch (error) {
      console.error("Erro ao buscar veículos não pagos:", error);
      toast.error("Erro ao carregar veículos não pagos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsPaid = async (spaceId: number, saleId: number | null) => {
    setMarkingPaidId(spaceId);
    try {
      // Update space payment status
      const { error: spaceError } = await supabase
        .from("spaces")
        .update({ payment_status: "paid" })
        .eq("id", spaceId);

      if (spaceError) throw spaceError;

      // Close linked sale
      if (saleId) {
        const { error: saleError } = await supabase
          .from("sales")
          .update({ is_open: false, status: "Fechada" })
          .eq("id", saleId);

        if (saleError) throw saleError;
      }

      toast.success("Pagamento confirmado! Veículo movido para aba de pagos.");
      fetchUnpaidExitedVehicles();
    } catch (error) {
      console.error("Erro ao marcar como pago:", error);
      toast.error("Erro ao confirmar pagamento");
    } finally {
      setMarkingPaidId(null);
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
            <AlertTriangle className="h-5 w-5 text-warning" />
            Veículos Não Pagos (Saída)
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
                : "Nenhum veículo com saída não paga"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredVehicles.map((space) => (
            <Card
              key={space.id}
              className="bg-card/50 border-border/50 hover:bg-card/80 transition-colors border-l-4 border-l-warning"
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
                    <Badge className="bg-warning/20 text-warning border-warning/30">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Não Pago
                    </Badge>
                    {space.sale && (
                      <span className="text-lg font-bold text-warning flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        R$ {space.sale.total.toFixed(2)}
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-success border-success/30 hover:bg-success/10 mt-2"
                      onClick={() => handleMarkAsPaid(space.id, space.sale_id)}
                      disabled={markingPaidId === space.id}
                    >
                      {markingPaidId === space.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-1" />
                      )}
                      Marcar como Pago
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default UnpaidExitedVehicles;
