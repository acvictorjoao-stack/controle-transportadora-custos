import {describe, expect, it, vi} from 'vitest';

import {
  canCancelAccountsPayableEntry,
  describeTripExpenseOrigin,
  formatAccountsPayableOrigin,
  getAccountsPayableOriginHref,
} from '@/features/accounts-payable/utils/origin';

import {listTripExpenseEntries, mapTripExpenseEntryRow} from '../../queries/trip-expense-entries';
import type {TripExpense} from '../../types';
import type {TripFinancialSummary} from '../../types/trip-financial-summary';
import {
  EMPTY_PAYMENT_FORM,
  canLeavePaidByEmpty,
  changePaidBy,
  changePaymentMethod,
  describePaymentEffect,
  expenseTypeOptions,
  paymentFormFromExpense,
  paymentMethodOptions,
  paymentPayload,
  showsDueDate,
  showsPaymentMethod,
  validatePaymentForm,
} from '../trip-expense-form';
import {
  SETTLED_EXPENSE_MESSAGE,
  describeTripExpenseDeletion,
  resolveTripExpenseStatus,
  type TripExpenseEntryRef,
} from '../trip-expense-status';
import {buildTripResultView} from '../trip-result-view';

function expense(overrides: Partial<TripExpense> = {}): TripExpense {
  return {
    id: 'exp-1',
    tripId: 'trip-1',
    expenseType: 'toll',
    amount: 100,
    currency: 'BRL',
    description: null,
    notes: null,
    expenseDate: '2026-11-02',
    receiptUrl: null,
    paidBy: 'company',
    paymentMethod: 'toll_tag',
    dueDate: null,
    createdAt: '2026-11-02T10:00:00Z',
    ...overrides,
  };
}

function entry(overrides: Partial<TripExpenseEntryRef> = {}): TripExpenseEntryRef {
  return {
    id: 'fe-1',
    sourceId: 'exp-1',
    entryType: 'expense',
    entryStatus: 'paid',
    paidAmount: 100,
    treatment: 'paid',
    ...overrides,
  };
}

function statusOf(item: TripExpense, entries: TripExpenseEntryRef[], financialVisible = true) {
  return resolveTripExpenseStatus({expense: item, entries, financialVisible});
}

// ---------------------------------------------------------------------------
// Situação financeira de cada despesa
// ---------------------------------------------------------------------------

describe('situação financeira da despesa', () => {
  it('despesa paga pela empresa: "Pago"', () => {
    expect(statusOf(expense(), [entry()])).toMatchObject({key: 'paid', label: 'Pago', tone: 'success'});
  });

  it('reembolso de motorista e de agregado pendente: "Aguardando reembolso"', () => {
    const pending = entry({entryStatus: 'pending', paidAmount: null, treatment: 'payable'});
    expect(statusOf(expense({paidBy: 'driver', paymentMethod: 'own_money'}), [pending]).label).toBe(
      'Aguardando reembolso',
    );
    expect(statusOf(expense({paidBy: 'aggregate', paymentMethod: 'own_money'}), [pending]).label).toBe(
      'Aguardando reembolso',
    );
  });

  it('reembolso já pago pelo Financeiro: "Pago", com exclusão e edição travadas', () => {
    const status = statusOf(expense({paidBy: 'driver', paymentMethod: 'own_money'}), [
      entry({entryStatus: 'paid', paidAmount: 100, treatment: 'payable'}),
    ]);
    expect(status).toMatchObject({key: 'paid', settledByFinance: true});
    expect(describeTripExpenseDeletion(status)).toBe(SETTLED_EXPENSE_MESSAGE);
  });

  it('compra a prazo: "Pendente" e, em atraso, "Vencido"', () => {
    const credit = expense({paymentMethod: 'supplier_credit', dueDate: '2026-12-01'});
    expect(statusOf(credit, [entry({entryStatus: 'pending', treatment: 'payable'})]).label).toBe('Pendente');
    expect(statusOf(credit, [entry({entryStatus: 'overdue', treatment: 'payable'})]).label).toBe('Vencido');
  });

  it('gasto com adiantamento: "Pago com adiantamento"', () => {
    expect(
      statusOf(expense({paidBy: 'driver', paymentMethod: 'driver_advance'}), [
        entry({treatment: 'paid_by_advance'}),
      ]),
    ).toMatchObject({key: 'paid_by_advance', label: 'Pago com adiantamento'});
  });

  it('terceiro: "Sem custo para a empresa", sem depender do financeiro', () => {
    expect(statusOf(expense({paidBy: 'third_party', paymentMethod: null}), [], false).label).toBe(
      'Sem custo para a empresa',
    );
  });

  it('despesa antiga sem quem pagou: "Sem integração financeira"', () => {
    expect(statusOf(expense({paidBy: null, paymentMethod: null}), []).label).toBe('Sem integração financeira');
  });

  it('adiantamento antigo (tipo da aba): não é custo', () => {
    expect(statusOf(expense({expenseType: 'advance'}), []).key).toBe('legacy_advance');
  });

  it('lançamento cancelado ou estornado, sem outro ativo', () => {
    expect(statusOf(expense(), [entry({entryStatus: 'reversed'})]).label).toBe('Cancelado ou estornado');
  });

  it('quem pagou informado, mas sem lançamento: "Integração pendente" (não inventa "Pago")', () => {
    expect(statusOf(expense(), []).key).toBe('integration_pending');
  });

  it('usuário sem financeiro:read não vê situação financeira', () => {
    expect(statusOf(expense(), [entry()], false)).toMatchObject({key: 'restricted', label: 'Restrito'});
  });

  it('ignora lançamentos de outras despesas', () => {
    expect(statusOf(expense(), [entry({sourceId: 'outra'})]).key).toBe('integration_pending');
  });

  it('confirmação de exclusão explica o efeito no financeiro', () => {
    expect(describeTripExpenseDeletion(statusOf(expense(), [entry()]))).toContain('estornado');
    expect(
      describeTripExpenseDeletion(
        statusOf(expense({paidBy: 'company', paymentMethod: 'supplier_credit'}), [
          entry({entryStatus: 'pending', treatment: 'payable'}),
        ]),
      ),
    ).toContain('cancelado');
  });
});

