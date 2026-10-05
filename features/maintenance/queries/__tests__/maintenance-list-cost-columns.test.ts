import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {describe, expect, it, vi} from 'vitest';

import {MAINTENANCE_DETAIL_COLUMNS, MAINTENANCE_LIST_COLUMNS} from '../../constants';
import {listMaintenanceRecords} from '../maintenance-records';

type Row = Record<string, unknown>;

const COMPANY_ID = 'company-a';
const VEHICLE_ID = 'vehicle-1';

function topLevelColumns(select: string): string[] {
  const columns: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of select) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      columns.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) columns.push(current.trim());
  return columns.filter(Boolean);
}

function scalarColumns(select: string): string[] {
  return topLevelColumns(select)
    .filter((column) => !column.includes('('))
    .map((column) => column.split(/[:\s]/)[0]);
}

function embeddedTables(select: string): string[] {
  return topLevelColumns(select)
    .filter((column) => column.includes('('))
    .map((column) => column.split(':')[0].trim());
}

/** Fake PostgREST: projeta só as colunas do SELECT e aplica eq/is, order e range. */
function createFakeSupabase(tables: Record<string, Row[]>) {
  const fromCalls: string[] = [];
  const rangeCalls: Array<[number, number]> = [];
  const orderCalls: Array<{column: string; ascending?: boolean}> = [];

  function from(table: string) {
    fromCalls.push(table);
    const filters: Array<{op: 'eq' | 'is'; column: string; value: unknown}> = [];
    let selected: string[] = [];
    let order: {column: string; ascending: boolean} | null = null;

    const builder: Record<string, unknown> = {};
    const self = () => builder;
    builder.select = vi.fn((columns: string) => {
      selected = scalarColumns(columns);
      return self();
    });
    builder.eq = vi.fn((column: string, value: unknown) => {
      filters.push({op: 'eq', column, value});
      return self();
    });
    builder.is = vi.fn((column: string, value: unknown) => {
      filters.push({op: 'is', column, value});
      return self();
    });
    builder.ilike = vi.fn(self);
    builder.gte = vi.fn(self);
    builder.lte = vi.fn(self);
    builder.or = vi.fn(self);
    builder.order = vi.fn((column: string, opts?: {ascending?: boolean}) => {
      orderCalls.push({column, ascending: opts?.ascending});
      order = {column, ascending: opts?.ascending ?? true};
      return self();
    });
    builder.range = vi.fn(async (fromIndex: number, toIndex: number) => {
      rangeCalls.push([fromIndex, toIndex]);
      const matched = (tables[table] ?? []).filter((row) =>
        filters.every((f) =>
          f.op === 'is' ? (row[f.column] ?? null) === f.value : row[f.column] === f.value,
        ),
      );
      if (order) {
        const {column, ascending} = order;
        matched.sort((a, b) => {
          const left = String(a[column]);
          const right = String(b[column]);
          return ascending ? left.localeCompare(right) : right.localeCompare(left);
        });
      }
      const data = matched
        .slice(fromIndex, toIndex + 1)
        .map((row) => Object.fromEntries(selected.map((column) => [column, row[column] ?? null])));
      return {data, error: null, count: matched.length};
    });

    return builder;
  }

  return {client: {from} as never, fromCalls, rangeCalls, orderCalls};
}

function part(id: string, recordId: string, totalPrice: number, deletedAt: string | null = null): Row {
  return {id, company_id: COMPANY_ID, maintenance_record_id: recordId, total_price: totalPrice, deleted_at: deletedAt};
}

function service(id: string, recordId: string, amount: number, deletedAt: string | null = null): Row {
  return {id, company_id: COMPANY_ID, maintenance_record_id: recordId, amount, deleted_at: deletedAt};
}

