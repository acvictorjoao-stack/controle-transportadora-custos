import {describe, expect, it} from 'vitest';

import type {FinancialEntryRow, TripExpenseRow, TripRow} from '../fase1-consistency';
import {reconciliationFindingHref, summarizeReconciliationFindings} from '../reconciliation';
import {
  compareDreWithStats,
  compareTripsWithDre,
  findCashFlowDirectionIssues,
  type CashFlowLineInput,
} from '../report-reconciliation';
import type {TripSummaryRow} from '../trip-summary';

const TRIP = '11111111-1111-4111-8111-111111111111';
const EXPENSE = '22222222-2222-4222-8222-222222222222';
const ENTRY = '33333333-3333-4333-8333-333333333333';
const FUEL_ENTRY = '44444444-4444-4444-8444-444444444444';
const MOVEMENT = '55555555-5555-4555-8555-555555555555';

const trip: TripRow = {
  id: TRIP,
  trip_number: 'V202600001',
  trip_status: 'completed',
  completed_at: '2026-10-21T20:14:17Z',
  actual_freight_value: 11040,
  contracted_freight_value: null,
  freight_margin: null,
  deleted_at: null,
};

const expense: TripExpenseRow = {
  id: EXPENSE,
  trip_id: TRIP,
  expense_type: 'toll',
  amount: 50,
  expense_date: '2026-10-21',
  description: 'Pedágio',
  deleted_at: null,
  paid_by: 'company',
  payment_method: 'not_informed',
};

function entry(overrides: Partial<FinancialEntryRow> = {}): FinancialEntryRow {
  return {
    id: ENTRY,
    entry_type: 'expense',
    entry_status: 'paid',
    amount: 50,
    paid_amount: 50,
    paid_at: '2026-10-21T15:00:00Z',
    entry_date: '2026-10-21',
    due_date: null,
    description: 'Pedágio',
    category_id: null,
    source_module: 'trip_expense',
    source_id: EXPENSE,
    installment_number: 1,
    trip_id: TRIP,
    fuel_record_id: null,
    maintenance_record_id: null,
    tire_id: null,
    trip_charge_key: null,
    adjustment_total: 0,
    deleted_at: null,
    ...overrides,
  };
}

function summary(overrides: Partial<TripSummaryRow> = {}): TripSummaryRow {
  return {
    trip_id: TRIP,
    trip_number: 'V202600001',
    freight_amount: 11040,
    direct_costs: 50,
    fuel_costs: 0,
    maintenance_costs: 0,
    tire_costs: 0,
    other_costs: 0,
    trip_expense_costs: 50,
    result: 10990,
    advances_total: 0,
    unposted_trip_expenses_amount: 0,
    unposted_trip_expenses_count: 0,
    ...overrides,
  };
}

describe('Fase 2.1.3 — R11: DRE × indicadores (acumulado)', () => {
  it('iguais (como validado na Fase 1): nenhum achado', () => {
    expect(
      compareDreWithStats({
        dre: {totalRevenue: 144110, totalOperatingCosts: 126002.7},
        stats: {revenue: 144110, expenses: 126002.7},
      }),
    ).toEqual([]);
  });

  it('custo diferente é alto, com os dois valores e a diferença', () => {
    const [finding] = compareDreWithStats({
      dre: {totalRevenue: 100, totalOperatingCosts: 126002.7},
      stats: {revenue: 100, expenses: 126052.7},
    });
    expect(finding).toMatchObject({
      checkId: 'R11',
      severity: 'high',
      entityType: 'period',
      entityId: null,
      expected: 126002.7,
      actual: 126052.7,
      details: {scope: 'all_time', metric: 'costs', difference: 50},
    });
    expect(reconciliationFindingHref(finding)).toBeNull();
  });

  it('receita diferente é só aviso (definições diferentes de propósito) e não bloqueia', () => {
    const findings = compareDreWithStats({
      dre: {totalRevenue: 144110, totalOperatingCosts: 10},
      stats: {revenue: 150000, expenses: 10},
    });
    expect(findings).toMatchObject([
      {checkId: 'R11', severity: 'warning', details: {metric: 'revenue', difference: 5890}},
    ]);
    expect(summarizeReconciliationFindings(findings).blocking).toBe(false);
  });

  it('diferença de arredondamento abaixo de um centavo não vira achado', () => {
    expect(
      compareDreWithStats({
        dre: {totalRevenue: 0.1 + 0.2, totalOperatingCosts: 10.004},
        stats: {revenue: 0.3, expenses: 10},
      }),
    ).toEqual([]);
  });
});

