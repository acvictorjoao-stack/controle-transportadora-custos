/**
 * Fase 1 — Números confiáveis: diagnóstico e invariantes (Etapa 0).
 *
 * Funções puras sobre linhas já carregadas do banco. Não leem nem gravam nada:
 * o mesmo código roda nos testes (fixtures) e no diagnóstico somente leitura
 * (`scripts/fase1-etapa0-diagnostico-readonly.ts`).
 */

import {toCivilDate} from '@/lib/formatting/date';

// ---------------------------------------------------------------------------
// Linhas mínimas (nomes de coluna do banco)
// ---------------------------------------------------------------------------

export interface TripRow {
  id: string;
  trip_number: string | null;
  trip_status: string;
  completed_at: string | null;
  actual_freight_value: number | string | null;
  contracted_freight_value: number | string | null;
  freight_margin: number | string | null;
  deleted_at: string | null;
}

export interface TripExpenseRow {
  id: string;
  trip_id: string;
  expense_type: string;
  amount: number | string;
  expense_date: string;
  description: string | null;
  deleted_at: string | null;
  /** Migration 111. Ausente/nulo em despesas antigas. */
  paid_by?: string | null;
  payment_method?: string | null;
}

/**
 * Despesa que precisa estar no financeiro (Etapa 2): ativa, fora do tipo antigo
 * "advance" (D14) e não paga por terceiro (D13). Despesa antiga sem "quem pagou"
 * conta: fica pendente até o backfill (2B).
 */
export function expenseRequiresEntry(expense: TripExpenseRow): boolean {
  return (
    expense.deleted_at === null &&
    expense.expense_type !== 'advance' &&
    expense.paid_by !== 'third_party'
  );
}

export interface FinancialEntryRow {
  id: string;
  entry_type: string;
  entry_status: string;
  amount: number | string;
  paid_amount: number | string | null;
  paid_at: string | null;
  entry_date: string;
  due_date: string | null;
  description: string | null;
  category_id: string | null;
  source_module: string | null;
  source_id: string | null;
  installment_number: number | null;
  trip_id: string | null;
  fuel_record_id: string | null;
  maintenance_record_id: string | null;
  tire_id: string | null;
  trip_charge_key?: string | null;
  adjustment_total?: number | string | null;
  deleted_at: string | null;
}

export interface MovementRow {
  id: string;
  financial_entry_id: string;
  kind: string;
  amount: number | string;
  movement_date: string;
  payment_method: string | null;
}

export interface CategoryRow {
  id: string;
  slug: string;
}

export interface FuelRecordRow {
  id: string;
  fueled_at: string;
  deleted_at: string | null;
}

export interface MaintenanceRecordRow {
  id: string;
  opened_at: string;
  completed_at: string | null;
  deleted_at: string | null;
}

// ---------------------------------------------------------------------------
// Regras compartilhadas
// ---------------------------------------------------------------------------

/** Mesmas exclusões da DRE (`operational-dre-data.ts`) e de `get_financial_stats`. */
const INACTIVE_ENTRY_STATUSES = new Set(['cancelled', 'reversed']);

/** Categorias que pertencem à futura linha "Despesas de viagem". */
export const TRIP_EXPENSE_CATEGORY_SLUGS = [
  'pedagio',
  'alimentacao',
  'hospedagem',
  'diarias',
  'multas',
] as const;

/** Origens de lançamento manual (sem fato operacional por trás). */
export const MANUAL_SOURCE_MODULES = ['accounts_payable', 'manual', 'financeiro'] as const;

const TRIP_EXPENSE_DESCRIPTION_PATTERN =
  /ped[aá]gio|balsa|alimenta|hosped|di[aá]ria|lavagem|estacionamento|multa/i;

export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Mesma regra de `getTripFreightValue`: frete realizado, senão contratado. */
export function tripFreight(trip: TripRow): number {
  if (trip.actual_freight_value !== null && trip.actual_freight_value !== undefined) {
    return toNumber(trip.actual_freight_value);
  }
  return toNumber(trip.contracted_freight_value);
}

export function isActiveEntry(entry: FinancialEntryRow): boolean {
  return (
    entry.deleted_at === null &&
    !INACTIVE_ENTRY_STATUSES.has(entry.entry_status) &&
    entry.entry_type !== 'reversal'
  );
}