// ---------------------------------------------------------------------------
// Formulário: campos condicionais, vencimento e edição
// ---------------------------------------------------------------------------

describe('formulário de despesa', () => {
  it('nova despesa começa vazia: nada é preenchido sozinho', () => {
    expect(paymentFormFromExpense(null)).toEqual(EMPTY_PAYMENT_FORM);
  });

  it('mostra só as formas compatíveis com quem pagou', () => {
    expect(paymentMethodOptions('driver')).toEqual(['own_money', 'driver_advance']);
    expect(paymentMethodOptions('aggregate')).toEqual(['own_money']);
    expect(paymentMethodOptions('third_party')).toEqual([]);
    expect(paymentMethodOptions('company')).toContain('supplier_credit');
    expect(paymentMethodOptions('company')).not.toContain('own_money');
  });

  it('terceiro não pede forma de pagamento', () => {
    const state = changePaidBy(EMPTY_PAYMENT_FORM, 'third_party');
    expect(showsPaymentMethod(state)).toBe(false);
    expect(validatePaymentForm(state, null)).toEqual([]);
    expect(paymentPayload(state)).toEqual({paidBy: 'third_party', paymentMethod: null, dueDate: null});
  });

  it('trocar quem pagou limpa forma incompatível; agregado só tem uma opção', () => {
    const company = changePaymentMethod(changePaidBy(EMPTY_PAYMENT_FORM, 'company'), 'toll_tag');
    expect(changePaidBy(company, 'driver').paymentMethod).toBe('');
    expect(changePaidBy(company, 'aggregate').paymentMethod).toBe('own_money');
  });

  it('vencimento só aparece e só é enviado na compra a prazo', () => {
    let state = changePaymentMethod(changePaidBy(EMPTY_PAYMENT_FORM, 'company'), 'supplier_credit');
    expect(showsDueDate(state)).toBe(true);
    expect(validatePaymentForm(state, null)).toEqual([
      {field: 'dueDate', message: 'Informe o vencimento da compra a prazo.'},
    ]);
    state = {...state, dueDate: '2026-12-02'};
    expect(validatePaymentForm(state, null)).toEqual([]);
    expect(paymentPayload(state)).toEqual({
      paidBy: 'company',
      paymentMethod: 'supplier_credit',
      dueDate: '2026-12-02',
    });
    const cash = changePaymentMethod(state, 'cash');
    expect(showsDueDate(cash)).toBe(false);
    expect(paymentPayload(cash).dueDate).toBeNull();
  });

  it('despesa nova exige quem pagou e forma', () => {
    expect(validatePaymentForm(EMPTY_PAYMENT_FORM, null)[0]?.field).toBe('paidBy');
    expect(validatePaymentForm(changePaidBy(EMPTY_PAYMENT_FORM, 'company'), null)[0]?.field).toBe(
      'paymentMethod',
    );
  });

  it('despesa antiga sem quem pagou pode ser editada sem apagar nem inventar nada', () => {
    const legacy = expense({paidBy: null, paymentMethod: null});
    const state = paymentFormFromExpense(legacy);
    expect(canLeavePaidByEmpty(legacy)).toBe(true);
    expect(validatePaymentForm(state, legacy)).toEqual([]);
    expect(paymentPayload(state)).toEqual({});
  });

  it('despesa integrada não pode voltar para "não informado"', () => {
    const integrated = expense();
    expect(canLeavePaidByEmpty(integrated)).toBe(false);
    expect(validatePaymentForm({...EMPTY_PAYMENT_FORM}, integrated)[0]?.field).toBe('paidBy');
  });

  it('edição carrega o que a despesa já tem', () => {
    expect(
      paymentFormFromExpense(expense({paymentMethod: 'supplier_credit', dueDate: '2026-12-02T00:00:00Z'})),
    ).toEqual({paidBy: 'company', paymentMethod: 'supplier_credit', dueDate: '2026-12-02'});
  });

  it('"adiantamento" sai das opções novas e só aparece ao editar o antigo (D14)', () => {
    expect(expenseTypeOptions(null)).not.toContain('advance');
    expect(expenseTypeOptions('toll')).not.toContain('advance');
    expect(expenseTypeOptions('advance')).toContain('advance');
  });

  it('explica antes de salvar como a despesa vai para o financeiro', () => {
    const driver = changePaymentMethod(changePaidBy(EMPTY_PAYMENT_FORM, 'driver'), 'own_money');
    expect(describePaymentEffect(driver, 'toll')).toContain('reembolso ao motorista');
    expect(
      describePaymentEffect(changePaymentMethod(driver, 'driver_advance'), 'toll'),
    ).toContain('sem nova saída de caixa');
    expect(describePaymentEffect(changePaidBy(EMPTY_PAYMENT_FORM, 'third_party'), 'toll')).toContain(
      'não gera custo',
    );
    expect(describePaymentEffect(EMPTY_PAYMENT_FORM, 'advance')).toContain('não é custo');
  });
});

