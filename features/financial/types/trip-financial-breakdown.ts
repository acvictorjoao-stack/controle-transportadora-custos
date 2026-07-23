/**
 * Breakdown financeiro de uma viagem (RC 26.9.1 / 26.9.2).
 * Desacoplado da DRE por rota — reutilizável na ficha da viagem e relatórios.
 * Receita alinhada à DRE (`getTripFreightValue`); custos com vínculo direto ou rateio por KM.
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
  /** `mileage` quando o valor veio de rateio por KM (sem trip_id). */
  allocation: 'direct' | 'mileage';
  /** Fração do valor original no rateio (1 = vínculo direto). */
  allocationShare: number | null;
  /** Valor original do lançamento antes do rateio. */
  originalAmount: number | null;
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
  allocation?: 'direct' | 'mileage';
  allocationShare?: number | null;
  originalAmount?: number | null;
}

/** Período opcional para rateio de custos compartilhados do veículo. */
export interface TripFinancialBreakdownPeriod {
  dateFrom?: string;
  dateTo?: string;
}
