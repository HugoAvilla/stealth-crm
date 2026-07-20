import React, { useState } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Search, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LixeiraProps {
    handleSlotClick: (space: any) => void;
}

export function Lixeira({ handleSlotClick }: LixeiraProps) {
    const { user } = useAuth();
    const companyId = user?.companyId;

    const [searchParams] = useSearchParams();
    const searchParamValue = searchParams.get("search") || "";
    const [searchTerm, setSearchTerm] = useState(searchParamValue);

    // Fetch deleted spaces (Lixeira)
    const { data: deletedSpaces, isLoading: isDeletedLoading } = useQuery({
        queryKey: ['spaces-deleted', companyId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('spaces')
                .select(`
          *,
          client:clients(id, name, phone, birth_date, email),
          vehicle:vehicles(id, brand, model, plate, year),
          sale:sales(
            id, total, subtotal, discount,
            sale_items(
              id,
              total_price,
              service:services(id, name)
            )
          )
        `)
                .eq('company_id', companyId)
                .not('deleted_at', 'is', null)
                .order('deleted_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!companyId,
    });

    return (
        <div className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card/30 p-4 rounded-lg border">
                <div>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Trash2 className="h-5 w-5 text-destructive" />
                        Lixeira Operacional (Vagas)
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Vagas que foram excluídas logicamente. Você pode visualizar detalhes, restaurá-las ou excluí-las permanentemente (apenas Administradores).
                    </p>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar excluídos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-9"
                    />
                </div>
            </div>

            {isDeletedLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (() => {
                const filteredDeleted = deletedSpaces?.filter((space: any) => {
                    if (!searchTerm) return true;
                    const term = searchTerm.toLowerCase();
                    return (
                        space.client?.name?.toLowerCase().includes(term) ||
                        space.name?.toLowerCase().includes(term) ||
                        space.vehicle?.plate?.toLowerCase().includes(term) ||
                        space.vehicle?.model?.toLowerCase().includes(term)
                    );
                }) || [];

                if (filteredDeleted.length === 0) {
                    return (
                        <Card className="flex flex-col items-center justify-center p-8 text-center min-h-[300px] border-dashed bg-card/30">
                            <div className="p-4 rounded-full bg-muted mb-4">
                                <Trash2 className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold">Lixeira vazia</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mt-1">
                                Nenhuma vaga excluída logicamente foi encontrada.
                            </p>
                        </Card>
                    );
                }

                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredDeleted.map((space: any) => (
                            <Card
                                key={space.id}
                                className="flex flex-col justify-between border border-destructive/10 hover:border-destructive/20 hover:shadow-md transition-all bg-card/50 cursor-pointer"
                                onClick={() => handleSlotClick(space)}
                            >
                                <CardContent className="p-5 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-base flex items-center gap-1.5 text-foreground">
                                                {space.name}
                                            </h4>
                                            <span className="text-xs text-muted-foreground block">
                                                Entrada em: {space.entry_date ? format(new Date(space.entry_date + 'T12:00:00'), "dd/MM/yyyy") : "-"}
                                            </span>
                                        </div>
                                        <Badge variant="destructive" className="gap-1 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10">
                                            <Trash2 className="h-3 w-3" />
                                            Excluída
                                        </Badge>
                                    </div>

                                    <div className="text-sm space-y-1.5 text-muted-foreground border-t pt-2 mt-2">
                                        <p><strong className="text-foreground font-medium">Cliente:</strong> {space.client?.name || "Sem Nome"}</p>
                                        {space.vehicle && (
                                            <p><strong className="text-foreground font-medium">Veículo:</strong> {space.vehicle.brand} {space.vehicle.model} ({space.vehicle.plate || "S/ Placa"})</p>
                                        )}
                                        <p className="text-xs text-destructive bg-destructive/5 p-2 rounded border border-destructive/15 mt-2 max-h-[60px] overflow-hidden text-ellipsis">
                                            <strong className="font-semibold block mb-0.5">Motivo:</strong>
                                            <span className="italic">"{space.deleted_reason || "Nenhum motivo informado."}"</span>
                                        </p>
                                    </div>

                                    <Button
                                        variant="outline"
                                        className="w-full mt-3 gap-2 border-destructive/20 text-destructive hover:bg-destructive/5 hover:text-destructive text-xs"
                                    >
                                        Visualizar & Gerenciar
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                );
            })()}
        </div>
    );
}
