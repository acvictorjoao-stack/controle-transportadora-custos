import {ChartPlaceholder} from '@/components/dashboard/chart-placeholder';
import {Section} from '@/components/layout/section';
import type {DashboardChartData} from '@/features/organization/dashboard/types';

const chartVariants = ['bar', 'bar', 'area'] as const;

export interface DashboardChartsProps {
  charts: DashboardChartData[];
}

function DashboardCharts({charts}: DashboardChartsProps) {
  return (
    <Section title="Análise Financeira" description="Indicadores visuais da performance">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:gap-5">
        {charts.slice(0, 2).map((chart, index) => (
          <ChartPlaceholder
            key={chart.id}
            title={chart.title}
            description={chart.description}
            variant={chartVariants[index]}
          />
        ))}
      </div>
      {charts[2] && (
        <ChartPlaceholder
          title={charts[2].title}
          description={charts[2].description}
          variant="area"
        />
      )}
    </Section>
  );
}

export {DashboardCharts};
