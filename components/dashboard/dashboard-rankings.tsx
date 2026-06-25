import {dashboardMock} from '@/components/dashboard/mock-data';
import {RankingCard} from '@/components/dashboard/ranking-card';
import {Section} from '@/components/layout/section';

function DashboardRankings() {
  const {clientes, veiculos, motoristas} = dashboardMock.rankings;

  return (
    <Section title="Rankings" description="Top performers do período">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RankingCard
          title="Top Clientes"
          description="Por receita gerada"
          items={clientes}
        />
        <RankingCard
          title="Top Veículos"
          description="Por receita operacional"
          items={veiculos}
        />
        <RankingCard
          title="Top Motoristas"
          description="Por performance e receita"
          items={motoristas}
        />
      </div>
    </Section>
  );
}

export {DashboardRankings};