/** Custo que a DRE vincula à viagem (`entry_type = 'expense'` com `trip_id`). */
export function isDreTripCost(entry: FinancialEntryRow): boolean {
  return entry.entry_type === 'expense' && entry.trip_id !== null && isActiveEntry(entry);
}

// ---------------------------------------------------------------------------
// 1. Despesas da viagem por tipo e situação
// ---------------------------------------------------------------------------

export interface ExpenseGroup {
  expenseType: string;
  situation: 'ativa' | 'excluida' | 'viagem_excluida';
  count: number;
  total: number;
}

export function summarizeTripExpenses(
  expenses: TripExpenseRow[],
  trips: TripRow[],
): ExpenseGroup[] {
  const tripById = new Map(trips.map((trip) => [trip.id, trip]));
  const groups = new Map<string, ExpenseGroup>();

  for (const expense of expenses) {
    const trip = tripById.get(expense.trip_id);
    const situation: ExpenseGroup['situation'] =
      expense.deleted_at !== null
        ? 'excluida'
        : !trip || trip.deleted_at !== null
          ? 'viagem_excluida'
          : 'ativa';
    const key = `${expense.expense_type}|${situation}`;
    const group = groups.get(key) ?? {
      expenseType: expense.expense_type,
      situation,
      count: 0,
      total: 0,
    };
    group.count += 1;
    group.total = roundMoney(group.total + toNumber(expense.amount));
    groups.set(key, group);
  }

  return [...groups.values()].sort(
    (a, b) =>
      a.expenseType.localeCompare(b.expenseType) || a.situation.localeCompare(b.situation),
  );
}

// ---------------------------------------------------------------------------
// 2. Lançamentos pagos sem movimento
// ---------------------------------------------------------------------------

export interface PaidWithoutMovementGroup {
  sourceModule: string;
  entryType: string;
  count: number;
  total: number;
}

export function findPaidEntriesWithoutMovement(
  entries: FinancialEntryRow[],
  movements: MovementRow[],
): PaidWithoutMovementGroup[] {
  const moved = new Set(movements.map((movement) => movement.financial_entry_id));
  const groups = new Map<string, PaidWithoutMovementGroup>();

  for (const entry of entries) {
    if (entry.deleted_at !== null || entry.entry_status !== 'paid') continue;
    if (moved.has(entry.id)) continue;
    const sourceModule = entry.source_module ?? '(sem origem)';
    const key = `${sourceModule}|${entry.entry_type}`;
    const group = groups.get(key) ?? {
      sourceModule,
      entryType: entry.entry_type,
      count: 0,
      total: 0,
    };
    group.count += 1;
    group.total = roundMoney(
      group.total + toNumber(entry.paid_amount ?? entry.amount),
    );
    groups.set(key, group);
  }

  return [...groups.values()].sort((a, b) => b.total - a.total);
}

// ---------------------------------------------------------------------------
// 3. Duplicidades por origem
// ---------------------------------------------------------------------------

export interface DuplicateGroup {
  key: string;
  kind: 'source' | 'fuel_record' | 'maintenance_record' | 'tire' | 'trip_charge';
  entryIds: string[];
}

function collectDuplicates(
  entries: FinancialEntryRow[],
  kind: DuplicateGroup['kind'],
  keyOf: (entry: FinancialEntryRow) => string | null,
): DuplicateGroup[] {
  const byKey = new Map<string, string[]>();
  for (const entry of entries) {
    const key = keyOf(entry);
    if (!key) continue;
    byKey.set(key, [...(byKey.get(key) ?? []), entry.id]);
  }
  return [...byKey.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, entryIds]) => ({key, kind, entryIds}));
}

