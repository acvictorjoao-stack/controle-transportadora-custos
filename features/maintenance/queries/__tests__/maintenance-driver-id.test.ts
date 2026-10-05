import {beforeEach, describe, expect, it, vi} from 'vitest';

type Row = Record<string, unknown>;

const financialSync = vi.hoisted(() => ({calls: [] as Row[]}));

vi.mock('@/features/financial/services/integration-events', () => ({
  onMaintenanceRecordCreated: vi.fn(async (_s: unknown, _c: string, record: Row) => {
    financialSync.calls.push(record);
  }),
  onLinkedFinancialEntryDeleted: vi.fn(async () => {}),
}));

import {listDriversForSelect} from '@/features/drivers/queries/drivers';

import {
  createMaintenanceRecordSchema,
  updateMaintenanceRecordSchema,
} from '../../validation';
import {
  createMaintenanceRecord,
  listMaintenanceRecords,
  updateMaintenanceRecord,
} from '../maintenance-records';

const COMPANY_ID = 'company-a';
const OTHER_COMPANY_ID = 'company-b';
const PROFILE_ID = '22222222-2222-4222-8222-222222222222';
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const SUPPLIER_ID = '44444444-4444-4444-8444-444444444444';
const DRIVER_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const DRIVER_B = 'aaaaaaaa-0000-4000-8000-000000000002';
const DRIVER_DELETED = 'aaaaaaaa-0000-4000-8000-000000000003';
const DRIVER_OTHER_COMPANY = 'bbbbbbbb-0000-4000-8000-000000000001';

const formInput = {
  vehicleId: VEHICLE_ID,
  branchId: null,
  maintenanceType: 'corrective',
  priority: 'medium',
  maintenanceStatus: 'completed',
  supplierId: SUPPLIER_ID,
  supplier: 'Oficina Teste',
  workshop: null,
  openedAt: '2026-03-01T10:00:00.000Z',
  completedAt: '2026-03-02T10:00:00.000Z',
  odometerKm: 1000,
  hourMeter: null,
  description: 'Troca de óleo',
  diagnosis: null,
  solution: null,
  notes: null,
  estimatedAmount: 100,
  finalAmount: 250,
  responsible: null,
  paymentType: 'cash',
  paymentDueDate: null,
  installmentCount: 1,
  installmentIntervalDays: 30,
};

function drivers(): Row[] {
  return [
    {id: DRIVER_A, company_id: COMPANY_ID, name: 'Ana', deleted_at: null},
    {id: DRIVER_B, company_id: COMPANY_ID, name: 'Bruno', deleted_at: null},
    {
      id: DRIVER_DELETED,
      company_id: COMPANY_ID,
      name: 'Carlos (excluído)',
      deleted_at: '2026-02-01T00:00:00.000Z',
    },
    {id: DRIVER_OTHER_COMPANY, company_id: OTHER_COMPANY_ID, name: 'Outro', deleted_at: null},
  ];
}

function maintenanceRow(id: string, overrides: Row = {}): Row {
  return {
    id,
    company_id: COMPANY_ID,
    branch_id: null,
    vehicle_id: VEHICLE_ID,
    driver_id: null,
    trip_id: null,
    maintenance_type: 'corrective',
    maintenance_status: 'completed',
    opened_at: '2026-03-01T10:00:00.000Z',
    total_cost: 100,
    deleted_at: null,
    ...overrides,
  };
}

type Filter = {op: 'eq' | 'is'; column: string; value: unknown};

/** Fake PostgREST in-memory: aplica eq/is, insert e update de verdade. */
function createFakeSupabase(tables: Record<string, Row[]>) {
  const writes: Array<{table: string; op: 'insert' | 'update'; payload: Row}> = [];
  let seq = 0;

  function from(table: string) {
    const filters: Filter[] = [];
    let mutation: {op: 'insert' | 'update'; payload: Row} | null = null;

    function matched(): Row[] {
      return (tables[table] ?? []).filter((row) =>
        filters.every((f) =>
          f.op === 'is' ? (row[f.column] ?? null) === f.value : row[f.column] === f.value,
        ),
      );
    }

    function execute(): Row[] {
      if (mutation?.op === 'insert') {
        const row = {id: `rec-${++seq}`, deleted_at: null, ...mutation.payload};
        (tables[table] ??= []).push(row);
        writes.push({table, ...mutation});
        return [{...row}];
      }
      const rows = matched();
      if (mutation?.op === 'update') {
        writes.push({table, ...mutation});
        for (const row of rows) Object.assign(row, mutation.payload);
      }
      return rows.map((row) => ({...row}));
    }

    const builder = {
      select() {
        return builder;
      },
      insert(payload: Row) {
        mutation = {op: 'insert', payload};
        return builder;
      },
      update(payload: Row) {
        mutation = {op: 'update', payload};
        return builder;
      },
      eq(column: string, value: unknown) {
        filters.push({op: 'eq', column, value});
        return builder;
      },
      is(column: string, value: unknown) {
        filters.push({op: 'is', column, value});
        return builder;
      },
      ilike() {
        return builder;
      },
      gte() {
        return builder;
      },
      lte() {
        return builder;
      },
      or() {
        return builder;
      },
      order() {
        return builder;
      },
      limit() {
        return builder;
      },
      range() {
        return builder;
      },
      async single() {
        const rows = execute();
        return rows[0]
          ? {data: rows[0], error: null}
          : {data: null, error: {code: 'PGRST116', message: 'no rows'}};
      },
      async maybeSingle() {
        return {data: execute()[0] ?? null, error: null};
      },
      then<T>(onFulfilled: (value: {data: Row[]; count: number; error: null}) => T) {
        const rows = execute();
        return Promise.resolve(onFulfilled({data: rows, count: rows.length, error: null}));
      },
    };
    return builder;
  }

  return {client: {from} as never, tables, writes};
}

