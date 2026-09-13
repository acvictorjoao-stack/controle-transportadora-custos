import {StatCard} from '@/components/data-display/stat-card';
import {formatCurrencyBr, formatPercent} from '@/features/financial/utils/financial-format';
import {cn} from '@/lib/utils';

import type {ExecutiveDashboardKpis} from '../loaders/executive-dashboard-loader';

export interface ExecutiveKpiGridProps {
  kpis: ExecutiveDashboardKpis;
  className?: string;
}

/** Rótulos estáveis dos cards de posição financeira (AP/AR). */
export const EXECUTIVE_OPEN_BALANCE_LABELS = {
  sectionTitle: 'Posição financeira da empresa',
  sectionHint:
    'Saldo em aberto • empresa inteira • independente dos filtros',
  accountsPayableTitle: 'Saldo em aberto — Contas a Pagar',
  accountsReceivableTitle: 'Saldo em aberto — Contas a Receber',
  accountsPayableSubtitle: 'Empresa inteira • sem folha',
  accountsReceivableSubtitle: 'Empresa inteira • independente dos filtros',
  costsSubtitle:
    'Total DRE = atribuídos + não atribuíveis; rankings usam só atribuídos',
} as const;

function formatKm(value: number): string {
  return `${value.toLocaleString('pt-BR', {maximumFractionDigits: 1})} km`;
}

function ExecutiveKpiGrid({kpis, className}: ExecutiveKpiGridProps) {
  const costsOnlyMode = kpis.costsOnlyMode;
  const hasOperationalData =
    kpis.completedTrips > 0 ||
    kpis.totalRevenue !== 0 ||
    kpis.totalCosts !== 0 ||
    costsOnlyMode;
  const profitClass =
    hasOperationalData &&
    kpis.operatingProfit != null &&
    kpis.operatingProfit < 0
      ? 'text-destructive'
      : undefined;

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

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {!hasOperationalData && (
        <p className="text-sm text-muted-foreground">
          Sem dados para o período selecionado.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4">
        <StatCard title="Receita Total" value={revenueValue} />
        <StatCard
          title="Custos Totais"
          value={hasOperationalData ? formatCurrencyBr(kpis.totalCosts) : '—'}
          subtitle={
            hasOperationalData
              ? EXECUTIVE_OPEN_BALANCE_LABELS.costsSubtitle
              : undefined
          }
        />
        <StatCard
          title="Lucro Operacional"
          value={<span className={profitClass}>{profitValue}</span>}
        />
        <StatCard
          title="Margem Operacional"
          value={<span className={profitClass}>{marginValue}</span>}
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4">
          <StatCard
            title={EXECUTIVE_OPEN_BALANCE_LABELS.accountsPayableTitle}
            value={formatCurrencyBr(kpis.accountsPayable)}
            subtitle={EXECUTIVE_OPEN_BALANCE_LABELS.accountsPayableSubtitle}
          />
          <StatCard
            title={EXECUTIVE_OPEN_BALANCE_LABELS.accountsReceivableTitle}
            value={formatCurrencyBr(kpis.accountsReceivable)}
            subtitle={EXECUTIVE_OPEN_BALANCE_LABELS.accountsReceivableSubtitle}
          />
        </div>
      </div>
    </div>
  );
}

export {ExecutiveKpiGrid};
