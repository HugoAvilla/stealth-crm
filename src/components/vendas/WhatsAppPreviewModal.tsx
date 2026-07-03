import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { MessageCircle, Edit, X, Send, Loader2 } from "lucide-react";
import { SaleWithDetails, DetailedServiceItemDB } from "@/types/sales";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface WhatsAppPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleWithDetails | null;
}

const WhatsAppPreviewModal = ({ open, onOpenChange, sale }: WhatsAppPreviewModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [customMessage, setCustomMessage] = useState("");

  // Fetch detailed service items
  const { data: detailedItems, isLoading: loadingItems } = useQuery({
    queryKey: ['sale-detailed-items', sale?.id],
    queryFn: async () => {
      if (!sale?.id) return [];
      const { data, error } = await supabase
        .from('service_items_detailed')
        .select(`
          *,
          product_type:product_types(brand, name, model, category, light_transmission),
          region:vehicle_regions(name, description)
        `)
        .eq('sale_id', sale.id);
      
      if (error) {
        console.error('Error fetching detailed items:', error);
        return [];
      }
      return (data || []) as DetailedServiceItemDB[];
    },
    enabled: !!sale?.id && open,
  });

  // Fetch sale payments
  const { data: salePayments, isLoading: loadingPayments } = useQuery({
    queryKey: ['sale-payments', sale?.id],
    queryFn: async () => {
      if (!sale?.id) return [];
      const { data, error } = await supabase
        .from('sale_payments')
        .select('*')
        .eq('sale_id', sale.id);
      
      if (error) {
        console.error('Error fetching sale payments:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!sale?.id && open,
  });

  if (!sale) return null;

  const client = sale.client;
  const vehicle = sale.vehicle;
  const saleItems = sale.sale_items || [];
  const isLoading = loadingItems || loadingPayments;

  const companyName = "WFE EVOLUTION";

  // Format detailed services list
  const servicesListString = detailedItems && detailedItems.length > 0
    ? detailedItems.map((item, i) => {
        const regionName = item.display_name || item.region?.name || 'Região';
        const categoryBadge = item.category ? ` [${item.category}]` : '';
        return `${i + 1}. ${regionName}${categoryBadge} R$ ${item.total_price.toFixed(2)}`;
      }).join("\n")
    : saleItems.map((item, i) => `${i + 1}. ${item.service?.name || `Serviço #${item.service_id}`} - R$ ${item.total_price.toFixed(2)}`).join("\n");

  // Format payments information
  let paymentInfo = "";
  if (sale.is_open) {
    paymentInfo = "*Forma de Pagamento:* Em aberto (a receber)";
  } else if (salePayments && salePayments.length > 0) {
    if (salePayments.length === 1) {
      const p = salePayments[0];
      paymentInfo = `*Forma de Pagamento:* ${p.method}${p.installments > 1 ? ` (${p.installments}x)` : ''}`;
    } else {
      paymentInfo = `*Formas de Pagamento:* \n${salePayments.map(p => `• ${p.method}${p.installments > 1 ? ` (${p.installments}x)` : ''}: R$ ${p.amount.toFixed(2)}`).join("\n")}`;
    }
  } else {
    paymentInfo = `*Forma de Pagamento:* ${sale.payment_method || 'Não informado'}`;
  }

  const defaultMessage = `Olá, ${client?.name}! Muito obrigado pela confiança! 
Segue abaixo o recibo da sua compra na ${companyName}.

🗓️ Data da Venda: ${format(new Date(sale.sale_date), "dd/MM/yyyy", { locale: ptBR })}
_______________________________________

📋 DETALHES DO VEÍCULO:
🚗 Veículo: ${vehicle?.brand || ''} ${vehicle?.model || ''}
🏷️ Placa: ${vehicle?.plate || 'N/A'}${vehicle?.year ? `\n📅 Ano: ${vehicle.year}` : ''}${vehicle?.size ? `\n📏 Porte: ${vehicle.size}` : ''}

🛠️ LISTA DE SERVIÇOS:
${servicesListString || 'Nenhum serviço registrado'}
_______________________________________

💰 Subtotal: R$ ${sale.subtotal.toFixed(2)}
💸 Desconto: R$ ${(sale.discount || 0).toFixed(2)}
💵 Total: R$ ${sale.total.toFixed(2)}

${paymentInfo}

Obrigado pela preferência! Qualquer dúvida, é só me chamar. Tenha uma ótima semana!`;

  const messageToSend = isEditing && customMessage ? customMessage : defaultMessage;

  const getWhatsAppUrl = () => {
    if (!client?.phone) return "#";
    const phone = client.phone.replace(/\D/g, "");
    const phoneWithCountryCode = phone.startsWith("55") ? phone : `55${phone}`;
    const encodedMessage = encodeURIComponent(messageToSend);
    return `https://wa.me/${phoneWithCountryCode}?text=${encodedMessage}`;
  };

  const handleSend = (e: React.MouseEvent) => {
    if (!client?.phone) {
      e.preventDefault();
      toast({
        title: "Erro!",
        description: "Cliente sem telefone cadastrado.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Abrindo WhatsApp Web!",
      description: "A mensagem será aberta em uma nova aba.",
    });
    onOpenChange(false);
  };

  const handleEdit = () => {
    if (!isEditing) {
      setCustomMessage(defaultMessage);
    }
    setIsEditing(!isEditing);
  };

  const charCount = messageToSend.length;
  const isOverLimit = charCount > 4000;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="max-w-2xl max-h-[90vh] overflow-y-auto" confirmClose={false}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <MessageCircle className="h-5 w-5 text-success" />
              </div>
              <DialogTitle>Enviar WhatsApp</DialogTitle>
            </div>
            <div className="flex gap-2">
              <a
                href={isLoading ? "#" : getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (isLoading) {
                    e.preventDefault();
                    return;
                  }
                  handleSend(e);
                }}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-success text-white hover:bg-success/90 h-10 px-4 py-2",
                  isLoading && "opacity-50 pointer-events-none"
                )}
              >
                <Send className="h-4 w-4" />
                Enviar whatsapp
              </a>
              <Button variant="outline" onClick={handleEdit} className="gap-2" disabled={isLoading}>
                <Edit className="h-4 w-4" />
                {isEditing ? "Cancelar edição" : "Editar mensagem"}
              </Button>
              <Button variant="destructive" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-success animate-duration-1000" />
              <p className="text-muted-foreground text-sm">Carregando detalhes da venda...</p>
            </div>
          ) : (
            <>
              {/* Warning Banner */}
              <Card className="p-3 bg-primary/20 border-primary">
                <p className="text-sm text-primary-foreground">
                  ⚠️ Caso o tamanho de 4000 caracteres seja excedido, o campo descrição do serviço não aparecerá
                </p>
              </Card>

              {/* Character count */}
              <div className="text-sm text-right">
                <span className={isOverLimit ? "text-destructive" : "text-muted-foreground"}>
                  {charCount} / 4000 caracteres
                </span>
              </div>

              {/* Message Preview/Editor */}
              {isEditing ? (
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                  maxLength={4000}
                />
              ) : (
                <div
                  className="relative rounded-lg p-4 min-h-[400px]"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23128C7E' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    backgroundColor: "#E5DDD5",
                  }}
                >
                  <Card className="bg-[#DCF8C6] p-4 rounded-lg shadow-md max-w-md ml-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                      {messageToSend}
                    </pre>
                    <div className="text-right mt-2">
                      <span className="text-[10px] text-gray-500">
                        {format(new Date(), "HH:mm")}
                      </span>
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppPreviewModal;
