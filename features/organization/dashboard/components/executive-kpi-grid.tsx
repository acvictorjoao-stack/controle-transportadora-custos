import type {ReactNode} from 'react';
import {
  ArrowUpRight,
  CreditCard,
  DollarSign,
  Gauge,
  HandCoins,
  Percent,
  Receipt,
  Route,
  TrendingUp,
  Truck,
} from 'lucide-react';

import {Badge} from '@/components/ui/badge';
import {formatCurrencyBr, formatPercent} from '@/features/financial/utils/financial-format';
import {cn} from '@/lib/utils';

import type {ExecutiveDashboardKpis} from '../loaders/executive-dashboard-loader';
import {
  EXECUTIVE_OPEN_BALANCE_LABELS,
  formatExecutiveKm,
  hasExecutiveOperationalData,
} from '../utils/executive-kpi-display';
import {ExecutiveKpiCard, ExecutiveKpiIcon} from './executive-kpi-card';

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

/** Cabeçalho discreto de cada categoria de indicadores. */
function KpiGroup({
  title,
  hint,
  aside,
  children,
}: {
  title: string;
  hint: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex items-baseline gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        {aside}
      </div>
      {children}
    </div>
  );
}

/** Card largo da posição financeira (AP/AR): ícone, valor e escopo lado a lado. */
function OpenBalanceCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <div
      data-slot="executive-open-balance-card"
      className="flex min-w-0 items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 shadow-card"
    >
      <ExecutiveKpiIcon accent="muted">{icon}</ExecutiveKpiIcon>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-muted-foreground">{title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <p
        className="shrink-0 font-financial text-xl font-semibold tracking-tight text-foreground"
        data-financial="true"
      >
        {value}
      </p>
    </div>
  );
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

  const gridClass = 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4';

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {!hasOperationalData && (
        <p className="text-sm text-muted-foreground">
          Sem dados para o período selecionado.
        </p>
      )}

      <KpiGroup title="Financeiros" hint="Resultado no período filtrado">
        <div className={gridClass}>
          <ExecutiveKpiCard
            title="Faturamento Total"
            value={revenueValue}
            subtitle="receita bruta de fretes"
            accent="primary"
            icon={<DollarSign aria-hidden />}
          />
          <ExecutiveKpiCard
            title="Custos Totais"
            value={hasOperationalData ? formatCurrencyBr(kpis.totalCosts) : '—'}
            subtitle={
              hasOperationalData
                ? EXECUTIVE_OPEN_BALANCE_LABELS.costsSubtitle
                : 'combustível, manutenção e demais custos'
            }
            accent="muted"
            icon={<Receipt aria-hidden />}
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
            icon={<TrendingUp aria-hidden />}
          />
          <ExecutiveKpiCard
            title="Margem Operacional"
            value={<span className={profitClass}>{marginValue}</span>}
            subtitle="lucro / faturamento"
            accent={profitAccent}
            icon={<Percent aria-hidden />}
          />
        </div>
      </KpiGroup>

      <KpiGroup title="Operacionais" hint="Eficiência da operação no período filtrado">
        <div className={gridClass}>
          <ExecutiveKpiCard
            size="md"
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
            icon={<Route aria-hidden />}
          />
          <ExecutiveKpiCard
            size="md"
            title="Custo por KM"
            value={formatPerKm(
              costsOnlyMode ? null : kpis.costPerKm,
              hasOperationalData,
            )}
            subtitle="gasto médio por quilômetro"
            accent="info"
            icon={<Gauge aria-hidden />}
          />
          <ExecutiveKpiCard
            size="md"
            title="Faturamento por KM"
            value={formatPerKm(
              costsOnlyMode ? null : kpis.revenuePerKm,
              hasOperationalData && !costsOnlyMode,
            )}
            subtitle="receita média por quilômetro"
            accent="info"
            icon={<ArrowUpRight aria-hidden />}
          />
          <ExecutiveKpiCard
            size="md"
            title="Média por Viagem"
            value={formatPerTrip(
              costsOnlyMode ? null : kpis.revenuePerTrip,
              hasOperationalData && !costsOnlyMode,
            )}
            subtitle="ticket médio de frete"
            accent="info"
            icon={<Truck aria-hidden />}
          />
        </div>
      </KpiGroup>

      <KpiGroup
        title={EXECUTIVE_OPEN_BALANCE_LABELS.sectionTitle}
        hint={EXECUTIVE_OPEN_BALANCE_LABELS.sectionHint}
        aside={
          <Badge variant="outline" className="text-[11px] font-medium text-muted-foreground">
            Não muda com os filtros
          </Badge>
        }
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <OpenBalanceCard
            title={EXECUTIVE_OPEN_BALANCE_LABELS.accountsPayableTitle}
            value={formatCurrencyBr(kpis.accountsPayable)}
            subtitle={EXECUTIVE_OPEN_BALANCE_LABELS.accountsPayableSubtitle}
            icon={<CreditCard aria-hidden />}
          />
          <OpenBalanceCard
            title={EXECUTIVE_OPEN_BALANCE_LABELS.accountsReceivableTitle}
            value={formatCurrencyBr(kpis.accountsReceivable)}
            subtitle={EXECUTIVE_OPEN_BALANCE_LABELS.accountsReceivableSubtitle}
            icon={<HandCoins aria-hidden />}
          />
        </div>
      </KpiGroup>
    </div>
  );
}

export {ExecutiveKpiGrid};
