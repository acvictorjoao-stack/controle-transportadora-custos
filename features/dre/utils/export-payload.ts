import type {AnalyticsExportPayload} from '@/features/analytics-nav/types';
import {analyticsFilenameBase} from '@/features/analytics-nav/utils/export-analytics';
import {formatCurrencyBr, formatPercent} from '@/features/financial/utils/financial-format';
import {
  formatEntityFilterScope,
  formatPeriodRangeLabel,
} from '@/features/organization/dashboard/utils/period';

import {OPERATIONAL_DRE_COST_ALLOCATION_LABELS} from '../services/operational-dre-cost-allocation';
import type {
  OperationalDreByRouteData,
  OperationalDreData,
  OperationalDreFilterOptions,
  OperationalDreFilters,
} from '../types';

const EMPTY = '—';

export const OPERATIONAL_DRE_EXPORT_FILENAME_PREFIX = 'dre-operacional';

export function operationalDreExportFilenameBase(filters: OperationalDreFilters): string {
  return analyticsFilenameBase(OPERATIONAL_DRE_EXPORT_FILENAME_PREFIX, filters);
}

function moneyOrEmpty(value: number | null): string {
  return value == null ? EMPTY : formatCurrencyBr(value);
}

/**
 * Exportação da DRE Operacional: mesmos dados de `OperationalDreView`
 * (cards, tabela analítica, indicadores, centros de custo e custos por rota),
 * sem recalcular nada. Respeita o modo só custos (Audit #6) como a tela.
 */
export function buildOperationalDreExportPayload(input: {
  data: OperationalDreData;
  byRoute: OperationalDreByRouteData;
  filters: OperationalDreFilters;
  filterOptions: OperationalDreFilterOptions;
}): AnalyticsExportPayload {
  const {data, byRoute, filters, filterOptions} = input;
  const {revenues, costs, result, indicators} = data;
  const costsOnlyMode = data.costsOnlyMode;
  const hideProfit = costsOnlyMode || result.operatingProfit == null;

  return {
    title: 'DRE Operacional',
    kpis: [
      {label: 'Período', value: formatPeriodRangeLabel(filters) || 'Todo o período'},
      {label: 'Filtros', value: formatEntityFilterScope(filters, filterOptions)},
      {
        label: 'Receita de Fretes',
        value: costsOnlyMode ? EMPTY : formatCurrencyBr(revenues.freightRevenue),
      },
      {
        label: 'Receita Total',
        value: costsOnlyMode ? EMPTY : formatCurrencyBr(revenues.totalRevenue),
      },
      {
        label: OPERATIONAL_DRE_COST_ALLOCATION_LABELS.allocated,
        value: formatCurrencyBr(costs.allocatedOperatingCosts),
      },
      {
        label: OPERATIONAL_DRE_COST_ALLOCATION_LABELS.unattributable,
        value: formatCurrencyBr(costs.unattributableOperatingCosts),
      },
      {
        label: OPERATIONAL_DRE_COST_ALLOCATION_LABELS.total,
        value: formatCurrencyBr(costs.totalOperatingCosts),
      },
      {
        label: 'Lucro Operacional',
        value: hideProfit ? EMPTY : moneyOrEmpty(result.operatingProfit),
      },
      {
        label: 'Margem Operacional',
        value:
          costsOnlyMode || result.operatingMarginPercent == null
            ? EMPTY
            : formatPercent(result.operatingMarginPercent),
      },
    ],
    tableTitle: 'Tabela Analítica',
    columns: [
      {id: 'category', header: 'Categoria'},
      {id: 'value', header: 'Valor'},
      {id: 'percentOfRevenue', header: '% Receita'},
    ],
    rows: data.analyticalTable.map((row) => ({
      category: row.label,
      value: row.value,
      percentOfRevenue: row.percentOfRevenue ?? EMPTY,
    })),
    sections: [
      {
        title: 'Indicadores',
        columns: [
          {id: 'indicator', header: 'Indicador'},
          {id: 'value', header: 'Valor'},
        ],
        rows: [
          {indicator: 'Receita/km', value: indicators.revenuePerKm ?? EMPTY},
          {indicator: 'Custo/km', value: indicators.costPerKm ?? EMPTY},
          {indicator: 'Lucro/km', value: indicators.profitPerKm ?? EMPTY},
          {indicator: 'Receita/Viagem', value: indicators.revenuePerTrip ?? EMPTY},
          {indicator: 'Custo/Viagem', value: indicators.costPerTrip ?? EMPTY},
          {indicator: 'Lucro/Viagem', value: indicators.profitPerTrip ?? EMPTY},
          {indicator: 'Viagens', value: indicators.tripCount},
          {indicator: 'KM Rodados', value: indicators.totalKm},
          {indicator: 'Clientes Atendidos', value: indicators.customersServed},
          {indicator: 'Rotas Utilizadas', value: indicators.routesUsed},
          {indicator: 'Veículos Utilizados', value: indicators.vehiclesUsed},
        ],
      },
      {
        title: 'Ranking — Centros de Custo',
        columns: [
          {id: 'center', header: 'Centro'},
          {id: 'value', header: 'Valor'},
          {id: 'percent', header: '%'},
        ],
        rows: data.costCenterBreakdown.ranking.map((row) => ({
          center: `${row.code} — ${row.name}`,
          value: row.value,
          percent: row.percent ?? EMPTY,
        })),
      },
      {
        title: 'Custos por Rota',
        columns: [
          {id: 'route', header: 'Rota'},
          {id: 'tripCount', header: 'Viagens'},
          {id: 'revenue', header: 'Receita Total'},
          {id: 'cost', header: 'Custos Totais'},
          {id: 'profit', header: 'Lucro'},
          {id: 'margin', header: 'Margem (%)'},
          {id: 'costPerKm', header: 'Custo/KM'},
          {id: 'revenuePerKm', header: 'Receita/KM'},
        ],
        rows: byRoute.groups.map((group) => ({
          route: group.route.label,
          tripCount: group.tripCount,
          revenue: costsOnlyMode ? EMPTY : group.totalRevenue,
          cost: group.totalCost,
          profit: group.totalProfit ?? EMPTY,
          margin: group.marginPercent ?? EMPTY,
          costPerKm: group.costPerKm ?? EMPTY,
          revenuePerKm: group.revenuePerKm ?? EMPTY,
        })),
      },
    ],
  };
}
