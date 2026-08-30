import type {SupabaseClient} from '@supabase/supabase-js';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {PayrollExpense} from '../../types';

const upsertMock = vi.fn();
const softDeleteMock = vi.fn();

vi.mock('@/features/financial/services/operation-financial.service', () => ({
  upsertFinancialInstallmentsFromOperation: (...args: unknown[]) => upsertMock(...args),
}));

vi.mock('@/features/financial/queries/financial-entries', () => ({
  getFinancialEntryById: vi.fn(),
  softDeleteFinancialEntry: (...args: unknown[]) => softDeleteMock(...args),
}));

const {removePayrollFinancialEntries, syncPayrollFinancialEntry} = await import(
  '../payroll-financial.service'
);

const COMPANY_ID = 'company-1';
const PROFILE_ID = 'profile-1';

interface QueryCall {
  table: string;
  filters: Record<string, unknown>;
}

/**
 * Stub encadeável do Supabase: registra os filtros aplicados para que os testes
 * possam checar o isolamento por empresa sem depender de um banco real.
 */
function createSupabaseStub(
  rows: {id: string; entry_status?: string; paid_amount?: number | null}[],
) {
  const calls: QueryCall[] = [];

  const client = {
    from(table: string) {
      const call: QueryCall = {table, filters: {}};
      calls.push(call);

      const chain = {
        select: () => chain,
        eq: (column: string, value: unknown) => {
          call.filters[column] = value;
          return chain;
        },
        is: (column: string, value: unknown) => {
          call.filters[`is:${column}`] = value;
          return chain;
        },
        neq: (column: string, value: unknown) => {
          call.filters[`neq:${column}`] = value;
          return chain;
        },
        then: (resolve: (result: {data: {id: string}[]; error: null}) => unknown) =>
          resolve({data: rows, error: null}),
      };

      return chain;
    },
  };

  return {client: client as unknown as SupabaseClient, calls};
}

function makeExpense(overrides: Partial<PayrollExpense> = {}): PayrollExpense {
  return {
    id: 'expense-1',
    companyId: COMPANY_ID,
    branchId: null,
    employeeId: null,
    driverId: 'driver-1',
    personId: 'driver-1',
    personKind: 'driver',
    personName: 'JOÃO SILVA',
    positionId: 'position-1',
    positionName: 'Motorista',
    costCenterId: 'cost-center-rh',
    costCenterCode: 'RH',
    costCenterName: 'RH',
    competence: '2026-03-01',
    expenseType: 'salario',
    expenseStatus: 'pending',
    amount: 3200,
    paymentMethod: 'pix',
    dueDate: '2026-04-05',
    paidAt: null,
    notes: null,
    metadata: {},
    status: 'active',
    createdAt: '2026-03-31T12:00:00.000Z',
    updatedAt: '2026-03-31T12:00:00.000Z',
    financialEntryId: null,
    financialStatus: null,
    ...overrides,
  };
}

beforeEach(() => {
  upsertMock.mockReset();
  softDeleteMock.mockReset();
  upsertMock.mockResolvedValue([]);
  softDeleteMock.mockResolvedValue(undefined);
});

