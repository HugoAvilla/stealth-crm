// @ts-nocheck
import { Client } from "@/pages/Clientes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MoreVertical,
  Phone,
  Car,
  DollarSign,
  Calendar,
  Eye,
  Pencil,
  Trash2,
  MessageCircle,
  MapPin,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ClientCardProps {
  client: Client;
  onViewProfile: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onWhatsApp: (phone: string) => void;
}

export function ClientCard({
  client,
  onViewProfile,
  onEdit,
  onDelete,
  onWhatsApp,
}: ClientCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const getTierBadgeProps = (tier: string) => {
    switch (tier) {
      case "VIP":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "Comum":
        return "bg-primary/10 text-primary border-primary/20";
      case "Sem Compras":
        return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    }
  };

  const getStatusBadgeProps = (status: string) => {
    if (status === "Ativo") {
      return "bg-green-500/10 text-green-500 border-green-500/20";
    }
    return "bg-red-500/10 text-red-500 border-red-500/20";
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Only trigger if not clicking a button/dropdown
    const target = e.target as HTMLElement;
    if (!target.closest("button") && !target.closest('[role="menuitem"]')) {
      onViewProfile(client);
    }
  };

  return (
    <Card 
      className="bg-card/50 border-border/50 hover:bg-card/80 hover:border-primary/30 transition-all duration-200 cursor-pointer overflow-hidden group"
      onClick={handleCardClick}
    >
      <CardContent className="p-0">
        <div className="p-4 space-y-4">
          {/* Header Row */}
          <div className="flex justify-between items-start">
            <div className="flex gap-3">
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-lg
                  ${client.tier === "VIP" 
                    ? "bg-gradient-to-br from-amber-400 to-yellow-600 text-white shadow-sm" 
                    : client.status === "Inativo"
                      ? "bg-zinc-500/20 text-zinc-400"
                      : "bg-primary/20 text-primary"
                  }
                `}
              >
                {getInitials(client.name)}
              </div>
              <div>
                <h3 className="font-medium text-base text-foreground leading-tight line-clamp-1">
                  {client.name}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onWhatsApp(client.phone);
                  }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-green-500 mt-1 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {client.phone}
                </button>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity -mr-2 -mt-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onViewProfile(client)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onWhatsApp(client.phone)}>
                  <MessageCircle className="h-4 w-4 mr-2 text-green-500" />
                  WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(client)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(client)}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Badges Row */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={`text-[10px] uppercase font-semibold tracking-wider ${getStatusBadgeProps(client.status)}`}>
              {client.status}
            </Badge>
            <Badge variant="outline" className={`text-[10px] uppercase font-semibold tracking-wider ${getTierBadgeProps(client.tier)}`}>
              {client.tier}
            </Badge>
            {client.origem && (
              <Badge variant="outline" className="text-[10px] uppercase font-semibold tracking-wider bg-card text-muted-foreground border-border/50 flex items-center gap-1">
                <MapPin className="h-3 w-3 -ml-0.5" />
                {client.origem}
              </Badge>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-muted/20 p-4 border-t border-border/50 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Car className="h-4 w-4 text-primary" />
              <span>{client.vehicles.length} veículo{client.vehicles.length !== 1 && 's'}</span>
            </div>
            <div className="flex items-center gap-2 font-medium">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className={client.total_spent > 0 ? "text-foreground" : "text-muted-foreground"}>
                R$ {client.total_spent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              Último serviço: {client.last_sale_date 
                ? format(new Date(client.last_sale_date), "dd/MM/yyyy")
                : "Nunca"
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
