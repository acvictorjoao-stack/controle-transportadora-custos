import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {afterEach, describe, expect, it, vi} from 'vitest';

const {logErrorMock} = vi.hoisted(() => ({logErrorMock: vi.fn()}));

vi.mock('@/lib/logging/error-logger', () => ({logError: logErrorMock}));
vi.mock('@/features/financial/services/integration-events', () => ({
  onLinkedFinancialEntryDeleted: vi.fn(async () => {
    throw new Error('financial unavailable');
  }),
}));

const {softDeleteFuelRecord} = await import('../fuel-records');

const COMPANY_ID = 'company-1';
const FUEL_ID = '11111111-1111-1111-1111-111111111111';
const PROFILE_ID = '22222222-2222-2222-2222-222222222222';

function createUpdateStub() {
  const state = {updated: false};
  const chain = {
    update() {
      return chain;
    },
    eq() {
      return chain;
    },
    is() {
      return chain;
    },
    then(done: (result: {error: null}) => unknown) {
      state.updated = true;
      return Promise.resolve(done({error: null}));
    },
  };
  return {state, client: {from: () => chain}};
}

describe('Fase 2.1 — falha da sincronização financeira do abastecimento', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    logErrorMock.mockClear();
  });

  it('registra a falha e não bloqueia a exclusão do abastecimento', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const {client, state} = createUpdateStub();

    await softDeleteFuelRecord(client as never, COMPANY_ID, FUEL_ID, PROFILE_ID);

    expect(state.updated).toBe(true);
    expect(logErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({message: 'financial unavailable'}),
      `fuel.financialDelete:${FUEL_ID}`,
    );
    expect(consoleError).toHaveBeenCalledWith('[fuel] Financial financialDelete failed', {
      companyId: COMPANY_ID,
      fuelRecordId: FUEL_ID,
      message: 'financial unavailable',
    });
  });

  it('nenhum catch da integração financeira fica silencioso (contrato de código)', () => {
    const source = readFileSync(resolve(__dirname, '../fuel-records.ts'), 'utf8');
    expect(source).not.toMatch(/catch \{\s*\/\/ Financial integration must not block/);
    expect(source.match(/reportFuelFinancialSyncFailure\(error, '/g)).toHaveLength(3);
  });
});
