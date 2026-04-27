import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Users } from "lucide-react";
import CommissionPersonCard, { CommissionPersonWithMetrics, CommissionPersonType } from "./CommissionPersonCard";

const SECTION_CONFIG: Record<CommissionPersonType, { title: string; icon_color: string; empty_text: string }> = {
  'VENDEDOR': {
    title: 'Vendedores',
    icon_color: 'text-blue-500',
    empty_text: 'Nenhum vendedor cadastrado. Cadastre o primeiro para começar a vincular comissões de vendas.',
  },
  'INSTALADOR_INSULFILM': {
    title: 'Instaladores Insulfilm',
    icon_color: 'text-amber-500',
    empty_text: 'Nenhum instalador de insulfilm cadastrado. Cadastre para vincular comissões de instalação.',
  },
  'INSTALADOR_PPF': {
    title: 'Instaladores PPF',
    icon_color: 'text-purple-500',
    empty_text: 'Nenhum instalador PPF cadastrado. Cadastre para vincular comissões de instalação PPF.',
  },
};

interface CommissionPeopleSectionProps {
  title: string;
  type: CommissionPersonType;
  people: CommissionPersonWithMetrics[];
  onAdd: () => void;
  onEdit: (person: CommissionPersonWithMetrics) => void;
  onViewDetail: (person: CommissionPersonWithMetrics) => void;
}

const CommissionPeopleSection = ({
  type,
  people,
  onAdd,
  onEdit,
  onViewDetail,
}: CommissionPeopleSectionProps) => {
  const config = SECTION_CONFIG[type];

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className={`h-5 w-5 ${config.icon_color}`} />
          {config.title}
        </h2>
        <Button size="sm" onClick={onAdd} className="gap-1">
          <Plus className="h-4 w-4" />
          Novo
        </Button>
      </div>

      {/* Empty State or Grid */}
      {people.length === 0 ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-8 text-center">
            <Users className={`h-10 w-10 mx-auto mb-3 ${config.icon_color} opacity-50`} />
            <p className="text-sm text-muted-foreground">{config.empty_text}</p>
            <Button variant="outline" size="sm" className="mt-4 gap-1" onClick={onAdd}>
              <Plus className="h-4 w-4" />
              Cadastrar Primeiro
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {people.map((person) => (
            <CommissionPersonCard
              key={person.id}
              person={person}
              onClick={() => onViewDetail(person)}
              onEdit={() => onEdit(person)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommissionPeopleSection;
