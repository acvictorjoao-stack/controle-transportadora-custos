import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

import {TRIP_EXPENSE_PAID_BY, TRIP_EXPENSE_PAYMENT_METHODS} from '../../constants/enums';
import {createTripExpenseSchema, updateTripExpenseSchema} from '../../validation/schemas';
import {
  TRIP_EXPENSE_METHODS_BY_PAID_BY,
  resolveTripExpenseTreatment,
  tripExpenseGeneratesEntry,
  validateTripExpensePayment,
} from '../trip-expense-payment';

const TRIP = '00000000-0000-4000-8000-000000000001';
const EXPENSE = '00000000-0000-4000-8000-000000000002';

describe('quem pagou → tratamento financeiro (mesma regra da migration 111)', () => {
  it.each([
    ['company', 'bank_account', 'paid'],
    ['company', 'corporate_card', 'paid'],
    ['company', 'toll_tag', 'paid'],
    ['company', 'cash', 'paid'],
    ['company', 'not_informed', 'paid'],
    ['company', 'supplier_credit', 'payable'],
    ['driver', 'own_money', 'payable'],
    ['driver', 'driver_advance', 'paid_by_advance'],
    ['aggregate', 'own_money', 'payable'],
    ['third_party', null, 'none'],
    [null, null, 'none'],
  ] as const)('%s + %s → %s', (paidBy, method, treatment) => {
    expect(resolveTripExpenseTreatment(paidBy, method)).toBe(treatment);
  });

  it('reembolso de motorista e agregado nasce pendente (baixa o próprio lançamento)', () => {
    expect(resolveTripExpenseTreatment('driver', 'own_money')).toBe('payable');
    expect(resolveTripExpenseTreatment('aggregate', 'own_money')).toBe('payable');
  });

  it('gasto com adiantamento nasce pago, sem nova saída', () => {
    expect(resolveTripExpenseTreatment('driver', 'driver_advance')).toBe('paid_by_advance');
  });
});

describe('quando a despesa vira custo da empresa', () => {
  const base = {expenseType: 'toll', paidBy: 'company', paymentMethod: 'cash'} as const;

  it('empresa, motorista e agregado geram um lançamento', () => {
    expect(tripExpenseGeneratesEntry(base)).toBe(true);
    expect(tripExpenseGeneratesEntry({...base, paidBy: 'driver', paymentMethod: 'own_money'})).toBe(true);
  });

  it('terceiro não gera custo para a empresa', () => {
    expect(tripExpenseGeneratesEntry({...base, paidBy: 'third_party', paymentMethod: null})).toBe(false);
  });

  it('tipo antigo "adiantamento" nunca vira custo', () => {
    expect(tripExpenseGeneratesEntry({...base, expenseType: 'advance'})).toBe(false);
  });

  it('despesa antiga sem "quem pagou" não é integrada pela aplicação', () => {
    expect(tripExpenseGeneratesEntry({...base, paidBy: null, paymentMethod: null})).toBe(false);
  });

  it('despesa excluída não gera custo', () => {
    expect(tripExpenseGeneratesEntry({...base, deleted: true})).toBe(false);
  });
});

describe('validação de paid_by e payment_method', () => {
  it('aceita todas as combinações válidas', () => {
    for (const paidBy of TRIP_EXPENSE_PAID_BY) {
      for (const method of TRIP_EXPENSE_METHODS_BY_PAID_BY[paidBy]) {
        const dueDate = method === 'supplier_credit' ? '2026-12-01' : null;
        expect(validateTripExpensePayment({paidBy, paymentMethod: method, dueDate})).toEqual([]);
      }
    }
    expect(validateTripExpensePayment({paidBy: 'third_party', paymentMethod: null})).toEqual([]);
  });

  it('recusa combinação que não existe no banco', () => {
    expect(validateTripExpensePayment({paidBy: 'driver', paymentMethod: 'toll_tag'})).toEqual([
      {field: 'paymentMethod', message: 'Esta forma de pagamento não combina com quem pagou.'},
    ]);
    expect(validateTripExpensePayment({paidBy: 'aggregate', paymentMethod: 'driver_advance'})).toHaveLength(1);
  });

  it('exige forma de pagamento quando há quem pagou (exceto terceiro)', () => {
    expect(validateTripExpensePayment({paidBy: 'company'})[0]?.field).toBe('paymentMethod');
    expect(validateTripExpensePayment({paidBy: 'third_party', paymentMethod: 'cash'})[0]?.field).toBe(
      'paymentMethod',
    );
  });

  it('forma de pagamento sem quem pagou é recusada', () => {
    expect(validateTripExpensePayment({paymentMethod: 'cash'})).toEqual([
      {field: 'paidBy', message: 'Informe quem pagou a despesa.'},
    ]);
  });

  it('compra a prazo exige vencimento', () => {
    expect(validateTripExpensePayment({paidBy: 'company', paymentMethod: 'supplier_credit'})).toEqual([
      {field: 'dueDate', message: 'Informe o vencimento da compra a prazo.'},
    ]);
    expect(
      validateTripExpensePayment({paidBy: 'company', paymentMethod: 'supplier_credit', dueDate: '2026-12-01'}),
    ).toEqual([]);
  });
});

