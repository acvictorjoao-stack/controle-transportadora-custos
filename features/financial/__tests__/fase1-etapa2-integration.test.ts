import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/features/financial/queries', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getFinancialEntryById: vi.fn(),
    cancelFinancialEntry: vi.fn(),
    softDeleteFinancialEntry: vi.fn(),
    listFinancialEntriesByIds: vi.fn(async () => []),
  };
});

import {cancelAccountsPayable, deleteAccountsPayable} from '@/features/accounts-payable/queries/accounts-payable';
import {TRIP_EXPENSE_ORIGIN_ERROR} from '@/features/accounts-payable/constants';
import {getAccountsPayableOriginHref, isAccountsPayableManagedEntry} from '@/features/accounts-payable/utils/origin';
import {getCashFlowSummary} from '@/features/cash-flow/queries/cash-flow';
import {
  aggregateCosts,
  buildAnalyticalTable,
  categorizeExpense,
} from '@/features/dre/services/operational-dre-calculator';
import type {OperationalDreExpenseRow} from '@/features/dre/types';
import {cancelFinancialEntry, getFinancialEntryById, softDeleteFinancialEntry} from '@/features/financial/queries';
import {mapDatabaseError} from '@/features/master/companies/utils/database-error';
import {
  TRIP_FINANCIAL_SUMMARY_COLUMNS,
  mapTripFinancialSummaryRow,
} from '@/features/trips/queries/trip-financial-summary';
import type {TripFinancialSummaryRow} from '@/features/trips/types/trip-financial-summary';
import {buildTripResultView} from '@/features/trips/utils/trip-result-view';

import {
  checkTripExpenseEntryParity,
  checkTripResultMatchesDre,
  type CategoryRow,
  type FinancialEntryRow,
  type TripExpenseRow,
  type TripRow,
} from '../consistency/fase1-consistency';
import {
  checkTripSummaryMatchesDre,
  computeTripFinancialSummaries,
} from '../consistency/trip-summary';
import {categorizeTripFinancialExpense} from '../services/trip-financial-breakdown';

function dreRow(overrides: Partial<OperationalDreExpenseRow> = {}): OperationalDreExpenseRow {
  return {
    id: 'e',
    amount: 100,
    branchId: null,
    customerId: null,
    tripId: 'trip-1',
    vehicleId: null,
    driverId: null,
    sourceModule: 'manual',
    categorySlug: null,
    fuelRecordId: null,
    maintenanceRecordId: null,
    tireId: null,
    costCenterId: null,
    costCenterCode: null,
    costCenterName: null,
    ...overrides,
  };
}

describe('DRE — grupo "Despesas de viagem"', () => {
  it('a origem trip_expense vem antes da categoria', () => {
    for (const slug of ['pneus', 'manutencao', 'combustivel', 'pedagio', null]) {
      expect(categorizeExpense(dreRow({sourceModule: 'trip_expense', categorySlug: slug}))).toBe(
        'tripExpenses',
      );
    }
  });

  it('outras origens não mudam de grupo', () => {
    expect(categorizeExpense(dreRow({categorySlug: 'pneus', tireId: 't'}))).toBe('tires');
    expect(categorizeExpense(dreRow({sourceModule: 'fuel', fuelRecordId: 'f'}))).toBe('fuel');
    expect(categorizeExpense(dreRow({sourceModule: 'accounts_payable'}))).toBe('accountsPayable');
    expect(categorizeExpense(dreRow({sourceModule: 'tolls', categorySlug: 'pedagio'}))).toBe('other');
  });

  it('sem contagem dupla: borracharia na viagem não entra em pneus', () => {
    const costs = aggregateCosts([
      dreRow({id: 'a', amount: 150, sourceModule: 'trip_expense', categorySlug: 'pneus'}),
      dreRow({id: 'b', amount: 800, sourceModule: 'tires', categorySlug: 'pneus', tireId: 't'}),
      dreRow({id: 'c', amount: 300, sourceModule: 'trip_expense', categorySlug: 'pedagio'}),
    ]);
    expect(costs).toMatchObject({tripExpenses: 450, tires: 800, other: 0, totalOperatingCosts: 1250});
  });

  it('a tabela analítica mostra a linha "Despesas de viagem"', () => {
    const costs = aggregateCosts([dreRow({amount: 450, sourceModule: 'trip_expense'})]);
    const table = buildAnalyticalTable(10000, costs, 9550);
    expect(table.find((row) => row.category === 'despesas_viagem')).toMatchObject({
      label: 'Despesas de viagem',
      value: 450,
    });
  });

  it('o detalhamento por viagem usa o mesmo grupo', () => {
    expect(
      categorizeTripFinancialExpense({
        id: 'x',
        entryType: 'expense',
        entryStatus: 'paid',
        amount: 150,
        entryDate: '2026-11-02',
        description: null,
        referenceNumber: null,
        supplier: null,
        categoryName: 'Pneus',
        categorySlug: 'pneus',
        sourceModule: 'trip_expense',
        sourceId: 'exp-1',
        fuelRecordId: null,
        maintenanceRecordId: null,
        tireId: null,
      }),
    ).toBe('despesas_viagem');
  });
});

