import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it, vi} from 'vitest';

import {createTripExpense, updateTripExpense} from '../trips';
import {mapTripExpenseRow} from '../../services/mappers';
import type {TripExpenseRow} from '../../types';

const COMPANY = 'company-1';
const TRIP = '00000000-0000-4000-8000-000000000001';

const savedRow: TripExpenseRow = {
  id: 'exp-1',
  company_id: COMPANY,
  branch_id: null,
  trip_id: TRIP,
  expense_type: 'toll',
  amount: 300,
  currency: 'BRL',
  description: null,
  notes: null,
  expense_date: '2026-11-02',
  receipt_url: null,
  paid_by: 'company',
  payment_method: 'toll_tag',
  due_date: null,
  created_at: '2026-11-02T10:00:00Z',
  deleted_at: null,
};

/** Supabase falso: guarda tabela, payload e filtros de cada chamada. */
function supabaseMock(result: {data: unknown; error: unknown} = {data: savedRow, error: null}) {
  const calls: Array<{table: string; op: string; payload?: Record<string, unknown>; filters: string[]}> = [];
  const supabase = {
    from: vi.fn((table: string) => {
      const call = {table, op: '', payload: undefined as Record<string, unknown> | undefined, filters: [] as string[]};
      calls.push(call);
      const chain: Record<string, unknown> = {};
      const self = () => chain;
      chain.insert = vi.fn((payload: Record<string, unknown>) => {
        call.op = 'insert';
        call.payload = payload;
        return chain;
      });
      chain.update = vi.fn((payload: Record<string, unknown>) => {
        call.op = 'update';
        call.payload = payload;
        return chain;
      });
      chain.eq = vi.fn((column: string, value: unknown) => {
        call.filters.push(`${column}=${String(value)}`);
        return chain;
      });
      chain.is = vi.fn(self);
      chain.select = vi.fn(self);
      chain.single = vi.fn(async () => result);
      return chain;
    }),
  };
  return {supabase, calls};
}

const baseInput = {
  tripId: TRIP,
  expenseType: 'toll' as const,
  amount: 300,
  currency: 'BRL',
  description: null,
  notes: null,
  expenseDate: '2026-11-02',
  receiptUrl: null,
};

describe('gravação da despesa da viagem', () => {
  it('formulário antigo: não envia quem pagou (despesa fica fora do financeiro, D10)', async () => {
    const {supabase, calls} = supabaseMock();
    await createTripExpense(supabase as never, COMPANY, baseInput, 'profile-1', null);
    expect(calls).toHaveLength(1);
    expect(calls[0].payload).not.toHaveProperty('paid_by');
    expect(calls[0].payload).not.toHaveProperty('payment_method');
    expect(calls[0].payload).not.toHaveProperty('due_date');
  });

  it('com quem pagou: grava os três campos na própria despesa', async () => {
    const {supabase, calls} = supabaseMock();
    const expense = await createTripExpense(
      supabase as never,
      COMPANY,
      {...baseInput, paidBy: 'company', paymentMethod: 'supplier_credit', dueDate: '2026-12-02'},
      'profile-1',
      null,
    );
    expect(calls[0].payload).toMatchObject({
      company_id: COMPANY,
      paid_by: 'company',
      payment_method: 'supplier_credit',
      due_date: '2026-12-02',
    });
    expect(expense).toMatchObject({paidBy: 'company', paymentMethod: 'toll_tag'});
  });

  it('nunca grava em financial_entries: o lançamento é do gatilho da migration 111', async () => {
    const {supabase, calls} = supabaseMock();
    await createTripExpense(
      supabase as never,
      COMPANY,
      {...baseInput, paidBy: 'driver', paymentMethod: 'own_money'},
      'profile-1',
      null,
    );
    await updateTripExpense(
      supabase as never,
      COMPANY,
      {...baseInput, id: 'exp-1', paidBy: 'aggregate', paymentMethod: 'own_money'},
      'profile-1',
    );
    expect(calls.map((call) => call.table)).toEqual(['trip_expenses', 'trip_expenses']);
  });

  it('edição sem quem pagou não apaga o que a despesa já tem', async () => {
    const {supabase, calls} = supabaseMock();
    await updateTripExpense(supabase as never, COMPANY, {...baseInput, id: 'exp-1'}, 'profile-1');
    expect(calls[0].payload).not.toHaveProperty('paid_by');
    expect(calls[0].payload).not.toHaveProperty('payment_method');
  });

  it('terceiro limpa a forma de pagamento (restrição do banco)', async () => {
    const {supabase, calls} = supabaseMock();
    await updateTripExpense(
      supabase as never,
      COMPANY,
      {...baseInput, id: 'exp-1', paidBy: 'third_party'},
      'profile-1',
    );
    expect(calls[0].payload).toMatchObject({paid_by: 'third_party', payment_method: null});
  });

  it('edição fica presa à empresa, à viagem e à despesa ativa', async () => {
    const {supabase, calls} = supabaseMock();
    await updateTripExpense(supabase as never, COMPANY, {...baseInput, id: 'exp-1'}, 'profile-1');
    expect(calls[0].filters).toEqual(['id=exp-1', `company_id=${COMPANY}`, `trip_id=${TRIP}`]);
  });

  it('mensagem do gatilho chega clara ao usuário', async () => {
    const {supabase} = supabaseMock({
      data: null,
      error: {
        code: 'P0001',
        message:
          'O pagamento desta despesa já foi registrado no Financeiro. Estorne o pagamento antes de alterar valor, viagem ou quem pagou.',
      },
    });
    await expect(
      updateTripExpense(supabase as never, COMPANY, {...baseInput, id: 'exp-1', amount: 400}, 'profile-1'),
    ).rejects.toThrow(/Estorne o pagamento antes/);
  });

  it('combinação recusada pelo banco vira mensagem de produto', async () => {
    const {supabase} = supabaseMock({
      data: null,
      error: {
        code: '23514',
        message:
          'new row for relation "trip_expenses" violates check constraint "trip_expenses_payment_combination_check"',
      },
    });
    await expect(
      createTripExpense(supabase as never, COMPANY, baseInput, 'profile-1', null),
    ).rejects.toThrow('Esta forma de pagamento não combina com quem pagou a despesa.');
  });
});

describe('leitura de despesas antigas', () => {
  it('despesa sem as colunas novas continua legível, com quem pagou nulo', () => {
    const legacy = {...savedRow} as Partial<TripExpenseRow>;
    delete legacy.paid_by;
    delete legacy.payment_method;
    delete legacy.due_date;
    expect(mapTripExpenseRow(legacy as TripExpenseRow)).toMatchObject({
      amount: 300,
      paidBy: null,
      paymentMethod: null,
      dueDate: null,
    });
  });
});

describe('permissões das ações de despesa', () => {
  const source = readFileSync(resolve(process.cwd(), 'features/trips/actions/trip-actions.ts'), 'utf8');

  it('criar e editar continuam exigindo trips:update; excluir, trips:delete', () => {
    for (const [action, permission] of [
      ['createTripExpenseAction', 'trips:update'],
      ['updateTripExpenseAction', 'trips:update'],
      ['deleteTripExpenseAction', 'trips:delete'],
    ]) {
      const start = source.indexOf(`export async function ${action}(`);
      expect(source.slice(start, start + 300)).toContain(`resolveTripAccess('${permission}')`);
    }
  });
});
