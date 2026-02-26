import { useState } from "react";
import { Search, FileText, Download, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { reportTypes, type ReportType } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { HelpOverlay } from "@/components/help/HelpOverlay";
import { ReportConfigModal } from "@/components/relatorios/ReportConfigModal";
import { DownloadedPDFsTab } from "@/components/shared/DownloadedPDFsTab";

const GROUP_LABELS = {
  financeiro: { label: 'Financeiro', color: 'bg-green-500' },
  vendas: { label: 'Vendas', color: 'bg-blue-500' },
  clientes: { label: 'Clientes', color: 'bg-purple-500' },
  operacional: { label: 'Operacional', color: 'bg-orange-500' }
};

export default function Relatorios() {
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [activeTab, setActiveTab] = useState("relatorios");

  const filteredReports = reportTypes.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  );

  const groupedReports = filteredReports.reduce((acc, report) => {
    if (!acc[report.group]) acc[report.group] = [];
    acc[report.group].push(report);
    return acc;
  }, {} as Record<string, ReportType[]>);

  return (
    <div className="space-y-6 p-[10px] border border-border rounded-lg bg-background">
      <HelpOverlay
        tabId="relatorios"
        title="Relatórios"
        description="Gere relatórios detalhados do seu negócio para análise e tomada de decisão."
        steps={[
          { title: "Escolher Relatório", description: "Selecione o tipo de relatório que deseja gerar" },
          { title: "Configurar", description: "Defina o período e filtros desejados" },
          { title: "Exportar", description: "Baixe o relatório em PDF ou Excel" },
        ]}
      />

      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">welcome</h1>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="relatorios" className="gap-2">
            <FileText className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
          <TabsTrigger value="pdfs" className="gap-2">
            <Download className="h-4 w-4" />
            PDFs Baixados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="relatorios" className="space-y-6 mt-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar relatório..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Reports by Group */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(groupedReports).map(([group, reports]) => {
              const groupConfig = GROUP_LABELS[group as keyof typeof GROUP_LABELS];

              return (
                <Card key={group} className="bg-card/50 border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", groupConfig.color)} />
                      <CardTitle className="text-lg">{groupConfig.label}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {reports.map(report => (
                      <button
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className="w-full p-3 rounded-lg bg-muted/30 hover:bg-accent transition-colors text-left flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{report.name}</p>
                            <p className="text-xs text-muted-foreground">{report.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {report.formats.map(format => (
                              <Badge key={format} variant="outline" className="text-[10px] uppercase">
                                {format}
                              </Badge>
                            ))}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="pdfs" className="mt-4">
          <DownloadedPDFsTab module="relatorios" />
        </TabsContent>
      </Tabs>

      {/* Config Modal */}
      <ReportConfigModal
        open={!!selectedReport}
        onOpenChange={(open) => !open && setSelectedReport(null)}
        report={selectedReport}
      />
    </div>
  );
}
