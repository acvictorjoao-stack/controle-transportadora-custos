/**
 * Breakdown financeiro de uma viagem (RC 26.9.1).
 * Desacoplado da DRE por rota — reutilizável na ficha da viagem e relatórios.
 */

export const TRIP_FINANCIAL_COST_CATEGORIES = [
  'combustivel',
  'manutencao',
  'pneus',
  'pedagio',
  'multas',
  'outros',
] as const;

export type TripFinancialCostCategory =
  (typeof TRIP_FINANCIAL_COST_CATEGORIES)[number];

export const TRIP_FINANCIAL_CATEGORY_LABELS: Record<
  TripFinancialCostCategory,
  string
> = {
  combustivel: 'Combustível',
  manutencao: 'Manutenção',
  pneus: 'Pneus',
  pedagio: 'Pedágio',
  multas: 'Multas',
  outros: 'Outros',
};

export const TRIP_FINANCIAL_CATEGORY_ICONS: Record<
  TripFinancialCostCategory,
  string
> = {
  combustivel: '⛽',
  manutencao: '🔧',
  pneus: '🛞',
  pedagio: '🛣️',
  multas: '🚨',
  outros: '📦',
};

/** Lançamento financeiro atribuído a uma categoria da viagem. */
export interface TripFinancialBreakdownEntry {
  id: string;
  date: string;
  document: string | null;
  supplier: string | null;
  description: string | null;
  category: TripFinancialCostCategory;
  categoryLabel: string;
  amount: number;
  sourceModule: string | null;
  sourceId: string | null;
  fuelRecordId: string | null;
  maintenanceRecordId: string | null;
  tireId: string | null;
  /** Href resolvido para "Abrir origem" (null se indisponível). */
  originHref: string | null;
  originLabel: string;
}

export interface TripFinancialBreakdownCategory {
  category: TripFinancialCostCategory;
  label: string;
  icon: string;
  total: number;
  /** Percentual do custo total da viagem. */
  percentOfCost: number | null;
  entries: TripFinancialBreakdownEntry[];
}

export interface TripFinancialBreakdownData {
  tripId: string;
  revenue: number;
  totalCost: number;
  profit: number;
  margin: number | null;
  categories: TripFinancialBreakdownCategory[];
}

/**
 * Linha mínima necessária para o calculator (evita acoplar ao FinancialEntry completo).
 */
export interface TripFinancialBreakdownSourceRow {
  id: string;
  entryType: string;
  entryStatus: string;
  amount: number;
  entryDate: string;
  description: string | null;
  referenceNumber: string | null;
  supplier: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  sourceModule: string | null;
  sourceId: string | null;
  fuelRecordId: string | null;
  maintenanceRecordId: string | null;
  tireId: string | null;
}
