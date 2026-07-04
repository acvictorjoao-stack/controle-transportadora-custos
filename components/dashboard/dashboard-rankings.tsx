import {RankingCard} from '@/components/dashboard/ranking-card';
import {Section} from '@/components/layout/section';
import type {CompanyDashboardData} from '@/features/organization/dashboard/types';

export interface DashboardRankingsProps {
  rankings: CompanyDashboardData['rankings'];
}

function DashboardRankings({rankings}: DashboardRankingsProps) {
  const {postos, veiculos, marcas, centrosCusto, viagens} = rankings;

  return (
    <Section title="Rankings" description="Top performers do período">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 2xl:grid-cols-5 2xl:gap-5">
        <RankingCard
          title="Top Postos"
          description="Por volume de abastecimentos"
          items={postos}
        />
        <RankingCard
          title="Top Veículos"
          description="Por custo financeiro"
          items={veiculos}
        />
        <RankingCard
          title="Top Categorias"
          description="Por volume financeiro"
          items={marcas}
        />
        <RankingCard
          title="Top Centros de Custo"
          description="Por alocação de custos"
          items={centrosCusto}
        />
        <RankingCard
          title="Top Viagens"
          description="Por rentabilidade"
          items={viagens}
        />
      </div>
    </Section>
  );
}

export {DashboardRankings};
