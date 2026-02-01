import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText } from "lucide-react";
import { type ReportType } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { generateReportPDF, type ReportPDFData } from "@/lib/pdfGenerator";

interface Account {
  id: number;
  name: string;
}

interface ReportConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportType | null;
}

export function ReportConfigModal({ open, onOpenChange, report }: ReportConfigModalProps) {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (open && report?.id === 'extrato_conta') {
      fetchAccounts();
    }
  }, [open, report?.id, user?.id]);

  const fetchAccounts = async () => {
    if (!user?.id) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return;

    const { data } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('company_id', profile.company_id)
      .eq('is_active', true);

    setAccounts(data || []);
  };

  const handleGenerate = async () => {
    if (!report) return;

    setGenerating(true);
    try {
      // Generate PDF
      const pdfData: ReportPDFData = {
        title: report.name,
        period: startDate && endDate ? { start: startDate, end: endDate } : undefined,
        columns: ['Item', 'Descrição', 'Valor'],
        rows: [
          ['1', 'Dados do relatório', 'R$ 0,00'],
        ],
        summary: [
          { label: 'Total', value: 'R$ 0,00' },
        ],
      };

      generateReportPDF(pdfData);
      toast.success(`Relatório ${report.name} gerado em PDF!`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setGenerating(false);
    }
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

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleGenerate} disabled={generating}>
              <Download className="h-4 w-4 mr-2" /> {generating ? 'Gerando...' : 'Gerar PDF'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}