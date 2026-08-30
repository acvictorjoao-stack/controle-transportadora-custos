import {describe, expect, it} from 'vitest';

import {
  buildPayrollDescription,
  findPayrollDuplicate,
  resolvePayrollFinancialPlan,
  resolvePayrollPersonColumns,
} from '../payroll-rules';
import type {PayrollDuplicateRecord} from '../payroll-rules';

describe('resolvePayrollPersonColumns (XOR driver/employee)', () => {
  it('motorista preenche apenas driver_id, sem duplicar cadastro em employees', () => {
    expect(resolvePayrollPersonColumns('driver', 'driver-1')).toEqual({
      employee_id: null,
      driver_id: 'driver-1',
    });
  });

  it('colaborador preenche apenas employee_id', () => {
    expect(resolvePayrollPersonColumns('employee', 'emp-1')).toEqual({
      employee_id: 'emp-1',
      driver_id: null,
    });
  });

  it('nunca preenche as duas colunas ao mesmo tempo', () => {
    for (const kind of ['driver', 'employee'] as const) {
      const columns = resolvePayrollPersonColumns(kind, 'person-1');
      const filled = [columns.employee_id, columns.driver_id].filter(
        (value) => value !== null,
      );
      expect(filled).toHaveLength(1);
    }
  });
});

describe('resolvePayrollFinancialPlan', () => {
  it('despesa em aberto vira obrigação a prazo com vencimento (Contas a Pagar)', () => {
    const plan = resolvePayrollFinancialPlan({
      expenseStatus: 'pending',
      competence: '2026-03',
      dueDate: '2026-04-05',
      paidAt: null,
    });

    expect(plan).toEqual({
      action: 'upsert',
      paymentType: 'credit',
      entryDate: '2026-03-31',
      dueDate: '2026-04-05',
      paidAt: null,
    });
  });

  it('sem vencimento informado, usa o fim da competência', () => {
    const plan = resolvePayrollFinancialPlan({
      expenseStatus: 'pending',
      competence: '2026-03',
      dueDate: null,
      paidAt: null,
    });

    expect(plan).toMatchObject({paymentType: 'credit', dueDate: '2026-03-31'});
  });

  it('despesa paga vira lançamento quitado, fora de Contas a Pagar', () => {
    const plan = resolvePayrollFinancialPlan({
      expenseStatus: 'paid',
      competence: '2026-03',
      dueDate: null,
      paidAt: '2026-04-05',
    });

    expect(plan).toEqual({
      action: 'upsert',
      paymentType: 'cash',
      entryDate: '2026-03-31',
      dueDate: null,
      paidAt: '2026-04-05T12:00:00.000Z',
    });
  });

  it('despesa cancelada não mantém lançamento ativo', () => {
    expect(
      resolvePayrollFinancialPlan({
        expenseStatus: 'cancelled',
        competence: '2026-03',
        dueDate: '2026-04-05',
        paidAt: null,
      }),
    ).toEqual({action: 'remove'});
  });

  it('é determinístico: reexecutar com a mesma despesa produz o mesmo plano', () => {
    const input = {
      expenseStatus: 'pending' as const,
      competence: '2026-03',
      dueDate: '2026-04-05',
      paidAt: null,
    };

    expect(resolvePayrollFinancialPlan(input)).toEqual(
      resolvePayrollFinancialPlan(input),
    );
  });
});

describe('findPayrollDuplicate (validação suave)', () => {
  const existing: PayrollDuplicateRecord[] = [
    {
      id: 'exp-1',
      personId: 'person-1',
      competence: '2026-03-01',
      expenseType: 'salario',
    },
  ];

  it('detecta mesma pessoa, competência e tipo', () => {
    const duplicate = findPayrollDuplicate(existing, {
      personId: 'person-1',
      competence: '2026-03',
      expenseType: 'salario',
    });

    expect(duplicate?.id).toBe('exp-1');
  });

  it('não acusa tipos diferentes na mesma competência', () => {
    expect(
      findPayrollDuplicate(existing, {
        personId: 'person-1',
        competence: '2026-03',
        expenseType: 'hora_extra',
      }),
    ).toBeNull();
  });

  it('não acusa a mesma pessoa em outra competência', () => {
    expect(
      findPayrollDuplicate(existing, {
        personId: 'person-1',
        competence: '2026-04',
        expenseType: 'salario',
      }),
    ).toBeNull();
  });

  it('não acusa pessoas diferentes', () => {
    expect(
      findPayrollDuplicate(existing, {
        personId: 'person-2',
        competence: '2026-03',
        expenseType: 'salario',
      }),
    ).toBeNull();
  });

  it('ignora o próprio registro durante a edição', () => {
    expect(
      findPayrollDuplicate(existing, {
        id: 'exp-1',
        personId: 'person-1',
        competence: '2026-03',
        expenseType: 'salario',
      }),
    ).toBeNull();
  });
});

describe('buildPayrollDescription', () => {
  it('identifica pessoa, cargo, tipo e competência no lançamento financeiro', () => {
    expect(
      buildPayrollDescription({
        personName: 'JOÃO SILVA',
        positionName: 'Motorista',
        expenseType: 'salario',
        competence: '2026-03',
      }),
    ).toBe('Folha — JOÃO SILVA (Motorista) · Salário 03/2026');
  });

  it('funciona sem cargo informado', () => {
    expect(
      buildPayrollDescription({
        personName: 'MARIA SOUZA',
        positionName: null,
        expenseType: 'decimo_terceiro',
        competence: '2026-12',
      }),
    ).toBe('Folha — MARIA SOUZA · 13º salário 12/2026');
  });
});
