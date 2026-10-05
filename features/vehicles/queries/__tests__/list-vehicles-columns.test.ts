import {describe, expect, it, vi} from 'vitest';

import {VEHICLE_DETAIL_COLUMNS, VEHICLE_LIST_COLUMNS} from '../../constants';
import type {VehicleRow} from '../../types';
import {listVehicles} from '../vehicles';

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
  return columns.map((column) => column.split(/[:\s(]/)[0]).filter(Boolean);
}

/** Simula o PostgREST: só devolve as colunas presentes no SELECT. */
function createVehiclesQueryMock(dbRows: VehicleRow[]) {
  const calls = {
    select: [] as Array<{columns: string; opts?: {count?: string}}>,
    eq: [] as Array<[string, unknown]>,
    is: [] as Array<[string, unknown]>,
    ilike: [] as Array<[string, unknown]>,
    or: [] as string[],
    order: [] as Array<{column: string; ascending?: boolean}>,
    range: [] as Array<[number, number]>,
  };
  let selected: string[] = [];

  const builder: Record<string, unknown> = {};
  const self = () => builder;
  builder.select = vi.fn((columns: string, opts?: {count?: string}) => {
    calls.select.push({columns, opts});
    selected = topLevelColumns(columns);
    return self();
  });
  builder.eq = vi.fn((column: string, value: unknown) => {
    calls.eq.push([column, value]);
    return self();
  });
  builder.is = vi.fn((column: string, value: unknown) => {
    calls.is.push([column, value]);
    return self();
  });
  builder.ilike = vi.fn((column: string, value: unknown) => {
    calls.ilike.push([column, value]);
    return self();
  });
  builder.or = vi.fn((filter: string) => {
    calls.or.push(filter);
    return self();
  });
  builder.order = vi.fn((column: string, opts?: {ascending?: boolean}) => {
    calls.order.push({column, ascending: opts?.ascending});
    return self();
  });
  builder.range = vi.fn(async (from: number, to: number) => {
    calls.range.push([from, to]);
    const data = dbRows.slice(from, to + 1).map((row) =>
      Object.fromEntries(
        selected.map((column) => [column, row[column as keyof VehicleRow]]),
      ),
    );
    return {data, error: null, count: dbRows.length};
  });

  return {
    calls,
    supabase: {from: vi.fn(() => builder)},
  };
}

function makeDbRow(overrides: Partial<VehicleRow> = {}): VehicleRow {
  return {
    id: 'vehicle-1',
    company_id: 'company-1',
    branch_id: 'branch-1',
    plate: 'ABC1D23',
    fleet_number: 'F-001',
    vehicle_type: 'Cavalo',
    body_type: null,
    brand: 'VOLVO',
    model: 'FH 540',
    year: 2022,
    renavam: '12345678901',
    chassis: '9BWZZZ377VT004251',
    color: 'BRANCO',
    fuel_type: null,
    load_capacity_kg: 30000,
    gross_weight_kg: 45000,
    tare_kg: 9000,
    axles: 3,
    initial_odometer_km: 125000.5,
    current_odometer_km: 180250,
    hour_meter: null,
    asset_status: 'active',
    photo_url: null,
    crlv_url: null,
    photo_storage_path: null,
    crlv_storage_path: null,
    external_id: null,
    integration_source: null,
    metadata: {},
    status: 'active',
    notes: 'OBS',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-02-01T00:00:00.000Z',
    deleted_at: null,
    created_by: null,
    updated_by: null,
    branches: {id: 'branch-1', name: 'Matriz', code: 'MTZ'},
    ...overrides,
  };
}

describe('VEHICLE_LIST_COLUMNS', () => {
  it('selects fleet_number and initial_odometer_km like the detail query', () => {
    const listColumns = topLevelColumns(VEHICLE_LIST_COLUMNS);
    const detailColumns = topLevelColumns(VEHICLE_DETAIL_COLUMNS);

    for (const column of ['fleet_number', 'initial_odometer_km']) {
      expect(listColumns).toContain(column);
      expect(detailColumns).toContain(column);
    }
  });
});

describe('listVehicles', () => {
  it('returns fleetNumber and a finite initialOdometerKm for each item', async () => {
    const {supabase} = createVehiclesQueryMock([
      makeDbRow(),
      makeDbRow({id: 'vehicle-2', fleet_number: null, initial_odometer_km: 0}),
    ]);

    const result = await listVehicles(supabase as never, {companyId: 'company-1'});

    expect(result.items[0].fleetNumber).toBe('F-001');
    expect(result.items[0].initialOdometerKm).toBe(125000.5);
    expect(result.items[1].fleetNumber).toBeNull();
    expect(result.items[1].initialOdometerKm).toBe(0);
    for (const item of result.items) {
      expect(Number.isFinite(item.initialOdometerKm)).toBe(true);
    }
  });

  it('gives the edit form a valid initial odometer instead of "NaN"', async () => {
    const {supabase} = createVehiclesQueryMock([makeDbRow()]);

    const {items} = await listVehicles(supabase as never, {companyId: 'company-1'});
    const editingVehicle = items[0];

    expect(String(editingVehicle.initialOdometerKm ?? 0)).toBe('125000.5');
  });

  it('keeps the other list fields, filters, ordering and pagination unchanged', async () => {
    const rows = Array.from({length: 12}, (_, index) =>
      makeDbRow({id: `vehicle-${index + 1}`, plate: `ABC1D${String(index).padStart(2, '0')}`}),
    );
    const {calls, supabase} = createVehiclesQueryMock(rows);

    const result = await listVehicles(supabase as never, {
      companyId: 'company-1',
      search: 'volvo',
      page: 2,
      pageSize: 10,
      filters: {branchId: 'branch-1', brand: 'VOLVO'},
      sort: {sortBy: 'brand', sortOrder: 'desc'},
    });

    expect(calls.select).toEqual([{columns: VEHICLE_LIST_COLUMNS, opts: {count: 'exact'}}]);
    expect(calls.eq).toEqual([
      ['company_id', 'company-1'],
      ['branch_id', 'branch-1'],
    ]);
    expect(calls.is).toEqual([['deleted_at', null]]);
    expect(calls.ilike).toEqual([['brand', '%VOLVO%']]);
    expect(calls.or).toEqual([
      'plate.ilike.%volvo%,brand.ilike.%volvo%,model.ilike.%volvo%',
    ]);
    expect(calls.order).toEqual([{column: 'brand', ascending: false}]);
    expect(calls.range).toEqual([[10, 19]]);

    expect(result).toMatchObject({total: 12, page: 2, pageSize: 10, totalPages: 2});
    expect(result.items.map((item) => item.id)).toEqual(['vehicle-11', 'vehicle-12']);
    expect(result.items[0]).toMatchObject({
      id: 'vehicle-11',
      companyId: 'company-1',
      branchId: 'branch-1',
      branchName: 'Matriz',
      plate: 'ABC1D10',
      vehicleType: 'Cavalo',
      bodyType: null,
      brand: 'VOLVO',
      model: 'FH 540',
      year: 2022,
      currentOdometerKm: 180250,
      assetStatus: 'active',
      photoUrl: null,
      status: 'active',
      notes: 'OBS',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    });
  });
});