/** Pares ativos repetidos — o que o futuro índice único por origem recusaria. */
export function findDuplicateSources(entries: FinancialEntryRow[]): DuplicateGroup[] {
  const active = entries.filter(isActiveEntry);
  const installment = (entry: FinancialEntryRow) => entry.installment_number ?? 1;
  return [
    ...collectDuplicates(active, 'source', (entry) =>
      entry.source_module && entry.source_id
        ? `${entry.source_module}:${entry.source_id}:${installment(entry)}`
        : null,
    ),
    ...collectDuplicates(active, 'fuel_record', (entry) =>
      entry.fuel_record_id ? `${entry.fuel_record_id}:${installment(entry)}` : null,
    ),
    ...collectDuplicates(active, 'maintenance_record', (entry) =>
      entry.maintenance_record_id
        ? `${entry.maintenance_record_id}:${installment(entry)}`
        : null,
    ),
    ...collectDuplicates(active, 'tire', (entry) =>
      entry.tire_id && entry.source_module === 'tires'
        ? `${entry.tire_id}:${installment(entry)}`
        : null,
    ),
    ...collectDuplicates(active, 'trip_charge', (entry) =>
      entry.trip_charge_key && entry.trip_id
        ? `${entry.trip_id}:${entry.trip_charge_key}`
        : null,
    ),
  ];
}

// ---------------------------------------------------------------------------
// 4. Despesas de viagem relançadas à mão em Contas a Pagar
// ---------------------------------------------------------------------------

export interface ManualRelaunchCandidate {
  entryId: string;
  description: string | null;
  amount: number;
  entryDate: string;
  reason: 'categoria' | 'descricao';
  matchedExpenseIds: string[];
}

const MAX_DAYS_APART = 3;

function daysApart(a: string, b: string): number {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 864e5;
}

/**
 * Lançamentos manuais com cara de despesa de viagem, e as despesas da aba
 * que podem ser o mesmo fato (mesma viagem, ou mesmo valor em até 3 dias).
 */
export function findManualRelaunchCandidates(
  entries: FinancialEntryRow[],
  expenses: TripExpenseRow[],
  categories: CategoryRow[],
): ManualRelaunchCandidate[] {
  const tripCategoryIds = new Set(
    categories
      .filter((category) =>
        (TRIP_EXPENSE_CATEGORY_SLUGS as readonly string[]).includes(category.slug),
      )
      .map((category) => category.id),
  );
  const activeExpenses = expenses.filter(
    (expense) => expense.deleted_at === null && expense.expense_type !== 'advance',
  );

  const candidates: ManualRelaunchCandidate[] = [];
  for (const entry of entries) {
    if (!isActiveEntry(entry) || entry.entry_type !== 'expense') continue;
    const isManual =
      entry.source_module === null ||
      (MANUAL_SOURCE_MODULES as readonly string[]).includes(entry.source_module);
    if (!isManual) continue;

    const byCategory = entry.category_id !== null && tripCategoryIds.has(entry.category_id);
    const byDescription = TRIP_EXPENSE_DESCRIPTION_PATTERN.test(entry.description ?? '');
    if (!byCategory && !byDescription) continue;

    const amount = toNumber(entry.amount);
    const matchedExpenseIds = activeExpenses
      .filter(
        (expense) =>
          (entry.trip_id !== null && expense.trip_id === entry.trip_id) ||
          (roundMoney(toNumber(expense.amount)) === roundMoney(amount) &&
            daysApart(expense.expense_date, entry.entry_date) <= MAX_DAYS_APART),
      )
      .map((expense) => expense.id);

    candidates.push({
      entryId: entry.id,
      description: entry.description,
      amount,
      entryDate: entry.entry_date,
      reason: byCategory ? 'categoria' : 'descricao',
      matchedExpenseIds,
    });
  }
  return candidates;
}

// ---------------------------------------------------------------------------
// 5. Adiantamentos antigos
// ---------------------------------------------------------------------------

export interface LegacyAdvanceSummary {
  tripExpenseAdvances: {count: number; total: number; tripIds: string[]};
  financialAdvanceEntries: {count: number; total: number};
  financialReimbursementEntries: {count: number; total: number};
}