describe('syncPayrollFinancialEntry', () => {
  it('lança pelo par (source_module, source_id) com parcela única', async () => {
    const {client} = createSupabaseStub([]);

    await syncPayrollFinancialEntry(client, COMPANY_ID, makeExpense(), PROFILE_ID);

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [, companyId, input] = upsertMock.mock.calls[0];
    expect(companyId).toBe(COMPANY_ID);
    expect(input).toMatchObject({
      sourceModule: 'payroll',
      sourceId: 'expense-1',
      paymentType: 'credit',
      amount: 3200,
      entryDate: '2026-03-31',
      dueDate: '2026-04-05',
      installmentCount: 1,
      categorySlug: 'salarios',
    });
  });

  it('é idempotente: reexecutar delega o mesmo upsert, sem criar novo lançamento', async () => {
    const {client} = createSupabaseStub([]);
    const expense = makeExpense();

    await syncPayrollFinancialEntry(client, COMPANY_ID, expense, PROFILE_ID);
    await syncPayrollFinancialEntry(client, COMPANY_ID, expense, PROFILE_ID);

    expect(upsertMock).toHaveBeenCalledTimes(2);
    expect(upsertMock.mock.calls[0][2]).toEqual(upsertMock.mock.calls[1][2]);
    // Nenhuma criação direta: a unicidade fica com o serviço financeiro central
    // e com o índice parcial de financial_entries.
    expect(upsertMock.mock.calls[0][2].sourceId).toBe(
      upsertMock.mock.calls[1][2].sourceId,
    );
  });

  it('usa o centro de custo escolhido, sem cair no OPERACIONAL automático', async () => {
    const {client} = createSupabaseStub([]);

    await syncPayrollFinancialEntry(
      client,
      COMPANY_ID,
      makeExpense({costCenterId: 'cost-center-administrativo'}),
      PROFILE_ID,
    );

    expect(upsertMock.mock.calls[0][2].costCenterId).toBe('cost-center-administrativo');
  });

  it('não rateia por veículo, motorista ou viagem', async () => {
    const {client} = createSupabaseStub([]);

    await syncPayrollFinancialEntry(client, COMPANY_ID, makeExpense(), PROFILE_ID);

    expect(upsertMock.mock.calls[0][2]).toMatchObject({
      vehicleId: null,
      driverId: null,
      tripId: null,
    });
  });

  it('despesa paga gera lançamento quitado, fora de Contas a Pagar', async () => {
    const {client} = createSupabaseStub([]);

    await syncPayrollFinancialEntry(
      client,
      COMPANY_ID,
      makeExpense({expenseStatus: 'paid', dueDate: null, paidAt: '2026-04-05'}),
      PROFILE_ID,
    );

    expect(upsertMock.mock.calls[0][2]).toMatchObject({
      paymentType: 'cash',
      dueDate: null,
      paidAt: '2026-04-05T12:00:00.000Z',
    });
  });

  it('despesa cancelada estorna o lançamento em vez de lançar', async () => {
    const {client} = createSupabaseStub([{id: 'entry-1'}]);

    await syncPayrollFinancialEntry(
      client,
      COMPANY_ID,
      makeExpense({expenseStatus: 'cancelled'}),
      PROFILE_ID,
    );

    expect(upsertMock).not.toHaveBeenCalled();
    expect(softDeleteMock).toHaveBeenCalledWith(
      expect.anything(),
      COMPANY_ID,
      'entry-1',
      PROFILE_ID,
    );
  });
});

describe('removePayrollFinancialEntries', () => {
  it('filtra sempre por empresa, origem payroll e a despesa informada', async () => {
    const {client, calls} = createSupabaseStub([{id: 'entry-1'}]);

    await removePayrollFinancialEntries(client, COMPANY_ID, 'expense-1', PROFILE_ID);

    expect(calls[0].table).toBe('financial_entries');
    expect(calls[0].filters).toMatchObject({
      company_id: COMPANY_ID,
      source_module: 'payroll',
      source_id: 'expense-1',
      'is:deleted_at': null,
      'neq:entry_status': 'reversed',
      'neq:entry_type': 'reversal',
    });
  });

  it('estorna todos os lançamentos ativos da despesa', async () => {
    const {client} = createSupabaseStub([{id: 'entry-1'}, {id: 'entry-2'}]);

    await removePayrollFinancialEntries(client, COMPANY_ID, 'expense-1', PROFILE_ID);

    expect(softDeleteMock).toHaveBeenCalledTimes(2);
  });

  it('propaga falha ao estornar para não informar sucesso', async () => {
    const {client} = createSupabaseStub([{id: 'entry-1'}, {id: 'entry-2'}]);
    softDeleteMock.mockRejectedValueOnce(new Error('conflito'));

    await expect(
      removePayrollFinancialEntries(client, COMPANY_ID, 'expense-1', PROFILE_ID),
    ).rejects.toThrow('conflito');
    expect(softDeleteMock).toHaveBeenCalledTimes(1);
  });

  it('preserva a baixa financeira existente durante uma sincronização compatível', async () => {
    const {client} = createSupabaseStub([
      {id: 'entry-1', entry_status: 'paid', paid_amount: 3200},
    ]);

    await syncPayrollFinancialEntry(
      client,
      COMPANY_ID,
      makeExpense({notes: 'Atualização compatível'}),
      PROFILE_ID,
    );
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });
});
