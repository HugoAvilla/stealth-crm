import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Percent, TrendingUp, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CommissionPersonWithMetrics } from "./CommissionPersonCard";

interface CommissionDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: CommissionPersonWithMetrics | null;
}

const CommissionDetailDrawer = ({ open, onOpenChange, person }: CommissionDetailDrawerProps) => {
  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ['person_commissions', person?.id],
    queryFn: async () => {
      if (!person?.id) return [];

      const { data, error } = await supabase
        .from('sale_commissions')
        .select(`
          *,
          sales (
            sale_date,
            subtotal,
            clients (name)
          )
        `)
        .eq('commission_person_id', person.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching person commissions:', error);
        throw error;
      }
      return data;
    },
    enabled: !!person?.id && open,
  });

  if (!person) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-6 border-b">
          <SheetTitle className="flex items-center justify-between">
            <span>{person.name}</span>
            <Badge variant="outline" className="text-primary border-primary">
              {person.commission_percentage}% Atual
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Histórico completo de comissões por venda
          </SheetDescription>
          
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-4 w-4" /> Vendas
              </p>
              <p className="text-2xl font-bold">{person.total_sales}</p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg col-span-2">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-4 w-4" /> Total Acumulado
              </p>
              <p className="text-2xl font-bold text-green-500">
                R$ {person.total_commission.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            Vendas e Valores
          </h3>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : commissions.length === 0 ? (
            <div className="text-center py-10 bg-muted/20 rounded-lg">
              <Percent className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhuma comissão registrada ainda.</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data / Venda</TableHead>
                    <TableHead>Base</TableHead>
                    <TableHead>Taxa</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((comm) => (
                    <TableRow key={comm.id}>
                      <TableCell>
                        <p className="font-medium">
                          {format(new Date(comm.sales.sale_date + 'T12:00:00'), 'dd/MM/yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {comm.sales.clients?.name}
                        </p>
                      </TableCell>
                      <TableCell>
                        R$ {Number(comm.commission_base_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {comm.percentage_snapshot}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-500">
                        R$ {Number(comm.commission_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CommissionDetailDrawer;
