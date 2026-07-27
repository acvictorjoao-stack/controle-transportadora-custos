export type ExecutiveGoalMetric =
  | 'receita'
  | 'lucro'
  | 'margem'
  | 'sla'
  | 'leadTime'
  | 'custoKm'
  | 'receitaKm'
  | 'lucroKm';

/** Metas da empresa (armazenadas em `companies.settings.executive_goals`). */
export type ExecutiveGoals = Partial<Record<ExecutiveGoalMetric, number | null>>;

export const EXECUTIVE_GOAL_METRICS: ExecutiveGoalMetric[] = [
  'receita',
  'lucro',
  'margem',
  'sla',
  'leadTime',
  'custoKm',
  'receitaKm',
  'lucroKm',
];

export const EXECUTIVE_GOAL_LABELS: Record<ExecutiveGoalMetric, string> = {
  receita: 'Receita',
  lucro: 'Lucro',
  margem: 'Margem',
  sla: 'SLA',
  leadTime: 'Lead Time',
  custoKm: 'Custo/KM',
  receitaKm: 'Receita/KM',
  lucroKm: 'Lucro/KM',
};

/** Unidades de exibição (não afetam cálculo). */
export const EXECUTIVE_GOAL_UNITS: Record<
  ExecutiveGoalMetric,
  'currency' | 'percent' | 'minutes' | 'perKm'
> = {
  receita: 'currency',
  lucro: 'currency',
  margem: 'percent',
  sla: 'percent',
  leadTime: 'minutes',
  custoKm: 'perKm',
  receitaKm: 'perKm',
  lucroKm: 'perKm',
};

/** Métricas em que valor menor é melhor (lead time, custo/km). */
export const EXECUTIVE_GOAL_LOWER_IS_BETTER: ReadonlySet<ExecutiveGoalMetric> =
  new Set(['leadTime', 'custoKm']);

export const DEFAULT_EXECUTIVE_GOALS: ExecutiveGoals = {
  receita: null,
  lucro: null,
  margem: 20,
  sla: 90,
  leadTime: null,
  custoKm: null,
  receitaKm: null,
  lucroKm: null,
};
