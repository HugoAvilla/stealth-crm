 import { useState, useEffect } from "react";
 import { Plus, Search, MoreHorizontal, Edit, Trash2, Send } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Card, CardContent } from "@/components/ui/card";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Skeleton } from "@/components/ui/skeleton";
 import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
 import { Badge } from "@/components/ui/badge";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { toast } from "sonner";
 import { NewWarrantyServiceModal } from "./NewWarrantyServiceModal";
 
 interface WarrantyService {
   id: number;
   name: string;
   description: string | null;
   instructions: string | null;
   is_active: boolean;
   warranty_template_id: number | null;
   warranty_template?: { name: string } | null;
 }
 
 export function WarrantyServicesTab() {
   const { user } = useAuth();
   const [search, setSearch] = useState("");
   const [showModal, setShowModal] = useState(false);
   const [services, setServices] = useState<WarrantyService[]>([]);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     fetchServices();
   }, [user?.companyId]);
 
   const fetchServices = async () => {
     if (!user?.companyId) return;
 
     setLoading(true);
     try {
       const { data, error } = await supabase
         .from('warranty_services')
         .select(`
           *,
           warranty_template:warranty_templates(name)
         `)
         .eq('company_id', user.companyId)
         .order('created_at', { ascending: false });
 
       if (error) throw error;
       setServices(data || []);
     } catch (error) {
       console.error('Error fetching warranty services:', error);
       toast.error('Erro ao carregar serviços');
     } finally {
       setLoading(false);
     }
   };
 
   const handleDelete = async (id: number) => {
     try {
       const { error } = await supabase
         .from('warranty_services')
         .delete()
         .eq('id', id);
 
       if (error) throw error;
       toast.success('Serviço excluído com sucesso!');
       fetchServices();
     } catch (error) {
       console.error('Error deleting service:', error);
       toast.error('Erro ao excluir serviço');
     }
   };
 
   const filteredServices = services.filter(s => {
     const searchLower = search.toLowerCase();
     return (
       s.name.toLowerCase().includes(searchLower) ||
       s.description?.toLowerCase().includes(searchLower) ||
       s.warranty_template?.name?.toLowerCase().includes(searchLower)
     );
   });
 
   return (
     <div className="space-y-6">
       {/* Header */}
       <div className="flex items-center justify-between">
         <div className="relative max-w-md flex-1">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input
             placeholder="Buscar por nome ou garantia..."
             value={search}
             onChange={e => setSearch(e.target.value)}
             className="pl-10"
           />
         </div>
         <Button onClick={() => setShowModal(true)}>
           <Plus className="h-4 w-4 mr-2" /> Criar Serviço
         </Button>
       </div>
 
       {/* Table */}
       <Card className="bg-card/50 border-border/50">
         <CardContent className="p-0">
           {loading ? (
             <div className="p-6 space-y-4">
               {Array.from({ length: 5 }).map((_, i) => (
                 <Skeleton key={i} className="h-12" />
               ))}
             </div>
           ) : filteredServices.length === 0 ? (
             <div className="text-center py-12 text-muted-foreground">
               {services.length === 0 ? 'Nenhum serviço criado ainda' : 'Nenhum serviço encontrado'}
             </div>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Nome</TableHead>
                   <TableHead>Descrição</TableHead>
                   <TableHead>Garantia Associada</TableHead>
                   <TableHead className="text-center">Status</TableHead>
                   <TableHead className="w-[80px]"></TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {filteredServices.map(service => (
                   <TableRow key={service.id}>
                     <TableCell className="font-medium">{service.name}</TableCell>
                     <TableCell className="max-w-[300px] truncate">
                       {service.description || '-'}
                     </TableCell>
                     <TableCell>
                       {service.warranty_template?.name || 'Sem garantia'}
                     </TableCell>
                     <TableCell className="text-center">
                       <Badge className={service.is_active ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}>
                         {service.is_active ? 'Ativo' : 'Inativo'}
                       </Badge>
                     </TableCell>
                     <TableCell>
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button variant="ghost" size="icon">
                             <MoreHorizontal className="h-4 w-4" />
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => toast.info('Edição em breve!')}>
                             <Edit className="h-4 w-4 mr-2" /> Editar
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => toast.info('Envio em breve!')}>
                             <Send className="h-4 w-4 mr-2" /> Enviar para Cliente
                           </DropdownMenuItem>
                           <DropdownMenuItem 
                             className="text-destructive"
                             onClick={() => handleDelete(service.id)}
                           >
                             <Trash2 className="h-4 w-4 mr-2" /> Excluir
                           </DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           )}
         </CardContent>
       </Card>
 
       {/* Modal */}
       <NewWarrantyServiceModal
         open={showModal}
         onOpenChange={(open) => {
           setShowModal(open);
           if (!open) fetchServices();
         }}
       />
     </div>
   );
 }