/** Agregados como o trigger recalculate_maintenance_costs os grava (somente filhos ativos). */
function storedAggregates(recordId: string, odometerKm: number | null, parts: Row[], services: Row[]) {
  const partsTotal = parts
    .filter((p) => p.maintenance_record_id === recordId && p.deleted_at === null)
    .reduce((sum, p) => sum + Number(p.total_price), 0);
  const servicesTotal = services
    .filter((s) => s.maintenance_record_id === recordId && s.deleted_at === null)
    .reduce((sum, s) => sum + Number(s.amount), 0);
  const totalCost = partsTotal + servicesTotal;
  return {
    parts_total: partsTotal,
    services_total: servicesTotal,
    total_cost: totalCost,
    cost_per_km:
      odometerKm !== null && odometerKm > 0
        ? Math.round((totalCost / odometerKm) * 10000) / 10000
        : null,
  };
}

function record(id: string, openedAt: string, overrides: Row = {}): Row {
  return {
    id,
    company_id: COMPANY_ID,
    branch_id: null,
    vehicle_id: VEHICLE_ID,
    driver_id: null,
    trip_id: null,
    maintenance_type: 'corrective',
    priority: 'medium',
    maintenance_status: 'completed',
    supplier_id: null,
    supplier: 'Oficina',
    workshop: null,
    opened_at: openedAt,
    completed_at: null,
    odometer_km: null,
    hour_meter: null,
    downtime_hours: null,
    description: 'Serviço',
    estimated_amount: null,
    final_amount: null,
    parts_total: 0,
    services_total: 0,
    total_cost: 0,
    cost_per_km: null,
    responsible: null,
    payment_type: 'cash',
    payment_due_date: null,
    installment_count: 1,
    installment_interval_days: 30,
    status: 'active',
    created_at: openedAt,
    deleted_at: null,
    ...overrides,
  };
}

function seed() {
  const parts = [
    part('p1', 'rec-1', 300),
    part('p2', 'rec-1', 200),
    part('p3', 'rec-1', 999, '2026-03-05T00:00:00.000Z'),
  ];
  const services = [
    service('s1', 'rec-1', 150),
    service('s2', 'rec-1', 777, '2026-03-05T00:00:00.000Z'),
  ];

  const tables: Record<string, Row[]> = {
    maintenance_records: [
      record('rec-1', '2026-03-03T10:00:00.000Z', {
        odometer_km: 125000,
        final_amount: 650,
        ...storedAggregates('rec-1', 125000, parts, services),
      }),
      record('rec-2', '2026-03-02T10:00:00.000Z', {
        odometer_km: 98000,
        final_amount: 400,
        ...storedAggregates('rec-2', 98000, parts, services),
      }),
      record('rec-3', '2026-03-01T10:00:00.000Z'),
      record('rec-deleted', '2026-03-04T10:00:00.000Z', {
        deleted_at: '2026-03-04T12:00:00.000Z',
      }),
    ],
    maintenance_parts: parts,
    maintenance_services: services,
  };
  return tables;
}

describe('MAINTENANCE_LIST_COLUMNS', () => {
  it('selects parts_total, services_total and cost_per_km like the detail query', () => {
    const listColumns = scalarColumns(MAINTENANCE_LIST_COLUMNS);
    const detailColumns = scalarColumns(MAINTENANCE_DETAIL_COLUMNS);

    for (const column of ['parts_total', 'services_total', 'cost_per_km']) {
      expect(listColumns).toContain(column);
      expect(detailColumns).toContain(column);
    }
  });

  it('does not embed one-to-many parts/services relations that could duplicate rows', () => {
    expect(embeddedTables(MAINTENANCE_LIST_COLUMNS)).toEqual([
      'branches',
      'vehicles',
      'drivers',
      'trips',
    ]);
  });
});

