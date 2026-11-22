import {describe, expect, it} from 'vitest';

import {
  checkAdvanceNotInDre,
  checkNoDuplicateSources,
  checkPaidAmountMatchesMovements,
  checkPaidHaveMovements,
  checkTripExpenseEntryParity,
  checkTripResultMatchesDre,
  type FinancialEntryRow,
  type TripExpenseRow,
  type TripRow,
} from '../fase1-consistency';
import {
  findingDifference,
  getReconciliationCheck,
  mapReconciliationFindingRow,
  RECONCILIATION_CHECK_IDS,
  RECONCILIATION_CHECKS,
  reconciliationFindingHref,
  ReconciliationContractError,
  sortReconciliationFindings,
  summarizeReconciliationFindings,
  type ReconciliationFinding,
  type ReconciliationFindingRow,
} from '../reconciliation';
import {invariantsToFindings, invariantToFindings} from '../reconciliation-invariants';

const TRIP = '11111111-1111-4111-8111-111111111111';
const EXPENSE = '22222222-2222-4222-8222-222222222222';
const ENTRY_A = '33333333-3333-4333-8333-333333333333';
const ENTRY_B = '44444444-4444-4444-8444-444444444444';
const FUEL = '55555555-5555-4555-8555-555555555555';

function trip(overrides: Partial<TripRow> = {}): TripRow {
  return {
    id: TRIP,
    trip_number: 'V202600001',
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
    id: EXPENSE,
    trip_id: TRIP,
    expense_type: 'toll',
    amount: 50,
    expense_date: '2026-11-05',
    description: null,
    deleted_at: null,
    paid_by: 'company',
    payment_method: 'not_informed',
    ...overrides,
  };
}

