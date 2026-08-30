import {describe, expect, it} from 'vitest';

import {createPayrollExpenseSchema} from '../schemas';

const PERSON_ID = '11111111-1111-4111-8111-111111111111';
const COST_CENTER_ID = '22222222-2222-4222-8222-222222222222';
const POSITION_ID = '33333333-3333-4333-8333-333333333333';

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    personKind: 'driver',
    personId: PERSON_ID,
    costCenterId: COST_CENTER_ID,
    competence: '2026-03',
    expenseType: 'salario',
    amount: '2500,50',
    dueDate: '2026-04-05',
    ...overrides,
  };
}

function fieldPaths(result: ReturnType<typeof createPayrollExpenseSchema.safeParse>) {
  if (result.success) return [];
  return result.error.issues.map((issue) => issue.path.join('.'));
}

describe('createPayrollExpenseSchema', () => {
  it('aceita uma despesa em aberto com os campos obrigatórios', () => {
    const result = createPayrollExpenseSchema.safeParse(
      baseInput({positionId: POSITION_ID, notes: 'FOLHA MARÇO'}),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.competence).toBe('2026-03-01');
    expect(result.data.amount).toBeCloseTo(2500.5);
    expect(result.data.expenseStatus).toBe('pending');
    expect(result.data.confirmDuplicate).toBe(false);
  });

  it('exige valor maior que zero', () => {
    expect(fieldPaths(createPayrollExpenseSchema.safeParse(baseInput({amount: 0})))).toContain(
      'amount',
    );
    expect(
      fieldPaths(createPayrollExpenseSchema.safeParse(baseInput({amount: '-10'}))),
    ).toContain('amount');
  });

  it('exige centro de custo', () => {
    expect(
      fieldPaths(createPayrollExpenseSchema.safeParse(baseInput({costCenterId: ''}))),
    ).toContain('costCenterId');
    const withoutCostCenter = baseInput();
    delete (withoutCostCenter as Record<string, unknown>).costCenterId;
    expect(fieldPaths(createPayrollExpenseSchema.safeParse(withoutCostCenter))).toContain(
      'costCenterId',
    );
  });

  it('exige funcionário, competência e tipo', () => {
    const empty = baseInput({personId: '', competence: '', expenseType: 'inexistente'});
    const paths = fieldPaths(createPayrollExpenseSchema.safeParse(empty));

    expect(paths).toContain('personId');
    expect(paths).toContain('competence');
    expect(paths).toContain('expenseType');
  });

  it('rejeita competência fora do formato mês/ano', () => {
    expect(
      fieldPaths(createPayrollExpenseSchema.safeParse(baseInput({competence: '03/2026'}))),
    ).toContain('competence');
  });

  it('exige vencimento quando a despesa está em aberto', () => {
    expect(
      fieldPaths(
        createPayrollExpenseSchema.safeParse(
          baseInput({expenseStatus: 'pending', dueDate: null}),
        ),
      ),
    ).toContain('dueDate');
  });

  it('exige data de pagamento quando a despesa está paga', () => {
    expect(
      fieldPaths(
        createPayrollExpenseSchema.safeParse(
          baseInput({expenseStatus: 'paid', dueDate: null, paidAt: null}),
        ),
      ),
    ).toContain('paidAt');
  });

  it('cargo é opcional e normalizado para null', () => {
    const result = createPayrollExpenseSchema.safeParse(baseInput({positionId: null}));
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.positionId).toBeNull();
  });

  it('não aceita campos de empresa vindos do client', () => {
    const result = createPayrollExpenseSchema.safeParse(
      baseInput({companyId: 'empresa-alheia', company_id: 'empresa-alheia'}),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).not.toHaveProperty('companyId');
    expect(result.data).not.toHaveProperty('company_id');
  });
});
