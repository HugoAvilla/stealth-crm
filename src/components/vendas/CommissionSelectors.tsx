import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, ChevronsUpDown, X, Percent, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type CommissionPersonType = 'VENDEDOR' | 'INSTALADOR_INSULFILM' | 'INSTALADOR_PPF';

interface CommissionPerson {
  id: number;
  name: string;
  type: CommissionPersonType;
  commission_percentage: number;
  is_active: boolean;
}

interface CommissionSelectorsProps {
  companyId: number;
  selectedSellerId: number | null;
  selectedInstallerIds: number[];
  onSellerChange: (id: number | null) => void;
  onInstallersChange: (ids: number[]) => void;
}

const TYPE_LABELS: Record<CommissionPersonType, string> = {
  'VENDEDOR': 'Vendedor',
  'INSTALADOR_INSULFILM': 'Inst. Insulfilm',
  'INSTALADOR_PPF': 'Inst. PPF',
};

const TYPE_COLORS: Record<CommissionPersonType, string> = {
  'VENDEDOR': 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  'INSTALADOR_INSULFILM': 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  'INSTALADOR_PPF': 'bg-purple-500/10 text-purple-500 border-purple-500/30',
};

const CommissionSelectors = ({
  companyId,
  selectedSellerId,
  selectedInstallerIds,
  onSellerChange,
  onInstallersChange,
}: CommissionSelectorsProps) => {
  const [openInstallerPopover, setOpenInstallerPopover] = useState(false);

  const { data: commissionPeople = [] } = useQuery({
    queryKey: ['commission-people-active', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_people')
        .select('id, name, type, commission_percentage, is_active')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching commission people:', error);
        return [];
      }
      return (data || []) as CommissionPerson[];
    },
    enabled: !!companyId,
  });

  const sellers = commissionPeople.filter(p => p.type === 'VENDEDOR');
  const installers = commissionPeople.filter(p => p.type !== 'VENDEDOR');

  const selectedSeller = sellers.find(s => s.id === selectedSellerId);
  const selectedInstallers = installers.filter(i => selectedInstallerIds.includes(i.id));

  const toggleInstaller = (id: number) => {
    if (selectedInstallerIds.includes(id)) {
      onInstallersChange(selectedInstallerIds.filter(iid => iid !== id));
    } else {
      onInstallersChange([...selectedInstallerIds, id]);
    }
  };

  const removeInstaller = (id: number) => {
    onInstallersChange(selectedInstallerIds.filter(iid => iid !== id));
  };

  // Don't render at all if no commission people exist
  if (commissionPeople.length === 0) return null;

  return (
    <div className="space-y-4">
      <Separator />
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Percent className="h-4 w-4" />
        Comissões (opcional)
      </div>

      {/* Seller single-select */}
      {sellers.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="h-3.5 w-3.5" />
            Vendedor
          </Label>
          <Select
            value={selectedSellerId?.toString() || "none"}
            onValueChange={(v) => onSellerChange(v === "none" ? null : parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Nenhum vendedor selecionado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {sellers.map((seller) => (
                <SelectItem key={seller.id} value={seller.id.toString()}>
                  <div className="flex items-center gap-2">
                    <span>{seller.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({seller.commission_percentage}%)
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Installers multi-select */}
      {installers.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            Instaladores
          </Label>
          <Popover open={openInstallerPopover} onOpenChange={setOpenInstallerPopover}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openInstallerPopover}
                className="w-full justify-between"
              >
                {selectedInstallerIds.length > 0
                  ? `${selectedInstallerIds.length} instalador(es) selecionado(s)`
                  : "Selecionar instaladores"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar instalador..." />
                <CommandList>
                  <CommandEmpty>Nenhum instalador encontrado.</CommandEmpty>
                  <CommandGroup>
                    {installers.map((installer) => (
                      <CommandItem
                        key={installer.id}
                        value={installer.name}
                        onSelect={() => toggleInstaller(installer.id)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Check
                            className={cn(
                              "h-4 w-4",
                              selectedInstallerIds.includes(installer.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span>{installer.name}</span>
                          <Badge variant="outline" className={cn("ml-auto text-xs", TYPE_COLORS[installer.type])}>
                            {TYPE_LABELS[installer.type]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {installer.commission_percentage}%
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Selected Badges */}
          {selectedInstallers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedInstallers.map((inst) => (
                <Badge
                  key={inst.id}
                  variant="outline"
                  className={cn("gap-1 pr-1", TYPE_COLORS[inst.type])}
                >
                  {inst.name} ({inst.commission_percentage}%)
                  <button
                    onClick={() => removeInstaller(inst.id)}
                    className="ml-1 rounded-full hover:bg-foreground/10 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CommissionSelectors;
export type { CommissionPerson, CommissionPersonType };
