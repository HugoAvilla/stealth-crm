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
import { MessageCircle, Edit, X, Send } from "lucide-react";
import { SaleWithDetails } from "@/types/sales";
import { toast } from "@/hooks/use-toast";

interface WhatsAppPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleWithDetails | null;
}

const WhatsAppPreviewModal = ({ open, onOpenChange, sale }: WhatsAppPreviewModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [customMessage, setCustomMessage] = useState("");

  if (!sale) return null;

  const client = sale.client;
  const vehicle = sale.vehicle;
  const saleItems = sale.sale_items || [];

  const companyName = "WFE EVOLUTION";

  const defaultMessage = `Olá, ${client?.name}! Muito obrigado pela confiança! 
Segue abaixo o recibo da sua compra na ${companyName}.

🗓️ Data da Venda: ${format(new Date(sale.sale_date), "dd/MM/yyyy", { locale: ptBR })}
_______________________________________

📋 LISTA DE SERVIÇOS:
Veículo: ${vehicle?.brand || ''} ${vehicle?.model || ''} (Placa: ${vehicle?.plate || 'N/A'})
${saleItems.map((item, i) => `${i + 1}. ${item.service?.name || `Serviço #${item.service_id}`} - R$ ${item.total_price.toFixed(2)}`).join("\n")}

💰 Subtotal: R$ ${sale.subtotal.toFixed(2)}
💸 Desconto: R$ ${(sale.discount || 0).toFixed(2)}
💵 Total: R$ ${sale.total.toFixed(2)}

Método de Pagamento: ${sale.payment_method || 'Não informado'}

Obrigado pela preferência! Qualquer dúvida, é só me chamar. Tenha uma ótima semana!`;

  const messageToSend = isEditing && customMessage ? customMessage : defaultMessage;

  const handleSend = () => {
    const phone = client?.phone.replace(/\D/g, "");
    const encodedMessage = encodeURIComponent(messageToSend);
    const url = `https://wa.me/${phone}?text=${encodedMessage}`;
    window.location.href = url;
    toast({
      title: "WhatsApp aberto!",
      description: "A mensagem foi preparada para envio.",
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <MessageCircle className="h-5 w-5 text-success" />
              </div>
              <DialogTitle>Enviar WhatsApp</DialogTitle>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSend} className="gap-2 bg-success hover:bg-success/90">
                <Send className="h-4 w-4" />
                Enviar whatsapp
              </Button>
              <Button variant="outline" onClick={handleEdit} className="gap-2">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppPreviewModal;