describe('Fase 2.1.3 — R12: viagem × DRE (I1, I3b, I9)', () => {
  it('viagem V202600001 como validada na Fase 1: nenhum achado', () => {
    expect(
      compareTripsWithDre({
        trips: [trip],
        expenses: [expense],
        entries: [entry()],
        categories: [],
        summaries: [summary()],
      }),
    ).toEqual([]);
  });

  it('resumo diferente da DRE vira achado na viagem, com o id para o link', () => {
    const findings = compareTripsWithDre({
      trips: [trip],
      expenses: [expense],
      entries: [entry()],
      categories: [],
      summaries: [summary({direct_costs: 0, trip_expense_costs: 0, result: 11040})],
    });
    expect(findings.length).toBeGreaterThan(0);
    for (const finding of findings) {
      expect(finding).toMatchObject({checkId: 'R12', entityType: 'trip', entityId: TRIP});
      expect(finding.details.invariant).toBe('I1');
    }
    expect(reconciliationFindingHref(findings[0])).toBe(`/viagens/${TRIP}`);
  });

  it('despesa da aba sem lançamento: I3b aponta a viagem', () => {
    const findings = compareTripsWithDre({
      trips: [trip],
      expenses: [expense],
      entries: [],
      categories: [],
      summaries: [summary({direct_costs: 0, trip_expense_costs: 0, result: 11040})],
    });
    expect(findings.some((finding) => finding.details.invariant === 'I3b')).toBe(true);
    expect(findings.every((finding) => finding.entityId === TRIP)).toBe(true);
  });

  it('adiantamento lançado como custo da viagem (I9) aponta o lançamento', () => {
    const advance = entry({id: FUEL_ENTRY, source_module: 'driver_advance', source_id: null, amount: 200});
    const findings = compareTripsWithDre({
      trips: [trip],
      expenses: [expense],
      entries: [entry(), advance],
      categories: [],
      summaries: [summary({direct_costs: 250, other_costs: 200, result: 10790})],
    });
    expect(findings).toContainEqual(
      expect.objectContaining({
        checkId: 'R12',
        entityType: 'financial_entry',
        entityId: FUEL_ENTRY,
        details: {invariant: 'I9'},
      }),
    );
  });

  it('só olha as viagens do recorte: lançamento de outra viagem não entra', () => {
    const otherTrip = '66666666-6666-4666-8666-666666666666';
    expect(
      compareTripsWithDre({
        trips: [trip],
        expenses: [expense],
        entries: [entry(), entry({id: FUEL_ENTRY, trip_id: otherTrip, source_module: 'driver_advance'})],
        categories: [],
        summaries: [summary()],
      }),
    ).toEqual([]);
  });
});

function line(overrides: Partial<CashFlowLineInput> = {}): CashFlowLineInput {
  return {
    line_id: MOVEMENT,
    financial_entry_id: ENTRY,
    movement_id: MOVEMENT,
    entry_type: 'revenue',
    line_status: 'paid',
    source_module: 'accounts_receivable',
    movement_date: '2026-11-05',
    line_amount: 500,
    description: 'Frete V202600021',
    ...overrides,
  };
}

describe('Fase 2.1.3 — R13: sentido das linhas do Fluxo de Caixa', () => {
  it('recebimento positivo fica na entrada: nenhum achado', () => {
    expect(findCashFlowDirectionIssues([line()])).toEqual([]);
  });

  it('estorno de recebimento (negativo) cai na saída: achado de aviso com link para o título', () => {
    const findings = findCashFlowDirectionIssues([line({line_amount: '-500.00'})]);
    expect(findings).toEqual([
      {
        checkId: 'R13',
        severity: 'warning',
        category: 'report',
        entityType: 'movement',
        entityId: MOVEMENT,
        reference: 'Frete V202600021 — 2026-11-05',
        expected: null,
        actual: -500,
        details: {
          reason: 'receipt_reversal_shown_as_outflow',
          financial_entry_id: ENTRY,
          movement_date: '2026-11-05',
          line_id: MOVEMENT,
        },
        legacy: false,
      },
    ]);
    expect(reconciliationFindingHref(findings[0])).toBe(`/financeiro/contas-a-receber/${ENTRY}`);
  });

  it('pagamento (despesa) e linhas em aberto não entram', () => {
    expect(
      findCashFlowDirectionIssues([
        line({entry_type: 'expense', source_module: 'accounts_payable', line_amount: -10}),
        line({line_status: 'pending', line_amount: -10}),
      ]),
    ).toEqual([]);
  });
});
