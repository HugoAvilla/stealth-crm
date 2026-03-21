 import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface NewWarrantyTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateCreated?: () => void;
  templateToEdit?: any;
}

export function NewWarrantyTemplateModal({ open, onOpenChange, onTemplateCreated, templateToEdit }: NewWarrantyTemplateModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [validityMonths, setValidityMonths] = useState("");
  const [terms, setTerms] = useState("");
  const [coverage, setCoverage] = useState("");
  const [restrictions, setRestrictions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (templateToEdit) {
        setName(templateToEdit.name || "");
        setValidityMonths(templateToEdit.validity_months?.toString() || "");
        setTerms(templateToEdit.terms || "");
        setCoverage(templateToEdit.coverage || "");
        setRestrictions(templateToEdit.restrictions || "");
      } else {
        resetForm();
      }
    }
  }, [open, templateToEdit]);

  const resetForm = () => {
    setName("");
    setValidityMonths("");
    setTerms("");
    setCoverage("");
    setRestrictions("");
  };

  const handleSubmit = async () => {
    if (!name || !validityMonths) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();
  
      if (!profile?.company_id) {
        toast.error("Empresa não encontrada");
        return;
      }
  
      if (templateToEdit?.id) {
        const { error } = await supabase
          .from('warranty_templates')
          .update({
            name,
            validity_months: parseInt(validityMonths),
            terms: terms || null,
            coverage: coverage || null,
            restrictions: restrictions || null,
          })
          .eq('id', templateToEdit.id);
  
        if (error) throw error;
        toast.success("Modelo de garantia atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from('warranty_templates')
          .insert({
            company_id: profile.company_id,
            name,
            validity_months: parseInt(validityMonths),
            terms: terms || null,
            coverage: coverage || null,
            restrictions: restrictions || null,
          });
  
        if (error) throw error;
        toast.success("Modelo de garantia criado com sucesso!");
      }
      
      onOpenChange(false);
      resetForm();
      onTemplateCreated?.();
    } catch (error) {
      console.error('Error saving warranty template:', error);
      toast.error("Erro ao salvar modelo de garantia");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
           <DialogTitle>{templateToEdit ? "Editar Modelo de Garantia" : "Criar Modelo de Garantia"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Modelo *</Label>
            <Input
              placeholder="Ex: ULTRA BLACK 4 Anos"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

           <div className="space-y-2">
             <Label>Validade (Meses) *</Label>
             <Input
               type="number"
               placeholder="24"
               value={validityMonths}
               onChange={e => setValidityMonths(e.target.value)}
             />
          </div>

          <div className="space-y-2">
            <Label>Termos da Garantia</Label>
            <Textarea
              placeholder="Descreva os termos gerais da garantia..."
              value={terms}
              onChange={e => setTerms(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Cobertura</Label>
            <Textarea
              placeholder="O que está coberto por esta garantia..."
              value={coverage}
              onChange={e => setCoverage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Restrições</Label>
            <Textarea
              placeholder="Situações não cobertas pela garantia..."
              value={restrictions}
              onChange={e => setRestrictions(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
             <Button className="flex-1" onClick={handleSubmit} disabled={isSubmitting}>
              Criar Modelo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
