import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { services } from "@/lib/mockData";
import { toast } from "sonner";

interface NewWarrantyTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateCreated?: () => void;
}

export function NewWarrantyTemplateModal({ open, onOpenChange, onTemplateCreated }: NewWarrantyTemplateModalProps) {
  const [name, setName] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [validityMonths, setValidityMonths] = useState("");
  const [terms, setTerms] = useState("");
  const [coverage, setCoverage] = useState("");
  const [restrictions, setRestrictions] = useState("");

  const resetForm = () => {
    setName("");
    setServiceId("");
    setValidityMonths("");
    setTerms("");
    setCoverage("");
    setRestrictions("");
  };

  const handleSubmit = () => {
    if (!name || !serviceId || !validityMonths) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    toast.success("Modelo de garantia criado com sucesso!");
    onOpenChange(false);
    resetForm();
    onTemplateCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Garantia de Produto</DialogTitle>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Serviço Associado *</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {services.map(service => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button className="flex-1" onClick={handleSubmit}>
              Criar Modelo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
