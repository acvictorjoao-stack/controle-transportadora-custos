/**
 * Analytics de fornecedores — estrutura preparada (RC 27.2.0).
 * NÃO implementar rankings/top 10 agora; apenas contratos tipados.
 */

export type SupplierAnalyticsMetricKey =
  | 'top_10_suppliers'
  | 'highest_spend'
  | 'most_services'
  | 'highest_avg_payment_term'
  | 'highest_operational_cost';

export const SUPPLIER_ANALYTICS_METRIC_KEYS: SupplierAnalyticsMetricKey[] = [
  'top_10_suppliers',
  'highest_spend',
  'most_services',
  'highest_avg_payment_term',
  'highest_operational_cost',
];

export interface SupplierAnalyticsMetricDefinition {
  key: SupplierAnalyticsMetricKey;
  label: string;
  description: string;
}

export const SUPPLIER_ANALYTICS_DEFINITIONS: SupplierAnalyticsMetricDefinition[] = [
  {
    key: 'top_10_suppliers',
    label: 'Top 10 fornecedores',
    description: 'Maiores volumes de gasto no período',
  },
  {
    key: 'highest_spend',
    label: 'Maior gasto',
    description: 'Fornecedor com maior despesa acumulada',
  },
  {
    key: 'most_services',
    label: 'Maior número de serviços',
    description: 'Fornecedor com mais ordens/registros',
  },
  {
    key: 'highest_avg_payment_term',
    label: 'Maior prazo médio',
    description: 'Maior prazo médio de pagamento',
  },
  {
    key: 'highest_operational_cost',
    label: 'Maior custo operacional',
    description: 'Maior impacto em custo operacional',
  },
];

/** Stub — retorna definições sem consultar dados. */
export function listSupplierAnalyticsDefinitions(): SupplierAnalyticsMetricDefinition[] {
  return SUPPLIER_ANALYTICS_DEFINITIONS;
}
