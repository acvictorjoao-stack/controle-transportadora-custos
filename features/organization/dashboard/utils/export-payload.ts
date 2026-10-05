import type {AnalyticsExportPayload} from '@/features/analytics-nav/types';
import {analyticsFilenameBase} from '@/features/analytics-nav/utils/export-analytics';
import type {OperationalDreFilterOptions} from '@/features/dre/types';
import {formatCurrencyBr, formatPercent} from '@/features/financial/utils/financial-format';

import type {ExecutiveDashboardCoreData} from '../loaders/executive-dashboard-loader';
import {
  EXECUTIVE_OPEN_BALANCE_LABELS,
  formatExecutiveKm,
  hasExecutiveOperationalData,
} from './executive-kpi-display';
import {formatMarginStatus} from './margin-status';
import {formatEntityFilterScope, formatPeriodRangeLabel} from './period';

const EMPTY = '—';

export const EXECUTIVE_DASHBOARD_EXPORT_FILENAME_PREFIX = 'dashboard-executivo';

export function executiveDashboardExportFilenameBase(
  period: ExecutiveDashboardCoreData['period'],
): string {
  return analyticsFilenameBase(EXECUTIVE_DASHBOARD_EXPORT_FILENAME_PREFIX, period);
}

/**
 * Exportação do Dashboard Executivo: KPIs (mesmas regras de `ExecutiveKpiGrid`),
 * Top 5 Rotas e Top 5 Clientes do loader core, no escopo dos filtros da tela.
 * AP/AR seguem company-wide, rotulados como na tela.
 */
export function buildExecutiveDashboardExportPayload(input: {
  core: Pick<ExecutiveDashboardCoreData, 'period' | 'kpis' | 'topRoutes' | 'topCustomers'>;
  filterOptions: OperationalDreFilterOptions;
}): AnalyticsExportPayload {
  const {core, filterOptions} = input;
  const {kpis} = core;
  const hasOperationalData = hasExecutiveOperationalData(kpis);
  const costsOnlyMode = kpis.costsOnlyMode;

  return {
    title: 'Dashboard Executivo',
    kpis: [
      {label: 'Período', value: formatPeriodRangeLabel(core.period) || 'Todo o período'},
      {label: 'Filtros', value: formatEntityFilterScope(core.period, filterOptions)},
      {
        label: 'Receita Total',
        value:
          !hasOperationalData || costsOnlyMode
            ? EMPTY
            : formatCurrencyBr(kpis.totalRevenue),
      },
      {
        label: 'Custos Totais',
        value: hasOperationalData ? formatCurrencyBr(kpis.totalCosts) : EMPTY,
      },
      {
        label: 'Lucro Operacional',
        value:
          !hasOperationalData || costsOnlyMode || kpis.operatingProfit == null
            ? EMPTY
            : formatCurrencyBr(kpis.operatingProfit),
      },
      {
        label: 'Margem Operacional',
        value:
          costsOnlyMode || kpis.operatingMarginPercent == null
            ? EMPTY
            : formatPercent(kpis.operatingMarginPercent),
      },
      {
        label: 'KM Rodados',
        value: hasOperationalData ? formatExecutiveKm(kpis.totalKm) : EMPTY,
      },
      {
        label: 'Viagens Concluídas',
        value: hasOperationalData ? kpis.completedTrips.toLocaleString('pt-BR') : EMPTY,
      },
      {
        label: `${EXECUTIVE_OPEN_BALANCE_LABELS.accountsPayableTitle} (${EXECUTIVE_OPEN_BALANCE_LABELS.accountsPayableSubtitle})`,
        value: formatCurrencyBr(kpis.accountsPayable),
      },
      {
        label: `${EXECUTIVE_OPEN_BALANCE_LABELS.accountsReceivableTitle} (${EXECUTIVE_OPEN_BALANCE_LABELS.accountsReceivableSubtitle})`,
        value: formatCurrencyBr(kpis.accountsReceivable),
      },
    ],
    tableTitle: 'Top 5 Rotas',
    columns: [
      {id: 'position', header: 'Posição'},
      {id: 'name', header: 'Rota'},
      {id: 'revenue', header: 'Receita'},
      {id: 'profit', header: 'Lucro'},
      {id: 'margin', header: 'Margem (%)'},
      {id: 'status', header: 'Status'},
    ],
    rows: core.topRoutes.map((route, index) => ({
      position: index + 1,
      name: route.name,
      revenue: route.revenue,
      profit: route.profit ?? EMPTY,
      margin: route.marginPercent ?? EMPTY,
      status: formatMarginStatus(route.status),
    })),
    sections: [
      {
        title: 'Top 5 Clientes',
        columns: [
          {id: 'position', header: 'Posição'},
          {id: 'name', header: 'Cliente'},
          {id: 'revenue', header: 'Receita'},
          {id: 'profit', header: 'Lucro'},
        ],
        rows: core.topCustomers.map((customer, index) => ({
          position: index + 1,
          name: customer.name,
          revenue: customer.revenue,
          profit: customer.profit ?? EMPTY,
        })),
      },
    ],
  };
}
