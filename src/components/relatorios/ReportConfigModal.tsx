import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, FileText } from "lucide-react";
import { type ReportType, accounts } from "@/lib/mockData";
import { toast } from "sonner";

interface ReportConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportType | null;
}

export function ReportConfigModal({ open, onOpenChange, report }: ReportConfigModalProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [format, setFormat] = useState<string>("");
  const [accountId, setAccountId] = useState("");

  const handleGenerate = () => {
    if (!format) {
      toast.error("Selecione o formato do relatório");
      return;
    }

    toast.success(`Relatório ${report?.name} gerado em ${format.toUpperCase()}!`);
    onOpenChange(false);
  };

  if (!report) return null;

  const needsAccount = report.id === 'extrato_conta';
  const needsDateRange = !['clientes_ativos', 'clientes_inativos'].includes(report.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {report.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{report.description}</p>

          {needsDateRange && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {needsAccount && (
            <div className="space-y-2">
              <Label>Conta</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id.toString()}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Formato de Exportação *</Label>
            <div className="flex gap-2">
              {report.formats.map(f => (
                <Button
                  key={f}
                  variant={format === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormat(f)}
                  className="uppercase"
                >
                  {f}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleGenerate}>
              <Download className="h-4 w-4 mr-2" /> Gerar Relatório
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
