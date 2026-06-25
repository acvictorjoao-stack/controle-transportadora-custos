import {MetricCard} from '@/components/data-display/metric-card';
import {dashboardMock} from '@/components/dashboard/mock-data';
import {kpiIcons} from '@/components/dashboard/dashboard-header';

function DashboardKpis() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {dashboardMock.kpis.map((kpi) => {
        const Icon = kpiIcons[kpi.id as keyof typeof kpiIcons];
        return (
          <MetricCard
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            description={kpi.description}
            trend={kpi.trend}
            icon={Icon ? <Icon className="size-4" /> : undefined}
          />
        );
      })}
    </div>
  );
}

export {DashboardKpis};
