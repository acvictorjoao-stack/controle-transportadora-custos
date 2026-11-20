import {describe, expect, it} from 'vitest';

import {
  checkAdvanceNotInDre,
  checkLinkIntegrity,
  checkNoDuplicateSources,
  checkPaidAmountMatchesMovements,
  checkPaidHaveMovements,
  checkTripExpenseEntryParity,
  checkTripResultMatchesDre,
  findDuplicateSources,
  findEntryDateMismatches,
  findManualRelaunchCandidates,
  findPaidEntriesWithoutMovement,
  findTripDivergences,
  runFase1Invariants,
  summarizeLegacyAdvances,
  summarizeMoneyWithoutAccount,
  summarizeTripExpenses,
  type FinancialEntryRow,
  type MovementRow,
  type TripExpenseRow,
  type TripRow,
} from '../fase1-consistency';

function trip(overrides: Partial<TripRow> = {}): TripRow {
  return {
    id: 'trip-1',
    trip_number: 'V1',
    trip_status: 'completed',
    completed_at: '2026-11-05T15:00:00Z',
    actual_freight_value: null,
    contracted_freight_value: 10000,
    freight_margin: null,
    deleted_at: null,
    ...overrides,
  };
}

function expense(overrides: Partial<TripExpenseRow> = {}): TripExpenseRow {
  return {
    id: 'exp-1',
    trip_id: 'trip-1',
    expense_type: 'toll',
    amount: 300,
    expense_date: '2026-11-05',
    description: null,
    deleted_at: null,
    ...overrides,
  };
}

function entry(overrides: Partial<FinancialEntryRow> = {}): FinancialEntryRow {
  return {
    id: 'fe-1',
    entry_type: 'expense',
    entry_status: 'paid',
    amount: 2000,
    paid_amount: 2000,
    paid_at: '2026-11-05T12:00:00.000Z',
    entry_date: '2026-11-05',
    due_date: null,
    description: null,
    category_id: null,
    source_module: 'fuel',
    source_id: 'fuel-1',
    installment_number: 1,
    trip_id: 'trip-1',
    fuel_record_id: 'fuel-1',
    maintenance_record_id: null,
    tire_id: null,
    trip_charge_key: null,
    adjustment_total: 0,
    deleted_at: null,
    ...overrides,
  };
}

function movement(overrides: Partial<MovementRow> = {}): MovementRow {
  return {
    id: 'mv-1',
    financial_entry_id: 'fe-ar',
    kind: 'receipt',
    amount: 10000,
    movement_date: '2026-11-20',
    payment_method: 'pix',
    ...overrides,
  };
}

/**
 * Cenário do plano (seção 4): frete 10.000; abastecimento vinculado 2.000;
 * pedágio 300 na tag; alimentação 150 com o adiantamento de 500.
 * Estado ATUAL: despesas só em `trip_expenses`, abastecimento no financeiro.
 */
const currentState = {
  trips: [trip()],
  expenses: [
    expense({id: 'exp-toll', expense_type: 'toll', amount: 300}),
    expense({id: 'exp-food', expense_type: 'food', amount: 150}),
    expense({id: 'exp-adv', expense_type: 'advance', amount: 500}),
  ],
  entries: [
    entry(),
    entry({
      id: 'fe-ar',
      entry_type: 'revenue',
      entry_status: 'paid',
      amount: 10000,
      paid_amount: 10000,
      source_module: 'accounts_receivable',
      source_id: null,
      fuel_record_id: null,
      trip_charge_key: 'freight',
    }),
  ],
  movements: [movement()],
};

describe('diagnóstico da Fase 1 — estado atual', () => {
  it('a tela da viagem, a DRE e a margem gravada divergem', () => {
    const [divergence] = findTripDivergences(
      [trip({freight_margin: 10000})],
      currentState.expenses,
      currentState.entries,
    );
    // tela: 10.000 − (300 + 150 + 500); DRE: 10.000 − 2.000
    expect(divergence.screenResult).toBe(9050);
    expect(divergence.dreResult).toBe(8000);
    expect(divergence.storedMargin).toBe(10000);
  });

  it('agrupa despesas por tipo e situação', () => {
    const groups = summarizeTripExpenses(
      [...currentState.expenses, expense({id: 'exp-old', amount: 40, deleted_at: '2026-11-06T00:00:00Z'})],
      currentState.trips,
    );
    expect(groups).toContainEqual({expenseType: 'toll', situation: 'ativa', count: 1, total: 300});
    expect(groups).toContainEqual({expenseType: 'toll', situation: 'excluida', count: 1, total: 40});
    expect(groups).toContainEqual({expenseType: 'advance', situation: 'ativa', count: 1, total: 500});
  });

  it('marca despesa de viagem excluída como fora da viagem ativa', () => {
    const groups = summarizeTripExpenses(
      [expense()],
      [trip({deleted_at: '2026-11-07T00:00:00Z'})],
    );
    expect(groups).toEqual([{expenseType: 'toll', situation: 'viagem_excluida', count: 1, total: 300}]);
  });

  it('acha lançamento pago sem movimento (abastecimento à vista)', () => {
    expect(findPaidEntriesWithoutMovement(currentState.entries, currentState.movements)).toEqual([
      {sourceModule: 'fuel', entryType: 'expense', count: 1, total: 2000},
    ]);
  });

  it('resume dinheiro sem conta: movimentos e pagos sem movimento', () => {
    expect(summarizeMoneyWithoutAccount(currentState.entries, currentState.movements)).toEqual({
      movementsByKind: {receipt: {count: 1, total: 10000}},
      paidEntriesWithoutMovement: {count: 1, total: 2000},
    });
  });

  it('separa adiantamentos antigos das despesas', () => {
    expect(summarizeLegacyAdvances(currentState.expenses, currentState.entries)).toEqual({
      tripExpenseAdvances: {count: 1, total: 500, tripIds: ['trip-1']},
      financialAdvanceEntries: {count: 0, total: 0},
      financialReimbursementEntries: {count: 0, total: 0},
    });
  });
});

