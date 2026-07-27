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
  const hasOperationalData =
    kpis.completedTrips > 0 || kpis.totalRevenue !== 0 || kpis.totalCosts !== 0;
  const profitClass =
    hasOperationalData && kpis.operatingProfit < 0
      ? 'text-destructive'
      : undefined;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {!hasOperationalData && (
        <p className="text-sm text-muted-foreground">
          Sem dados para o período selecionado.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4">
        <StatCard
          title="Receita Total"
          value={hasOperationalData ? formatCurrencyBr(kpis.totalRevenue) : '—'}
        />
        <StatCard
          title="Custos Totais"
          value={hasOperationalData ? formatCurrencyBr(kpis.totalCosts) : '—'}
        />
        <StatCard
          title="Lucro Operacional"
          value={
            <span className={profitClass}>
              {hasOperationalData ? formatCurrencyBr(kpis.operatingProfit) : '—'}
            </span>
          }
        />
        <StatCard
          title="Margem Operacional"
          value={
            <span className={profitClass}>
              {kpis.operatingMarginPercent == null
                ? '—'
                : formatPercent(kpis.operatingMarginPercent)}
            </span>
          }
        />
        <StatCard
          title="KM Rodados"
          value={hasOperationalData ? formatKm(kpis.totalKm) : '—'}
        />
        <StatCard
          title="Viagens Concluídas"
          value={
            hasOperationalData
              ? kpis.completedTrips.toLocaleString('pt-BR')
              : '—'
          }
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
    </div>
  );
}

export {ExecutiveKpiGrid};
