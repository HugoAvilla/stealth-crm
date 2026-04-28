import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CommissionPeopleSection from "@/components/comissoes/CommissionPeopleSection";
import CommissionPersonModal from "@/components/comissoes/CommissionPersonModal";
import { CommissionPersonWithMetrics } from "@/components/comissoes/CommissionPersonCard";
import CommissionDetailDrawer from "@/components/comissoes/CommissionDetailDrawer";
import { HelpOverlay } from "@/components/help/HelpOverlay";

export default function Comissoes() {
  const { user } = useAuth();
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<CommissionPersonWithMetrics | null>(null);
  const [detailPerson, setDetailPerson] = useState<CommissionPersonWithMetrics | null>(null);

  const { data: companyId } = useQuery({
    queryKey: ['companyId'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user?.id || '')
        .single();
      return data?.company_id;
    },
    enabled: !!user?.id
  });

  const { data: people = [], refetch } = useQuery({
    queryKey: ['commission_people_with_metrics', companyId],
    queryFn: async () => {
      // 1. Fetch people
      const { data: peopleData, error: peopleError } = await supabase
        .from('commission_people')
        .select('*')
        .eq('company_id', companyId)
        .order('name');
        
      if (peopleError) throw peopleError;

      // 2. Fetch metrics
      const { data: commissionsData, error: commError } = await supabase
        .from('sale_commissions')
        .select('commission_person_id, commission_amount')
        .eq('company_id', companyId);

      if (commError) throw commError;

      // 3. Aggregate
      const metricsMap = new Map<number, { total_sales: number, total_commission: number }>();
      
      commissionsData?.forEach(comm => {
        const current = metricsMap.get(comm.commission_person_id) || { total_sales: 0, total_commission: 0 };
        current.total_sales += 1;
        current.total_commission += Number(comm.commission_amount);
        metricsMap.set(comm.commission_person_id, current);
      });

      return (peopleData || []).map(p => ({
        ...p,
        total_sales: metricsMap.get(p.id)?.total_sales || 0,
        total_commission: metricsMap.get(p.id)?.total_commission || 0,
      })) as CommissionPersonWithMetrics[];
    },
    enabled: !!companyId
  });

  const sellers = people.filter(p => p.type === 'VENDEDOR');
  const instInsulfilm = people.filter(p => p.type === 'INSTALADOR_INSULFILM');
  const instPpf = people.filter(p => p.type === 'INSTALADOR_PPF');

  const handleAdd = () => {
    setSelectedPerson(null);
    setShowPersonModal(true);
  };

  const handleEdit = (person: CommissionPersonWithMetrics) => {
    setSelectedPerson(person);
    setShowPersonModal(true);
  };

  const handleViewDetail = (person: CommissionPersonWithMetrics) => {
    setDetailPerson(person);
    setShowDetailDrawer(true);
  };

  return (
    <div className="space-y-6 p-6 pb-20">
      <HelpOverlay
        tabId="comissoes"
        title="Guia de Comissões"
        sections={[
          {
            title: "Vídeo Aula — Comissões",
            description: "Assista ao vídeo tutorial para entender como gerenciar vendedores, instaladores e pagamentos.",
            videoUrl: "/help/video-aula-comissoes.mp4"
          },
          {
            title: "Gestão de Comissionados",
            description: "Adicione pessoas para receber comissões, configure suas taxas e visualize métricas e relatórios diretamente no card de cada um.",
            screenshotUrl: "/help/help-comissoes.png"
          }
        ]}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Percent className="h-6 w-6 text-primary" />
            Comissões
          </h1>
          <p className="text-muted-foreground">
            Gestão de comissionados e acompanhamento de ganhos
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Comissionado
        </Button>
      </div>

      <div className="space-y-8">
        <CommissionPeopleSection
          type="VENDEDOR"
          people={sellers}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onViewDetail={handleViewDetail}
        />
        <CommissionPeopleSection
          type="INSTALADOR_INSULFILM"
          people={instInsulfilm}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onViewDetail={handleViewDetail}
        />
        <CommissionPeopleSection
          type="INSTALADOR_PPF"
          people={instPpf}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onViewDetail={handleViewDetail}
        />
      </div>

      <CommissionPersonModal
        open={showPersonModal}
        onOpenChange={setShowPersonModal}
        person={selectedPerson}
        onSuccess={refetch}
      />

      <CommissionDetailDrawer
        open={showDetailDrawer}
        onOpenChange={setShowDetailDrawer}
        person={detailPerson}
      />
    </div>
  );
}
