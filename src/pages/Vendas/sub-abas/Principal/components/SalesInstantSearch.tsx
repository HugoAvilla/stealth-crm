import { Search, Loader2, DollarSign, User, Car } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SaleWithDetails } from "@/types/sales";

interface SalesInstantSearchProps {
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    showSearchResults: boolean;
    setShowSearchResults: (val: boolean) => void;
    isSearching: boolean;
    searchResults: { sales: any[]; clients: any[]; vehicles: any[] };
    onSaleSelect: (sale: SaleWithDetails) => void;
}

export function SalesInstantSearch({
    searchTerm,
    setSearchTerm,
    showSearchResults,
    setShowSearchResults,
    isSearching,
    searchResults,
    onSaleSelect
}: SalesInstantSearchProps) {
    return (
        <div className="relative flex-1 min-w-[200px] w-full sm:w-auto search-container z-50">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar venda, cliente ou veículo..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowSearchResults(true);
                    }}
                    onFocus={() => setShowSearchResults(true)}
                    className="pl-10"
                />
                {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
            </div>

            {showSearchResults && searchTerm.trim().length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl overflow-hidden max-h-[400px] overflow-y-auto z-50">
                    {isSearching ? (
                        <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            <span>Buscando...</span>
                        </div>
                    ) : searchResults.sales.length === 0 && searchResults.clients.length === 0 && searchResults.vehicles.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            Nenhum resultado encontrado
                        </div>
                    ) : (
                        <div className="p-2 space-y-4">
                            {searchResults.sales.length > 0 && (
                                <div className="space-y-1">
                                    <h4 className="text-[10px] uppercase font-bold text-muted-foreground px-3 py-1 tracking-wider">
                                        Vendas Encontradas
                                    </h4>
                                    {searchResults.sales.map(sale => (
                                        <button
                                            key={sale.id}
                                            onClick={() => {
                                                setShowSearchResults(false);
                                                onSaleSelect(sale);
                                            }}
                                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent transition-colors flex items-center gap-3"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center shrink-0">
                                                <DollarSign className="w-4 h-4 text-success" />
                                            </div>
                                            <div className="truncate">
                                                <p className="text-sm font-semibold">
                                                    Venda #{sale.id} - R$ {sale.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    Cliente: {sale.client?.name || "Sem Nome"} {sale.vehicle ? `(${sale.vehicle.brand} ${sale.vehicle.model})` : ''}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {searchResults.clients.length > 0 && (
                                <div className="space-y-1">
                                    <h4 className="text-[10px] uppercase font-bold text-muted-foreground px-3 py-1 tracking-wider">
                                        Clientes
                                    </h4>
                                    {searchResults.clients.map(client => (
                                        <button
                                            key={client.id}
                                            onClick={() => {
                                                setShowSearchResults(false);
                                                setSearchTerm(client.name);
                                            }}
                                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent transition-colors flex items-center gap-3"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                                                <User className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="truncate">
                                                <p className="text-sm font-semibold">{client.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    WhatsApp: {client.phone}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {searchResults.vehicles.length > 0 && (
                                <div className="space-y-1">
                                    <h4 className="text-[10px] uppercase font-bold text-muted-foreground px-3 py-1 tracking-wider">
                                        Veículos Cadastrados
                                    </h4>
                                    {searchResults.vehicles.map(vehicle => (
                                        <button
                                            key={vehicle.id}
                                            onClick={() => {
                                                setShowSearchResults(false);
                                                setSearchTerm(vehicle.plate || vehicle.model);
                                            }}
                                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent transition-colors flex items-center gap-3"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-info/20 flex items-center justify-center shrink-0">
                                                <Car className="w-4 h-4 text-info" />
                                            </div>
                                            <div className="truncate">
                                                <p className="text-sm font-semibold">
                                                    {vehicle.brand} {vehicle.model}
                                                    {vehicle.plate && <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">{vehicle.plate}</span>}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    Proprietário: {vehicle.client?.name || "Sem Proprietário"}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
