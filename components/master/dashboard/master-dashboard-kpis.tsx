import {
  AlertTriangle,
  Building2,
  CalendarPlus,
  CreditCard,
  PauseCircle,
  TrendingUp,
} from 'lucide-react';

import {MetricCard} from '@/components/data-display/metric-card';
import {getPlanLabel} from '@/features/master/plans';
import type {MasterDashboardStats} from '@/features/master/dashboard';
import type {PlanCatalogItem} from '@/features/master/plans';

export interface MasterDashboardKpisProps {
  stats: MasterDashboardStats;
  plans: PlanCatalogItem[];
}

function formatPlanSummary(
  planCounts: Record<string, number>,
  plans: PlanCatalogItem[],
): string {
  const entries = Object.entries(planCounts);
  if (entries.length === 0) {
    return 'Nenhuma empresa cadastrada';
  }

  return entries
    .map(([slug, count]) => `${getPlanLabel(plans, slug)}: ${count}`)
    .join(' · ');
}

function MasterDashboardKpis({stats, plans}: MasterDashboardKpisProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <MetricCard
        label="Total de Empresas"
        value={stats.totalCompanies}
        icon={<Building2 className="size-4" />}
      />
      <MetricCard
        label="Empresas Ativas"
        value={stats.activeCompanies}
        icon={<TrendingUp className="size-4" />}
        description="operando na plataforma"
      />
      <MetricCard
        label="Empresas Suspensas"
        value={stats.suspendedCompanies}
        icon={<PauseCircle className="size-4" />}
        description="inativas ou bloqueadas"
      />
      <MetricCard
        label="Empresas por Plano"
        value={Object.keys(stats.planCounts).length}
        icon={<CreditCard className="size-4" />}
        description={formatPlanSummary(stats.planCounts, plans)}
      />
      <MetricCard
        label="Criadas este mês"
        value={stats.createdThisMonth}
        icon={<CalendarPlus className="size-4" />}
        description="novos cadastros"
      />
      <MetricCard
        label="Provisionamentos com erro"
        value={stats.provisioningErrors}
        icon={<AlertTriangle className="size-4" />}
        description="requerem atenção"
      />
    </div>
  );
}

export {MasterDashboardKpis};