// ---------------------------------------------------------------------------
// Caixa: gasto pago com adiantamento não é segunda saída
// ---------------------------------------------------------------------------

function cashFlowSupabase(lines: Record<string, unknown>[], consumedIds: string[], reversalIds: string[]) {
  const queries: string[] = [];
  return {
    queries,
    supabase: {
      from: vi.fn((table: string) => {
        const filters: string[] = [];
        const chain: Record<string, unknown> = {};
        const self = () => chain;
        chain.select = vi.fn(self);
        chain.is = vi.fn(self);
        chain.order = vi.fn(self);
        chain.gte = vi.fn(self);
        chain.lte = vi.fn(self);
        chain.or = vi.fn(self);
        chain.eq = vi.fn((column: string, value: unknown) => {
          filters.push(`${column}=${String(value)}`);
          return chain;
        });
        chain.in = vi.fn((column: string) => {
          filters.push(`${column} in`);
          return chain;
        });
        chain.range = vi.fn(async () => ({data: lines, error: null, count: lines.length}));
        chain.then = (resolveFn: (value: unknown) => unknown) => {
          queries.push(`${table}:${filters.join(',')}`);
          const data = filters.includes('reversed_entry_id in')
            ? reversalIds.map((id) => ({id}))
            : consumedIds.map((id) => ({id}));
          return Promise.resolve({data, error: null}).then(resolveFn);
        };
        return chain;
      }),
    },
  };
}

function line(id: string, sourceModule: string, amount: number, entryType = 'expense', status = 'paid') {
  return {
    line_id: id,
    financial_entry_id: id,
    entry_type: entryType,
    line_status: status,
    source_module: sourceModule,
    movement_date: '2026-11-02',
    line_amount: amount,
  };
}

describe('Fluxo de Caixa — despesas da viagem', () => {
  it('conta a despesa paga pela empresa e ignora o gasto pago com adiantamento', async () => {
    const {supabase} = cashFlowSupabase(
      [
        line('rev', 'accounts_receivable', 1000, 'revenue'),
        line('company-paid', 'trip_expense', 300),
        line('advance-paid', 'trip_expense', 60),
        line('reimbursement', 'trip_expense', 200, 'expense', 'pending'),
      ],
      ['advance-paid'],
      [],
    );
    const summary = await getCashFlowSummary(supabase as never, 'company-1');
    expect(summary).toMatchObject({entradasRecebidas: 1000, saidasPagas: 300, aPagar: 200});
  });

  it('sem linhas de despesa de viagem, não faz consulta extra', async () => {
    const {supabase, queries} = cashFlowSupabase([line('fuel', 'fuel', 100)], [], []);
    await getCashFlowSummary(supabase as never, 'company-1');
    expect(queries).toEqual([]);
  });

  it('a busca do adiantamento fica presa à empresa', async () => {
    const {supabase, queries} = cashFlowSupabase([line('x', 'trip_expense', 10)], ['x'], []);
    await getCashFlowSummary(supabase as never, 'company-9');
    expect(queries[0]).toContain('company_id=company-9');
    expect(queries[0]).toContain('metadata->>treatment=paid_by_advance');
  });
});

