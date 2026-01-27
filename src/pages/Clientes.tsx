import { useState, useMemo } from "react";
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
  Plus, 
  Search, 
  ArrowUpDown, 
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  HelpCircle,
  MessageCircle
} from "lucide-react";
import { clients, Client } from "@/lib/mockData";
import NewClientModal from "@/components/vendas/NewClientModal";
import { ClientProfileModal } from "@/components/clientes/ClientProfileModal";
import { EditClientModal } from "@/components/clientes/EditClientModal";
import { ClientChatModal } from "@/components/clientes/ClientChatModal";
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

type SortOption = 'name-asc' | 'name-desc' | 'recent' | 'spent';

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatClient, setChatClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

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
          v.plate.toLowerCase().includes(term)
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
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'spent':
        result.sort((a, b) => b.total_spent - a.total_spent);
        break;
    }

    return result;
  }, [searchTerm, sortBy]);

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

  const confirmDelete = () => {
    if (clientToDelete) {
      toast.success(`Cliente "${clientToDelete.name}" excluído com sucesso`);
      setClientToDelete(null);
    }
  };

  const openChat = (client: Client) => {
    setChatClient(client);
    setShowChatModal(true);
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'name-asc': return 'A-Z';
      case 'name-desc': return 'Z-A';
      case 'recent': return 'Mais Recentes';
      case 'spent': return 'Maior Gasto';
    }
  };

  return (
    <div className="space-y-6">
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
            placeholder="Buscar cliente por nome, whatsapp, veículo ou estofado..."
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

      {/* Table */}
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
                  <button
                    onClick={() => openChat(client)}
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <MessageCircle className="h-3 w-3" />
                    {client.phone}
                  </button>
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

        {filteredAndSortedClients.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            Nenhum cliente encontrado
          </div>
        )}
      </div>

      {/* Pagination info */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>Exibindo resultados de 1 a {filteredAndSortedClients.length}</span>
      </div>

      {/* Modals */}
      <NewClientModal
        open={showNewClientModal}
        onOpenChange={setShowNewClientModal}
        onClientCreated={() => {
          setShowNewClientModal(false);
          toast.success("Cliente criado com sucesso!");
        }}
      />

      {selectedClient && (
        <>
          <ClientProfileModal
            open={showProfileModal}
            onOpenChange={setShowProfileModal}
            client={selectedClient}
            onEdit={() => {
              setShowProfileModal(false);
              setShowEditModal(true);
            }}
          />

          <EditClientModal
            open={showEditModal}
            onOpenChange={setShowEditModal}
            client={selectedClient}
            onSave={() => {
              setShowEditModal(false);
              toast.success("Cliente atualizado com sucesso!");
            }}
          />
        </>
      )}

      <ClientChatModal
        open={showChatModal}
        onOpenChange={setShowChatModal}
        client={chatClient}
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
