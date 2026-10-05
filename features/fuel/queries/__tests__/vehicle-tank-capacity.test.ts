import {readFileSync, readdirSync} from 'node:fs';
import {join, resolve} from 'node:path';

import {describe, expect, it, vi} from 'vitest';

vi.mock('@/features/financial/services/integration-events', () => ({
  onFuelRecordCreated: vi.fn(async () => undefined),
  onFuelRecordUpdated: vi.fn(async () => undefined),
}));

import {FUEL_DETAIL_COLUMNS, FUEL_LIST_COLUMNS} from '../../constants';
import {composeFuelDetail} from '../../loaders/fuel-detail-loader';
import {calculateFuelMetrics} from '../../services/consumption';
import type {CreateFuelRecordInput} from '../../validation';
import {createFuelRecord, getFuelRecordDetailRow, updateFuelRecord} from '../fuel-records';

type Row = Record<string, unknown>;

const ROOT = process.cwd();
const COMPANY_ID = 'company-1';
const PROFILE_ID = 'profile-1';
const FUEL_ID = 'fuel-1';
const VEHICLE_ID = 'vehicle-1';
const PREVIOUS_ODOMETER = 100_000;

const input = {
  vehicleId: VEHICLE_ID,
  driverId: 'driver-1',
  branchId: null,
  tripId: null,
  supplierId: 'supplier-1',
  stationName: 'Posto Teste',
  stationBrand: null,
  city: null,
  state: null,
  fueledAt: '2026-03-01T10:00:00.000Z',
  fuelType: 'diesel_s10',
  quantityLiters: 200,
  pricePerLiter: 6,
  totalAmount: 1200,
  odometerKm: 100_500,
  notes: null,
  responsible: null,
  paymentType: 'cash',
  paymentDueDate: null,
  installmentCount: 1,
  installmentIntervalDays: 30,
} as unknown as CreateFuelRecordInput;

function storedRow(overrides: Row = {}): Row {
  return {
    id: FUEL_ID,
    company_id: COMPANY_ID,
    branch_id: null,
    vehicle_id: VEHICLE_ID,
    driver_id: 'driver-1',
    trip_id: null,
    supplier_id: 'supplier-1',
    station_name: 'Posto Teste',
    station_brand: null,
    city: null,
    state: null,
    fueled_at: '2026-03-01T10:00:00.000Z',
    fuel_type: 'diesel_s10',
    quantity_liters: 200,
    price_per_liter: 6,
    total_amount: 1200,
    odometer_km: 100_500,
    hour_meter: null,
    km_traveled: 500,
    consumption_l_per_100km: 40,
    km_per_liter: 2.5,
    cost_per_km: 2.4,
    autonomy_km: null,
    notes: null,
    responsible: null,
    is_inconsistent: false,
    inconsistency_flags: [],
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
    vehicles: {id: VEHICLE_ID, plate: 'ABC1D23', model: 'FH 540', fuel_type: 'diesel_s10'},
    ...overrides,
  };
}

/** Fake PostgREST que registra tabelas, SELECTs e payloads gravados. */
function createFakeSupabase(detailRow: Row | null = storedRow()) {
  const tables: string[] = [];
  const selects: Array<{table: string; columns: string}> = [];
  const writes: Array<{table: string; op: 'insert' | 'update'; payload: Row}> = [];

  function from(table: string) {
    tables.push(table);
    let columns = '';
    let mutation: {op: 'insert' | 'update'; payload: Row} | null = null;

    const builder: Record<string, unknown> = {};
    const self = () => builder;
    builder.select = vi.fn((cols: string) => {
      columns = cols;
      selects.push({table, columns: cols});
      return self();
    });
    for (const method of ['eq', 'is', 'not', 'order', 'limit', 'lt', 'neq', 'gte', 'lte']) {
      builder[method] = vi.fn(self);
    }
    builder.insert = vi.fn((payload: Row) => {
      mutation = {op: 'insert', payload};
      writes.push({table, ...mutation});
      return self();
    });
    builder.update = vi.fn((payload: Row) => {
      mutation = {op: 'update', payload};
      writes.push({table, ...mutation});
      return self();
    });
    builder.maybeSingle = vi.fn(async () => {
      if (columns === 'odometer_km') {
        return {data: {odometer_km: PREVIOUS_ODOMETER}, error: null};
      }
      return {data: detailRow, error: null};
    });
    builder.single = vi.fn(async () => ({
      data: storedRow({...(mutation?.payload ?? {})}),
      error: null,
    }));
    builder.then = (onFulfilled: (value: {data: Row[]; count: number; error: null}) => unknown) =>
      Promise.resolve(onFulfilled({data: [], count: 0, error: null}));

    return builder;
  }

  return {client: {from} as never, tables, selects, writes};
}