describe('duplicidades e relançamentos', () => {
  it('acha a mesma origem lançada duas vezes, ignorando estornados e excluídos', () => {
    const groups = findDuplicateSources([
      entry({id: 'a'}),
      entry({id: 'b'}),
      entry({id: 'c', entry_status: 'reversed'}),
      entry({id: 'd', deleted_at: '2026-11-06T00:00:00Z'}),
      entry({id: 'e', installment_number: 2}),
    ]);
    expect(groups.map((group) => [group.kind, group.entryIds])).toEqual([
      ['source', ['a', 'b']],
      ['fuel_record', ['a', 'b']],
    ]);
  });

  it('acha pedágio relançado à mão em Contas a Pagar', () => {
    const candidates = findManualRelaunchCandidates(
      [
        entry({
          id: 'ap-1',
          source_module: 'accounts_payable',
          source_id: null,
          fuel_record_id: null,
          trip_id: null,
          amount: 300,
          entry_date: '2026-11-06',
          description: 'Pedágio BR-316',
        }),
        entry({
          id: 'ap-2',
          source_module: 'accounts_payable',
          source_id: null,
          fuel_record_id: null,
          trip_id: null,
          category_id: 'cat-imp',
          description: 'DAS',
        }),
      ],
      currentState.expenses,
      [
        {id: 'cat-ped', slug: 'pedagio'},
        {id: 'cat-imp', slug: 'impostos'},
      ],
    );
    expect(candidates).toEqual([
      {
        entryId: 'ap-1',
        description: 'Pedágio BR-316',
        amount: 300,
        entryDate: '2026-11-06',
        reason: 'descricao',
        matchedExpenseIds: ['exp-toll'],
      },
    ]);
  });
});

describe('datas de lançamento no fuso de negócio', () => {
  it('acha abastecimento às 23h30 de Brasília lançado no dia UTC', () => {
    const mismatches = findEntryDateMismatches(
      [
        entry({id: 'late', entry_date: '2026-11-06', fuel_record_id: 'fuel-late', source_id: 'fuel-late'}),
        entry({id: 'ok', entry_date: '2026-11-05', fuel_record_id: 'fuel-ok', source_id: 'fuel-ok'}),
        entry({
          id: 'mnt',
          source_module: 'maintenance',
          source_id: 'mnt-1',
          fuel_record_id: null,
          maintenance_record_id: 'mnt-1',
          entry_date: '2026-11-06',
        }),
      ],
      [
        {id: 'fuel-late', fueled_at: '2026-11-06T02:30:00Z', deleted_at: null},
        {id: 'fuel-ok', fueled_at: '2026-11-05T15:00:00Z', deleted_at: null},
      ],
      [{id: 'mnt-1', opened_at: '2026-11-05T10:00:00Z', completed_at: '2026-11-06T01:00:00Z', deleted_at: null}],
    );
    expect(mismatches.map((row) => [row.entryId, row.entryDate, row.expectedDate])).toEqual([
      ['late', '2026-11-06', '2026-11-05'],
      ['mnt', '2026-11-06', '2026-11-05'],
    ]);
  });
});

describe('integridade de vínculos', () => {
  it('acha lançamento de viagem excluída, movimento órfão e cobrança sem viagem', () => {
    const report = checkLinkIntegrity({
      trips: [trip({deleted_at: '2026-11-07T00:00:00Z'})],
      expenses: [expense()],
      entries: [entry(), entry({id: 'charge', trip_id: null, trip_charge_key: 'freight', fuel_record_id: null, source_id: null})],
      movements: [movement({financial_entry_id: 'nao-existe'})],
      fuelRecords: [],
      maintenanceRecords: [],
    });
    expect(report.entriesWithDeletedTrip).toEqual(['fe-1']);
    expect(report.movementsWithMissingEntry).toEqual(['mv-1']);
    expect(report.tripChargeWithoutTrip).toEqual(['charge']);
    expect(report.activeExpensesOnDeletedTrip).toEqual(['exp-1']);
    expect(report.fuelEntriesWithMissingRecord).toEqual(['fe-1']);
  });
});

