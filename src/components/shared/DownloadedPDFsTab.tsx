import { useState, useEffect } from 'react';
import { FileText, Trash2, X, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getPDFRecords, deletePDFRecord, clearPDFRecords, getPDFSignedUrl, type PDFRecord } from '@/lib/pdfStorage';
import { toast } from 'sonner';

interface DownloadedPDFsTabProps {
  module: PDFRecord['module'];
}

export function DownloadedPDFsTab({ module }: DownloadedPDFsTabProps) {
  const [records, setRecords] = useState<PDFRecord[]>([]);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    setRecords(getPDFRecords(module));
  }, [module]);

  useEffect(() => {
    const handleFocus = () => setRecords(getPDFRecords(module));
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [module]);

  const refresh = () => setRecords(getPDFRecords(module));

  const handleDelete = (id: string) => {
    deletePDFRecord(id);
    refresh();
    toast.success('Registro removido');
  };

  const handleClearAll = () => {
    clearPDFRecords(module);
    refresh();
    toast.success('Histórico limpo');
  };

  const handleOpenPDF = async (record: PDFRecord) => {
    if (!record.storagePath) {
      toast.info('PDF não disponível para visualização. Gere o documento novamente.');
      return;
    }

    setOpeningId(record.id);
    try {
      const signedUrl = await getPDFSignedUrl(record.storagePath, 600);
      if (signedUrl) {
        window.open(signedUrl, '_blank');
      } else {
        toast.error('Erro ao gerar link do PDF. Tente gerar o documento novamente.');
      }
    } catch {
      toast.error('Erro ao abrir PDF.');
    } finally {
      setOpeningId(null);
    }
  };

  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum PDF gerado ainda neste módulo</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{records.length} PDF(s) gerado(s)</p>
        <Button variant="outline" size="sm" onClick={handleClearAll} className="gap-2 text-destructive hover:text-destructive">
          <Trash2 className="h-3 w-3" />
          Limpar histórico
        </Button>
      </div>

      <div className="space-y-2">
        {records.map(record => (
          <Card
            key={record.id}
            className="bg-card/50 border-border/50 cursor-pointer hover:bg-card/80 transition-colors"
            onClick={() => handleOpenPDF(record)}
          >
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  {openingId === record.id ? (
                    <Loader2 className="h-4 w-4 text-destructive animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{record.filename}</p>
                  <p className="text-xs text-muted-foreground">{record.details}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {record.storagePath && (
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                )}
                <Badge variant="outline" className="text-[10px]">{record.type}</Badge>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(record.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(record.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
