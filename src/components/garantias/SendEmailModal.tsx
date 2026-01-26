import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mail } from "lucide-react";
import { getClientById, issuedWarranties } from "@/lib/mockData";
import { toast } from "sonner";

interface SendEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warranty: typeof issuedWarranties[0] | null;
}

export function SendEmailModal({ open, onOpenChange, warranty }: SendEmailModalProps) {
  const client = warranty ? getClientById(warranty.client_id) : null;
  const [email, setEmail] = useState(client?.email || "");
  const [subject, setSubject] = useState(`Certificado de Garantia - ${warranty?.certificate_number || ''}`);
  const [message, setMessage] = useState(
    `Olá ${client?.name || ''},\n\nSegue em anexo o certificado de garantia ${warranty?.certificate_number || ''} referente ao serviço realizado.\n\nAtenciosamente,\nWFE Evolution`
  );

  const handleSend = () => {
    if (!email) {
      toast.error("Informe o email de destino");
      return;
    }

    toast.success(`Email enviado para ${email}!`);
    onOpenChange(false);
  };

  if (!warranty) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Enviar por Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p className="font-mono">{warranty.certificate_number}</p>
          </div>

          <div className="space-y-2">
            <Label>Email de Destino *</Label>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Assunto</Label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              rows={5}
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSend}>
              <Send className="h-4 w-4 mr-2" /> Enviar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