// ---------------------------------------------------------------------------
// Cards do resumo da viagem
// ---------------------------------------------------------------------------

function summary(overrides: Partial<TripFinancialSummary> = {}): TripFinancialSummary {
  return {
    tripId: 'trip-1',
    tripNumber: 'V1',
    tripStatus: 'completed',
    completedAt: null,
    freightAmount: 10000,
    directCosts: 2450,
    fuelCosts: 2000,
    maintenanceCosts: 0,
    tireCosts: 0,
    otherCosts: 0,
    directCostEntries: 3,
    tripExpenseCosts: 450,
    result: 7550,
    marginPercent: 75.5,
    advancesTotal: 0,
    reimbursementsTotal: 0,
    unpostedTripExpensesAmount: 0,
    unpostedTripExpensesCount: 0,
    legacyAdvanceExpensesAmount: 0,
    legacyAdvanceExpensesCount: 0,
    receivableEntryId: null,
    receivableStatus: null,
    receivableAmount: null,
    receivableReceived: null,
    receivableBalance: null,
    financialVisible: true,
    ...overrides,
  };
}

describe('cards do resumo da viagem', () => {
  it('separa custos operacionais e despesas de viagem, sem duplicar', () => {
    const view = buildTripResultView(summary(), 0);
    if (view.state !== 'ready') throw new Error('esperava ready');
    expect(view).toMatchObject({
      freight: 10000,
      operationalCosts: 2000,
      tripExpenseCosts: 450,
      directCosts: 2450,
      result: 7550,
      marginPercent: 75.5,
    });
    expect(view.operationalLines).toEqual([{label: 'Combustível', amount: 2000}]);
    expect(view.operationalCosts + view.tripExpenseCosts).toBe(view.directCosts);
  });

  it('avisa as despesas ainda não integradas', () => {
    const view = buildTripResultView(summary({unpostedTripExpensesAmount: 140, unpostedTripExpensesCount: 1}), 0);
    if (view.state !== 'ready') throw new Error('esperava ready');
    expect(view.unpostedNotice).toContain('1 despesa(s)');
  });

  it('usuário sem financeiro:read não vê valores protegidos', () => {
    expect(
      buildTripResultView(summary({financialVisible: false, directCosts: null, tripExpenseCosts: null, result: null}), 0),
    ).toEqual({state: 'restricted', freight: 10000});
  });
});