// ---------------------------------------------------------------------------
// Contas a Pagar
// ---------------------------------------------------------------------------

describe('Contas a Pagar — lançamento da despesa da viagem', () => {
  const entry = {
    id: 'fe-1',
    sourceModule: 'trip_expense',
    sourceId: 'exp-1',
    tripId: 'trip-1',
    entryStatus: 'pending',
    entryType: 'expense',
    isSystemGenerated: true,
  };

  beforeEach(() => {
    vi.mocked(getFinancialEntryById).mockResolvedValue(entry as never);
    vi.mocked(cancelFinancialEntry).mockClear();
    vi.mocked(softDeleteFinancialEntry).mockClear();
  });

  it('reembolso e compra a prazo aparecem em Contas a Pagar', () => {
    expect(isAccountsPayableManagedEntry({sourceModule: 'trip_expense'})).toBe(true);
  });

  it('cancelar ou excluir pela conta a pagar é recusado com mensagem clara', async () => {
    await expect(cancelAccountsPayable({} as never, 'c', 'fe-1', 'p')).rejects.toThrow(
      TRIP_EXPENSE_ORIGIN_ERROR,
    );
    await expect(deleteAccountsPayable({} as never, 'c', 'fe-1', 'p')).rejects.toThrow(
      TRIP_EXPENSE_ORIGIN_ERROR,
    );
    expect(cancelFinancialEntry).not.toHaveBeenCalled();
    expect(softDeleteFinancialEntry).not.toHaveBeenCalled();
  });

  it('"Abrir origem" leva à viagem', () => {
    expect(
      getAccountsPayableOriginHref({
        sourceModule: 'trip_expense',
        sourceId: 'exp-1',
        tripId: 'trip-1',
        fuelRecordId: null,
        maintenanceRecordId: null,
        tireId: null,
      }),
    ).toBe('/viagens/trip-1');
  });

  it('mensagens da proteção do banco chegam ao Financeiro', () => {
    for (const message of [
      'Altere a despesa na viagem: este lançamento é controlado por ela.',
      'Lançamentos de despesa de viagem nascem da própria despesa, na viagem.',
      'Para estornar uma despesa de viagem, exclua ou altere a despesa na viagem.',
      'Este lançamento já nasce pago pela despesa da viagem.',
    ]) {
      expect(mapDatabaseError({code: 'P0001', message})).toBe(message);
    }
    // Outras mensagens do banco continuam genéricas.
    expect(mapDatabaseError({code: 'P0001', message: 'erro interno qualquer'})).toBe(
      'Não foi possível concluir a operação.',
    );
  });
});

// ---------------------------------------------------------------------------
// View trip_financial_summary (110 e extensão da 111)
// ---------------------------------------------------------------------------

function viewColumns(sql: string): string[] {
  const start = sql.indexOf('create or replace view public.trip_financial_summary');
  const select = sql.indexOf('\nselect\n', start);
  const from = sql.indexOf('\nfrom public.trips t', select);
  const columns: string[] = [];
  for (const raw of sql.slice(select, from).split('\n')) {
    const text = raw.trim();
    const alias = /\bas (\w+),?$/.exec(text);
    const plain = /^(?:t|aba)\.(\w+),?$/.exec(text);
    if (alias) columns.push(alias[1]);
    else if (plain) columns.push(plain[1]);
  }
  return columns;
}

