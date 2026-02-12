import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mail, Loader2 } from "lucide-react";
import { issuedWarranties, getClientById } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
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
    `Olá ${client?.name || ''},\n\nSegue em anexo o certificado de garantia ${warranty?.certificate_number || ''} referente ao serviço realizado.\n\nAtenciosamente,\nCRM WFE`
  );
  const [sending, setSending] = useState(false);

  const buildHtmlEmail = () => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1a1a2e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">CRM WFE</h1>
          <p style="margin: 5px 0 0; opacity: 0.8;">Certificado de Garantia</p>
        </div>
        <div style="border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Certificado: ${warranty?.certificate_number || ''}</h2>
          <p style="color: #555; white-space: pre-line;">${message}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center;">
            Este email foi enviado automaticamente pelo CRM WFE.<br/>
            Por favor, não responda a este email.
          </p>
        </div>
      </div>
    `;
  };

  const handleSend = async () => {
    if (!email) {
      toast.error("Informe o email de destino");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject,
          html: buildHtmlEmail(),
          text: message,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Email enviado com sucesso para ${email}!`);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Erro ao enviar email:", err);
      toast.error(err.message || "Erro ao enviar email. Tente novamente.");
    } finally {
      setSending(false);
    }
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
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={sending}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSend} disabled={sending}>
              {sending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Enviar</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
