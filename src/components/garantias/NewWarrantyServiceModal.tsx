 import { useState, useEffect } from "react";
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { Loader2 } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { toast } from "sonner";
 
 interface WarrantyTemplate {
   id: number;
   name: string;
 }
 
 interface NewWarrantyServiceModalProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export function NewWarrantyServiceModal({ open, onOpenChange }: NewWarrantyServiceModalProps) {
   const { user } = useAuth();
   const [name, setName] = useState("");
   const [description, setDescription] = useState("");
   const [instructions, setInstructions] = useState("");
   const [templateId, setTemplateId] = useState<string>("");
   const [templates, setTemplates] = useState<WarrantyTemplate[]>([]);
   const [isSaving, setIsSaving] = useState(false);
   const [loadingTemplates, setLoadingTemplates] = useState(false);
 
   useEffect(() => {
     if (open && user?.companyId) {
       fetchTemplates();
     }
   }, [open, user?.companyId]);
 
   const fetchTemplates = async () => {
     if (!user?.companyId) return;
 
     setLoadingTemplates(true);
     try {
       const { data, error } = await supabase
         .from('warranty_templates')
         .select('id, name')
         .eq('company_id', user.companyId);
 
       if (error) throw error;
       setTemplates(data || []);
     } catch (error) {
       console.error('Error fetching templates:', error);
     } finally {
       setLoadingTemplates(false);
     }
   };
 
   const handleSubmit = async () => {
     if (!name.trim()) {
       toast.error('Nome do serviço é obrigatório');
       return;
     }
 
     if (!user?.companyId) {
       toast.error('Empresa não encontrada');
       return;
     }
 
     setIsSaving(true);
     try {
       const { error } = await supabase
         .from('warranty_services')
         .insert({
           company_id: user.companyId,
           name: name.trim(),
           description: description.trim() || null,
           instructions: instructions.trim() || null,
           warranty_template_id: templateId ? parseInt(templateId) : null,
         });
 
       if (error) throw error;
 
       toast.success('Serviço criado com sucesso!');
       resetForm();
       onOpenChange(false);
     } catch (error) {
       console.error('Error creating service:', error);
       toast.error('Erro ao criar serviço');
     } finally {
       setIsSaving(false);
     }
   };
 
   const resetForm = () => {
     setName("");
     setDescription("");
     setInstructions("");
     setTemplateId("");
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="sm:max-w-lg">
         <DialogHeader>
           <DialogTitle>Criar Serviço Associado</DialogTitle>
           <DialogDescription>
             Crie um serviço que pode ser enviado junto com garantias para os clientes.
           </DialogDescription>
         </DialogHeader>
 
         <div className="space-y-4 py-4">
           <div className="space-y-2">
             <Label htmlFor="name">Nome do Serviço *</Label>
             <Input
               id="name"
               placeholder="Ex: Manutenção preventiva"
               value={name}
               onChange={(e) => setName(e.target.value)}
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="description">Descrição</Label>
             <Textarea
               id="description"
               placeholder="Descreva o serviço..."
               value={description}
               onChange={(e) => setDescription(e.target.value)}
               rows={2}
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="template">Garantia Associada</Label>
             <Select value={templateId} onValueChange={setTemplateId}>
               <SelectTrigger>
                 <SelectValue placeholder={loadingTemplates ? "Carregando..." : "Selecione uma garantia"} />
               </SelectTrigger>
               <SelectContent>
                 {templates.map((template) => (
                   <SelectItem key={template.id} value={template.id.toString()}>
                     {template.name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="instructions">Instruções para o Cliente</Label>
             <Textarea
               id="instructions"
               placeholder="Instruções que serão enviadas ao cliente..."
               value={instructions}
               onChange={(e) => setInstructions(e.target.value)}
               rows={3}
             />
           </div>
         </div>
 
         <DialogFooter>
           <Button variant="outline" onClick={() => onOpenChange(false)}>
             Cancelar
           </Button>
           <Button onClick={handleSubmit} disabled={isSaving}>
             {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
             Criar Serviço
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }