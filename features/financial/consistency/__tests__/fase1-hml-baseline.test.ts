import {describe, expect, it} from 'vitest';

import {mapTripFinancialSummaryRow} from '@/features/trips/queries/trip-financial-summary';
import type {TripFinancialSummaryRow} from '@/features/trips/types/trip-financial-summary';
import {buildTripResultView} from '@/features/trips/utils/trip-result-view';

import {
  findDuplicateSources,
  findTripDivergences,
  type CategoryRow,
  type FinancialEntryRow,
  type MovementRow,
  type TripExpenseRow,
  type TripRow,
} from '../fase1-consistency';
import {
  checkTripSummaryMatchesDre,
  computeTripFinancialSummaries,
  runAllFase1Invariants,
} from '../trip-summary';

/**
 * Retrato do diagnóstico real do HML (Etapa 0, 2026-11-10), reduzido a duas
 * viagens com os valores reais:
 *   - V202600007: frete 5.505, pedágio de 140 só na aba, margem gravada 3.588;
 *   - V202600011: frete 21.290, sem despesa, margem gravada 5.064;
 *   - abastecimento e folha pagos sem movimento e sem viagem;
 *   - um título a receber com recebimento, estorno e ajuste (os 3 movimentos).
 */
const trips: TripRow[] = [
  {
    id: 't7',
    trip_number: 'V202600007',
    trip_status: 'completed',
    completed_at: '2026-10-20T15:00:00Z',
    actual_freight_value: 5505,
    contracted_freight_value: 5505,
    freight_margin: 3588,
    deleted_at: null,
  },
  {
    id: 't11',
    trip_number: 'V202600011',
    trip_status: 'completed',
    completed_at: '2026-10-28T15:00:00Z',
    actual_freight_value: 21290,
    contracted_freight_value: 21290,
    freight_margin: 5064,
    deleted_at: null,
  },
];

const expenses: TripExpenseRow[] = [
  {
    id: 'exp-toll-7',
    trip_id: 't7',
    expense_type: 'toll',
    amount: '140.00',
    expense_date: '2026-10-19',
    description: 'Pedágio',
    deleted_at: null,
  },
];

const categories: CategoryRow[] = [
  {id: 'cat-fuel', slug: 'combustivel'},
  {id: 'cat-payroll', slug: 'folha'},
  {id: 'cat-rev', slug: 'receitas'},
];

function entry(overrides: Partial<FinancialEntryRow>): FinancialEntryRow {
  return {
    id: 'fe',
    entry_type: 'expense',
    entry_status: 'paid',
    amount: 0,
    paid_amount: null,
    paid_at: '2026-10-20T12:00:00Z',
    entry_date: '2026-10-20',
    due_date: null,
    description: null,
    category_id: null,
    source_module: null,
    source_id: null,
    installment_number: null,
    trip_id: null,
    fuel_record_id: null,
    maintenance_record_id: null,
    tire_id: null,
    trip_charge_key: null,
    adjustment_total: 0,
    deleted_at: null,
    ...overrides,
  };
}

const entries: FinancialEntryRow[] = [
  entry({id: 'fe-rev-7', entry_type: 'revenue', amount: 5505, paid_amount: 5505, category_id: 'cat-rev', source_module: 'trips', source_id: 't7', trip_id: 't7'}),
  entry({id: 'fe-rev-11', entry_type: 'revenue', amount: 21290, paid_amount: 21290, category_id: 'cat-rev', source_module: 'trips', source_id: 't11', trip_id: 't11'}),
  entry({id: 'fe-fuel', amount: 885.7, paid_amount: 885.7, category_id: 'cat-fuel', source_module: 'fuel', source_id: 'fr-1', fuel_record_id: 'fr-1', installment_number: 1}),
  entry({id: 'fe-payroll', amount: 3000, paid_amount: 3000, category_id: 'cat-payroll', source_module: 'payroll', source_id: 'pe-1', installment_number: 1}),
  entry({id: 'fe-ar', entry_type: 'revenue', entry_status: 'partial', amount: 5000, paid_amount: 0, adjustment_total: 500, source_module: 'accounts_receivable', paid_at: null}),
];

const movements: MovementRow[] = [
  {id: 'mv-1', financial_entry_id: 'fe-ar', kind: 'receipt', amount: 5000, movement_date: '2026-10-21', payment_method: 'pix'},
  {id: 'mv-2', financial_entry_id: 'fe-ar', kind: 'receipt_reversal', amount: 5000, movement_date: '2026-10-22', payment_method: 'pix'},
  {id: 'mv-3', financial_entry_id: 'fe-ar', kind: 'adjustment', amount: 500, movement_date: '2026-10-22', payment_method: null},
];