function maintenanceWrites(fake: ReturnType<typeof createFakeSupabase>) {
  return fake.writes.filter((w) => w.table === 'maintenance_records');
}

beforeEach(() => {
  financialSync.calls.length = 0;
});

describe('Audit #20 — create preserva driver_id', () => {
  it('create com motorista grava driver_id (schema → payload → INSERT)', async () => {
    const fake = createFakeSupabase({maintenance_records: [], drivers: drivers()});
    const input = createMaintenanceRecordSchema.parse({...formInput, driverId: DRIVER_A});

    const {record} = await createMaintenanceRecord(fake.client, COMPANY_ID, input, PROFILE_ID);

    expect(maintenanceWrites(fake)[0].payload.driver_id).toBe(DRIVER_A);
    expect(fake.tables.maintenance_records[0].driver_id).toBe(DRIVER_A);
    expect(record.driverId).toBe(DRIVER_A);
  });

  it('create sem motorista grava driver_id null', async () => {
    const fake = createFakeSupabase({maintenance_records: [], drivers: drivers()});
    const input = createMaintenanceRecordSchema.parse(formInput);

    const {record} = await createMaintenanceRecord(fake.client, COMPANY_ID, input, PROFILE_ID);

    expect(maintenanceWrites(fake)[0].payload).toHaveProperty('driver_id', null);
    expect(record.driverId).toBeNull();
  });

  it('create com motorista null explícito grava null', async () => {
    const fake = createFakeSupabase({maintenance_records: [], drivers: drivers()});
    const input = createMaintenanceRecordSchema.parse({...formInput, driverId: null});

    await createMaintenanceRecord(fake.client, COMPANY_ID, input, PROFILE_ID);

    expect(maintenanceWrites(fake)[0].payload).toHaveProperty('driver_id', null);
  });

  it('driverId inválido é rejeitado pelo schema; driver_id continua opcional', () => {
    expect(
      createMaintenanceRecordSchema.safeParse({...formInput, driverId: 'nao-uuid'}).success,
    ).toBe(false);
    expect(createMaintenanceRecordSchema.safeParse(formInput).success).toBe(true);
  });
});

describe('Audit #20 — update preserva/atualiza driver_id', () => {
  it('update sem driverId (formulário atual) preserva o motorista existente', async () => {
    const fake = createFakeSupabase({
      maintenance_records: [maintenanceRow('rec-1', {driver_id: DRIVER_A})],
      drivers: drivers(),
    });
    const input = updateMaintenanceRecordSchema.parse({...formInput, description: 'Editado'});

    const {record} = await updateMaintenanceRecord(
      fake.client,
      COMPANY_ID,
      'rec-1',
      input,
      PROFILE_ID,
    );

    expect(maintenanceWrites(fake)[0].payload).not.toHaveProperty('driver_id');
    expect(fake.tables.maintenance_records[0].driver_id).toBe(DRIVER_A);
    expect(fake.tables.maintenance_records[0].description).toBe('Editado');
    expect(record.driverId).toBe(DRIVER_A);
  });

  it('update mantendo o mesmo motorista preserva driver_id', async () => {
    const fake = createFakeSupabase({
      maintenance_records: [maintenanceRow('rec-1', {driver_id: DRIVER_A})],
      drivers: drivers(),
    });
    const input = updateMaintenanceRecordSchema.parse({...formInput, driverId: DRIVER_A});

    await updateMaintenanceRecord(fake.client, COMPANY_ID, 'rec-1', input, PROFILE_ID);

    expect(fake.tables.maintenance_records[0].driver_id).toBe(DRIVER_A);
  });

  it('update alterando motorista persiste o novo driver_id', async () => {
    const fake = createFakeSupabase({
      maintenance_records: [maintenanceRow('rec-1', {driver_id: DRIVER_A})],
      drivers: drivers(),
    });
    const input = updateMaintenanceRecordSchema.parse({...formInput, driverId: DRIVER_B});

    const {record} = await updateMaintenanceRecord(
      fake.client,
      COMPANY_ID,
      'rec-1',
      input,
      PROFILE_ID,
    );

    expect(maintenanceWrites(fake)[0].payload.driver_id).toBe(DRIVER_B);
    expect(record.driverId).toBe(DRIVER_B);
  });

  it('update com driverId null remove o vínculo explicitamente', async () => {
    const fake = createFakeSupabase({
      maintenance_records: [maintenanceRow('rec-1', {driver_id: DRIVER_A})],
      drivers: drivers(),
    });
    const input = updateMaintenanceRecordSchema.parse({...formInput, driverId: null});

    const {record} = await updateMaintenanceRecord(
      fake.client,
      COMPANY_ID,
      'rec-1',
      input,
      PROFILE_ID,
    );

    expect(maintenanceWrites(fake)[0].payload).toHaveProperty('driver_id', null);
    expect(record.driverId).toBeNull();
  });
});

