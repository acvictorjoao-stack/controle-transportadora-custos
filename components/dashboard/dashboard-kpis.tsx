import {MetricCard} from '@/components/data-display/metric-card';
import {kpiIcons} from '@/components/dashboard/kpi-icons';
import type {DashboardKpiData} from '@/features/organization/dashboard/types';

export interface DashboardKpisProps {
  kpis: DashboardKpiData[];
}

function DashboardKpis({kpis}: DashboardKpisProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 2xl:gap-5">
      {kpis.map((kpi) => {
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
