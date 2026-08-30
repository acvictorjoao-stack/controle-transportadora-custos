import type {SupabaseClient} from '@supabase/supabase-js';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const createMock = vi.fn();
const getByIdMock = vi.fn();
const listByRelationMock = vi.fn();
const softDeleteMock = vi.fn();

vi.mock('@/features/cost-centers/services', () => ({
    resolveCostCenter: vi.fn(async () => null),
}));

vi.mock('../../queries/financial-entries', () => ({
  createFinancialEntry: (...args: unknown[]) => createMock(...args),
  getFinancialEntryById: (...args: unknown[]) => getByIdMock(...args),
  listFinancialEntriesByRelation: (...args: unknown[]) => listByRelationMock(...args),
  softDeleteFinancialEntry: (...args: unknown[]) => softDeleteMock(...args),
  getCategoryBySlug: vi.fn(async () => ({id: 'category-1'})),
}));

const {upsertFinancialInstallmentsFromOperation} = await import(
  '../operation-financial.service'
);

const COMPANY_ID = 'company-1';
const PROFILE_ID = 'profile-1';

interface QueryCall {
  table: string;
  filters: Record<string, unknown>;
}

/** Stub encadeável do Supabase que registra os filtros aplicados na consulta. */
function createSupabaseStub(rows: {id: string}[]) {
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
        order: () => chain,
        limit: () => chain,
        then: (resolve: (result: {data: {id: string}[]; error: null}) => unknown) =>
          resolve({data: rows, error: null}),
      };

      return chain;
    },
  };

  return {client: client as unknown as SupabaseClient, calls};
}

const payrollInput = {
  sourceModule: 'payroll',
  sourceId: 'expense-1',
  paymentType: 'credit' as const,
  amount: 3200,
  entryDate: '2026-03-31',
  dueDate: '2026-04-05',
  installmentCount: 1,
  description: 'Folha — JOÃO SILVA · Salário 03/2026',
  categorySlug: 'salarios',
  costCenterId: 'cost-center-rh',
};

beforeEach(() => {
  createMock.mockReset();
  getByIdMock.mockReset();
  softDeleteMock.mockReset();
  createMock.mockResolvedValue({id: 'entry-1', entryStatus: 'pending'});
  getByIdMock.mockResolvedValue({id: 'entry-1', entryStatus: 'pending'});
});

describe('busca do lançamento de origem', () => {
  it('exclui estornos: reversal compartilha source_id mas não é origem', async () => {
    const {client, calls} = createSupabaseStub([]);

    await upsertFinancialInstallmentsFromOperation(
      client,
      COMPANY_ID,
      payrollInput,
      PROFILE_ID,
    );

    const lookup = calls.find((call) => call.table === 'financial_entries');
    expect(lookup?.filters).toMatchObject({
      company_id: COMPANY_ID,
      source_module: 'payroll',
      source_id: 'expense-1',
      'is:deleted_at': null,
      'neq:entry_status': 'reversed',
      'neq:entry_type': 'reversal',
    });
  });

  it('sem origem ativa, cria o lançamento com a parcela preenchida', async () => {
    const {client} = createSupabaseStub([]);

    await upsertFinancialInstallmentsFromOperation(
      client,
      COMPANY_ID,
      payrollInput,
      PROFILE_ID,
    );

    expect(createMock).toHaveBeenCalledTimes(1);
    // installment_number nulo deixaria a chave de idempotência incompleta e o
    // CHECK financial_entries_payroll_origin_key recusaria a linha.
    expect(createMock.mock.calls[0][4]).toMatchObject({
      source_module: 'payroll',
      source_id: 'expense-1',
      installment_number: 1,
      installment_total: 1,
    });
  });
});
