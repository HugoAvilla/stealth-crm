import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  ArrowUpDown,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  HelpCircle,
  MessageCircle,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { HelpOverlay } from "@/components/help/HelpOverlay";
import NewClientModal from "@/components/vendas/NewClientModal";
import { ClientProfileModal } from "@/components/clientes/ClientProfileModal";
import { EditClientModal } from "@/components/clientes/EditClientModal";
import { openWhatsApp } from "@/lib/utils";
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
import { toast } from "sonner";

interface Vehicle {
  id: number;
  brand: string;
  model: string;
  year: number | null;
  plate: string | null;
  size: string | null;
}

interface Client {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  cpf_cnpj: string | null;
  origem: string | null;
  created_at: string | null;
  vehicles: Vehicle[];
  total_spent: number;
  sales_count: number;
}

type SortOption = 'name-asc' | 'name-desc' | 'recent' | 'spent';

export default function Clientes() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const fetchClients = async () => {
    if (!user?.id) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.company_id) {
        setLoading(false);
        return;
      }

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("name");

      if (clientsError) throw clientsError;

      // Fetch vehicles for all clients
      const { data: vehiclesData } = await supabase
        .from("vehicles")
        .select("*")
        .eq("company_id", profile.company_id);

      // Fetch sales to calculate stats
      const { data: salesData } = await supabase
        .from("sales")
        .select("client_id, total")
        .eq("company_id", profile.company_id);

      // Map clients with vehicles and stats
      const clientsWithData = (clientsData || []).map((client) => {
        const clientVehicles = (vehiclesData || []).filter(v => v.client_id === client.id);
        const clientSales = (salesData || []).filter(s => s.client_id === client.id);
        const totalSpent = clientSales.reduce((sum, s) => sum + (s.total || 0), 0);

        return {
          ...client,
          vehicles: clientVehicles,
          total_spent: totalSpent,
          sales_count: clientSales.length,
        };
      });

      setClients(clientsWithData);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [user?.id]);

  const filteredAndSortedClients = useMemo(() => {
    let result = [...clients];

    // Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(client =>
        client.name.toLowerCase().includes(term) ||
        client.phone.includes(term) ||
        client.vehicles.some(v =>
          v.model.toLowerCase().includes(term) ||
          (v.plate?.toLowerCase() || "").includes(term)
        )
      );
    }

    // Sort
    switch (sortBy) {
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'recent':
        result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      case 'spent':
        result.sort((a, b) => b.total_spent - a.total_spent);
        break;
    }

    return result;
  }, [clients, searchTerm, sortBy]);

  const handleViewProfile = (client: Client) => {
    setSelectedClient(client);
    setShowProfileModal(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setShowEditModal(true);
  };

  const handleDeleteClient = (client: Client) => {
    setClientToDelete(client);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;

    // Check if client has sales
    if (clientToDelete.sales_count > 0) {
      toast.error("Cliente possui vendas vinculadas. Não pode ser excluído.");
      setClientToDelete(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientToDelete.id);

      if (error) throw error;

      toast.success(`Cliente "${clientToDelete.name}" excluído com sucesso`);
      fetchClients();
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Erro ao excluir cliente");
    } finally {
      setClientToDelete(null);
    }
  };


  const getSortLabel = () => {
    switch (sortBy) {
      case 'name-asc': return 'A-Z';
      case 'name-desc': return 'Z-A';
      case 'recent': return 'Mais Recentes';
      case 'spent': return 'Maior Gasto';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HelpOverlay
        tabId="clientes"
        title="Guia de Clientes"
        sections={[
          {
            title: "Cadastrar Novo Cliente",
            description: "Clique em 'Novo cliente' para abrir o formulário. Preencha nome, WhatsApp, e-mail e CPF/CNPJ. O cliente ficará disponível para associar a vendas e veículos.",
            screenshotUrl: "/help/help-clientes-novo.png"
          },
          {
            title: "Buscar e Filtrar",
            description: "Use a barra de pesquisa para buscar clientes por nome, número de WhatsApp, modelo do veículo ou placa. Use o botão de ordenação para classificar por nome (A-Z / Z-A), mais recentes ou maior gasto.",
            screenshotUrl: "/help/help-clientes-busca.png"
          },
          {
            title: "Ações do Cliente",
            description: "Clique no menu '⋮' de cada cliente para: Ver Perfil (histórico completo), Editar (alterar dados), Excluir (remover cliente sem vendas), ou enviar mensagem via WhatsApp.",
            screenshotUrl: "/help/help-clientes-acoes.png"
          },
          {
            title: "Perfil Completo",
            description: "No perfil do cliente você encontra todos os veículos cadastrados, histórico de vendas, total gasto e dados de contato. Use essa visão para entender o relacionamento com cada cliente.",
            screenshotUrl: "/help/help-clientes-perfil.png"
          },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {clients.length} clientes cadastrados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowNewClientModal(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo cliente
          </Button>
          <Button variant="ghost" size="icon">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente por nome, whatsapp, veículo ou placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-border">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {getSortLabel()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            <DropdownMenuItem onClick={() => setSortBy('name-asc')}>
              Nome A-Z
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('name-desc')}>
              Nome Z-A
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('recent')}>
              Mais Recentes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('spent')}>
              Maior Gasto
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Empty State or Table */}
      {clients.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum cliente cadastrado</h3>
          <p className="text-muted-foreground mb-4">
            Comece cadastrando seu primeiro cliente
          </p>
          <Button onClick={() => setShowNewClientModal(true)}>
            <Plus className="h-4 w-4 mr-2" /> Cadastrar Primeiro Cliente
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Cliente</TableHead>
                <TableHead className="text-muted-foreground">Contato</TableHead>
                <TableHead className="text-muted-foreground text-center">Veículos</TableHead>
                <TableHead className="text-muted-foreground text-right">Qtd Gasto</TableHead>
                <TableHead className="text-muted-foreground text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedClients.map((client) => (
                <TableRow key={client.id} className="border-border">
                  <TableCell className="font-medium text-foreground">
                    {client.name}
                  </TableCell>
                  <TableCell>
                    <a
                      href={openWhatsApp(client.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <MessageCircle className="h-3 w-3" />
                      {client.phone}
                    </a>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {client.vehicles.length} veículo(s)
                  </TableCell>
                  <TableCell className="text-right font-semibold text-foreground">
                    R$ {client.total_spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border">
                        <DropdownMenuItem onClick={() => handleViewProfile(client)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditClient(client)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClient(client)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredAndSortedClients.length === 0 && clients.length > 0 && (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum cliente encontrado
            </div>
          )}
        </div>
      )}

      {/* Pagination info */}
      {clients.length > 0 && (
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>Exibindo resultados de 1 a {filteredAndSortedClients.length}</span>
        </div>
      )}

      {/* Modals */}
      <NewClientModal
        open={showNewClientModal}
        onOpenChange={setShowNewClientModal}
        onClientCreated={() => {
          setShowNewClientModal(false);
          fetchClients();
          toast.success("Cliente criado com sucesso!");
        }}
      />

      {selectedClient && (
        <>
          <ClientProfileModal
            open={showProfileModal}
            onOpenChange={setShowProfileModal}
            client={selectedClient as any}
            onEdit={() => {
              setShowProfileModal(false);
              setShowEditModal(true);
            }}
          />

          <EditClientModal
            open={showEditModal}
            onOpenChange={setShowEditModal}
            client={selectedClient as any}
            onSave={() => {
              setShowEditModal(false);
              fetchClients();
              toast.success("Cliente atualizado com sucesso!");
            }}
          />
        </>
      )}


      {/* Delete Confirmation */}
      <AlertDialog open={!!clientToDelete} onOpenChange={() => setClientToDelete(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{clientToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
