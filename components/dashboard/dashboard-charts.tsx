import {ChartPlaceholder} from '@/components/dashboard/chart-placeholder';
import {dashboardMock} from '@/components/dashboard/mock-data';
import {Section} from '@/components/layout/section';

const chartVariants = ['bar', 'bar', 'area'] as const;

function DashboardCharts() {
  return (
    <Section title="Análise Financeira" description="Indicadores visuais da performance">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:gap-5">
        {dashboardMock.charts.slice(0, 2).map((chart, index) => (
          <ChartPlaceholder
            key={chart.id}
            title={chart.title}
            description={chart.description}
            variant={chartVariants[index]}
          />
        ))}
      </div>
      <ChartPlaceholder
        title={dashboardMock.charts[2].title}
        description={dashboardMock.charts[2].description}
        variant="area"
      />
    </Section>
  );
}

export {DashboardCharts};