function entry(overrides: Partial<FinancialEntryRow> = {}): FinancialEntryRow {
  return {
    id: ENTRY_A,
    entry_type: 'expense',
    entry_status: 'paid',
    amount: 50,
    paid_amount: 50,
    paid_at: '2026-11-05T12:00:00.000Z',
    entry_date: '2026-11-05',
    due_date: null,
    description: null,
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

function row(overrides: Partial<ReconciliationFindingRow> = {}): ReconciliationFindingRow {
  return {
    check_id: 'R05',
    severity: 'high',
    entity_type: 'fuel_record',
    entity_id: FUEL,
    reference: 'Abastecimento — Posto X',
    expected: '300.00',
    actual: '250.5',
    details: {installments: 2},
    ...overrides,
  };
}

describe('Fase 2.1 — catálogo das verificações', () => {
  it('tem as 14 verificações da proposta, na ordem e sem repetição', () => {
    expect(RECONCILIATION_CHECKS.map((check) => check.id)).toEqual([...RECONCILIATION_CHECK_IDS]);
    expect(new Set(RECONCILIATION_CHECKS.map((check) => check.title)).size).toBe(14);
  });

  it('toda verificação diz o que fazer, e nenhuma propõe correção automática', () => {
    for (const check of RECONCILIATION_CHECKS) {
      expect(check.description.length).toBeGreaterThan(20);
      expect(check.suggestedAction.length).toBeGreaterThan(10);
      expect(check.suggestedAction.toLowerCase()).not.toContain('automaticamente');
    }
  });

  it('só as comparações de relatório rodam em TypeScript (a DRE não é recriada em SQL)', () => {
    const report = RECONCILIATION_CHECKS.filter((check) => check.source === 'report');
    expect(report.map((check) => check.id)).toEqual(['R11', 'R12', 'R13']);
    expect(report.every((check) => check.category === 'report')).toBe(true);
  });

  it('só a R09 é legado, e legado nunca é crítico', () => {
    expect(RECONCILIATION_CHECKS.filter((check) => check.legacy).map((check) => check.id)).toEqual([
      'R09',
    ]);
    expect(getReconciliationCheck('R09').severity).toBe('warning');
  });

  it('o portão automático cobre todas as verificações críticas', () => {
    for (const check of RECONCILIATION_CHECKS.filter((item) => item.severity === 'critical')) {
      expect(check.automatic).toBe(true);
    }
  });

  it('cada invariante da Fase 1 está ligada a uma verificação', () => {
    const linked = RECONCILIATION_CHECKS.flatMap((check) => check.invariants);
    for (const id of ['I1', 'I3/I4', 'I3b', 'I5', 'I6', 'I8', 'I9']) {
      expect(linked).toContain(id);
    }
  });
});

describe('Fase 2.1 — linha do banco para o achado', () => {
  it('converte numeric em texto, completa categoria e legado pelo catálogo', () => {
    const finding = mapReconciliationFindingRow(row());
    expect(finding).toEqual({
      checkId: 'R05',
      severity: 'high',
      category: 'amount',
      entityType: 'fuel_record',
      entityId: FUEL,
      reference: 'Abastecimento — Posto X',
      expected: 300,
      actual: 250.5,
      details: {installments: 2},
      legacy: false,
    });
    expect(findingDifference(finding)).toBe(-49.5);
  });

  it('aceita severidade menor que a padrão (possível duplicidade manual)', () => {
    expect(mapReconciliationFindingRow(row({check_id: 'R01', severity: 'warning'})).severity).toBe(
      'warning',
    );
  });

  it('sem referência, usa o id; sem id, o título da verificação', () => {
    expect(mapReconciliationFindingRow(row({reference: '  '})).reference).toBe(FUEL);
    expect(
      mapReconciliationFindingRow(
        row({check_id: 'R11', entity_type: 'period', entity_id: null, reference: null}),
      ).reference,
    ).toBe('DRE diferente dos indicadores');
  });

  it('valores ausentes e detalhes inválidos não viram zero nem quebram', () => {
    const finding = mapReconciliationFindingRow(
      row({expected: null, actual: '', details: ['x'], legacy: true}),
    );
    expect(finding.expected).toBeNull();
    expect(finding.actual).toBeNull();
    expect(finding.details).toEqual({});
    expect(finding.legacy).toBe(true);
    expect(findingDifference(finding)).toBeNull();
  });

  it.each([
    [{check_id: 'R99'}, 'verificação desconhecida'],
    [{severity: 'low'}, 'severidade desconhecida'],
    [{entity_type: 'vehicle'}, 'entidade desconhecida'],
  ])('banco e aplicação fora de sincronia falham alto: %o', (overrides, message) => {
    expect(() => mapReconciliationFindingRow(row(overrides))).toThrow(ReconciliationContractError);
    expect(() => mapReconciliationFindingRow(row(overrides))).toThrow(message);
  });
});

function finding(overrides: Partial<ReconciliationFinding> = {}): ReconciliationFinding {
  return {
    checkId: 'R05',
    severity: 'high',
    category: 'amount',
    entityType: 'financial_entry',
    entityId: ENTRY_A,
    reference: 'B',
    expected: null,
    actual: null,
    details: {},
    legacy: false,
    ...overrides,
  };
}

describe('Fase 2.1 — ordem e resumo', () => {
  it('atuais antes dos legados; depois severidade, catálogo e referência', () => {
    const sorted = sortReconciliationFindings([
      finding({checkId: 'R09', severity: 'warning', legacy: true, reference: 'legado'}),
      finding({checkId: 'R07', reference: 'r07'}),
      finding({checkId: 'R05', reference: 'b'}),
      finding({checkId: 'R05', reference: 'a'}),
      finding({checkId: 'R14', severity: 'warning', reference: 'data'}),
      finding({checkId: 'R03', severity: 'critical', reference: 'crítico'}),
    ]);
    expect(sorted.map((item) => item.reference)).toEqual([
      'crítico',
      'a',
      'b',
      'r07',
      'data',
      'legado',
    ]);
  });

  it('conta por severidade sem legado, lista todas as verificações e bloqueia só com crítico atual', () => {
    const summary = summarizeReconciliationFindings([
      finding({checkId: 'R09', severity: 'warning', legacy: true}),
      finding({checkId: 'R09', severity: 'warning', legacy: true}),
      finding({checkId: 'R05'}),
    ]);
    expect(summary.total).toBe(3);
    expect(summary.legacy).toBe(2);
    expect(summary.bySeverity).toEqual({critical: 0, high: 1, warning: 0});
    expect(summary.byCheck).toHaveLength(14);
    expect(summary.byCheck.find((item) => item.checkId === 'R09')).toMatchObject({
      count: 2,
      legacyCount: 2,
    });
    expect(summary.blocking).toBe(false);

    expect(
      summarizeReconciliationFindings([finding({checkId: 'R03', severity: 'critical'})]).blocking,
    ).toBe(true);
  });

  it('sem achados, nada bloqueia', () => {
    const summary = summarizeReconciliationFindings([]);
    expect(summary.total).toBe(0);
    expect(summary.blocking).toBe(false);
    expect(summary.byCheck.every((item) => item.count === 0)).toBe(true);
  });
});

describe('Fase 2.1 — link para o registro', () => {
  it.each([
    ['financial_entry', ENTRY_A, {}, `/financeiro/${ENTRY_A}`],
    ['trip', TRIP, {}, `/viagens/${TRIP}`],
    ['trip_expense', EXPENSE, {trip_id: TRIP}, `/viagens/${TRIP}`],
    ['fuel_record', FUEL, {}, `/abastecimentos/${FUEL}`],
    ['maintenance_record', FUEL, {}, `/manutencoes/${FUEL}`],
    ['tire', FUEL, {}, `/pneus/${FUEL}`],
    ['payroll_expense', FUEL, {}, '/financeiro/despesas-de-pessoal'],
    ['movement', FUEL, {financial_entry_id: ENTRY_B}, `/financeiro/contas-a-receber/${ENTRY_B}`],
  ] as const)('%s → %s', (entityType, entityId, details, href) => {
    expect(reconciliationFindingHref(finding({entityType, entityId, details}))).toBe(href);
  });

  it('sem id válido ou de período, não há link (e nada fora de UUID entra na rota)', () => {
    expect(reconciliationFindingHref(finding({entityType: 'period', entityId: null}))).toBeNull();
    expect(reconciliationFindingHref(finding({entityId: '../admin'}))).toBeNull();
    expect(reconciliationFindingHref(finding({entityType: 'trip_expense', details: {}}))).toBeNull();
    expect(
      reconciliationFindingHref(finding({entityType: 'movement', details: {financial_entry_id: 'x'}})),
    ).toBeNull();
  });
});

describe('Fase 2.1 — invariantes da Fase 1 como achados (textos reais das funções)', () => {
  it('I3/I4: despesa sem lançamento → R03; órfão → R04; valor diferente → R05; dois lançamentos → R01', () => {
    const missing = invariantToFindings(checkTripExpenseEntryParity([expense()], []));
    expect(missing).toMatchObject([
      {checkId: 'R03', severity: 'critical', entityType: 'trip_expense', entityId: EXPENSE},
    ]);
    expect(missing[0].details).toEqual({invariant: 'I3/I4', posted_entries: 0});

    const orphan = invariantToFindings(
      checkTripExpenseEntryParity([expense({deleted_at: '2026-11-06T00:00:00Z'})], [entry()]),
    );
    expect(orphan).toMatchObject([{checkId: 'R04', entityType: 'trip_expense', entityId: EXPENSE}]);

    const amount = invariantToFindings(
      checkTripExpenseEntryParity([expense()], [entry({amount: 40})]),
    );
    expect(amount).toMatchObject([{checkId: 'R05', severity: 'high', entityId: EXPENSE}]);

    const doubled = invariantToFindings(
      checkTripExpenseEntryParity([expense()], [entry(), entry({id: ENTRY_B})]),
    );
    expect(doubled).toMatchObject([{checkId: 'R01', details: {posted_entries: 2}}]);
  });

  it('I5: aponta para o primeiro lançamento repetido e guarda todos', () => {
    const findings = invariantToFindings(
      checkNoDuplicateSources([
        entry({source_module: 'fuel', source_id: FUEL, fuel_record_id: FUEL}),
        entry({id: ENTRY_B, source_module: 'fuel', source_id: FUEL, fuel_record_id: FUEL}),
      ]),
    );
    // Mesma origem e mesmo abastecimento: o par aparece por origem e por abastecimento.
    expect(findings.map((item) => item.reference.split(' ')[0]).sort()).toEqual([
      'fuel_record',
      'source',
    ]);
    for (const item of findings) {
      expect(item.checkId).toBe('R01');
      expect(item.entityType).toBe('financial_entry');
      expect(item.entityId).toBe(ENTRY_A);
      expect(item.details.entry_ids).toEqual([ENTRY_A, ENTRY_B]);
    }
  });

  it('I6 vira R09 legado, que não bloqueia', () => {
    const findings = invariantToFindings(
      checkPaidHaveMovements([entry({entry_type: 'revenue', source_module: 'trips'})], []),
    );
    expect(findings).toMatchObject([
      {checkId: 'R09', legacy: true, severity: 'warning', entityId: ENTRY_A},
    ]);
    expect(summarizeReconciliationFindings(findings).blocking).toBe(false);
  });

  it('I8 → R07; I9 → R12, ambos no lançamento', () => {
    const paid = invariantToFindings(
      checkPaidAmountMatchesMovements(
        [entry({entry_type: 'revenue', paid_amount: 100})],
        [
          {
            id: 'm1',
            financial_entry_id: ENTRY_A,
            kind: 'receipt',
            amount: 80,
            movement_date: '2026-11-05',
            payment_method: 'pix',
          },
        ],
      ),
    );
    expect(paid).toMatchObject([{checkId: 'R07', entityType: 'financial_entry', entityId: ENTRY_A}]);

    // Adiantamento gravado como custo (expense) da viagem: é o que a I9 recusa.
    const advance = invariantToFindings(
      checkAdvanceNotInDre([entry({source_module: 'driver_advance'})]),
    );
    expect(advance).toMatchObject([
      {checkId: 'R12', entityType: 'financial_entry', entityId: ENTRY_A, details: {invariant: 'I9'}},
    ]);
  });

  it('I3b: viagem identificada pelo número fica sem id, com a referência legível', () => {
    const findings = invariantToFindings(checkTripResultMatchesDre([trip()], [expense()], []));
    expect(findings).toMatchObject([
      {checkId: 'R12', entityType: 'trip', entityId: null, details: {invariant: 'I3b'}},
    ]);
    expect(findings[0].reference).toContain('V202600001');
  });

  it('base limpa: nenhuma invariante gera achado', () => {
    const results = [
      checkTripExpenseEntryParity([expense()], [entry()]),
      checkNoDuplicateSources([entry()]),
      checkTripResultMatchesDre([trip()], [expense()], [entry()]),
    ];
    expect(invariantsToFindings(results)).toEqual([]);
  });

  it('invariante sem verificação no catálogo é recusada', () => {
    expect(() =>
      invariantToFindings({id: 'I99', description: 'x', stage: 9, violations: ['a']}),
    ).toThrow(ReconciliationContractError);
  });
});