describe('Fase 1 — retrato do HML antes da Etapa 1', () => {
  it('reproduz as três contas diferentes da mesma viagem', () => {
    const [v7] = findTripDivergences(trips, expenses, entries);
    expect(v7).toMatchObject({
      tripNumber: 'V202600007',
      screenResult: 5365, // frete − aba Despesas (tela antiga)
      dreResult: 5505, // frete − custo vinculado (DRE)
      storedMargin: 3588, // trips.freight_margin
    });
  });

  it('não tem duplicidade por origem (o índice da 109 pode ser criado)', () => {
    expect(findDuplicateSources(entries)).toEqual([]);
  });
});

describe('Fase 1 — Etapa 1 sobre os dados do HML', () => {
  const summaries = computeTripFinancialSummaries({trips, expenses, entries, categories});

  it('o resumo da viagem dá o mesmo resultado da DRE', () => {
    const v7 = summaries.find((row) => row.trip_id === 't7');
    expect(v7).toMatchObject({freight_amount: 5505, direct_costs: 0, result: 5505});
    expect(
      checkTripSummaryMatchesDre({summaries, trips, entries, categories}).violations,
    ).toEqual([]);
  });

  it('a despesa da aba fora do financeiro aparece como aviso, não some', () => {
    const v7 = summaries.find((row) => row.trip_id === 't7');
    expect(v7).toMatchObject({unposted_trip_expenses_amount: 140, unposted_trip_expenses_count: 1});

    const view = buildTripResultView(
      mapTripFinancialSummaryRow({
        ...(v7 as unknown as TripFinancialSummaryRow),
        trip_status: 'completed',
        completed_at: null,
        direct_cost_entries: 0,
        margin_percent: 100,
        reimbursements_total: 0,
        legacy_advance_expenses_amount: 0,
        legacy_advance_expenses_count: 0,
        receivable_entry_id: null,
        receivable_status: null,
        receivable_amount: null,
        receivable_received: null,
        receivable_balance: null,
        financial_visible: true,
      }),
      0,
    );
    expect(view.state).toBe('ready');
    if (view.state !== 'ready') return;
    expect(view.result).toBe(5505);
    expect(view.unpostedNotice).toContain('140,00');
    expect(view.unpostedNotice).toContain('1 despesa(s)');
  });

  it('invariantes até a Etapa 1 passam; as das etapas seguintes continuam falhando', () => {
    const results = runAllFase1Invariants({trips, expenses, entries, movements, categories});
    const byId = Object.fromEntries(results.map((result) => [result.id, result]));

    for (const result of results.filter((item) => item.stage <= 1)) {
      expect({id: result.id, violations: result.violations}).toEqual({id: result.id, violations: []});
    }
    // Etapa 2: despesa da aba sem lançamento.
    expect(byId['I3/I4'].violations).toEqual(['despesa exp-toll-7: 0 lançamento(s)']);
    expect(byId.I3b.violations).toEqual(['V202600007: aba Despesas 140 × DRE 0']);
    // Etapa 3: pagos sem movimento (backfill 3b, não executado).
    expect(byId.I6.violations).toEqual(['fe-rev-7', 'fe-rev-11', 'fe-fuel', 'fe-payroll']);
  });

  it('I1 acusa a view que divergir da DRE', () => {
    const broken = summaries.map((row) =>
      row.trip_id === 't7' ? {...row, fuel_costs: 10, other_costs: -10} : row,
    );
    const missing = summaries.filter((row) => row.trip_id !== 't11');
    expect(checkTripSummaryMatchesDre({summaries: broken, trips, entries, categories}).violations).toEqual([
      'V202600007: combustível resumo 10 × DRE 0',
    ]);
    expect(checkTripSummaryMatchesDre({summaries: missing, trips, entries, categories}).violations).toEqual([
      'V202600011: sem linha no resumo',
    ]);
  });

  it('custo vinculado entra no resumo pelo mesmo grupo da DRE', () => {
    const withFuel = [
      ...entries,
      entry({id: 'fe-fuel-7', amount: 1200, category_id: 'cat-fuel', fuel_record_id: 'fr-7', source_module: 'fuel', source_id: 'fr-7', installment_number: 1, trip_id: 't7'}),
      entry({id: 'fe-cancel', amount: 999, entry_status: 'cancelled', trip_id: 't7'}),
      entry({id: 'fe-adv', entry_type: 'advance', amount: 400, source_module: 'driver_advance', source_id: 'adv-1', trip_id: 't7'}),
    ];
    const [v7] = computeTripFinancialSummaries({trips: [trips[0]], expenses, entries: withFuel, categories});
    expect(v7).toMatchObject({direct_costs: 1200, fuel_costs: 1200, result: 4305, advances_total: 400});
  });
});
