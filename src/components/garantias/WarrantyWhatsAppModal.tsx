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
import { MessageCircle, Edit, X, Send, Save, Bold, Italic } from "lucide-react";
import { toast } from "sonner";

interface WarrantyWhatsAppData {
  certNumber: string;
  clientName: string;
  clientPhone: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehiclePlate: string | null;
  serviceName: string;
  issueDate: string;
  expiryDate: string;
  warrantyTerms: string;
  pdfLink: string;
}

interface WarrantyWhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: WarrantyWhatsAppData | null;
  companyName?: string;
}

export function WarrantyWhatsAppModal({ open, onOpenChange, data }: WarrantyWhatsAppModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [template, setTemplate] = useState("");
  const [savedTemplate, setSavedTemplate] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!data) return null;

  const vehicleStr = `${data.vehicleBrand} ${data.vehicleModel}${data.vehiclePlate ? ` (${data.vehiclePlate})` : ''}`.trim();
  const issueDateStr = (() => {
    try {
      return format(new Date(data.issueDate + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR });
    } catch { return data.issueDate; }
  })();
  const expiryDateStr = (() => {
    try {
      return format(new Date(data.expiryDate + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR });
    } catch { return data.expiryDate; }
  })();

  const extractSection = (text: string, title: string) => {
    const regex = new RegExp(`\\[ ${title} \\]\\n([\\s\\S]*?)(?=\\n\\[ |$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  };

  const coverageText = extractSection(data.warrantyTerms || '', 'COBERTURA DA GARANTIA');
  let termsText = extractSection(data.warrantyTerms || '', 'TERMOS');
  const restrictionsText = extractSection(data.warrantyTerms || '', 'RESTRIÇÕES');
  const careText = extractSection(data.warrantyTerms || '', 'INSTRUÇÕES DE CUIDADO');

  if (!coverageText && !termsText && !restrictionsText && !careText) {
    termsText = data.warrantyTerms;
  }

  const builder = [];
  builder.push(`*CERTIFICADO DE GARANTIA*\n`);
  builder.push(`Olá {cliente}!\n`);
  builder.push(`Nº {certificado}`);
  builder.push(`Serviço: {servico}`);
  builder.push(`Veículo: {veiculo}`);
  builder.push(`Emissão: {emissao}`);
  builder.push(`Validade: {validade}\n`);
  if (coverageText) builder.push(`*Cobertura:*\n{cobertura}\n`);
  if (termsText) builder.push(`*Termos:*\n{termos}\n`);
  if (restrictionsText) builder.push(`*Restrições:*\n{restricoes}\n`);
  if (careText) builder.push(`*Cuidados:*\n{cuidados}\n`);
  if (data.pdfLink) builder.push(`*Baixe o PDF:*\n{pdfLink}\n`);
  builder.push(`_Garantia Intransferível_`);

  const defaultMessage = builder.join('\n');

  const resolveVariables = (text: string) => {
    return text
      .replace(/\{cliente\}/g, data.clientName)
      .replace(/\{veiculo\}/g, vehicleStr)
      .replace(/\{servico\}/g, data.serviceName)
      .replace(/\{emissao\}/g, issueDateStr)
      .replace(/\{validade\}/g, expiryDateStr)
      .replace(/\{cobertura\}/g, coverageText || '')
      .replace(/\{termos\}/g, termsText || '')
      .replace(/\{restricoes\}/g, restrictionsText || '')
      .replace(/\{cuidados\}/g, careText || '')
      .replace(/\{certificado\}/g, data.certNumber)
      .replace(/\{pdfLink\}/g, data.pdfLink || '');
  };

  const messageToSend = resolveVariables(
    isEditing && template ? template : (savedTemplate ?? defaultMessage)
  );

  const getWhatsAppUrl = () => {
    if (!data.clientPhone) return "#";
    const phone = data.clientPhone.replace(/\D/g, "");
    const phoneWithCountryCode = phone.startsWith("55") ? phone : `55${phone}`;
    return `https://wa.me/${phoneWithCountryCode}?text=${encodeURIComponent(messageToSend)}`;
  };

  const handleSend = (e: React.MouseEvent) => {
    if (!data.clientPhone) {
      e.preventDefault();
      toast.error("Cliente sem telefone cadastrado");
      return;
    }
    toast.success("Abrindo WhatsApp em nova aba!");
    onOpenChange(false);
  };

  const handleEdit = () => {
    if (!isEditing) {
      setTemplate(savedTemplate ?? defaultMessage);
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    setSavedTemplate(template);
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

  const toggleVariable = (variable: string) => {
    if (template.includes(variable)) {
      setTemplate(template.replace(variable, ""));
    } else {
      insertVariable(variable);
    }
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

  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  const formatWhatsAppPreview = (text: string) => {
    return escapeHtml(text)
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  const variables = [
    { label: "Certificado", value: "{certificado}" },
    { label: "Cliente", value: "{cliente}" },
    { label: "Veículo", value: "{veiculo}" },
    { label: "Serviço", value: "{servico}" },
    { label: "Emissão", value: "{emissao}" },
    { label: "Validade", value: "{validade}" },
    { label: "Cobertura", value: "{cobertura}" },
    { label: "Termos", value: "{termos}" },
    { label: "Restrições", value: "{restricoes}" },
    { label: "Cuidados", value: "{cuidados}" },
    { label: "Link PDF", value: "{pdfLink}" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => {
        if (!v) {
          setIsEditing(false);
          setTemplate("");
          setSavedTemplate(null);
        }
        onOpenChange(v);
      }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <MessageCircle className="h-5 w-5 text-success" />
              </div>
              <DialogTitle>Enviar Garantia via WhatsApp</DialogTitle>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <a
                    href={getWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleSend}
                    className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-success text-white hover:bg-success/90 h-9 px-3"
                  >
                    <Send className="h-4 w-4" />
                    Enviar WhatsApp
                  </a>
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

              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => insertFormatting('*')}>
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => insertFormatting('_')}>
                    <Italic className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-6 bg-border self-center" />
                  {variables.map((v) => {
                    const isVariablePresent = template.includes(v.value);
                    return (
                      <Button
                        key={v.value}
                        variant={isVariablePresent ? "secondary" : "outline"}
                        size="sm"
                        className="text-xs"
                        onClick={() => toggleVariable(v.value)}
                      >
                        {isVariablePresent ? '-' : '+'} {v.label}
                      </Button>
                    );
                  })}
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
