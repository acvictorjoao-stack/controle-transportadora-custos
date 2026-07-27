import {StatCard} from '@/components/data-display/stat-card';
import {formatCurrencyBr, formatPercent} from '@/features/financial/utils/financial-format';
import {cn} from '@/lib/utils';

import type {ExecutiveDashboardKpis} from '../loaders/executive-dashboard-loader';

export interface ExecutiveKpiGridProps {
  kpis: ExecutiveDashboardKpis;
  className?: string;
}

function formatKm(value: number): string {
  return `${value.toLocaleString('pt-BR', {maximumFractionDigits: 1})} km`;
}

function ExecutiveKpiGrid({kpis, className}: ExecutiveKpiGridProps) {
  const profitClass =
    kpis.operatingProfit < 0 ? 'text-destructive' : undefined;

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4',
        className,
      )}
    >
      <StatCard title="Receita Total" value={formatCurrencyBr(kpis.totalRevenue)} />
      <StatCard title="Custos Totais" value={formatCurrencyBr(kpis.totalCosts)} />
      <StatCard
        title="Lucro Operacional"
        value={
          <span className={profitClass}>
            {formatCurrencyBr(kpis.operatingProfit)}
          </span>
        }
      />
      <StatCard
        title="Margem Operacional"
        value={
          <span className={profitClass}>
            {formatPercent(kpis.operatingMarginPercent)}
          </span>
        }
      />
      <StatCard title="KM Rodados" value={formatKm(kpis.totalKm)} />
      <StatCard
        title="Viagens Concluídas"
        value={kpis.completedTrips.toLocaleString('pt-BR')}
      />
      <StatCard
        title="Contas a Pagar"
        value={formatCurrencyBr(kpis.accountsPayable)}
      />
      <StatCard
        title="Contas a Receber"
        value={formatCurrencyBr(kpis.accountsReceivable)}
      />
    </div>
  );
}

export {ExecutiveKpiGrid};