describe('trip_financial_summary — leitura no TypeScript', () => {
  const sql111 = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/111_trip_expense_financial_sync.sql'),
    'utf8',
  ).replace(/\r\n/g, '\n');

  it('as colunas lidas existem na view da 111', () => {
    const view = new Set(viewColumns(sql111));
    const read = TRIP_FINANCIAL_SUMMARY_COLUMNS.split(',').map((column) => column.trim());
    for (const column of read) expect(view.has(column), column).toBe(true);
    expect(read).toContain('trip_expense_costs');
  });

  const baseRow: TripFinancialSummaryRow = {
    trip_id: 't1',
    trip_number: 'V1',
    trip_status: 'completed',
    completed_at: null,
    freight_amount: '10000.00',
    direct_costs: '590.00',
    fuel_costs: '0',
    maintenance_costs: '0',
    tire_costs: '0',
    other_costs: '0',
    direct_cost_entries: 3,
    result: '9410.00',
    margin_percent: '94.10',
    advances_total: '0',
    reimbursements_total: '0',
    unposted_trip_expenses_amount: '120.00',
    unposted_trip_expenses_count: 1,
    legacy_advance_expenses_amount: '0',
    legacy_advance_expenses_count: 0,
    receivable_entry_id: null,
    receivable_status: null,
    receivable_amount: null,
    receivable_received: null,
    receivable_balance: null,
    financial_visible: true,
    trip_expense_costs: '590.00',
  };

  it('view da 111: despesas de viagem com linha própria no card', () => {
    const summary = mapTripFinancialSummaryRow(baseRow);
    expect(summary.tripExpenseCosts).toBe(590);
    const view = buildTripResultView(summary, 0);
    if (view.state !== 'ready') throw new Error('esperava ready');
    expect(view.costLines).toEqual([{label: 'Despesas de viagem', amount: 590}]);
    expect(view.result).toBe(9410);
  });

  it('linha no formato da 110 (sem a coluna nova) continua legível', () => {
    const legacy = {...baseRow};
    delete legacy.trip_expense_costs;
    expect(mapTripFinancialSummaryRow(legacy).tripExpenseCosts).toBeNull();
  });

  it('sem financeiro:read a coluna nova também vem nula', () => {
    const restricted = mapTripFinancialSummaryRow({
      ...baseRow,
      financial_visible: false,
      trip_expense_costs: null,
      direct_costs: null,
      result: null,
    });
    expect(restricted.tripExpenseCosts).toBeNull();
    expect(buildTripResultView(restricted, 0).state).toBe('restricted');
  });
});

// ---------------------------------------------------------------------------
// Invariantes I1, I3/I4 e I3b
// ---------------------------------------------------------------------------

const trip: TripRow = {
  id: 'trip-1',
  trip_number: 'V1',
  trip_status: 'completed',
  completed_at: '2026-11-05T15:00:00Z',
  actual_freight_value: 10000,
  contracted_freight_value: null,
  freight_margin: null,
  deleted_at: null,
};

function expense(overrides: Partial<TripExpenseRow>): TripExpenseRow {
  return {
    id: 'exp',
    trip_id: 'trip-1',
    expense_type: 'toll',
    amount: 100,
    expense_date: '2026-11-02',
    description: null,
    deleted_at: null,
    paid_by: 'company',
    payment_method: 'cash',
    ...overrides,
  };
}

function entry(overrides: Partial<FinancialEntryRow>): FinancialEntryRow {
  return {
    id: 'fe',
    entry_type: 'expense',
    entry_status: 'paid',
    amount: 100,
    paid_amount: 100,
    paid_at: '2026-11-02T15:00:00Z',
    entry_date: '2026-11-02',
    due_date: null,
    description: null,
    category_id: null,
    source_module: 'trip_expense',
    source_id: 'exp',
    installment_number: 1,
    trip_id: 'trip-1',
    fuel_record_id: null,
    maintenance_record_id: null,
    tire_id: null,
    deleted_at: null,
    ...overrides,
  };
}

