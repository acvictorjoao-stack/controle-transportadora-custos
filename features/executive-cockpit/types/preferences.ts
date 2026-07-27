export type CockpitWidgetId =
  | 'kpis'
  | 'score'
  | 'goals'
  | 'trends'
  | 'insights'
  | 'comparatives';

export type CockpitChartId =
  | 'receita'
  | 'margem'
  | 'custos'
  | 'sla';

export interface ExecutiveCockpitPreferences {
  widgetOrder: CockpitWidgetId[];
  hiddenWidgets: CockpitWidgetId[];
  favoriteCharts: CockpitChartId[];
}

export const ALL_COCKPIT_WIDGETS: CockpitWidgetId[] = [
  'comparatives',
  'kpis',
  'score',
  'goals',
  'trends',
  'insights',
];

export const ALL_COCKPIT_CHARTS: CockpitChartId[] = [
  'receita',
  'margem',
  'custos',
  'sla',
];

export const COCKPIT_WIDGET_LABELS: Record<CockpitWidgetId, string> = {
  comparatives: 'Comparativos',
  kpis: 'Cards Inteligentes',
  score: 'Score Operacional',
  goals: 'Metas',
  trends: 'Tendências',
  insights: 'Insights',
};

export const COCKPIT_CHART_LABELS: Record<CockpitChartId, string> = {
  receita: 'Receita',
  margem: 'Margem',
  custos: 'Custos',
  sla: 'SLA',
};

export const DEFAULT_COCKPIT_PREFERENCES: ExecutiveCockpitPreferences = {
  widgetOrder: [...ALL_COCKPIT_WIDGETS],
  hiddenWidgets: [],
  favoriteCharts: ['receita', 'margem', 'sla'],
};
