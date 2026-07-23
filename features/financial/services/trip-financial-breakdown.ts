import {
  TRIP_FINANCIAL_CATEGORY_ICONS,
  TRIP_FINANCIAL_CATEGORY_LABELS,
  TRIP_FINANCIAL_COST_CATEGORIES,
  type TripFinancialBreakdownCategory,
  type TripFinancialBreakdownData,
  type TripFinancialBreakdownEntry,
  type TripFinancialBreakdownSourceRow,
  type TripFinancialCostCategory,
} from '../types/trip-financial-breakdown';
import {
  resolveTripFinancialOriginHref,
  resolveTripFinancialOriginLabel,
} from '../utils/trip-financial-origin';

function asFinite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function marginPercent(profit: number, revenue: number): number | null {
  if (revenue <= 0) return null;
  return (profit / revenue) * 100;
}

function isActiveEntry(row: TripFinancialBreakdownSourceRow): boolean {
  return row.entryStatus !== 'cancelled' && row.entryStatus !== 'reversed';
}

/**
 * Classifica despesa da viagem nas categorias do drill-down.
 * Alinhado à prioridade da DRE (`categorizeExpense`) + pedágio/multas.
 */
export function categorizeTripFinancialExpense(
  row: TripFinancialBreakdownSourceRow,
): TripFinancialCostCategory {
  const slug = row.categorySlug?.toLowerCase() ?? null;

  if (slug === 'combustivel' || row.fuelRecordId || row.sourceModule === 'fuel') {
    return 'combustivel';
  }
  if (
    slug === 'manutencao' ||
    row.maintenanceRecordId ||
    row.sourceModule === 'maintenance'
  ) {
    return 'manutencao';
  }
  if (slug === 'pneus' || row.tireId || row.sourceModule === 'tires') {
    return 'pneus';
  }
  if (slug === 'pedagio' || row.sourceModule === 'tolls') {
    return 'pedagio';
  }
  if (slug === 'multas' || row.sourceModule === 'fines') {
    return 'multas';
  }

  return 'outros';
}

function mapEntry(
  row: TripFinancialBreakdownSourceRow,
  category: TripFinancialCostCategory,
): TripFinancialBreakdownEntry {
  const amount = asFinite(row.amount);
  return {
    id: row.id,
    date: row.entryDate,
    document: row.referenceNumber,
    supplier: row.supplier,
    description: row.description,
    category,
    categoryLabel: TRIP_FINANCIAL_CATEGORY_LABELS[category],
    amount,
    sourceModule: row.sourceModule,
    sourceId: row.sourceId,
    fuelRecordId: row.fuelRecordId,
    maintenanceRecordId: row.maintenanceRecordId,
    tireId: row.tireId,
    originHref: resolveTripFinancialOriginHref(row),
    originLabel: resolveTripFinancialOriginLabel(row.sourceModule),
    allocation: row.allocation ?? 'direct',
    allocationShare: row.allocationShare ?? (row.allocation === 'mileage' ? null : 1),
    originalAmount:
      row.originalAmount != null ? asFinite(row.originalAmount) : amount,
  };
}

function emptyCategories(): TripFinancialBreakdownCategory[] {
  return TRIP_FINANCIAL_COST_CATEGORIES.map((category) => ({
    category,
    label: TRIP_FINANCIAL_CATEGORY_LABELS[category],
    icon: TRIP_FINANCIAL_CATEGORY_ICONS[category],
    total: 0,
    percentOfCost: null,
    entries: [],
  }));
}

export interface BuildTripFinancialBreakdownOptions {
  /**
   * Receita oficial da viagem (mesma origem da DRE: `getTripFreightValue`).
   * Quando informada, lançamentos `revenue` são ignorados no total.
   */
  revenue?: number;
}

/**
 * Consolida receita, custos por categoria, lucro e margem.
 * Sem I/O — testável unitariamente.
 *
 * `entries` em cada categoria já vêm preenchidos (uma única leitura no loader);
 * a UI expande categorias sem nova consulta.
 */
export function buildTripFinancialBreakdown(
  tripId: string,
  rows: TripFinancialBreakdownSourceRow[],
  options: BuildTripFinancialBreakdownOptions = {},
): TripFinancialBreakdownData {
  const active = rows.filter(isActiveEntry);
  const useOfficialRevenue = options.revenue !== undefined;
  let revenue = useOfficialRevenue ? asFinite(options.revenue!) : 0;
  const categories = emptyCategories();
  const byCategory = new Map(
    categories.map((category) => [category.category, category] as const),
  );

  for (const row of active) {
    const amount = asFinite(row.amount);
    if (row.entryType === 'revenue') {
      if (!useOfficialRevenue) revenue += amount;
      continue;
    }
    if (row.entryType !== 'expense') continue;

    const categoryKey = categorizeTripFinancialExpense(row);
    const bucket = byCategory.get(categoryKey);
    if (!bucket) continue;
    bucket.total += amount;
    bucket.entries.push(mapEntry(row, categoryKey));
  }

  for (const category of categories) {
    category.entries.sort((a, b) => a.date.localeCompare(b.date));
  }

  const totalCost = categories.reduce((sum, category) => sum + category.total, 0);
  const profit = revenue - totalCost;

  for (const category of categories) {
    category.percentOfCost =
      totalCost > 0 ? (category.total / totalCost) * 100 : null;
  }

  return {
    tripId,
    revenue,
    totalCost,
    profit,
    margin: marginPercent(profit, revenue),
    categories,
  };
}

/** Expõe entradas de uma categoria (útil para testes de expansão). */
export function getTripFinancialCategoryEntries(
  breakdown: TripFinancialBreakdownData,
  category: TripFinancialCostCategory,
): TripFinancialBreakdownEntry[] {
  return breakdown.categories.find((item) => item.category === category)?.entries ?? [];
}
