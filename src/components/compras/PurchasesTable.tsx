import React, { useState } from "react";
import { format } from "date-fns";
import { 
  Search, Filter, Trash2, Eye, MoreVertical, X
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Purchase } from "@/lib/database.types";
import { Skeleton } from "@/components/ui/skeleton";

export interface PurchaseRow extends Purchase {
  supplier_name: string;
  purchase_installments?: { id: number; status: string }[];
}

export interface PurchaseFilters {
  search: string;
  status: string;
  paymentMethod: string;
  startDate?: string;
  endDate?: string;
}

interface PurchasesTableProps {
  purchases: PurchaseRow[];
  loading: boolean;
  onViewDetails: (id: number) => void;
  onDelete: (id: number) => void;
  filters: PurchaseFilters;
  onFiltersChange: (filters: PurchaseFilters) => void;
}

export function PurchasesTable({ 
  purchases, loading, onViewDetails, onDelete, filters, onFiltersChange 
}: PurchasesTableProps) {

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paga': return <Badge className="bg-green-500 hover:bg-green-600">Paga</Badge>;
      case 'em_aberto': return <Badge variant="outline" className="text-amber-600 border-amber-600">Em Aberto</Badge>;
      case 'atrasada': return <Badge variant="destructive">Atrasada</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredPurchases = purchases.filter(p => {
    const searchMatch = p.supplier_name_snapshot.toLowerCase().includes(filters.search.toLowerCase());
    const statusMatch = filters.status === "all" || p.status === filters.status;
    const paymentMatch = filters.paymentMethod === "all" || p.payment_method === filters.paymentMethod;
    
    // Filtro por data
    let dateMatch = true;
    if (filters.startDate && filters.endDate) {
      dateMatch = p.purchase_date >= filters.startDate && p.purchase_date <= filters.endDate;
    } else if (filters.startDate) {
      dateMatch = p.purchase_date >= filters.startDate;
    } else if (filters.endDate) {
      dateMatch = p.purchase_date <= filters.endDate;
    }

    return searchMatch && statusMatch && paymentMatch && dateMatch;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por fornecedor..." 
            className="pl-9"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          />
        </div>
        <div className="flex gap-2">
          {filters.startDate || filters.endDate ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onFiltersChange({ ...filters, startDate: "", endDate: "" })}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" /> Limpar
            </Button>
          ) : null}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" /> Filtros
                {(filters.startDate || filters.endDate) && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">Ativo</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 border-border/50">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Filtro por Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Selecione o período das compras.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data Inicial</Label>
                    <Input 
                      type="date" 
                      className="[color-scheme:dark] w-full"
                      value={filters.startDate || ""} 
                      onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Final</Label>
                    <Input 
                      type="date" 
                      className="[color-scheme:dark] w-full"
                      value={filters.endDate || ""} 
                      onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Card className="border-border/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cód</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Forma Pgto</TableHead>
              <TableHead>Parcelas</TableHead>
              <TableHead>Pagas</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Restante</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPurchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                  Nenhuma compra encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredPurchases.map(purchase => (
                <TableRow 
                  key={purchase.id} 
                  className="cursor-pointer hover:bg-muted/30" 
                  onClick={() => onViewDetails(purchase.id)}
                >
                  <TableCell className="font-medium">#{purchase.id}</TableCell>
                  <TableCell>{purchase.supplier_name_snapshot}</TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(purchase.purchase_date + 'T12:00:00'), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>{purchase.payment_method}</TableCell>
                  <TableCell>{purchase.installments_count}x</TableCell>
                  <TableCell>
                    {(() => {
                      const paidCount = purchase.purchase_installments
                        ? purchase.purchase_installments.filter(inst => inst.status === "paga").length
                        : purchase.status === "paga" ? purchase.installments_count : 0;
                      return `${paidCount} / ${purchase.installments_count}`;
                    })()}
                  </TableCell>
                  <TableCell>R$ {Number(purchase.total_amount).toFixed(2)}</TableCell>
                  <TableCell>R$ {Number(purchase.remaining_amount).toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2" onClick={() => onViewDetails(purchase.id)}>
                          <Eye className="h-4 w-4" /> Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-destructive" onClick={() => onDelete(purchase.id)}>
                          <Trash2 className="h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
