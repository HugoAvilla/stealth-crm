import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Car, User, Camera, Tag, FileText, DollarSign, Package, Plus, RefreshCw, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FillSlotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSlotFilled?: () => void;
  preselectedDate?: Date;
}

interface ClientSale {
  id: number;
  total: number;
  subtotal: number;
  discount: number | null;
  sale_date: string;
  vehicle: {
    id: number;
    brand: string;
    model: string;
    plate: string | null;
    year: number | null;
    size: string | null;
  } | null;
  sale_items: {
    id: number;
    service_id: number | null;
    quantity: number | null;
    unit_price: number;
    total_price: number;
    service: {
      id: number;
      name: string;
      base_price: number;
    } | null;
  }[];
}

export function FillSlotModal({ open, onOpenChange, onSlotFilled, preselectedDate }: FillSlotModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = user?.companyId;

  // Form state
  const [slotName, setSlotName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedSaleId, setSelectedSaleId] = useState<string>("");
  const [entryDate, setEntryDate] = useState(format(preselectedDate || new Date(), 'yyyy-MM-dd'));
  const [entryTime, setEntryTime] = useState(format(new Date(), 'HH:mm'));
  const [exitDate, setExitDate] = useState("");
  const [exitTime, setExitTime] = useState("");
  const [discount, setDiscount] = useState<number>(0);
  const [observations, setObservations] = useState("");
  const [tag, setTag] = useState("");
  
  // Toggle states for optional fields
  const [showDiscount, setShowDiscount] = useState(false);
  const [showObservations, setShowObservations] = useState(false);
  const [showTag, setShowTag] = useState(false);

  // Fetch clients
  const { data: clients, isLoading: loadingClients, refetch: refetchClients } = useQuery({
    queryKey: ['clients-for-slot', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, phone, birth_date')
        .eq('company_id', companyId)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!companyId && open,
  });

  // Fetch client's open sales
  const { data: clientSales, isLoading: loadingSales } = useQuery({
    queryKey: ['client-open-sales', selectedClientId, companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id,
          total,
          subtotal,
          discount,
          sale_date,
          vehicle:vehicles(id, brand, model, plate, year, size),
          sale_items(
            id,
            service_id,
            quantity,
            unit_price,
            total_price,
            service:services(id, name, base_price)
          )
        `)
        .eq('client_id', parseInt(selectedClientId))
        .eq('company_id', companyId)
        .eq('is_open', true)
        .order('sale_date', { ascending: false });
      if (error) throw error;
      return data as unknown as ClientSale[];
    },
    enabled: !!selectedClientId && !!companyId,
  });

  // Get selected sale details
  const selectedSale = clientSales?.find(s => s.id === parseInt(selectedSaleId));
  const selectedClient = clients?.find(c => c.id === parseInt(selectedClientId));

  // Calculate totals
  const subtotal = selectedSale?.subtotal || 0;
  const finalTotal = subtotal - (discount || 0);
  const serviceCount = selectedSale?.sale_items?.length || 0;

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSlotName("");
      setSelectedClientId("");
      setSelectedSaleId("");
      setEntryDate(format(new Date(), 'yyyy-MM-dd'));
      setEntryTime(format(new Date(), 'HH:mm'));
      setExitDate("");
      setExitTime("");
      setDiscount(0);
      setObservations("");
      setTag("");
      setShowDiscount(false);
      setShowObservations(false);
      setShowTag(false);
    }
  }, [open]);

  // Update entry date when preselectedDate changes
  useEffect(() => {
    if (preselectedDate) {
      setEntryDate(format(preselectedDate, 'yyyy-MM-dd'));
    }
  }, [preselectedDate]);

  // Reset sale when client changes
  useEffect(() => {
    setSelectedSaleId("");
  }, [selectedClientId]);

  // Mutation to create space
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSale || !companyId) throw new Error("Dados inválidos");

      const { data, error } = await supabase
        .from('spaces')
        .insert({
          name: slotName || `Vaga de ${selectedClient?.name}`,
          client_id: parseInt(selectedClientId),
          vehicle_id: selectedSale.vehicle?.id || null,
          sale_id: selectedSale.id,
          company_id: companyId,
          entry_date: entryDate,
          entry_time: entryTime,
          exit_date: exitDate || null,
          exit_time: exitTime || null,
          discount: discount || null,
          observations: observations || null,
          tag: tag || null,
          status: 'ocupada',
          payment_status: 'pending',
          has_exited: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Vaga preenchida com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      onSlotFilled?.();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Erro ao criar vaga:", error);
      toast.error("Erro ao preencher vaga");
    },
  });

  const handleSubmit = () => {
    if (!selectedClientId) {
      toast.error("Selecione um cliente");
      return;
    }
    if (!selectedSaleId) {
      toast.error("Selecione uma venda");
      return;
    }
    if (!entryDate || !entryTime) {
      toast.error("Informe a data e hora de entrada");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preencher vaga</DialogTitle>
          <DialogDescription>Informe os dados para preencher a vaga</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Nome da vaga */}
          <div className="space-y-2">
            <Label>Nome da vaga (opcional)</Label>
            <Input 
              value={slotName} 
              onChange={(e) => setSlotName(e.target.value)}
              placeholder="Ex: Vaga 1, Box A, etc."
            />
          </div>

          {/* Cliente */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Cliente *</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => refetchClients()}
                className="h-8 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Atualizar
              </Button>
            </div>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder={loadingClients ? "Carregando..." : "Selecione um cliente"} />
              </SelectTrigger>
              <SelectContent>
                {clients?.map(client => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{client.name}</span>
                      {client.phone && (
                        <span className="text-muted-foreground text-xs">({client.phone})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vendas do cliente */}
          {selectedClientId && (
            <div className="space-y-2">
              <Label>Venda em aberto *</Label>
              {loadingSales ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : clientSales && clientSales.length > 0 ? (
                <Select value={selectedSaleId} onValueChange={setSelectedSaleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma venda" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientSales.map(sale => (
                      <SelectItem key={sale.id} value={sale.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>Venda #{sale.id}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{sale.vehicle?.brand} {sale.vehicle?.model}</span>
                          <Badge variant="outline" className="ml-2">
                            R$ {sale.total.toFixed(2)}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Este cliente não possui vendas em aberto.
                </p>
              )}
            </div>
          )}

          {/* Card do veículo e serviços */}
          {selectedSale && (
            <Card className="bg-muted/50 border-border/50">
              <CardContent className="p-4 space-y-4">
                {/* Veículo */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Car className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Marca: <span className="font-medium text-foreground">{selectedSale.vehicle?.brand}</span>
                        {selectedSale.vehicle?.plate && (
                          <span className="ml-4">Placa: <span className="font-medium text-foreground">{selectedSale.vehicle.plate}</span></span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Modelo: <span className="font-medium text-foreground">{selectedSale.vehicle?.model}</span>
                        {selectedSale.vehicle?.year && (
                          <span className="ml-4">Ano: <span className="font-medium text-foreground">{selectedSale.vehicle.year}</span></span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Serviços */}
                <div className="space-y-2">
                  {selectedSale.sale_items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.service?.name || 'Serviço'}</span>
                      <span className="font-medium">R$ {item.total_price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total em serviços</span>
                  <span className="font-bold text-primary">R$ {subtotal.toFixed(2)}</span>
                </div>

                <Badge variant="secondary" className="text-xs">
                  {serviceCount} serviço(s) adicionado(s) R$ {subtotal.toFixed(2)}
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* Datas de entrada e saída */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dia da entrada *
              </Label>
              <Input 
                type="date" 
                value={entryDate} 
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Hora da entrada *
              </Label>
              <Input 
                type="time" 
                value={entryTime} 
                onChange={(e) => setEntryTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dia da saída (previsão)
              </Label>
              <Input 
                type="date" 
                value={exitDate} 
                onChange={(e) => setExitDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Hora da saída
              </Label>
              <Input 
                type="time" 
                value={exitTime} 
                onChange={(e) => setExitTime(e.target.value)}
              />
            </div>
          </div>

          {/* Fotos de checklist - placeholder */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Fotos de checklist
            </Label>
            <p className="text-sm text-muted-foreground">Abaixo estão as fotos dessa vaga</p>
            <Button variant="outline" className="w-full" disabled>
              <Plus className="h-4 w-4 mr-2" />
              Carregar nova foto 0/20
            </Button>
          </div>

          {/* Campos opcionais */}
          <div className="space-y-2">
            <Label>Campos opcionais</Label>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant={showDiscount ? "default" : "outline"} 
                size="sm"
                onClick={() => setShowDiscount(!showDiscount)}
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Desconto
              </Button>
              <Button 
                variant={showObservations ? "default" : "outline"} 
                size="sm"
                onClick={() => setShowObservations(!showObservations)}
              >
                <FileText className="h-4 w-4 mr-1" />
                Observações
              </Button>
              <Button 
                variant={showTag ? "default" : "outline"} 
                size="sm"
                onClick={() => setShowTag(!showTag)}
              >
                <Tag className="h-4 w-4 mr-1" />
                Tag
              </Button>
            </div>
          </div>

          {/* Campos opcionais expandidos */}
          {showDiscount && (
            <div className="space-y-2">
              <Label>Desconto (R$)</Label>
              <Input 
                type="number" 
                value={discount || ""} 
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          )}

          {showObservations && (
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea 
                value={observations} 
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Observações sobre a vaga..."
              />
            </div>
          )}

          {showTag && (
            <div className="space-y-2">
              <Label>Tag</Label>
              <Input 
                value={tag} 
                onChange={(e) => setTag(e.target.value)}
                placeholder="Ex: Urgente, VIP, etc."
              />
            </div>
          )}

          {/* Resumo da vaga */}
          {selectedSale && (
            <Card className="bg-muted/30 border-border/50">
              <CardContent className="p-4 space-y-2">
                <h4 className="font-medium">Resumo da vaga</h4>
                <div className="space-y-1 text-sm">
                  <p className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>Vaga com {serviceCount} serviço(s)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>Sub-total ficou em R$ {subtotal.toFixed(2)}</span>
                  </p>
                  {discount > 0 && (
                    <p className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span>Desconto de R$ {discount.toFixed(2)}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-2 font-medium">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="text-primary">Total ficou em R$ {finalTotal.toFixed(2)}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Entrada em {format(new Date(entryDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    <span>Nenhuma foto adicionada</span>
                  </p>
                  <p className="flex items-center gap-2 text-warning">
                    <span className="text-lg">⚠️</span>
                    <span>O valor pendente para fechar a venda é de R$ {finalTotal.toFixed(2)}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botão de ação */}
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleSubmit}
            disabled={createMutation.isPending || !selectedClientId || !selectedSaleId}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Check className="h-5 w-5 mr-2" />
            )}
            Adicionar vaga
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
