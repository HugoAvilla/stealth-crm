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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  User,
  Phone,
  Car,
  Calendar,
  CreditCard,
  FileText,
  MessageCircle,
  Eye,
  ArrowRight,
  Edit,
  Trash2,
  Settings,
} from "lucide-react";
import { Sale, getClientById, getVehicleById, getServiceById } from "@/lib/mockData";
import { toast } from "@/hooks/use-toast";
import PdfA4Modal from "@/components/vendas/PdfA4Modal";
import PdfNotinhaModal from "@/components/vendas/PdfNotinhaModal";
import WhatsAppPreviewModal from "@/components/vendas/WhatsAppPreviewModal";

interface SaleDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
}

const SaleDetailsModal = ({ open, onOpenChange, sale }: SaleDetailsModalProps) => {
  const [isPdfA4Open, setIsPdfA4Open] = useState(false);
  const [isPdfNotinhaOpen, setIsPdfNotinhaOpen] = useState(false);
  const [pdfNotinhaSize, setPdfNotinhaSize] = useState<"80mm" | "58mm">("80mm");
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  if (!sale) return null;

  const client = getClientById(sale.client_id);
  const vehicle = getVehicleById(sale.vehicle_id);
  const saleServices = sale.services.map((id) => getServiceById(id)).filter(Boolean);

  const handleOpenNotinha = (size: "80mm" | "58mm") => {
    setPdfNotinhaSize(size);
    setIsPdfNotinhaOpen(true);
  };

  const handleWhatsAppSend = () => {
    const phone = client?.phone.replace(/\D/g, "");
    if (phone) {
      window.open(`https://wa.me/${phone}`, "_blank");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <DialogTitle>Venda Nº {sale.id}</DialogTitle>
                  <Badge variant={sale.status === "Fechada" ? "default" : "outline"}>
                    {sale.status}
                  </Badge>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Client Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Cliente</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-info" />
                  <span className="font-medium">{client?.name || "Cliente"}</span>
                </div>
                <a
                  href={`https://wa.me/${client?.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-success hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {client?.phone}
                </a>
              </div>
            </div>

            {/* Vehicle & Services Card */}
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Car className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {vehicle?.brand} {vehicle?.model}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {vehicle?.year} • {vehicle?.plate}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                {saleServices.map((service) => (
                  <div key={service!.id} className="flex justify-between">
                    <span>{service!.name}</span>
                    <span className="font-medium">
                      R$ {service!.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-between font-semibold">
                <span>Total do veículo</span>
                <span className="text-success">
                  R$ {sale.subtotal.toFixed(2)}
                </span>
              </div>
            </Card>

            {/* Financial Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-info" />
                <span className="text-sm text-muted-foreground">
                  {saleServices.length} serviço(s)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-info" />
                <span className="text-sm text-muted-foreground">
                  {format(new Date(sale.date), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-info" />
                <span className="text-sm text-muted-foreground">
                  Subtotal: R$ {sale.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-info" />
                <span className="text-sm text-muted-foreground">
                  Desconto: R$ {sale.discount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">
                  Total: R$ {sale.total.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-info" />
                <span className="text-sm text-muted-foreground">
                  {sale.payment_method}
                </span>
              </div>
            </div>

            {/* Document Actions */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Central de Documentos
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="gap-2 border-primary text-primary hover:bg-primary/10"
                  onClick={() => setIsPdfA4Open(true)}
                >
                  <FileText className="h-4 w-4" />
                  PDF A4
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-primary text-primary hover:bg-primary/10"
                  onClick={() => handleOpenNotinha("80mm")}
                >
                  <FileText className="h-4 w-4" />
                  Notinha 80mm
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-primary text-primary hover:bg-primary/10"
                  onClick={() => handleOpenNotinha("58mm")}
                >
                  <FileText className="h-4 w-4" />
                  Notinha 58mm
                </Button>
              </div>
            </div>

            {/* CRM Actions */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Ações CRM
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  className="gap-2 bg-success hover:bg-success/90"
                  onClick={() => setIsWhatsAppOpen(true)}
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-violet-500 text-violet-500 hover:bg-violet-500/10"
                  onClick={() => toast({ title: "Ver cliente", description: "Abrindo perfil do cliente..." })}
                >
                  <Eye className="h-4 w-4" />
                  Ver cliente
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-info text-info hover:bg-info/10"
                  onClick={() => toast({ title: "Exportar para vaga", description: "Vaga criada com sucesso!" })}
                >
                  <ArrowRight className="h-4 w-4" />
                  Exportar p/ vaga
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="default" className="flex-1 gap-2">
              <Edit className="h-4 w-4" />
              Editar
            </Button>
            <Button variant="destructive" className="flex-1 gap-2">
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PdfA4Modal
        open={isPdfA4Open}
        onOpenChange={setIsPdfA4Open}
        sale={sale}
      />

      <PdfNotinhaModal
        open={isPdfNotinhaOpen}
        onOpenChange={setIsPdfNotinhaOpen}
        sale={sale}
        size={pdfNotinhaSize}
      />

      <WhatsAppPreviewModal
        open={isWhatsAppOpen}
        onOpenChange={setIsWhatsAppOpen}
        sale={sale}
      />
    </>
  );
};

export default SaleDetailsModal;
