import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { consumptionRules, materials, services, getMaterialById, getServiceById } from "@/lib/mockData";

interface ConsumptionRulesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConsumptionRulesModal({ open, onOpenChange }: ConsumptionRulesModalProps) {
  // Group rules by service
  const rulesByService = consumptionRules.reduce((acc, rule) => {
    if (!acc[rule.service_id]) acc[rule.service_id] = [];
    acc[rule.service_id].push(rule);
    return acc;
  }, {} as Record<number, typeof consumptionRules>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Regras de Consumo (P/M/G)</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Define a quantidade de material consumido automaticamente por tamanho do veículo (P = Pequeno, M = Médio, G = Grande).
          </p>

          {Object.entries(rulesByService).map(([serviceId, rules]) => {
            const service = getServiceById(parseInt(serviceId));
            if (!service) return null;

            return (
              <div key={serviceId} className="space-y-2">
                <h3 className="font-medium">{service.name}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-center">P</TableHead>
                      <TableHead className="text-center">M</TableHead>
                      <TableHead className="text-center">G</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Group by material
                      const byMaterial = rules.reduce((acc, r) => {
                        if (!acc[r.material_id]) acc[r.material_id] = { P: 0, M: 0, G: 0 };
                        acc[r.material_id][r.vehicle_size] = r.quantity;
                        return acc;
                      }, {} as Record<number, { P: number; M: number; G: number }>);

                      return Object.entries(byMaterial).map(([materialId, sizes]) => {
                        const material = getMaterialById(parseInt(materialId));
                        return (
                          <TableRow key={materialId}>
                            <TableCell>
                              {material?.name}
                              <span className="text-xs text-muted-foreground ml-1">
                                ({material?.unit})
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{sizes.P}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{sizes.M}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{sizes.G}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
