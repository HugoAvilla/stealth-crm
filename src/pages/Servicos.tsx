import { useState, useEffect } from "react";
import { Plus, Search, ArrowUpDown, Edit, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { NewServiceModal } from "@/components/servicos/NewServiceModal";
import { toast } from "sonner";

interface Service {
  id: number;
  name: string;
  base_price: number;
  description: string | null;
  commission_percentage: number | null;
  is_active: boolean | null;
  company_id: number | null;
  sales_count?: number;
  total_revenue?: number;
}

type SortOption = "name" | "sales" | "revenue";

export default function Servicos() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const fetchServices = async () => {
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

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .order("name");

      if (servicesError) throw servicesError;

      // Fetch sale items to calculate stats
      const { data: saleItems } = await supabase
        .from("sale_items")
        .select("service_id, total_price")
        .eq("company_id", profile.company_id);

      // Calculate stats for each service
      const servicesWithStats = (servicesData || []).map((service) => {
        const serviceItems = (saleItems || []).filter(
          (item) => item.service_id === service.id
        );
        const salesCount = serviceItems.length;
        const totalRevenue = serviceItems.reduce(
          (sum, item) => sum + (item.total_price || 0),
          0
        );

        return {
          ...service,
          sales_count: salesCount,
          total_revenue: totalRevenue,
        };
      });

      setServices(servicesWithStats);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast.error("Erro ao carregar serviços");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [user?.id]);

  const filteredServices = services
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "sales":
          return (b.sales_count || 0) - (a.sales_count || 0);
        case "revenue":
          return (b.total_revenue || 0) - (a.total_revenue || 0);
        default:
          return 0;
      }
    });

  const totalRevenue = services.reduce((sum, s) => sum + (s.total_revenue || 0), 0);
  const totalSales = services.reduce((sum, s) => sum + (s.sales_count || 0), 0);
  const avgPrice = services.length > 0
    ? services.reduce((sum, s) => sum + s.base_price, 0) / services.length
    : 0;

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingService(null);
  };

  const handleSuccess = () => {
    fetchServices();
    handleCloseModal();
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Serviços</h1>
          <p className="text-muted-foreground">Gerencie os serviços oferecidos</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Serviço
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Vendas</p>
                <p className="text-2xl font-bold">{totalSales}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Preço Médio</p>
                <p className="text-2xl font-bold">
                  R$ {avgPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar serviço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Ordenar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSortBy("sales")}>
              Mais Vendidos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("revenue")}>
              Maior Faturamento
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("name")}>
              Nome A-Z
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Empty State or Table */}
      {services.length === 0 ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum serviço cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Comece cadastrando os serviços que sua empresa oferece
            </p>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" /> Cadastrar Primeiro Serviço
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serviço</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">Total Vendido</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground">{service.description}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {service.base_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">{service.sales_count || 0}</TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      R$ {(service.total_revenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(service)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <NewServiceModal
        open={showModal}
        onOpenChange={handleCloseModal}
        editService={editingService}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