describe('Audit #20 — filtro ?driver=', () => {
  function seeded() {
    return createFakeSupabase({
      maintenance_records: [
        maintenanceRow('rec-a1', {driver_id: DRIVER_A}),
        maintenanceRow('rec-a2', {driver_id: DRIVER_A}),
        maintenanceRow('rec-b1', {driver_id: DRIVER_B}),
        maintenanceRow('rec-none'),
        maintenanceRow('rec-other', {company_id: OTHER_COMPANY_ID, driver_id: DRIVER_A}),
      ],
      drivers: drivers(),
    });
  }

  it('retorna somente registros do motorista filtrado, na empresa', async () => {
    const result = await listMaintenanceRecords(seeded().client, {
      companyId: COMPANY_ID,
      filters: {driverId: DRIVER_A},
    });

    expect(result.items.map((r) => r.id).sort()).toEqual(['rec-a1', 'rec-a2']);
  });

  it('registro novo com motorista passa a aparecer no filtro', async () => {
    const fake = seeded();
    const input = createMaintenanceRecordSchema.parse({...formInput, driverId: DRIVER_B});
    const {record} = await createMaintenanceRecord(fake.client, COMPANY_ID, input, PROFILE_ID);

    const result = await listMaintenanceRecords(fake.client, {
      companyId: COMPANY_ID,
      filters: {driverId: DRIVER_B},
    });

    expect(result.items.map((r) => r.id)).toEqual(['rec-b1', record.id]);
  });

  it('registro sem motorista continua aparecendo sem filtro e sem erro', async () => {
    const result = await listMaintenanceRecords(seeded().client, {companyId: COMPANY_ID});

    const none = result.items.find((r) => r.id === 'rec-none');
    expect(none?.driverId).toBeNull();
    expect(none?.driverName).toBeNull();
    expect(result.items).toHaveLength(4);
  });
});

