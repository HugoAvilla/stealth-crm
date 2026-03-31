import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  ArrowUpDown,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  MessageCircle,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { HelpOverlay } from "@/components/help/HelpOverlay";
import NewClientModal from "@/components/vendas/NewClientModal";
import NewSaleModal from "@/components/vendas/NewSaleModal";
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
  last_sale_date: string | null;
  status: 'Ativo' | 'Inativo';
  tier: 'VIP' | 'B2B' | 'B2C' | 'Novo';
}

type SortOption = 'name-asc' | 'name-desc' | 'recent' | 'spent';

export default function Clientes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOrigem, setFilterOrigem] = useState<string>("todas");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterTier, setFilterTier] = useState<string>("todos");
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);

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
        .select("client_id, total, created_at")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      // Map clients with vehicles and stats
      const clientsWithData = (clientsData || []).map((client) => {
        const clientVehicles = (vehiclesData || []).filter(v => v.client_id === client.id);
        const clientSales = (salesData || []).filter(s => s.client_id === client.id);
        const totalSpent = clientSales.reduce((sum, s) => sum + (s.total || 0), 0);
        const lastSaleDate = clientSales.length > 0 ? clientSales[0].created_at : null;
        
        // Calculate Status
        let status: 'Ativo' | 'Inativo' = 'Inativo';
        if (lastSaleDate) {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          if (new Date(lastSaleDate) > sixMonthsAgo) {
            status = 'Ativo';
          }
        } else if (client.created_at) {
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          if (new Date(client.created_at) > threeMonthsAgo) {
            status = 'Ativo'; // New clients are active for a while
          }
        }
        
        // Calculate Tier
        let tier: 'VIP' | 'B2B' | 'B2C' | 'Novo' = 'Novo';
        const isB2B = client.cpf_cnpj?.replace(/\D/g, '').length === 14;
        
        if (totalSpent >= 5000 || clientSales.length >= 5) {
          tier = 'VIP';
        } else if (isB2B) {
          tier = 'B2B';
        } else if (clientSales.length > 0) {
          tier = 'B2C';
        }

        return {
          ...client,
          vehicles: clientVehicles,
          total_spent: totalSpent,
          sales_count: clientSales.length,
          last_sale_date: lastSaleDate,
          status,
          tier
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

    if (filterOrigem && filterOrigem !== "todas") {
      result = result.filter(client => client.origem === filterOrigem);
    }
    if (filterStatus && filterStatus !== "todos") {
      result = result.filter(client => client.status.toLowerCase() === filterStatus.toLowerCase());
    }
    if (filterTier && filterTier !== "todos") {
      result = result.filter(client => client.tier.toLowerCase() === filterTier.toLowerCase());
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
      // Delete associated operational data before deleting the client to prevent FK errors
      await supabase.from("pipeline_stages").delete().eq("client_id", clientToDelete.id);
      await supabase.from("spaces").delete().eq("client_id", clientToDelete.id);
      await supabase.from("warranties").delete().eq("client_id", clientToDelete.id);

      // Delete associated vehicles
      const { error: vehiclesError } = await supabase
        .from("vehicles")
        .delete()
        .eq("client_id", clientToDelete.id);

      if (vehiclesError) throw vehiclesError;

      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientToDelete.id);

      if (error) throw error;

      toast.success(`Cliente "${clientToDelete.name}" excluído com sucesso`);
      fetchClients();
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast.error(`Erro ao excluir cliente: ${error?.message || "Erro desconhecido"}`);
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
            title: "Vídeo Aula — Clientes",
            description: "Assista ao vídeo tutorial completo para aprender a usar todas as funcionalidades da gestão de clientes.",
            videoUrl: "/help/video-aula-clientes.mov"
          },
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
        
        {/* Origin Filter */}
        <div className="w-full sm:w-[150px]">
          <Select value={filterOrigem} onValueChange={setFilterOrigem}>
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Origens (Todas)</SelectItem>
              {Array.from(new Set(clients.map(c => c.origem).filter(Boolean))).sort().map(origem => (
                <SelectItem key={origem} value={origem as string}>{origem}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-[130px]">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Status (Todos)</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tier Filter */}
        <div className="w-full sm:w-[130px]">
          <Select value={filterTier} onValueChange={setFilterTier}>
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Tipos (Todos)</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="b2b">B2B</SelectItem>
              <SelectItem value="b2c">B2C</SelectItem>
              <SelectItem value="novo">Novo</SelectItem>
            </SelectContent>
          </Select>
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
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-foreground">{client.name}</span>
                      <div className="flex flex-wrap gap-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium uppercase tracking-wider
                          ${client.status === 'Ativo' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}
                        `}>
                          {client.status}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium uppercase tracking-wider
                          ${client.tier === 'VIP' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 
                            client.tier === 'B2B' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 
                            client.tier === 'B2C' ? 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400' :
                            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}
                        `}>
                          {client.tier}
                        </span>
                      </div>
                    </div>
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
            onCreateSale={() => {
              setShowProfileModal(false);
              setShowNewSaleModal(true);
            }}
            onAddToSpace={() => {
              setShowProfileModal(false);
              navigate('/espaco');
            }}
            onDelete={(client) => {
              setShowProfileModal(false);
              handleDeleteClient(client as any);
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

      {/* New Sale Modal */}
      <NewSaleModal
        open={showNewSaleModal}
        onOpenChange={(open) => {
          setShowNewSaleModal(open);
          if (!open) fetchClients();
        }}
        defaultClientId={selectedClient?.id}
      />


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
