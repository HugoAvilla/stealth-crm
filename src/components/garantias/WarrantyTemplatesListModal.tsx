import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { NewWarrantyTemplateModal } from "./NewWarrantyTemplateModal";

interface WarrantyTemplate {
  id: number;
  name: string;
  validity_months: number;
  terms: string | null;
  coverage: string | null;
  restrictions?: string | null;
}

interface WarrantyTemplatesListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplatesChange?: () => void;
}

export function WarrantyTemplatesListModal({ open, onOpenChange, onTemplatesChange }: WarrantyTemplatesListModalProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<WarrantyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // For editing
  const [showEditModal, setShowEditModal] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<WarrantyTemplate | null>(null);

  useEffect(() => {
    if (open && user?.id) {
      fetchTemplates();
    }
  }, [open, user?.id]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.company_id) return;

      const { data } = await supabase
        .from('warranty_templates')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name');

      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching warranty templates:', error);
      toast.error("Erro ao buscar modelos de garantia");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja excluir este modelo? (Garantias já emitidas com ele não serão afetadas)")) return;

    try {
      const { error } = await supabase
        .from('warranty_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success("Modelo de garantia excluído com sucesso");
      fetchTemplates();
      onTemplatesChange?.();
    } catch (error) {
      console.error('Error deleting warranty template:', error);
      toast.error("Erro ao excluir modelo de garantia");
    }
  };

  const handleEdit = (template: WarrantyTemplate) => {
    setTemplateToEdit(template);
    setShowEditModal(true);
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Gerenciar Modelos de Garantia</DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 pb-6">
            <div className="space-y-4 pt-2">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando modelos...
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum modelo de garantia criado
                </div>
              ) : (
                templates.map(template => (
                  <div key={template.id} className="border rounded-lg bg-card overflow-hidden">
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleExpand(template.id)}
                    >
                      <div>
                        <h3 className="font-semibold">{template.name}</h3>
                        <p className="text-sm text-muted-foreground">Validade: {template.validity_months} meses</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(template);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(template.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="w-8 flex justify-center text-muted-foreground">
                          {expandedId === template.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                      </div>
                    </div>
                    
                    {expandedId === template.id && (
                      <div className="p-4 bg-muted/20 border-t space-y-4 text-sm">
                        {template.coverage && (
                          <div>
                            <p className="font-semibold mb-1 text-primary">Cobertura:</p>
                            <p className="text-muted-foreground whitespace-pre-wrap">{template.coverage}</p>
                          </div>
                        )}
                        {template.terms && (
                          <div>
                            <p className="font-semibold mb-1 text-primary">Termos:</p>
                            <p className="text-muted-foreground whitespace-pre-wrap">{template.terms}</p>
                          </div>
                        )}
                        {template.restrictions && (
                          <div>
                            <p className="font-semibold mb-1 text-primary">Restrições:</p>
                            <p className="text-muted-foreground whitespace-pre-wrap">{template.restrictions}</p>
                          </div>
                        )}
                        {!template.coverage && !template.terms && !template.restrictions && (
                          <p className="text-muted-foreground italic">Nenhum detalhe adicional informado.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Edit Modal overlays on top of the list modal */}
      <NewWarrantyTemplateModal
        open={showEditModal}
        templateToEdit={templateToEdit}
        onOpenChange={(open) => {
          setShowEditModal(open);
          if (!open) setTemplateToEdit(null);
        }}
        onTemplateCreated={() => {
          fetchTemplates();
          onTemplatesChange?.();
        }}
      />
    </>
  );
}
