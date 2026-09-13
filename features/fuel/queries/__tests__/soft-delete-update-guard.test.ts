import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it, vi} from 'vitest';

vi.mock('@/features/financial/services/integration-events', () => ({
  onLinkedFinancialEntryDeleted: vi.fn(async () => undefined),
}));

const {softDeleteFuelRecord} = await import('../fuel-records');

const COMPANY_ID = 'company-1';
const FUEL_ID = '11111111-1111-1111-1111-111111111111';
const PROFILE_ID = '22222222-2222-2222-2222-222222222222';

function createSoftDeleteStub(recordDeletedAt: string | null) {
  const state = {
    sawDeletedAtNull: false,
    mutationApplied: false,
    updatePayload: null as Record<string, unknown> | null,
  };

  const chain = {
    update(payload: Record<string, unknown>) {
      state.updatePayload = payload;
      return chain;
    },
    eq() {
      return chain;
    },
    is(column: string, value: unknown) {
      if (column === 'deleted_at' && value === null) {
        state.sawDeletedAtNull = true;
      }
      return chain;
    },
    then(resolve: (result: {error: null}) => unknown) {
      if (state.sawDeletedAtNull && recordDeletedAt !== null) {
        return Promise.resolve(resolve({error: null}));
      }
      state.mutationApplied = true;
      return Promise.resolve(resolve({error: null}));
    },
  };

  return {
    state,
    client: {
      from(table: string) {
        expect(table).toBe('fuel_records');
        return chain;
      },
    },
  };
}

describe('Audit #11 — fuel_records soft-delete UPDATE guard', () => {
  it('softDeleteFuelRecord exige deleted_at null (contrato de código)', () => {
    const source = readFileSync(
      resolve(__dirname, '../fuel-records.ts'),
      'utf8',
    );
    const start = source.indexOf('export async function softDeleteFuelRecord');
    const end = source.indexOf('function mapEfficiencyEntity', start);
    const block = source.slice(start, end);
    expect(block).toContain(".is('deleted_at', null)");
  });

  it('updateFuelRecord exige deleted_at null (contrato de código)', () => {
    const source = readFileSync(
      resolve(__dirname, '../fuel-records.ts'),
      'utf8',
    );
    const start = source.indexOf('export async function updateFuelRecord');
    const end = source.indexOf('export async function softDeleteFuelRecord', start);
    const block = source.slice(start, end);
    expect(block).toContain('.update(payload)');
    expect(block).toContain(".is('deleted_at', null)");
  });

  it('não re-stampa deleted_at em abastecimento já soft-deletado', async () => {
    const {client, state} = createSoftDeleteStub('2026-01-01T00:00:00.000Z');

    await softDeleteFuelRecord(client as never, COMPANY_ID, FUEL_ID, PROFILE_ID);

    expect(state.sawDeletedAtNull).toBe(true);
    expect(state.mutationApplied).toBe(false);
  });

  it('soft-delete de abastecimento ativo aplica o UPDATE normalmente', async () => {
    const {client, state} = createSoftDeleteStub(null);

    await softDeleteFuelRecord(client as never, COMPANY_ID, FUEL_ID, PROFILE_ID);

    expect(state.sawDeletedAtNull).toBe(true);
    expect(state.mutationApplied).toBe(true);
    expect(state.updatePayload).toMatchObject({
      status: 'archived',
      updated_by: PROFILE_ID,
    });
    expect(state.updatePayload?.deleted_at).toEqual(expect.any(String));
  });
});