describe('schemas de despesa da viagem', () => {
  it('formulário antigo (sem quem pagou) continua válido e não inventa valores', () => {
    const parsed = createTripExpenseSchema.parse({tripId: TRIP, expenseType: 'toll', amount: '12,50'});
    expect(parsed.amount).toBe(12.5);
    expect(parsed.paidBy).toBeUndefined();
    expect(parsed.paymentMethod).toBeUndefined();
    expect(parsed.dueDate).toBeUndefined();
  });

  it('edição sem quem pagou mantém o campo ausente (não apaga o que existe)', () => {
    const parsed = updateTripExpenseSchema.parse({id: EXPENSE, tripId: TRIP, expenseType: 'food', amount: 40});
    expect('paidBy' in parsed ? parsed.paidBy : undefined).toBeUndefined();
  });

  it('aceita quem pagou e forma válidos', () => {
    const parsed = createTripExpenseSchema.parse({
      tripId: TRIP,
      expenseType: 'other',
      amount: 150,
      paidBy: 'company',
      paymentMethod: 'supplier_credit',
      dueDate: '2026-12-02',
    });
    expect(parsed).toMatchObject({paidBy: 'company', paymentMethod: 'supplier_credit', dueDate: '2026-12-02'});
  });

  it('recusa combinação inválida e compra a prazo sem vencimento', () => {
    const invalid = createTripExpenseSchema.safeParse({
      tripId: TRIP,
      expenseType: 'toll',
      amount: 10,
      paidBy: 'driver',
      paymentMethod: 'toll_tag',
    });
    expect(invalid.success).toBe(false);
    const noDue = updateTripExpenseSchema.safeParse({
      id: EXPENSE,
      tripId: TRIP,
      expenseType: 'other',
      amount: 10,
      paidBy: 'company',
      paymentMethod: 'supplier_credit',
      dueDate: '',
    });
    expect(noDue.success).toBe(false);
    if (!noDue.success) expect(noDue.error.issues[0]?.path).toEqual(['dueDate']);
  });

  it('recusa valores fora da lista', () => {
    expect(
      createTripExpenseSchema.safeParse({tripId: TRIP, expenseType: 'toll', amount: 1, paidBy: 'cliente'}).success,
    ).toBe(false);
  });
});

describe('paridade com a migration 111', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/111_trip_expense_financial_sync.sql'),
    'utf8',
  ).replace(/\r\n/g, '\n');

  it('listas de quem pagou e de instrumentos são as mesmas do banco', () => {
    expect(sql).toContain(
      `check (paid_by is null or paid_by in (${TRIP_EXPENSE_PAID_BY.map((v) => `'${v}'`).join(', ')}))`,
    );
    for (const method of TRIP_EXPENSE_PAYMENT_METHODS) {
      expect(sql).toContain(`'${method}'`);
    }
  });

  it('combinações aceitas são as mesmas da restrição do banco', () => {
    const quote = (values: readonly string[]) => values.map((v) => `'${v}'`).join(', ');
    expect(sql).toContain(
      `(paid_by = 'driver' and payment_method in (${quote(TRIP_EXPENSE_METHODS_BY_PAID_BY.driver)}))`,
    );
    expect(sql).toContain("(paid_by = 'aggregate' and payment_method = 'own_money')");
    expect(sql.replace(/\s+/g, ' ')).toContain(
      `(paid_by = 'company' and payment_method in ( ${quote(TRIP_EXPENSE_METHODS_BY_PAID_BY.company)} ))`,
    );
  });
});
