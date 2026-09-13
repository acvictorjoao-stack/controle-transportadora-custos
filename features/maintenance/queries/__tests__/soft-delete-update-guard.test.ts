import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it, vi} from 'vitest';

vi.mock('@/features/financial/services/integration-events', () => ({
  onLinkedFinancialEntryDeleted: vi.fn(async () => undefined),
  onMaintenanceRecordCreated: vi.fn(async () => undefined),
}));

const {softDeleteMaintenanceRecord, updateMaintenanceRecord} = await import(
  '../maintenance-records'
);

const COMPANY_ID = 'company-1';
const RECORD_ID = '11111111-1111-1111-1111-111111111111';
const PROFILE_ID = '22222222-2222-2222-2222-222222222222';
const VEHICLE_ID = '33333333-3333-3333-3333-333333333333';
const SUPPLIER_ID = '44444444-4444-4444-4444-444444444444';

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
        expect(table).toBe('maintenance_records');
        return chain;
      },
    },
  };
}

function makeActiveMaintenanceRow() {
  return {
    id: RECORD_ID,
    company_id: COMPANY_ID,
    branch_id: null,
    vehicle_id: VEHICLE_ID,
    trip_id: null,
    supplier_id: SUPPLIER_ID,
    supplier: 'Oficina Teste',
    workshop: null,
    maintenance_type: 'corrective',
    priority: 'medium',
    maintenance_status: 'open',
    opened_at: '2026-03-01T10:00:00.000Z',
    completed_at: null,
    odometer_km: 1000,
    hour_meter: null,
    description: 'Troca de óleo',
    diagnosis: null,
    solution: null,
    notes: null,
    estimated_amount: 100,
    final_amount: 100,
    downtime_hours: null,
    cost_per_km: null,
    responsible: null,
    payment_type: 'cash',
    payment_due_date: null,
    installment_count: 1,
    installment_interval_days: 30,
    external_id: null,
    integration_source: null,
    metadata: {},
    status: 'active',
    created_at: '2026-03-01T10:00:00.000Z',
    updated_at: '2026-03-01T10:00:00.000Z',
    deleted_at: null,
    created_by: PROFILE_ID,
    updated_by: PROFILE_ID,
  };
}

function createContentUpdateStub(recordDeletedAt: string | null) {
  const state = {
    sawDeletedAtNull: false,
    mutationApplied: false,
  };

  const activeRow = makeActiveMaintenanceRow();

  const updateChain = {
    update() {
      return updateChain;
    },
    eq() {
      return updateChain;
    },
    is(column: string, value: unknown) {
      if (column === 'deleted_at' && value === null) {
        state.sawDeletedAtNull = true;
      }
      return updateChain;
    },
    select() {
      return updateChain;
    },
    async single() {
      if (!state.sawDeletedAtNull) {
        state.mutationApplied = true;
        return {data: activeRow, error: null};
      }
      if (recordDeletedAt !== null) {
        return {
          data: null,
          error: {
            code: 'PGRST116',
            message: 'JSON object requested, multiple (or no) rows returned',
          },
        };
      }
      state.mutationApplied = true;
      return {data: activeRow, error: null};
    },
  };

  const selectChain = {
    select() {
      return selectChain;
    },
    eq() {
      return selectChain;
    },
    is() {
      return selectChain;
    },
    async maybeSingle() {
      return {data: activeRow, error: null};
    },
    async single() {
      return {data: activeRow, error: null};
    },
  };

  return {
    state,
    client: {
      from(table: string) {
        if (table === 'maintenance_records') {
          // update path vs getById path — distinguish by returning dual-capable chain
          return {
            update: updateChain.update.bind(updateChain),
            select: selectChain.select.bind(selectChain),
          };
        }
        return selectChain;
      },
    },
  };
}

const updateInput = {
  vehicleId: VEHICLE_ID,
  branchId: null,
  maintenanceType: 'corrective' as const,
  priority: 'medium' as const,
  maintenanceStatus: 'open' as const,
  supplierId: SUPPLIER_ID,
  supplier: 'Oficina Teste',
  workshop: null,
  openedAt: '2026-03-01T10:00:00.000Z',
  completedAt: null,
  odometerKm: 1000,
  hourMeter: null,
  description: 'Troca de óleo',
  diagnosis: null,
  solution: null,
  notes: null,
  estimatedAmount: 100,
  finalAmount: 100,
  responsible: null,
  paymentType: 'cash' as const,
  paymentDueDate: null,
  installmentCount: 1,
  installmentIntervalDays: 30,
};

describe('Audit #11 — maintenance_records soft-delete UPDATE guard', () => {
  it('softDeleteMaintenanceRecord exige deleted_at null (contrato de código)', () => {
    const source = readFileSync(
      resolve(__dirname, '../maintenance-records.ts'),
      'utf8',
    );
    const start = source.indexOf('export async function softDeleteMaintenanceRecord');
    const end = source.indexOf('export async function getMaintenanceStats', start);
    const block = source.slice(start, end);
    expect(block).toContain(".is('deleted_at', null)");
  });

  it('updateMaintenanceRecord exige deleted_at null (contrato de código)', () => {
    const source = readFileSync(
      resolve(__dirname, '../maintenance-records.ts'),
      'utf8',
    );
    const start = source.indexOf('export async function updateMaintenanceRecord');
    const end = source.indexOf('export async function softDeleteMaintenanceRecord', start);
    const block = source.slice(start, end);
    expect(block).toContain('.update(payload)');
    expect(block).toContain(".is('deleted_at', null)");
  });

  it('não re-stampa deleted_at em manutenção já soft-deletada', async () => {
    const {client, state} = createSoftDeleteStub('2026-01-01T00:00:00.000Z');

    await softDeleteMaintenanceRecord(client as never, COMPANY_ID, RECORD_ID, PROFILE_ID);

    expect(state.sawDeletedAtNull).toBe(true);
    expect(state.mutationApplied).toBe(false);
  });

  it('soft-delete de manutenção ativa aplica o UPDATE normalmente', async () => {
    const {client, state} = createSoftDeleteStub(null);

    await softDeleteMaintenanceRecord(client as never, COMPANY_ID, RECORD_ID, PROFILE_ID);

    expect(state.sawDeletedAtNull).toBe(true);
    expect(state.mutationApplied).toBe(true);
    expect(state.updatePayload).toMatchObject({
      status: 'archived',
      updated_by: PROFILE_ID,
    });
    expect(state.updatePayload?.deleted_at).toEqual(expect.any(String));
  });

  it('updateMaintenanceRecord não altera registro soft-deletado', async () => {
    const {client, state} = createContentUpdateStub('2026-01-01T00:00:00.000Z');

    await expect(
      updateMaintenanceRecord(
        client as never,
        COMPANY_ID,
        RECORD_ID,
        updateInput,
        PROFILE_ID,
      ),
    ).rejects.toThrow();

    expect(state.sawDeletedAtNull).toBe(true);
    expect(state.mutationApplied).toBe(false);
  });

  it('updateMaintenanceRecord altera registro ativo normalmente', async () => {
    const {client, state} = createContentUpdateStub(null);

    const result = await updateMaintenanceRecord(
      client as never,
      COMPANY_ID,
      RECORD_ID,
      updateInput,
      PROFILE_ID,
    );

    expect(state.sawDeletedAtNull).toBe(true);
    expect(state.mutationApplied).toBe(true);
    expect(result.record.id).toBe(RECORD_ID);
  });
});
