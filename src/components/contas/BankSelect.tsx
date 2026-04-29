import { useState } from "react";
import { Check, ChevronsUpDown, Landmark } from "lucide-react";
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
import { BANK_LIST, getBankByCode } from "@/constants/bankCatalog";

interface BankSelectProps {
  value: string | null;
  onValueChange: (code: string | null) => void;
  className?: string;
  placeholder?: string;
}

const BankSelect = ({ 
  value, 
  onValueChange, 
  className,
  placeholder = "Selecione um banco..."
}: BankSelectProps) => {
  const [open, setOpen] = useState(false);
  const selectedBank = getBankByCode(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !selectedBank && "text-muted-foreground",
            className
          )}
        >
          {selectedBank ? (
            <div className="flex items-center gap-2">
              <img 
                src={selectedBank.logoUrl} 
                alt={selectedBank.name} 
                className="w-4 h-4 object-contain rounded-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span>{selectedBank.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-muted-foreground" />
              <span>{placeholder}</span>
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0" align="start">
        <Command className="max-h-[400px]">
          <CommandInput placeholder="Buscar banco..." />
          <CommandList className="max-h-[350px] overflow-y-auto">
            <CommandEmpty>Nenhum banco encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                key="none"
                value="Nenhum banco"
                onSelect={() => {
                  onValueChange(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === null ? "opacity-100" : "opacity-0"
                  )}
                />
                Nenhum
              </CommandItem>
              {BANK_LIST.map((bank) => (
                <CommandItem
                  key={bank.code}
                  value={bank.name}
                  onSelect={() => {
                    onValueChange(bank.code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === bank.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2 w-full">
                    <img 
                      src={bank.logoUrl} 
                      alt={bank.name} 
                      className="w-5 h-5 object-contain rounded-sm bg-white p-0.5"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span>{bank.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {bank.code}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default BankSelect;
