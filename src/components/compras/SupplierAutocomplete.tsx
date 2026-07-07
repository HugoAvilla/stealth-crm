// @ts-nocheck
import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Plus, ArrowLeft, Loader2, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Supplier } from "@/lib/purchaseService";
import { toast } from "sonner";

interface SupplierAutocompleteProps {
  companyId: number;
  value: Supplier | null;
  onChange: (supplier: Supplier | null) => void;
  className?: string;
  placeholder?: string;
}

export function SupplierAutocomplete({
  companyId,
  value,
  onChange,
  className,
  placeholder = "Selecione um fornecedor..."
}: SupplierAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Estado para fluxo de criação inline
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [creating, setCreating] = useState(false);

  // Busca fornecedores ativos no banco
  const fetchSuppliers = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error("[SupplierAutocomplete] Error fetching suppliers:", error);
      toast.error("Erro ao carregar fornecedores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchSuppliers();
      setShowCreateForm(false);
      setNewSupplierName("");
      setNewSupplierPhone("");
    }
  }, [open, companyId]);

  // Criação rápida de fornecedor
  const handleCreateSupplier = async () => {
    if (newSupplierName.trim().length < 2) {
      toast.error("O nome do fornecedor deve ter pelo menos 2 caracteres");
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .insert({
          company_id: companyId,
          name: newSupplierName.trim(),
          phone: newSupplierPhone.trim() || null,
          is_active: true
        })
        .select("*")
        .single();

      if (error) throw error;

      toast.success("Fornecedor cadastrado com sucesso!");
      
      const createdSupplier = data as Supplier;
      // Atualiza lista local
      setSuppliers(prev => [...prev, createdSupplier].sort((a, b) => a.name.localeCompare(b.name)));
      // Seleciona o recém-criado
      onChange(createdSupplier);
      // Fecha o popover
      setOpen(false);
    } catch (error: any) {
      console.error("[SupplierAutocomplete] Error creating supplier:", error);
      toast.error(error?.message || "Erro ao cadastrar fornecedor");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          {value ? (
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{value.name}</span>
              {value.phone && (
                <span className="text-xs text-muted-foreground">({value.phone})</span>
              )}
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0" align="start">
        {!showCreateForm ? (
          <Command className="w-full">
            <CommandInput 
              placeholder="Buscar fornecedor..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList className="max-h-[300px] overflow-y-auto scrollbar-thin">
              {loading ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Carregando fornecedores...</span>
                </div>
              ) : (
                <>
                  <CommandEmpty className="py-4 px-2 text-center text-sm">
                    <p className="text-muted-foreground">Nenhum fornecedor encontrado.</p>
                  </CommandEmpty>

                  <CommandGroup>
                    {suppliers.map((supplier) => (
                      <CommandItem
                        key={supplier.id}
                        value={supplier.name}
                        onSelect={() => {
                          onChange(supplier);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 text-primary",
                            value?.id === supplier.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{supplier.name}</span>
                          {supplier.phone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" /> {supplier.phone}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
            
            {/* Rodapé fixo para cadastrar novo fornecedor */}
            <div className="p-2 border-t border-border bg-muted/40 flex justify-center">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs flex items-center justify-center gap-1.5"
                onClick={() => {
                  setNewSupplierName("");
                  setShowCreateForm(true);
                }}
              >
                <Plus className="w-3.5 h-3.5" /> Novo Fornecedor
              </Button>
            </div>
          </Command>
        ) : (
          /* Formulário de criação inline */
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setShowCreateForm(false)}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h4 className="text-sm font-semibold">Novo Fornecedor</h4>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="sup-name" className="text-xs font-semibold text-muted-foreground">Nome Comercial *</Label>
                <Input
                  id="sup-name"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  placeholder="Ex: Distribuidora WFE"
                  className="h-9 text-sm"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="sup-phone" className="text-xs font-semibold text-muted-foreground">Telefone de Contato</Label>
                <Input
                  id="sup-phone"
                  value={newSupplierPhone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    let formatted = digits;
                    if (digits.length > 0) {
                      if (digits.length <= 2) formatted = `(${digits}`;
                      else if (digits.length <= 6) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
                      else if (digits.length <= 10) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
                      else formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
                    }
                    setNewSupplierPhone(formatted);
                  }}
                  placeholder="Ex: (11) 99999-9999"
                  maxLength={15}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setShowCreateForm(false)}
                disabled={creating}
              >
                Voltar
              </Button>
              <Button
                size="sm"
                className="flex-1 text-xs"
                onClick={handleCreateSupplier}
                disabled={creating || !newSupplierName.trim()}
              >
                {creating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    Criando...
                  </>
                ) : (
                  "Cadastrar"
                )}
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