describe('Capacidade do tanque — fonte de dados', () => {
  it('vehicles has no tank capacity column in migrations or generated types', () => {
    const migrationsDir = join(ROOT, 'supabase/migrations');
    const migrations = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .map((file) => readFileSync(join(migrationsDir, file), 'utf8'))
      .join('\n');
    const types = readFileSync(join(ROOT, 'supabase/types/database.ts'), 'utf8');

    expect(migrations).not.toMatch(/tank_capacity|fuel_tank/i);
    expect(types).not.toMatch(/tank_capacity|fuel_tank/i);
  });

  it('fuel code no longer reads the nonexistent tank_capacity_liters column', () => {
    const files = [
      '../fuel-records.ts',
      '../../services/mappers.ts',
      '../../types/fuel.ts',
      '../../constants.ts',
    ].map((file) => readFileSync(resolve(__dirname, file), 'utf8'));

    for (const source of files) {
      expect(source).not.toMatch(/tank_capacity/);
    }
    expect(FUEL_LIST_COLUMNS).not.toMatch(/tank/);
    expect(FUEL_DETAIL_COLUMNS).not.toMatch(/tank/);
  });
});

describe('calculateFuelMetrics — autonomia depende da capacidade', () => {
  const base = {
    quantityLiters: 200,
    pricePerLiter: 6,
    totalAmount: 1200,
    odometerKm: 100_500,
    previousOdometerKm: PREVIOUS_ODOMETER,
    fueledAt: '2026-03-01T10:00:00.000Z',
  };

  it('computes autonomy when a real capacity is provided', () => {
    const metrics = calculateFuelMetrics({...base, tankCapacityLiters: 400});

    expect(metrics.kmPerLiter).toBe(2.5);
    expect(metrics.autonomyKm).toBe(1000);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['zero', 0],
    ['NaN', Number.NaN],
    ['negative', -50],
  ])('keeps autonomy null when capacity is %s', (_label, capacity) => {
    const metrics = calculateFuelMetrics({...base, tankCapacityLiters: capacity});

    expect(metrics.autonomyKm).toBeNull();
    expect(metrics.kmTraveled).toBe(500);
    expect(metrics.kmPerLiter).toBe(2.5);
    expect(metrics.costPerKm).toBe(2.4);
  });
});

describe('createFuelRecord / updateFuelRecord — capacidade indisponível', () => {
  it('create never queries vehicles and persists autonomy_km as null', async () => {
    const fake = createFakeSupabase();

    const record = await createFuelRecord(fake.client, COMPANY_ID, input, PROFILE_ID);

    expect(fake.tables).not.toContain('vehicles');
    const payload = fake.writes.find((w) => w.op === 'insert')?.payload;
    expect(payload).toHaveProperty('autonomy_km', null);
    expect(payload).toMatchObject({km_traveled: 500, km_per_liter: 2.5, cost_per_km: 2.4});
    expect(record.autonomyKm).toBeNull();
  });

  it('update never queries vehicles and persists autonomy_km as null', async () => {
    const fake = createFakeSupabase();

    const record = await updateFuelRecord(fake.client, COMPANY_ID, FUEL_ID, input, PROFILE_ID);

    expect(fake.tables).not.toContain('vehicles');
    const payload = fake.writes.find((w) => w.op === 'update')?.payload;
    expect(payload).toHaveProperty('autonomy_km', null);
    expect(payload).toMatchObject({km_traveled: 500, km_per_liter: 2.5, cost_per_km: 2.4});
    expect(record.autonomyKm).toBeNull();
  });
});

describe('detalhe do abastecimento — consumidores', () => {
  it('getFuelRecordDetailRow returns only the record, without a phantom tankCapacity', async () => {
    const fake = createFakeSupabase();

    const detail = await getFuelRecordDetailRow(fake.client, COMPANY_ID, FUEL_ID);

    expect(detail).not.toBeNull();
    expect(Object.keys(detail!)).toEqual(['record']);
    expect(detail!.record.autonomyKm).toBeNull();
    expect(fake.selects).toEqual([{table: 'fuel_records', columns: FUEL_DETAIL_COLUMNS}]);
  });

  it('getFuelRecordDetailRow preserves a stored autonomy value as-is', async () => {
    const fake = createFakeSupabase(storedRow({autonomy_km: 900}));

    const detail = await getFuelRecordDetailRow(fake.client, COMPANY_ID, FUEL_ID);

    expect(detail!.record.autonomyKm).toBe(900);
  });

  it('getFuelRecordDetailRow returns null when the record does not exist', async () => {
    const fake = createFakeSupabase(null);

    await expect(getFuelRecordDetailRow(fake.client, COMPANY_ID, FUEL_ID)).resolves.toBeNull();
  });

  it('composeFuelDetail keeps loading the detail with autonomy unavailable', async () => {
    const fake = createFakeSupabase();

    const data = await composeFuelDetail(fake.client, COMPANY_ID, FUEL_ID);

    expect(data?.record).toMatchObject({
      id: FUEL_ID,
      vehiclePlate: 'ABC1D23',
      kmPerLiter: 2.5,
      autonomyKm: null,
    });
    expect(data?.history).toEqual([]);
    expect(data?.documents).toEqual([]);
  });
});
