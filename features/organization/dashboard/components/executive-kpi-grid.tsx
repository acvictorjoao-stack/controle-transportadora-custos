import {
  DollarSign,
  Percent,
  Receipt,
  Route,
  TrendingUp,
  Truck,
  Gauge,
  ArrowUpRight,
} from 'lucide-react';

import {formatCurrencyBr, formatPercent} from '@/features/financial/utils/financial-format';
import {cn} from '@/lib/utils';

import type {ExecutiveDashboardKpis} from '../loaders/executive-dashboard-loader';
import {
  EXECUTIVE_OPEN_BALANCE_LABELS,
  formatExecutiveKm,
  hasExecutiveOperationalData,
} from '../utils/executive-kpi-display';
import {ExecutiveKpiCard} from './executive-kpi-card';

export {EXECUTIVE_OPEN_BALANCE_LABELS};

export interface ExecutiveKpiGridProps {
  kpis: ExecutiveDashboardKpis;
  className?: string;
}

function formatPerKm(value: number | null, hasData: boolean): string {
  if (!hasData || value == null) return '—';
  return `${formatCurrencyBr(value)}/km`;
}

function formatPerTrip(value: number | null, hasData: boolean): string {
  if (!hasData || value == null) return '—';
  return formatCurrencyBr(value);
}

function ExecutiveKpiGrid({kpis, className}: ExecutiveKpiGridProps) {
  const costsOnlyMode = kpis.costsOnlyMode;
  const hasOperationalData = hasExecutiveOperationalData(kpis);
  const profitNegative =
    hasOperationalData &&
    kpis.operatingProfit != null &&
    kpis.operatingProfit < 0;
  const profitClass = profitNegative ? 'text-destructive' : undefined;
  const profitAccent = profitNegative ? 'danger' : 'success';

  const revenueValue =
    !hasOperationalData || costsOnlyMode
      ? '—'
      : formatCurrencyBr(kpis.totalRevenue);
  const profitValue =
    !hasOperationalData || costsOnlyMode || kpis.operatingProfit == null
      ? '—'
      : formatCurrencyBr(kpis.operatingProfit);
  const marginValue =
    costsOnlyMode || kpis.operatingMarginPercent == null
      ? '—'
      : formatPercent(kpis.operatingMarginPercent);

  const iconClass = 'size-4';

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {!hasOperationalData && (
        <p className="text-sm text-muted-foreground">
          Sem dados para o período selecionado.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ExecutiveKpiCard
          title="Faturamento Total"
          value={revenueValue}
          subtitle="receita bruta de fretes"
          accent="info"
          icon={<DollarSign className={iconClass} aria-hidden />}
        />
        <ExecutiveKpiCard
          title="Custos Totais"
          value={hasOperationalData ? formatCurrencyBr(kpis.totalCosts) : '—'}
          subtitle={
            hasOperationalData
              ? EXECUTIVE_OPEN_BALANCE_LABELS.costsSubtitle
              : 'combustível, manutenção e demais custos'
          }
          accent="warning"
          icon={<Receipt className={iconClass} aria-hidden />}
        />
        <ExecutiveKpiCard
          title="Lucro Operacional"
          value={<span className={profitClass}>{profitValue}</span>}
          subtitle={
            profitNegative
              ? 'resultado líquido negativo'
              : 'resultado líquido do período'
          }
          accent={profitAccent}
          icon={<TrendingUp className={iconClass} aria-hidden />}
        />
        <ExecutiveKpiCard
          title="Margem Operacional"
          value={<span className={profitClass}>{marginValue}</span>}
          subtitle="lucro / faturamento"
          accent="primary"
          icon={<Percent className={iconClass} aria-hidden />}
        />
        <ExecutiveKpiCard
          title="Total de Viagens"
          value={
            hasOperationalData
              ? kpis.completedTrips.toLocaleString('pt-BR')
              : '—'
          }
          subtitle={
            hasOperationalData
              ? formatExecutiveKm(kpis.totalKm)
              : 'viagens concluídas'
          }
          accent="info"
          icon={<Route className={iconClass} aria-hidden />}
        />
        <ExecutiveKpiCard
          title="Custo por KM"
          value={formatPerKm(
            costsOnlyMode ? null : kpis.costPerKm,
            hasOperationalData,
          )}
          subtitle="gasto médio por quilômetro"
          accent="muted"
          icon={<Gauge className={iconClass} aria-hidden />}
        />
        <ExecutiveKpiCard
          title="Faturamento por KM"
          value={formatPerKm(
            costsOnlyMode ? null : kpis.revenuePerKm,
            hasOperationalData && !costsOnlyMode,
          )}
          subtitle="receita média por quilômetro"
          accent="muted"
          icon={<ArrowUpRight className={iconClass} aria-hidden />}
        />
        <ExecutiveKpiCard
          title="Média por Viagem"
          value={formatPerTrip(
            costsOnlyMode ? null : kpis.revenuePerTrip,
            hasOperationalData && !costsOnlyMode,
          )}
          subtitle="ticket médio de frete"
          accent="muted"
          icon={<Truck className={iconClass} aria-hidden />}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {EXECUTIVE_OPEN_BALANCE_LABELS.sectionTitle}
          </p>
          <p className="text-xs text-muted-foreground">
            {EXECUTIVE_OPEN_BALANCE_LABELS.sectionHint}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ExecutiveKpiCard
            title={EXECUTIVE_OPEN_BALANCE_LABELS.accountsPayableTitle}
            value={formatCurrencyBr(kpis.accountsPayable)}
            subtitle={EXECUTIVE_OPEN_BALANCE_LABELS.accountsPayableSubtitle}
            accent="warning"
          />
          <ExecutiveKpiCard
            title={EXECUTIVE_OPEN_BALANCE_LABELS.accountsReceivableTitle}
            value={formatCurrencyBr(kpis.accountsReceivable)}
            subtitle={EXECUTIVE_OPEN_BALANCE_LABELS.accountsReceivableSubtitle}
            accent="success"
          />
        </div>
      </div>
    </div>
  );
}

export {ExecutiveKpiGrid};
