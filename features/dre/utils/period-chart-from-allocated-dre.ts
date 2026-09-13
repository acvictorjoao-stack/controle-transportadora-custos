import type {PeriodChartPoint} from '@/features/dre/components/revenue-cost-profit-chart';
import type {OperationalDreData} from '@/features/dre/types';

/**
 * Audit #14 — ponto temporal do gráfico de rentabilidade na mesma base
 * conceitual do ranking (custos atribuídos/rateados).
 *
 * Não usa `totalOperatingCosts` / lucro DRE empresarial (que inclui
 * não atribuíveis). Não atribui artificialmente o que Audit #12 separou.
 */
export type AllocatedPeriodChartDre = Pick<
  OperationalDreData,
  'revenues' | 'costs' | 'costsOnlyMode'
>;

export function buildAllocatedPeriodChartPoint(
  bucket: {key: string; label: string},
  dre: AllocatedPeriodChartDre,
): PeriodChartPoint {
  const revenue = dre.revenues.totalRevenue;
  const costs = dre.costs.allocatedOperatingCosts;
  const profit = dre.costsOnlyMode ? null : revenue - costs;

  return {
    key: bucket.key,
    label: bucket.label,
    revenue,
    costs,
    profit,
  };
}
