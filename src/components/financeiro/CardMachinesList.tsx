import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  CreditCard, 
  CheckCircle2, 
  XCircle,
  Clock,
  Settings2,
  Landmark
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CardMachineModal } from "./CardMachineModal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CardMachine {
  id: number;
  name: string;
  account_id: number | null;
  max_installments: number | null;
  is_anticipated: boolean | null;
  anticipation_type: string | null;
  anticipation_value: number | null;
  is_active: boolean | null;
  accounts?: {
    name: string;
  } | null;
}

export function CardMachinesList() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [machines, setMachines] = useState<CardMachine[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [machineToDelete, setMachineToDelete] = useState<number | null>(null);

  const fetchMachines = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user?.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from("card_machines")
        .select(`
          *,
          accounts (
            name
          )
        `)
        .eq("company_id", profile.company_id)
        .order("name", { ascending: true });

      if (error) throw error;
      setMachines(data || []);
    } catch (error) {
      console.error("Error fetching machines:", error);
      toast.error("Erro ao carregar maquininhas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchMachines();
    }
  }, [user?.id]);

  const handleDelete = async () => {
    if (!machineToDelete) return;

    try {
      // Rates will be deleted automatically if CASCADE is on, 
      // but let's delete them manually to be safe or if FK doesn't cascade
      await supabase
        .from("card_machine_rates")
        .delete()
        .eq("machine_id", machineToDelete);

      const { error } = await supabase
        .from("card_machines")
        .delete()
        .eq("id", machineToDelete);

      if (error) throw error;

      toast.success("Maquininha removida com sucesso");
      fetchMachines();
    } catch (error) {
      console.error("Error deleting machine:", error);
      toast.error("Erro ao remover maquininha");
    } finally {
      setDeleteDialogOpen(false);
      setMachineToDelete(null);
    }
  };

  const filteredMachines = machines.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar maquininhas..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => { setSelectedMachineId(null); setModalOpen(true); }} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> Nova Maquininha
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredMachines.length === 0 ? (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <CreditCard className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">Nenhuma maquininha encontrada</h3>
            <p className="text-muted-foreground max-w-xs mt-1">
              Cadastre suas maquininhas de cartão para gerenciar as taxas e prazos de recebimento.
            </p>
            <Button variant="outline" className="mt-6" onClick={() => { setSelectedMachineId(null); setModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Cadastrar agora
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMachines.map(machine => (
            <Card key={machine.id} className="overflow-hidden border-border/50 hover:border-primary/30 transition-colors group">
              <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    machine.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold truncate max-w-[150px]">
                      {machine.name}
                    </CardTitle>
                    <div className="flex items-center gap-1 mt-0.5">
                      {machine.is_active ? (
                        <Badge variant="outline" className="text-[9px] h-4 bg-green-500/10 text-green-600 border-green-500/20">Ativa</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] h-4 bg-red-500/10 text-red-600 border-red-500/20">Inativa</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setSelectedMachineId(machine.id); setModalOpen(true); }}>
                      <Edit2 className="h-4 w-4 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => { setMachineToDelete(machine.id); setDeleteDialogOpen(true); }}>
                      <Trash2 className="h-4 w-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Landmark className="h-3 w-3" />
                      <span>Conta:</span>
                    </div>
                    <span className="font-medium text-foreground">{machine.accounts?.name || "Não definida"}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Settings2 className="h-3 w-3" />
                      <span>Parcelas máx:</span>
                    </div>
                    <span className="font-medium text-foreground">{machine.max_installments}x</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      <span>Antecipação:</span>
                    </div>
                    <span className={cn(
                      "font-medium",
                      machine.is_anticipated ? "text-primary" : "text-foreground"
                    )}>
                      {machine.is_anticipated 
                        ? `${machine.anticipation_value} ${machine.anticipation_type === 'hours' ? 'hora(s)' : 'dia(s)'}`
                        : "Não"
                      }
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border/50">
                  <Button 
                    variant="secondary" 
                    className="w-full text-xs h-8 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20"
                    onClick={() => { setSelectedMachineId(machine.id); setModalOpen(true); }}
                  >
                    Ver Taxas e Detalhes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CardMachineModal 
        open={modalOpen}
        onOpenChange={setModalOpen}
        machineId={selectedMachineId}
        onSuccess={fetchMachines}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a maquininha
              e todas as suas taxas cadastradas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
