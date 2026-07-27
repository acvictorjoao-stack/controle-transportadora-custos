import {ChartPlaceholder} from '@/components/dashboard/chart-placeholder';
import {Section} from '@/components/layout/section';
import type {DashboardChartData} from '@/features/organization/dashboard/types';

export interface DashboardChartsProps {
  charts: DashboardChartData[];
}

/**
 * Seção de gráficos do dashboard legado.
 * Sem séries mockadas — apenas empty state até integração com dados reais.
 */
function DashboardCharts({charts}: DashboardChartsProps) {
  if (charts.length === 0) {
    return (
      <Section title="Análise Financeira" description="Indicadores visuais da performance">
        <ChartPlaceholder
          title="Gráficos"
          description="Nenhum dado disponível para gerar o gráfico."
        />
      </Section>
    );
  }

  return (
    <Section title="Análise Financeira" description="Indicadores visuais da performance">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:gap-5">
        {charts.map((chart) => (
          <ChartPlaceholder
            key={chart.id}
            title={chart.title}
            description={chart.description}
          />
        ))}
      </div>
    </Section>
  );
}

export {DashboardCharts};