describe('invariantes da Fase 1', () => {
  it('falham no estado atual, como esperado', () => {
    const results = runFase1Invariants(currentState);
    const failing = Object.fromEntries(results.map((result) => [result.id, result.violations.length]));
    expect(failing).toEqual({I3b: 1, 'I3/I4': 2, I5: 0, I6: 1, I8: 0, I9: 0});
  });

  /**
   * Estado-alvo: despesas no financeiro, adiantamento como `advance`,
   * todo pago com movimento. Resultado = DRE = caixa = 7.550.
   */
  it('passam no estado-alvo do cenário de R$ 7.550', () => {
    const target = {
      trips: [trip()],
      // Alvo: a tela soma o mesmo custo que a DRE (adiantamento não é despesa).
      expenses: [
        expense({id: 'exp-toll', expense_type: 'toll', amount: 300}),
        expense({id: 'exp-food', expense_type: 'food', amount: 150}),
      ],
      entries: [
        entry(),
        entry({id: 'fe-toll', source_module: 'trip_expense', source_id: 'exp-toll', fuel_record_id: null, amount: 300, paid_amount: 300}),
        entry({id: 'fe-food', source_module: 'trip_expense', source_id: 'exp-food', fuel_record_id: null, amount: 150, paid_amount: 150}),
        entry({id: 'fe-adv', entry_type: 'advance', source_module: 'driver_advance', source_id: 'adv-1', fuel_record_id: null, amount: 500, paid_amount: 500}),
        entry({id: 'fe-back', entry_type: 'revenue', source_module: 'trip_settlement', source_id: 'set-1', fuel_record_id: null, amount: 350, paid_amount: 350}),
        entry({id: 'fe-ar', entry_type: 'revenue', source_module: 'accounts_receivable', source_id: null, fuel_record_id: null, amount: 10000, paid_amount: 10000, trip_charge_key: 'freight'}),
      ],
      movements: [
        movement({id: 'm-ar', financial_entry_id: 'fe-ar', kind: 'receipt', amount: 10000}),
        movement({id: 'm-fuel', financial_entry_id: 'fe-1', kind: 'payment', amount: 2000}),
        movement({id: 'm-toll', financial_entry_id: 'fe-toll', kind: 'payment', amount: 300}),
        // Alimentação paga com o adiantamento: consumo sem novo caixa, mas com
        // movimento não-caixa para a invariante I6 (forma a definir na Etapa 4).
        movement({id: 'm-food', financial_entry_id: 'fe-food', kind: 'payment', amount: 150}),
        movement({id: 'm-adv', financial_entry_id: 'fe-adv', kind: 'payment', amount: 500}),
        movement({id: 'm-back', financial_entry_id: 'fe-back', kind: 'receipt', amount: 350}),
      ],
    };
    for (const result of runFase1Invariants(target)) {
      expect({id: result.id, violations: result.violations}).toEqual({id: result.id, violations: []});
    }
    const dreCosts = 2000 + 300 + 150;
    expect(10000 - dreCosts).toBe(7550);
    const cash = 10000 + 350 - 2000 - 300 - 500;
    expect(cash).toBe(7550);
  });

  it('I3/I4 acusa despesa sem lançamento e lançamento órfão', () => {
    const result = checkTripExpenseEntryParity(
      [expense({id: 'sem-lancamento'})],
      [entry({source_module: 'trip_expense', source_id: 'apagada', fuel_record_id: null})],
    );
    expect(result.violations).toEqual([
      'despesa sem-lancamento: 0 lançamento(s)',
      'lançamento órfão da despesa apagada',
    ]);
  });

  it('I5, I6, I8 e I9 acusam cada violação', () => {
    expect(checkNoDuplicateSources([entry({id: 'a'}), entry({id: 'b'})]).violations).toHaveLength(2);
    expect(checkPaidHaveMovements([entry()], []).violations).toEqual(['fe-1']);
    expect(
      checkPaidAmountMatchesMovements(
        [entry({id: 'fe-ar', paid_amount: 10000})],
        [movement(), movement({id: 'mv-2', kind: 'receipt_reversal', amount: 4000})],
      ).violations,
    ).toEqual(['fe-ar: paid_amount 10000 ≠ movimentos 6000']);
    expect(
      checkAdvanceNotInDre([entry({id: 'adv', source_module: 'driver_advance', fuel_record_id: null})]).violations,
    ).toEqual(['adv']);
    expect(checkAdvanceNotInDre([entry({id: 'adv', entry_type: 'advance'})]).violations).toEqual([]);
  });

  it('I3b compara aba Despesas e DRE só quando divergem', () => {
    expect(checkTripResultMatchesDre([trip()], [expense()], [entry()]).violations).toEqual([
      'V1: aba Despesas 300 × DRE 0',
    ]);
  });
});