const categories: CategoryRow[] = [{id: 'cat-pneus', slug: 'pneus'}];

describe('invariantes da Etapa 2', () => {
  const expenses = [
    expense({id: 'toll', amount: 300}),
    expense({id: 'tire', expense_type: 'other', amount: 150, payment_method: 'supplier_credit'}),
    expense({id: 'client', amount: 40, paid_by: 'third_party', payment_method: null}),
    expense({id: 'adv', expense_type: 'advance', amount: 500}),
    expense({id: 'legacy', amount: 120, paid_by: null, payment_method: null}),
  ];
  const entries = [
    entry({id: 'fe-toll', source_id: 'toll', amount: 300}),
    entry({id: 'fe-tire', source_id: 'tire', amount: 150, category_id: 'cat-pneus', entry_status: 'pending', paid_amount: null}),
    entry({id: 'fe-fuel', source_module: 'fuel', source_id: 'fr-1', amount: 1000, fuel_record_id: 'fr-1'}),
  ];

  it('I3/I4: terceiro e adiantamento ficam fora; a despesa antiga sem lançamento aparece', () => {
    expect(checkTripExpenseEntryParity(expenses, entries).violations).toEqual([
      'despesa legacy: 0 lançamento(s)',
    ]);
  });

  it('I3: valor diferente do lançamento e lançamento de terceiro são acusados', () => {
    const wrong = [
      entry({id: 'fe-toll', source_id: 'toll', amount: 290}),
      entry({id: 'fe-client', source_id: 'client', amount: 40}),
    ];
    expect(checkTripExpenseEntryParity([expense({id: 'toll', amount: 300}), expenses[2]], wrong).violations).toEqual([
      'despesa toll: valor 300 × lançamento 290',
      'lançamento órfão da despesa client',
    ]);
  });

  it('I3b: aba (sem terceiro e adiantamento) igual ao custo de despesas de viagem na DRE', () => {
    const integrated = expenses.filter((item) => item.id !== 'legacy');
    expect(checkTripResultMatchesDre([trip], integrated, entries).violations).toEqual([]);
  });

  it('I1: o espelho da view separa despesas de viagem de pneus e combustível', () => {
    const [summary] = computeTripFinancialSummaries({trips: [trip], expenses, entries, categories});
    expect(summary).toMatchObject({
      direct_costs: 1450,
      trip_expense_costs: 450,
      fuel_costs: 1000,
      tire_costs: 0,
      other_costs: 0,
      result: 8550,
      unposted_trip_expenses_amount: 120,
      unposted_trip_expenses_count: 1,
    });
    expect(checkTripSummaryMatchesDre({summaries: [summary], trips: [trip], entries, categories}).violations).toEqual(
      [],
    );
  });

  it('I1: view da 111 com grupo divergente é acusada; view da 110 não compara o grupo', () => {
    const [summary] = computeTripFinancialSummaries({trips: [trip], expenses, entries, categories});
    expect(
      checkTripSummaryMatchesDre({
        summaries: [{...summary, trip_expense_costs: 300}],
        trips: [trip],
        entries,
        categories,
      }).violations,
    ).toEqual(['V1: despesas de viagem resumo 300 × DRE 450']);
    const view110 = {...summary};
    delete view110.trip_expense_costs;
    expect(
      checkTripSummaryMatchesDre({summaries: [view110], trips: [trip], entries, categories}).violations,
    ).toEqual([]);
  });

  it('isolamento: lançamento de outra viagem não conta na viagem', () => {
    const [summary] = computeTripFinancialSummaries({
      trips: [trip],
      expenses: [],
      entries: [entry({id: 'other', source_id: 'x', trip_id: 'trip-2', amount: 999})],
      categories,
    });
    expect(summary.direct_costs).toBe(0);
  });
});
