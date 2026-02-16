import { useState, useRef } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Edit, X, Send, Save, Bold, Italic } from "lucide-react";
import { toast } from "sonner";

interface SpaceData {
  id: number;
  name: string;
  entry_date: string | null;
  entry_time: string | null;
  exit_date: string | null;
  exit_time: string | null;
  observations: string | null;
  discount: number | null;
  client?: {
    name: string;
    phone: string;
  } | null;
  vehicle?: {
    brand: string;
    model: string;
    plate: string | null;
  } | null;
  services: Array<{ name: string; price: number }>;
  subtotal: number;
  total: number;
}

interface SpaceWhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  space: SpaceData | null;
  type: 'entrada' | 'saida';
  companyName?: string;
}

export function SpaceWhatsAppModal({ open, onOpenChange, space, type, companyName = "WFE EVOLUTION" }: SpaceWhatsAppModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [template, setTemplate] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!space) return null;

  const vehicleStr = `${space.vehicle?.brand || ''} ${space.vehicle?.model || ''} ${space.vehicle?.plate ? `(${space.vehicle.plate})` : ''}`.trim();
  const entryDateStr = space.entry_date ? format(new Date(space.entry_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR }) : '-';
  const entryTimeStr = space.entry_time || '';
  const exitDateStr = space.exit_date ? format(new Date(space.exit_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR }) : '-';
  const exitTimeStr = space.exit_time || '';
  const servicesStr = space.services.length > 0
    ? space.services.map((s, i) => `${i + 1}. ${s.name} - R$ ${s.price.toFixed(2)}`).join("\n")
    : 'Nenhum serviço';

  const defaultEntrance = `Olá ${space.client?.name || ''}!\nO seu veículo ${vehicleStr} já está sob os cuidados da nossa equipe. Agradecemos pela confiança em nosso trabalho.\n\n*Entrada:*\n${entryDateStr} ${entryTimeStr && `às ${entryTimeStr}h`}\n\n*Saída prevista:*\n${exitDateStr} ${exitTimeStr && `às ${exitTimeStr}h`}\n\n_Obs.: Uma mensagem será enviada assim que o serviço estiver pronto!_`;

  const defaultExit = `Olá ${space.client?.name || ''}!\nSeu veículo ${vehicleStr} está pronto para retirada!\n\n*Serviços realizados:*\n${servicesStr}\n\n*Total:* R$ ${space.total.toFixed(2)}\n\nAgradecemos a preferência! Qualquer dúvida estamos à disposição.`;

  const defaultMessage = type === 'entrada' ? defaultEntrance : defaultExit;

  const resolveVariables = (text: string) => {
    return text
      .replace(/\{cliente\}/g, space.client?.name || '')
      .replace(/\{veiculo\}/g, vehicleStr)
      .replace(/\{nomeEmpresa\}/g, companyName)
      .replace(/\{servicos\}/g, servicesStr)
      .replace(/\{dataEntrada\}/g, `${entryDateStr} ${entryTimeStr && `às ${entryTimeStr}h`}`)
      .replace(/\{dataSaida\}/g, `${exitDateStr} ${exitTimeStr && `às ${exitTimeStr}h`}`)
      .replace(/\{descricao\}/g, space.observations || '')
      .replace(/\{subtotal\}/g, space.subtotal.toFixed(2))
      .replace(/\{desconto\}/g, (space.discount || 0).toFixed(2))
      .replace(/\{total\}/g, space.total.toFixed(2));
  };

  const messageToSend = isEditing && template ? resolveVariables(template) : defaultMessage;

  const handleSend = () => {
    const phone = space.client?.phone?.replace(/\D/g, "");
    if (!phone) {
      toast.error("Cliente sem telefone cadastrado");
      return;
    }
    const encodedMessage = encodeURIComponent(messageToSend);
    const url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
    window.open(url, '_blank');
    toast.success("WhatsApp Web aberto em nova aba!");
    onOpenChange(false);
  };

  const handleEdit = () => {
    if (!isEditing) {
      setTemplate(defaultMessage);
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    toast.success("Mensagem salva!");
  };

  const insertVariable = (variable: string) => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newText = template.substring(0, start) + variable + template.substring(end);
    setTemplate(newText);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + variable.length;
    }, 0);
  };

  const insertFormatting = (wrapper: string) => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = template.substring(start, end);
    const newText = template.substring(0, start) + `${wrapper}${selected || 'texto'}${wrapper}` + template.substring(end);
    setTemplate(newText);
  };

  const formatWhatsAppPreview = (text: string) => {
    return text
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  const variables = [
    { label: "+ Nome Empresa", value: "{nomeEmpresa}" },
    { label: "+ Veículo", value: "{veiculo}" },
    { label: "+ Cliente", value: "{cliente}" },
    { label: "+ Serviços", value: "{servicos}" },
    { label: "+ Data entrada", value: "{dataEntrada}" },
    { label: "+ Data saída", value: "{dataSaida}" },
    { label: "+ Descrição", value: "{descricao}" },
    { label: "+ Subtotal", value: "{subtotal}" },
    { label: "+ Desconto", value: "{desconto}" },
    { label: "+ Total", value: "{total}" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <MessageCircle className="h-5 w-5 text-success" />
              </div>
              <DialogTitle>
                {type === 'entrada' ? 'Mensagem de Entrada' : 'Mensagem de Saída'}
              </DialogTitle>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <Button onClick={handleSend} className="gap-2 bg-success hover:bg-success/90" size="sm">
                    <Send className="h-4 w-4" />
                    Enviar WhatsApp
                  </Button>
                  <Button variant="outline" onClick={handleEdit} size="sm" className="gap-2">
                    <Edit className="h-4 w-4" />
                    Editar mensagem
                  </Button>
                </>
              ) : (
                <Button onClick={handleSave} className="gap-2 bg-success hover:bg-success/90" size="sm">
                  <Save className="h-4 w-4" />
                  Salvar
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={() => { setIsEditing(false); onOpenChange(false); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {isEditing ? (
            <>
              <div
                className="relative rounded-lg p-4 min-h-[300px]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23128C7E' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  backgroundColor: "#E5DDD5",
                }}
              >
                <Card className="bg-[#DCF8C6] p-4 rounded-lg shadow-md">
                  <Textarea
                    ref={textareaRef}
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    className="min-h-[250px] bg-transparent border-none focus-visible:ring-0 text-sm text-gray-800 font-sans resize-none"
                  />
                </Card>
              </div>

              {/* Formatting bar */}
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => insertFormatting('*')}>
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => insertFormatting('_')}>
                    <Italic className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-6 bg-border self-center" />
                  {variables.map((v) => (
                    <Button
                      key={v.value}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => insertVariable(v.value)}
                    >
                      {v.label}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div
              className="relative rounded-lg p-4 min-h-[400px]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23128C7E' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundColor: "#E5DDD5",
              }}
            >
              <Card className="bg-[#DCF8C6] p-4 rounded-lg shadow-md max-w-md ml-auto">
                <div
                  className="whitespace-pre-wrap text-sm text-gray-800 font-sans"
                  dangerouslySetInnerHTML={{ __html: formatWhatsAppPreview(messageToSend) }}
                />
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
}