// ---------------------------------------------------------------------------
// Contas a Pagar e Fluxo de Caixa: origem e navegação
// ---------------------------------------------------------------------------

describe('origem do lançamento da despesa de viagem', () => {
  const base = {
    sourceModule: 'trip_expense',
    sourceId: 'exp-1',
    referenceNumber: 'V202600007',
    fuelRecordId: null,
  };

  it.each([
    [{paid_by: 'driver', payment_method: 'own_money', treatment: 'payable'}, 'Reembolso ao motorista'],
    [{paid_by: 'aggregate', payment_method: 'own_money', treatment: 'payable'}, 'Reembolso ao agregado'],
    [{paid_by: 'company', payment_method: 'supplier_credit', treatment: 'payable'}, 'Compra a prazo'],
    [{paid_by: 'company', payment_method: 'cash', treatment: 'paid'}, 'Paga pela empresa'],
    [{paid_by: 'driver', payment_method: 'driver_advance', treatment: 'paid_by_advance'}, 'Paga com adiantamento'],
  ])('%o → %s', (metadata, label) => {
    expect(describeTripExpenseOrigin({...base, metadata})).toBe(label);
    expect(formatAccountsPayableOrigin({...base, metadata})).toBe(
      `🧾 Despesa de viagem · ${label} · Viagem V202600007`,
    );
  });

  it('outras origens não mudam', () => {
    expect(describeTripExpenseOrigin({sourceModule: 'fuel', metadata: {}})).toBeNull();
    expect(formatAccountsPayableOrigin({...base, sourceModule: 'accounts_payable'})).toBe('📄 Manual');
  });

  it('"Abrir origem" leva à viagem', () => {
    expect(
      getAccountsPayableOriginHref({
        ...base,
        tripId: 'trip-1',
        maintenanceRecordId: null,
        tireId: null,
      }),
    ).toBe('/viagens/trip-1');
  });

  it('não oferece cancelar o lançamento da despesa de viagem fora da viagem', () => {
    expect(canCancelAccountsPayableEntry({sourceModule: 'trip_expense'})).toBe(false);
    expect(canCancelAccountsPayableEntry({sourceModule: 'accounts_payable'})).toBe(true);
    expect(canCancelAccountsPayableEntry({sourceModule: 'fuel'})).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Carga dos lançamentos das despesas (sem colunas da migration 111)
// ---------------------------------------------------------------------------

describe('lançamentos das despesas da viagem', () => {
  it('lê só a origem trip_expense da viagem e da empresa, com colunas que já existem', async () => {
    const filters: string[] = [];
    let columns = '';
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn((value: string) => {
      columns = value;
      return chain;
    });
    chain.eq = vi.fn((column: string, value: string) => {
      filters.push(`${column}=${value}`);
      return chain;
    });
    chain.is = vi.fn(async () => ({
      data: [
        {id: 'fe-1', source_id: 'exp-1', entry_type: 'expense', entry_status: 'paid', paid_amount: '100', metadata: {treatment: 'paid'}},
        {id: 'fe-x', source_id: null, entry_type: 'expense', entry_status: 'paid', paid_amount: null, metadata: null},
      ],
      error: null,
    }));
    const supabase = {from: vi.fn(() => chain)};

    const entries = await listTripExpenseEntries(supabase as never, 'c1', 'trip-1');

    expect(supabase.from).toHaveBeenCalledWith('financial_entries');
    expect(filters).toEqual(['company_id=c1', 'trip_id=trip-1', 'source_module=trip_expense']);
    expect(columns).not.toMatch(/paid_by|payment_method|trip_expense_costs/);
    expect(entries).toEqual([
      {id: 'fe-1', sourceId: 'exp-1', entryType: 'expense', entryStatus: 'paid', paidAmount: 100, treatment: 'paid'},
    ]);
  });

  it('sem tratamento no metadata, cai na regra de quem pagou', () => {
    expect(
      mapTripExpenseEntryRow({
        id: 'fe',
        source_id: 'exp',
        entry_type: 'expense',
        entry_status: 'pending',
        paid_amount: null,
        metadata: {},
      })?.treatment,
    ).toBeNull();
  });
});
