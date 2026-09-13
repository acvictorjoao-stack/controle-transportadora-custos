import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

import {softDeleteTrip} from '../trips';

const COMPANY_ID = 'company-1';
const TRIP_ID = '11111111-1111-1111-1111-111111111111';
const PROFILE_ID = '22222222-2222-2222-2222-222222222222';

/**
 * Stub que só “aplica” UPDATE se `.is('deleted_at', null)` estiver na cadeia
 * e o registro ainda estiver ativo — espelha o padrão PostgREST/suppliers.
 */
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
        // Nenhum row match — não re-stampa deleted_at
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
        expect(table).toBe('trips');
        return chain;
      },
    },
  };
}

describe('Audit #11 — trips soft-delete UPDATE guard', () => {
  it('softDeleteTrip exige deleted_at null (contrato de código)', () => {
    const source = readFileSync(
      resolve(__dirname, '../trips.ts'),
      'utf8',
    );
    const start = source.indexOf('export async function softDeleteTrip');
    const end = source.indexOf('export async function updateTripStatus', start);
    const block = source.slice(start, end);
    expect(block).toContain(".is('deleted_at', null)");
  });

  it('updateTrip exige deleted_at null (contrato de código)', () => {
    const source = readFileSync(
      resolve(__dirname, '../trips.ts'),
      'utf8',
    );
    const start = source.indexOf('export async function updateTrip');
    const end = source.indexOf('export async function softDeleteTrip', start);
    const block = source.slice(start, end);
    expect(block).toContain(".update(payload)");
    expect(block).toContain(".is('deleted_at', null)");
  });

  it('não re-stampa deleted_at em viagem já soft-deletada', async () => {
    const {client, state} = createSoftDeleteStub('2026-01-01T00:00:00.000Z');

    await softDeleteTrip(client as never, COMPANY_ID, TRIP_ID, PROFILE_ID);

    expect(state.sawDeletedAtNull).toBe(true);
    expect(state.mutationApplied).toBe(false);
  });

  it('soft-delete de viagem ativa aplica o UPDATE normalmente', async () => {
    const {client, state} = createSoftDeleteStub(null);

    await softDeleteTrip(client as never, COMPANY_ID, TRIP_ID, PROFILE_ID);

    expect(state.sawDeletedAtNull).toBe(true);
    expect(state.mutationApplied).toBe(true);
    expect(state.updatePayload).toMatchObject({
      status: 'archived',
      updated_by: PROFILE_ID,
    });
    expect(state.updatePayload?.deleted_at).toEqual(expect.any(String));
  });
});