export function summarizeLegacyAdvances(
  expenses: TripExpenseRow[],
  entries: FinancialEntryRow[],
): LegacyAdvanceSummary {
  const advances = expenses.filter(
    (expense) => expense.deleted_at === null && expense.expense_type === 'advance',
  );
  const sumEntries = (type: string) => {
    const rows = entries.filter(
      (entry) => entry.deleted_at === null && entry.entry_type === type,
    );
    return {
      count: rows.length,
      total: roundMoney(rows.reduce((sum, row) => sum + toNumber(row.amount), 0)),
    };
  };
  return {
    tripExpenseAdvances: {
      count: advances.length,
      total: roundMoney(advances.reduce((sum, row) => sum + toNumber(row.amount), 0)),
      tripIds: [...new Set(advances.map((row) => row.trip_id))],
    },
    financialAdvanceEntries: sumEntries('advance'),
    financialReimbursementEntries: sumEntries('reimbursement'),
  };
}

// ---------------------------------------------------------------------------
// 6. Dinheiro sem conta associada
// ---------------------------------------------------------------------------

export interface MoneyWithoutAccountSummary {
  /** Movimentos de recebimento/estorno: o banco ainda não tem coluna de conta. */
  movementsByKind: Record<string, {count: number; total: number}>;
  /** Pagamentos e recebimentos gravados só no título (sem movimento). */
  paidEntriesWithoutMovement: {count: number; total: number};
}

export function summarizeMoneyWithoutAccount(
  entries: FinancialEntryRow[],
  movements: MovementRow[],
): MoneyWithoutAccountSummary {
  const movementsByKind: MoneyWithoutAccountSummary['movementsByKind'] = {};
  for (const movement of movements) {
    const current = movementsByKind[movement.kind] ?? {count: 0, total: 0};
    current.count += 1;
    current.total = roundMoney(current.total + toNumber(movement.amount));
    movementsByKind[movement.kind] = current;
  }
  const paid = findPaidEntriesWithoutMovement(entries, movements);
  return {
    movementsByKind,
    paidEntriesWithoutMovement: {
      count: paid.reduce((sum, group) => sum + group.count, 0),
      total: roundMoney(paid.reduce((sum, group) => sum + group.total, 0)),
    },
  };
}

// ---------------------------------------------------------------------------
// 7. Divergências por viagem
// ---------------------------------------------------------------------------

export interface TripDivergence {
  tripId: string;
  tripNumber: string | null;
  tripStatus: string;
  freight: number;
  /** "Resultado" do detalhe da viagem: frete − `trip_expenses`. */
  screenResult: number;
  /** Resultado com o custo que a DRE vincula: frete − despesas em `financial_entries`. */
  dreResult: number;
  /** Snapshot gravado na conclusão (`trips.freight_margin`). */
  storedMargin: number | null;
  tripExpensesTotal: number;
  dreLinkedCosts: number;
}