describe('Audit #20 — motorista soft-deletado e company_id', () => {
  it('motorista soft-deletado não aparece como opção (listDriversForSelect)', async () => {
    const fake = createFakeSupabase({drivers: drivers()});
    const options = await listDriversForSelect(fake.client, COMPANY_ID);

    expect(options.map((o) => o.id).sort()).toEqual([DRIVER_A, DRIVER_B]);
  });

  it('motorista soft-deletado não pode ser novo vínculo no create', async () => {
    const fake = createFakeSupabase({maintenance_records: [], drivers: drivers()});
    const input = createMaintenanceRecordSchema.parse({...formInput, driverId: DRIVER_DELETED});

    await expect(
      createMaintenanceRecord(fake.client, COMPANY_ID, input, PROFILE_ID),
    ).rejects.toThrow('Motorista inválido para esta empresa.');
    expect(maintenanceWrites(fake)).toHaveLength(0);
  });

  it('motorista soft-deletado não pode ser novo vínculo no update', async () => {
    const fake = createFakeSupabase({
      maintenance_records: [maintenanceRow('rec-1', {driver_id: DRIVER_A})],
      drivers: drivers(),
    });
    const input = updateMaintenanceRecordSchema.parse({...formInput, driverId: DRIVER_DELETED});

    await expect(
      updateMaintenanceRecord(fake.client, COMPANY_ID, 'rec-1', input, PROFILE_ID),
    ).rejects.toThrow('Motorista inválido para esta empresa.');
    expect(fake.tables.maintenance_records[0].driver_id).toBe(DRIVER_A);
  });

  it('histórico com motorista excluído depois não é apagado ao editar', async () => {
    const fake = createFakeSupabase({
      maintenance_records: [maintenanceRow('rec-1', {driver_id: DRIVER_DELETED})],
      drivers: drivers(),
    });

    await updateMaintenanceRecord(
      fake.client,
      COMPANY_ID,
      'rec-1',
      updateMaintenanceRecordSchema.parse(formInput),
      PROFILE_ID,
    );
    expect(fake.tables.maintenance_records[0].driver_id).toBe(DRIVER_DELETED);

    await updateMaintenanceRecord(
      fake.client,
      COMPANY_ID,
      'rec-1',
      updateMaintenanceRecordSchema.parse({...formInput, driverId: DRIVER_DELETED}),
      PROFILE_ID,
    );
    expect(fake.tables.maintenance_records[0].driver_id).toBe(DRIVER_DELETED);
  });

  it('motorista de outra empresa nunca é associado (create e update)', async () => {
    const fake = createFakeSupabase({
      maintenance_records: [maintenanceRow('rec-1')],
      drivers: drivers(),
    });

    await expect(
      createMaintenanceRecord(
        fake.client,
        COMPANY_ID,
        createMaintenanceRecordSchema.parse({...formInput, driverId: DRIVER_OTHER_COMPANY}),
        PROFILE_ID,
      ),
    ).rejects.toThrow('Motorista inválido para esta empresa.');

    await expect(
      updateMaintenanceRecord(
        fake.client,
        COMPANY_ID,
        'rec-1',
        updateMaintenanceRecordSchema.parse({...formInput, driverId: DRIVER_OTHER_COMPANY}),
        PROFILE_ID,
      ),
    ).rejects.toThrow('Motorista inválido para esta empresa.');

    expect(maintenanceWrites(fake)).toHaveLength(0);
    expect(fake.tables.maintenance_records[0].driver_id).toBeNull();
  });

  it('update de registro de outra empresa não lê o motorista dela como "atual"', async () => {
    const fake = createFakeSupabase({
      maintenance_records: [
        maintenanceRow('rec-x', {company_id: OTHER_COMPANY_ID, driver_id: DRIVER_OTHER_COMPANY}),
      ],
      drivers: drivers(),
    });

    await expect(
      updateMaintenanceRecord(
        fake.client,
        COMPANY_ID,
        'rec-x',
        updateMaintenanceRecordSchema.parse({...formInput, driverId: DRIVER_OTHER_COMPANY}),
        PROFILE_ID,
      ),
    ).rejects.toThrow('Motorista inválido para esta empresa.');
  });
});

describe('Audit #20 — regressão do payload', () => {
  it('veículo, tipo, status, datas, custos e trip_id seguem iguais', async () => {
    const fake = createFakeSupabase({maintenance_records: [], drivers: drivers()});
    const input = createMaintenanceRecordSchema.parse({...formInput, driverId: DRIVER_A});

    await createMaintenanceRecord(fake.client, COMPANY_ID, input, PROFILE_ID);
    const payload = maintenanceWrites(fake)[0].payload;

    expect(payload).toMatchObject({
      company_id: COMPANY_ID,
      vehicle_id: VEHICLE_ID,
      trip_id: null,
      maintenance_type: 'corrective',
      maintenance_status: 'completed',
      opened_at: '2026-03-01T10:00:00.000Z',
      completed_at: '2026-03-02T10:00:00.000Z',
      final_amount: 250,
      total_cost: 250,
      payment_type: 'cash',
      created_by: PROFILE_ID,
      updated_by: PROFILE_ID,
    });
  });

  it('sincronização financeira continua sendo disparada com o registro salvo', async () => {
    const fake = createFakeSupabase({maintenance_records: [], drivers: drivers()});
    const input = createMaintenanceRecordSchema.parse({...formInput, driverId: DRIVER_A});

    await createMaintenanceRecord(fake.client, COMPANY_ID, input, PROFILE_ID);

    expect(financialSync.calls).toHaveLength(1);
    expect(financialSync.calls[0]).toMatchObject({driverId: DRIVER_A, totalCost: 250});
  });

  it('demais filtros da listagem seguem aplicados', async () => {
    const fake = createFakeSupabase({
      maintenance_records: [
        maintenanceRow('rec-1', {driver_id: DRIVER_A, maintenance_type: 'preventive'}),
        maintenanceRow('rec-2', {driver_id: DRIVER_A, maintenance_type: 'corrective'}),
        maintenanceRow('rec-3', {
          driver_id: DRIVER_A,
          maintenance_type: 'preventive',
          maintenance_status: 'open',
        }),
      ],
    });

    const result = await listMaintenanceRecords(fake.client, {
      companyId: COMPANY_ID,
      filters: {
        driverId: DRIVER_A,
        vehicleId: VEHICLE_ID,
        maintenanceType: 'preventive',
        maintenanceStatus: 'completed',
      },
    });

    expect(result.items.map((r) => r.id)).toEqual(['rec-1']);
  });
});