describe('listMaintenanceRecords — peças, serviços e custo/km', () => {
  it('returns parts and services totals from the record aggregates', async () => {
    const fake = createFakeSupabase(seed());

    const {items} = await listMaintenanceRecords(fake.client, {companyId: COMPANY_ID});
    const rec1 = items.find((item) => item.id === 'rec-1');

    expect(rec1?.partsTotal).toBe(500);
    expect(rec1?.servicesTotal).toBe(150);
  });

  it('returns the stored cost_per_km without recomputing it', async () => {
    const fake = createFakeSupabase(seed());

    const {items} = await listMaintenanceRecords(fake.client, {companyId: COMPANY_ID});
    const rec1 = items.find((item) => item.id === 'rec-1');

    expect(rec1?.costPerKm).toBe(0.0052);
    expect(rec1?.totalCost).toBe(650);
  });

  it('keeps maintenances without parts/services working with zero totals and null cost/km', async () => {
    const fake = createFakeSupabase(seed());

    const {items} = await listMaintenanceRecords(fake.client, {companyId: COMPANY_ID});
    const rec2 = items.find((item) => item.id === 'rec-2');
    const rec3 = items.find((item) => item.id === 'rec-3');

    expect(rec2).toMatchObject({partsTotal: 0, servicesTotal: 0, costPerKm: 0, totalCost: 400});
    expect(rec3).toMatchObject({partsTotal: 0, servicesTotal: 0, costPerKm: null, totalCost: 0});
    for (const item of items) {
      expect(Number.isFinite(item.partsTotal)).toBe(true);
      expect(Number.isFinite(item.servicesTotal)).toBe(true);
      expect(item.costPerKm === null || Number.isFinite(item.costPerKm)).toBe(true);
    }
  });

  it('excludes soft-deleted parts and services from the totals', async () => {
    const fake = createFakeSupabase(seed());

    const {items} = await listMaintenanceRecords(fake.client, {companyId: COMPANY_ID});
    const rec1 = items.find((item) => item.id === 'rec-1');

    expect(rec1?.partsTotal).toBe(300 + 200);
    expect(rec1?.servicesTotal).toBe(150);
    expect(rec1?.partsTotal).not.toBe(300 + 200 + 999);
    expect(rec1?.servicesTotal).not.toBe(150 + 777);
  });

  it('relies on the trigger that only sums non-deleted parts/services', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/051_maintenance.sql'),
      'utf8',
    );
    const body = migration.slice(
      migration.indexOf('function public.recalculate_maintenance_costs()'),
      migration.indexOf('create trigger maintenance_parts_recalculate_costs'),
    );

    expect(body).toMatch(
      /from public\.maintenance_parts\s+where maintenance_record_id = v_record_id\s+and deleted_at is null/,
    );
    expect(body).toMatch(
      /from public\.maintenance_services\s+where maintenance_record_id = v_record_id\s+and deleted_at is null/,
    );
    expect(body).toMatch(/cost_per_km = v_cost_per_km/);
  });

  it('returns one item per maintenance with a single query (no duplication, no N+1)', async () => {
    const fake = createFakeSupabase(seed());

    const result = await listMaintenanceRecords(fake.client, {companyId: COMPANY_ID});
    const ids = result.items.map((item) => item.id);

    expect(ids).toEqual(['rec-1', 'rec-2', 'rec-3']);
    expect(new Set(ids).size).toBe(ids.length);
    expect(result.total).toBe(3);
    expect(fake.fromCalls).toEqual(['maintenance_records']);
  });

  it('keeps ordering, pagination and the other list fields unchanged', async () => {
    const fake = createFakeSupabase(seed());

    const result = await listMaintenanceRecords(fake.client, {
      companyId: COMPANY_ID,
      page: 2,
      pageSize: 2,
      sort: {sortBy: 'opened_at', sortOrder: 'desc'},
    });

    expect(fake.orderCalls).toEqual([{column: 'opened_at', ascending: false}]);
    expect(fake.rangeCalls).toEqual([[2, 3]]);
    expect(result).toMatchObject({total: 3, page: 2, pageSize: 2, totalPages: 2});
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'rec-3',
      companyId: COMPANY_ID,
      vehicleId: VEHICLE_ID,
      maintenanceType: 'corrective',
      maintenanceStatus: 'completed',
      supplier: 'Oficina',
      openedAt: '2026-03-01T10:00:00.000Z',
      description: 'Serviço',
      totalCost: 0,
      paymentType: 'cash',
      installmentCount: 1,
      installmentIntervalDays: 30,
      status: 'active',
    });
  });
});