/** Viagens em que tela, DRE e margem gravada não coincidem. */
export function findTripDivergences(
  trips: TripRow[],
  expenses: TripExpenseRow[],
  entries: FinancialEntryRow[],
): TripDivergence[] {
  const expenseTotals = new Map<string, number>();
  for (const expense of expenses) {
    if (expense.deleted_at !== null) continue;
    expenseTotals.set(
      expense.trip_id,
      (expenseTotals.get(expense.trip_id) ?? 0) + toNumber(expense.amount),
    );
  }
  const dreTotals = new Map<string, number>();
  for (const entry of entries) {
    if (!isDreTripCost(entry) || !entry.trip_id) continue;
    dreTotals.set(entry.trip_id, (dreTotals.get(entry.trip_id) ?? 0) + toNumber(entry.amount));
  }

  const result: TripDivergence[] = [];
  for (const trip of trips) {
    if (trip.deleted_at !== null) continue;
    const freight = tripFreight(trip);
    const tripExpensesTotal = roundMoney(expenseTotals.get(trip.id) ?? 0);
    const dreLinkedCosts = roundMoney(dreTotals.get(trip.id) ?? 0);
    const screenResult = roundMoney(freight - tripExpensesTotal);
    const dreResult = roundMoney(freight - dreLinkedCosts);
    const storedMargin =
      trip.freight_margin === null || trip.freight_margin === undefined
        ? null
        : roundMoney(toNumber(trip.freight_margin));
    const marginDiverges =
      trip.trip_status === 'completed' && storedMargin !== null && storedMargin !== dreResult;
    if (screenResult !== dreResult || marginDiverges) {
      result.push({
        tripId: trip.id,
        tripNumber: trip.trip_number,
        tripStatus: trip.trip_status,
        freight,
        screenResult,
        dreResult,
        storedMargin,
        tripExpensesTotal,
        dreLinkedCosts,
      });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// 8. Datas de lançamento de abastecimento e manutenção (fuso)
// ---------------------------------------------------------------------------

export interface EntryDateMismatch {
  entryId: string;
  sourceModule: 'fuel' | 'maintenance';
  sourceId: string;
  entryDate: string;
  expectedDate: string;
  sourceInstant: string;
}

/**
 * Lançamentos cujo `entry_date` é o dia UTC do abastecimento/manutenção,
 * e não o dia em America/Sao_Paulo.
 */
export function findEntryDateMismatches(
  entries: FinancialEntryRow[],
  fuelRecords: FuelRecordRow[],
  maintenanceRecords: MaintenanceRecordRow[],
): EntryDateMismatch[] {
  const fuelById = new Map(fuelRecords.map((row) => [row.id, row]));
  const maintenanceById = new Map(maintenanceRecords.map((row) => [row.id, row]));
  const mismatches: EntryDateMismatch[] = [];

  for (const entry of entries) {
    if (entry.deleted_at !== null) continue;
    if (entry.source_module === 'fuel' && entry.fuel_record_id) {
      const record = fuelById.get(entry.fuel_record_id);
      const expected = record ? toCivilDate(record.fueled_at) : null;
      // Parcelas a prazo usam a data do abastecimento só na 1ª; compara a 1ª.
      if (record && expected && (entry.installment_number ?? 1) === 1 && expected !== entry.entry_date) {
        mismatches.push({
          entryId: entry.id,
          sourceModule: 'fuel',
          sourceId: record.id,
          entryDate: entry.entry_date,
          expectedDate: expected,
          sourceInstant: record.fueled_at,
        });
      }
    }
    if (entry.source_module === 'maintenance' && entry.maintenance_record_id) {
      const record = maintenanceById.get(entry.maintenance_record_id);
      const instant = record ? (record.completed_at ?? record.opened_at) : null;
      const expected = instant ? toCivilDate(instant) : null;
      if (record && instant && expected && (entry.installment_number ?? 1) === 1 && expected !== entry.entry_date) {
        mismatches.push({
          entryId: entry.id,
          sourceModule: 'maintenance',
          sourceId: record.id,
          entryDate: entry.entry_date,
          expectedDate: expected,
          sourceInstant: instant,
        });
      }
    }
  }
  return mismatches;
}

// ---------------------------------------------------------------------------
// 9. Integridade de vínculos
// ---------------------------------------------------------------------------

export interface LinkIntegrityReport {
  entriesWithMissingTrip: string[];
  entriesWithDeletedTrip: string[];
  movementsWithMissingEntry: string[];
  tripChargeWithoutTrip: string[];
  activeExpensesOnDeletedTrip: string[];
  fuelEntriesWithMissingRecord: string[];
  maintenanceEntriesWithMissingRecord: string[];
}

export function checkLinkIntegrity(input: {
  trips: TripRow[];
  expenses: TripExpenseRow[];
  entries: FinancialEntryRow[];
  movements: MovementRow[];
  fuelRecords: FuelRecordRow[];
  maintenanceRecords: MaintenanceRecordRow[];
}): LinkIntegrityReport {
  const tripById = new Map(input.trips.map((trip) => [trip.id, trip]));
  const entryIds = new Set(input.entries.map((entry) => entry.id));
  const fuelIds = new Set(input.fuelRecords.map((row) => row.id));
  const maintenanceIds = new Set(input.maintenanceRecords.map((row) => row.id));
  const liveEntries = input.entries.filter((entry) => entry.deleted_at === null);

  return {
    entriesWithMissingTrip: liveEntries
      .filter((entry) => entry.trip_id && !tripById.has(entry.trip_id))
      .map((entry) => entry.id),
    entriesWithDeletedTrip: liveEntries
      .filter(
        (entry) =>
          isActiveEntry(entry) &&
          entry.trip_id &&
          tripById.get(entry.trip_id)?.deleted_at,
      )
      .map((entry) => entry.id),
    movementsWithMissingEntry: input.movements
      .filter((movement) => !entryIds.has(movement.financial_entry_id))
      .map((movement) => movement.id),
    tripChargeWithoutTrip: input.entries
      .filter((entry) => entry.trip_charge_key && !entry.trip_id)
      .map((entry) => entry.id),
    activeExpensesOnDeletedTrip: input.expenses
      .filter((expense) => {
        if (expense.deleted_at !== null) return false;
        const trip = tripById.get(expense.trip_id);
        return !trip || trip.deleted_at !== null;
      })
      .map((expense) => expense.id),
    fuelEntriesWithMissingRecord: liveEntries
      .filter((entry) => entry.fuel_record_id && !fuelIds.has(entry.fuel_record_id))
      .map((entry) => entry.id),
    maintenanceEntriesWithMissingRecord: liveEntries
      .filter(
        (entry) =>
          entry.maintenance_record_id && !maintenanceIds.has(entry.maintenance_record_id),
      )
      .map((entry) => entry.id),
  };
}

// ---------------------------------------------------------------------------
// Invariantes da Fase 1 (devem dar zero violações ao fim da fase)
// ---------------------------------------------------------------------------

export interface InvariantResult {
  id: string;
  description: string;
  /** Etapa em que passa a ser exigida. */
  stage: number;
  violations: string[];
}

/** I3/I4: cada despesa ativa ↔ exatamente um lançamento `trip_expense` ativo. */
export function checkTripExpenseEntryParity(
  expenses: TripExpenseRow[],
  entries: FinancialEntryRow[],
): InvariantResult {
  const linked = new Map<string, FinancialEntryRow[]>();
  for (const entry of entries) {
    if (
      entry.source_module !== 'trip_expense' ||
      entry.entry_type !== 'expense' ||
      !entry.source_id ||
      !isActiveEntry(entry)
    ) {
      continue;
    }
    linked.set(entry.source_id, [...(linked.get(entry.source_id) ?? []), entry]);
  }
  const violations: string[] = [];
  const requiredIds = new Set<string>();
  for (const expense of expenses) {
    if (!expenseRequiresEntry(expense)) continue;
    requiredIds.add(expense.id);
    const posted = linked.get(expense.id) ?? [];
    if (posted.length !== 1) {
      violations.push(`despesa ${expense.id}: ${posted.length} lançamento(s)`);
      continue;
    }
    // I3: o lançamento tem o mesmo valor e a mesma viagem da despesa.
    const [entry] = posted;
    if (roundMoney(toNumber(entry.amount)) !== roundMoney(toNumber(expense.amount))) {
      violations.push(
        `despesa ${expense.id}: valor ${roundMoney(toNumber(expense.amount))} × lançamento ${roundMoney(toNumber(entry.amount))}`,
      );
    }
    if (entry.trip_id !== expense.trip_id) {
      violations.push(`despesa ${expense.id}: lançamento em outra viagem`);
    }
  }
  // I4: nenhum lançamento ativo sem despesa que o exija (excluída, terceiro, adiantamento).
  for (const sourceId of linked.keys()) {
    if (!requiredIds.has(sourceId)) violations.push(`lançamento órfão da despesa ${sourceId}`);
  }
  return {
    id: 'I3/I4',
    description: 'Cada despesa de viagem que é custo da empresa tem exatamente um lançamento ativo, com o mesmo valor e viagem',
    stage: 2,
    violations,
  };
}

/** I5: nenhum par ativo repetido por origem. */
export function checkNoDuplicateSources(entries: FinancialEntryRow[]): InvariantResult {
  return {
    id: 'I5',
    description: 'Nenhuma origem com mais de um lançamento ativo por parcela',
    stage: 1,
    violations: findDuplicateSources(entries).map(
      (group) => `${group.kind} ${group.key}: ${group.entryIds.join(', ')}`,
    ),
  };
}

/** I6: nenhum lançamento pago sem movimento. */
export function checkPaidHaveMovements(
  entries: FinancialEntryRow[],
  movements: MovementRow[],
): InvariantResult {
  const moved = new Set(movements.map((movement) => movement.financial_entry_id));
  return {
    id: 'I6',
    description: 'Todo lançamento pago tem movimento de caixa',
    stage: 3,
    violations: entries
      .filter(
        (entry) =>
          entry.deleted_at === null && entry.entry_status === 'paid' && !moved.has(entry.id),
      )
      .map((entry) => entry.id),
  };
}

/** I8: `paid_amount` = recebimentos − estornos, para títulos com movimento. */
export function checkPaidAmountMatchesMovements(
  entries: FinancialEntryRow[],
  movements: MovementRow[],
): InvariantResult {
  const net = new Map<string, number>();
  for (const movement of movements) {
    const sign =
      movement.kind === 'receipt' || movement.kind === 'payment'
        ? 1
        : movement.kind === 'receipt_reversal' || movement.kind === 'payment_reversal'
          ? -1
          : 0;
    if (sign === 0) continue;
    net.set(
      movement.financial_entry_id,
      (net.get(movement.financial_entry_id) ?? 0) + sign * toNumber(movement.amount),
    );
  }
  const violations: string[] = [];
  for (const entry of entries) {
    if (!net.has(entry.id)) continue;
    const expected = roundMoney(net.get(entry.id) ?? 0);
    const actual = roundMoney(toNumber(entry.paid_amount));
    if (expected !== actual) {
      violations.push(`${entry.id}: paid_amount ${actual} ≠ movimentos ${expected}`);
    }
  }
  return {
    id: 'I8',
    description: 'paid_amount do título = soma dos movimentos',
    stage: 3,
    violations,
  };
}

/** I9: adiantamento nunca é custo da DRE. */
export function checkAdvanceNotInDre(entries: FinancialEntryRow[]): InvariantResult {
  return {
    id: 'I9',
    description: 'Nenhum adiantamento contado como custo da DRE',
    stage: 4,
    violations: entries
      .filter(
        (entry) =>
          isDreTripCost(entry) &&
          (entry.source_module === 'driver_advance' || entry.entry_type === 'advance'),
      )
      .map((entry) => entry.id),
  };
}

/**
 * I3b (Etapa 2): por viagem, o total das despesas da aba (sem adiantamento) é
 * o mesmo custo `trip_expense` que a DRE enxerga. Junto com a I1 (resumo da
 * viagem = DRE, Etapa 1), a aba Despesas também passa a bater com a DRE.
 */
export function checkTripResultMatchesDre(
  trips: TripRow[],
  expenses: TripExpenseRow[],
  entries: FinancialEntryRow[],
): InvariantResult {
  const screen = new Map<string, number>();
  for (const expense of expenses) {
    if (!expenseRequiresEntry(expense)) continue;
    screen.set(expense.trip_id, (screen.get(expense.trip_id) ?? 0) + toNumber(expense.amount));
  }
  const dre = new Map<string, number>();
  for (const entry of entries) {
    if (!isDreTripCost(entry) || entry.source_module !== 'trip_expense' || !entry.trip_id) continue;
    dre.set(entry.trip_id, (dre.get(entry.trip_id) ?? 0) + toNumber(entry.amount));
  }
  const violations: string[] = [];
  for (const trip of trips) {
    if (trip.deleted_at !== null) continue;
    const onScreen = roundMoney(screen.get(trip.id) ?? 0);
    const inDre = roundMoney(dre.get(trip.id) ?? 0);
    if (onScreen !== inDre) {
      violations.push(`${trip.trip_number ?? trip.id}: aba Despesas ${onScreen} × DRE ${inDre}`);
    }
  }
  return {
    id: 'I3b',
    description: 'Despesas da aba iguais ao custo de despesas de viagem na DRE',
    stage: 2,
    violations,
  };
}

export function runFase1Invariants(input: {
  trips: TripRow[];
  expenses: TripExpenseRow[];
  entries: FinancialEntryRow[];
  movements: MovementRow[];
}): InvariantResult[] {
  return [
    checkTripResultMatchesDre(input.trips, input.expenses, input.entries),
    checkTripExpenseEntryParity(input.expenses, input.entries),
    checkNoDuplicateSources(input.entries),
    checkPaidHaveMovements(input.entries, input.movements),
    checkPaidAmountMatchesMovements(input.entries, input.movements),
    checkAdvanceNotInDre(input.entries),
  ];
}
