import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {beforeEach, describe, expect, it, vi} from 'vitest';

type Row = Record<string, unknown>;

const auth = vi.hoisted(() => ({
  client: null as unknown,
  allowed: true,
}));

vi.mock('@/lib/auth/company', () => ({
  COMPANY_ACCESS_DENIED: 'Acesso negado.',
  getServerSupabaseClient: async () => auth.client,
  getCurrentCompanyId: async () => 'company-a',
  getUserCompanyMembership: async () => ({profileId: 'profile-1'}),
  assertCompanyPermission: async () => auth.allowed,
}));

vi.mock('next/cache', () => ({revalidatePath: vi.fn()}));

const {getVehicleForEditAction, updateVehicleAction} = await import(
  '../actions/vehicle-actions'
);
const {VEHICLE_DETAIL_COLUMNS, VEHICLE_LIST_COLUMNS} = await import('../constants');
const {createVehicle, getVehicleById, listVehicles} = await import('../queries/vehicles');
const {createVehicleSchema} = await import('../validation');
const {
  buildVehicleFormPayload,
  buildVehicleFormState,
  getMissingVehicleFormFields,
} = await import('../utils/vehicle-form-state');

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
  return columns.map((column) => column.split(/[:\s(]/)[0]).filter(Boolean);
}

/**
 * Fake PostgREST: projeta só as colunas do SELECT, aplica eq/is e grava o
 * payload serializado em JSON (como o supabase-js, chaves `undefined` somem).
 */
function createFakeSupabase(tables: Record<string, Row[]>) {
  const selects: Array<{table: string; columns: string}> = [];
  let seq = 0;

  function from(table: string) {
    const filters: Array<[string, unknown]> = [];
    let selected: string[] | null = null;
    let mutation: {op: 'insert' | 'update'; payload: Row} | null = null;

    const project = (row: Row) =>
      selected
        ? Object.fromEntries(selected.map((column) => [column, row[column] ?? null]))
        : {...row};

    function execute(): Row[] {
      const payload = mutation ? (JSON.parse(JSON.stringify(mutation.payload)) as Row) : null;
      if (mutation?.op === 'insert' && payload) {
        const row = {id: `new-${++seq}`, deleted_at: null, ...payload};
        (tables[table] ??= []).push(row);
        return [project(row)];
      }
      const rows = (tables[table] ?? []).filter((row) =>
        filters.every(([column, value]) => (row[column] ?? null) === value),
      );
      if (mutation?.op === 'update' && payload) {
        for (const row of rows) Object.assign(row, payload);
      }
      return rows.map(project);
    }

    const builder: Record<string, unknown> = {};
    const self = () => builder;
    builder.select = (columns: string) => {
      selects.push({table, columns});
      selected = topLevelColumns(columns);
      return builder;
    };
    builder.insert = (payload: Row) => ((mutation = {op: 'insert', payload}), builder);
    builder.update = (payload: Row) => ((mutation = {op: 'update', payload}), builder);
    builder.eq = (column: string, value: unknown) => (filters.push([column, value]), builder);
    builder.is = (column: string, value: unknown) => (filters.push([column, value]), builder);
    builder.ilike = self;
    builder.or = self;
    builder.order = self;
    builder.range = async () => {
      const rows = execute();
      return {data: rows, error: null, count: rows.length};
    };
    builder.single = async () => {
      const rows = execute();
      return rows[0]
        ? {data: rows[0], error: null}
        : {data: null, error: {code: 'PGRST116', message: 'no rows'}};
    };
    builder.maybeSingle = async () => ({data: execute()[0] ?? null, error: null});
    return builder;
  }

  return {client: {from} as never, tables, selects};
}

function fullVehicleRow(overrides: Row = {}): Row {
  return {
    id: VEHICLE_ID,
    company_id: COMPANY_ID,
    branch_id: null,
    plate: 'ABC1D23',
    fleet_number: 'F-001',
    vehicle_type: 'Cavalo',
    body_type: null,
    brand: 'VOLVO',
    model: 'FH',
    year: 2022,
    renavam: '12345678901',
    chassis: '9BWZZZ377VT004251',
    color: 'BRANCO',
    fuel_type: 'diesel',
    load_capacity_kg: 30000,
    gross_weight_kg: 45000,
    tare_kg: 9000,
    axles: 3,
    initial_odometer_km: 100000,
    current_odometer_km: 180250,
    hour_meter: 5400,
    asset_status: 'active',
    photo_url: 'https://cdn/photo.jpg',
    crlv_url: 'https://cdn/crlv.pdf',
    photo_storage_path: 'vehicles/photo.jpg',
    crlv_storage_path: 'vehicles/crlv.pdf',
    external_id: 'EXT-1',
    integration_source: 'erp',
    metadata: {source: 'erp'},
    status: 'active',
    notes: 'OBS ORIGINAL',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-02-01T00:00:00.000Z',
    deleted_at: null,
    created_by: 'profile-0',
    updated_by: 'profile-0',
    ...overrides,
  };
}

const UNTOUCHED_COLUMNS = [
  'plate',
  'fleet_number',
  'vehicle_type',
  'brand',
  'year',
  'renavam',
  'chassis',
  'color',
  'fuel_type',
  'load_capacity_kg',
  'gross_weight_kg',
  'tare_kg',
  'axles',
  'initial_odometer_km',
  'current_odometer_km',
  'hour_meter',
  'asset_status',
  'photo_url',
  'crlv_url',
  'external_id',
  'metadata',
  'notes',
] as const;

function pick(row: Row, columns: readonly string[]) {
  return Object.fromEntries(columns.map((column) => [column, row[column]]));
}

beforeEach(() => {
  auth.allowed = true;
});

describe('Veículos — linha da listagem não serve como fonte da edição', () => {
  it('a listagem não traz os campos que o formulário regrava (origem do risco)', async () => {
    const fake = createFakeSupabase({vehicles: [fullVehicleRow()]});
    const [listRow] = (await listVehicles(fake.client, {companyId: COMPANY_ID})).items;

    expect(getMissingVehicleFormFields(listRow)).toEqual([
      'renavam',
      'chassis',
      'color',
      'fuelType',
      'loadCapacityKg',
      'grossWeightKg',
      'tareKg',
      'axles',
    ]);
  });

  it('a lista abre a edição com o registro do servidor, nunca com a linha da tabela', () => {
    const source = readFileSync(resolve(__dirname, '../components/vehicles-list.tsx'), 'utf8');
    const start = source.indexOf('async function openEdit');
    const block = source.slice(start, source.indexOf('\n  }\n', start));

    expect(block).toContain('await getVehicleForEditAction(vehicle.id)');
    expect(block).toContain('setEditingVehicle(result.data)');
    expect(block).not.toMatch(/setEditingVehicle\(vehicle\)/);
  });

  it('o formulário bloqueia o envio quando recebe um veículo incompleto', () => {
    const source = readFileSync(resolve(__dirname, '../components/vehicle-form-modal.tsx'), 'utf8');
    const submit = source.slice(source.indexOf('async function handleSubmit'));
    const guard = submit.indexOf('getMissingVehicleFormFields(vehicle).length > 0');
    const save = submit.indexOf('updateVehicleAction(vehicle.id, payload)');

    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(save);
  });
});

describe('Veículos — edição a partir da lista preserva dados', () => {
  it('altera só o campo escolhido e mantém todos os demais (lista → editar → salvar)', async () => {
    const fake = createFakeSupabase({vehicles: [fullVehicleRow()]});
    auth.client = fake.client;
    const before = {...fake.tables.vehicles[0]};

    const [listRow] = (await listVehicles(fake.client, {companyId: COMPANY_ID})).items;
    const loaded = await getVehicleForEditAction(listRow.id);
    if (!loaded.success) throw new Error(loaded.error);
    expect(getMissingVehicleFormFields(loaded.data)).toEqual([]);

    const formData = {...buildVehicleFormState(loaded.data), model: 'FH 540'};
    const result = await updateVehicleAction(
      listRow.id,
      buildVehicleFormPayload(formData, {
        isEdit: true,
        currentOdometerKm: String(loaded.data.currentOdometerKm),
      }),
    );

    expect(result.success).toBe(true);
    const after = fake.tables.vehicles[0];
    expect(after.model).toBe('FH 540');
    expect(pick(after, UNTOUCHED_COLUMNS)).toEqual(pick(before, UNTOUCHED_COLUMNS));
  });

  it('carrega o veículo com as colunas de detalhe, na empresa ativa e sem excluídos', async () => {
    const fake = createFakeSupabase({
      vehicles: [
        fullVehicleRow(),
        fullVehicleRow({id: 'vehicle-other', company_id: 'company-b'}),
        fullVehicleRow({id: 'vehicle-deleted', deleted_at: '2026-03-01T00:00:00.000Z'}),
      ],
    });
    auth.client = fake.client;

    const ok = await getVehicleForEditAction(VEHICLE_ID);
    expect(ok.success && ok.data.renavam).toBe('12345678901');
    expect(fake.selects).toEqual([{table: 'vehicles', columns: VEHICLE_DETAIL_COLUMNS}]);

    expect(await getVehicleForEditAction('vehicle-other')).toEqual({
      success: false,
      error: 'Veículo não encontrado.',
    });
    expect(await getVehicleForEditAction('vehicle-deleted')).toEqual({
      success: false,
      error: 'Veículo não encontrado.',
    });
  });

  it('sem permissão de edição não consulta nem devolve o veículo', async () => {
    const fake = createFakeSupabase({vehicles: [fullVehicleRow()]});
    auth.client = fake.client;
    auth.allowed = false;

    const result = await getVehicleForEditAction(VEHICLE_ID);

    expect(result.success).toBe(false);
    expect(fake.selects).toEqual([]);
  });

  it('a listagem continua com uma única query e o mesmo SELECT (sem N+1)', async () => {
    const fake = createFakeSupabase({
      vehicles: [fullVehicleRow(), fullVehicleRow({id: 'vehicle-2', plate: 'XYZ9A87'})],
    });

    const {items} = await listVehicles(fake.client, {companyId: COMPANY_ID});

    expect(items).toHaveLength(2);
    expect(fake.selects).toEqual([{table: 'vehicles', columns: VEHICLE_LIST_COLUMNS}]);
  });
});

describe('Veículos — limpeza explícita, detalhe e criação', () => {
  it('campo limpo explicitamente pelo usuário continua sendo gravado como null', async () => {
    const fake = createFakeSupabase({vehicles: [fullVehicleRow()]});
    auth.client = fake.client;
    const before = {...fake.tables.vehicles[0]};

    const loaded = await getVehicleForEditAction(VEHICLE_ID);
    if (!loaded.success) throw new Error(loaded.error);
    const formData = {...buildVehicleFormState(loaded.data), renavam: '', color: ''};
    await updateVehicleAction(
      VEHICLE_ID,
      buildVehicleFormPayload(formData, {
        isEdit: true,
        currentOdometerKm: String(loaded.data.currentOdometerKm),
      }),
    );

    const after = fake.tables.vehicles[0];
    expect(after.renavam).toBeNull();
    expect(after.color).toBeNull();
    const others = UNTOUCHED_COLUMNS.filter((c) => c !== 'renavam' && c !== 'color');
    expect(pick(after, others)).toEqual(pick(before, others));
  });

  it('edição pelo detalhe (getVehicleById) continua preservando os demais campos', async () => {
    const fake = createFakeSupabase({vehicles: [fullVehicleRow()]});
    auth.client = fake.client;
    const before = {...fake.tables.vehicles[0]};

    const vehicle = await getVehicleById(fake.client, COMPANY_ID, VEHICLE_ID);
    if (!vehicle) throw new Error('vehicle not found');
    const formData = {...buildVehicleFormState(vehicle), axles: '5'};
    await updateVehicleAction(
      VEHICLE_ID,
      buildVehicleFormPayload(formData, {isEdit: true, currentOdometerKm: '181000'}),
    );

    const after = fake.tables.vehicles[0];
    expect(after.axles).toBe(5);
    expect(after.current_odometer_km).toBe(181000);
    const others = UNTOUCHED_COLUMNS.filter((c) => c !== 'axles' && c !== 'current_odometer_km');
    expect(pick(after, others)).toEqual(pick(before, others));
  });

  it('criação continua gravando todos os campos do formulário', async () => {
    const fake = createFakeSupabase({vehicles: []});
    const formData = {
      ...buildVehicleFormState(null),
      plate: 'QWE-1R23',
      vehicleType: 'Truck',
      brand: 'SCANIA',
      renavam: '98765432109',
      chassis: '9BSR6X200C3812345',
      loadCapacityKg: '14000',
      axles: '3',
      initialOdometerKm: '5000',
      notes: 'NOVO',
    };
    const input = createVehicleSchema.parse(
      buildVehicleFormPayload(formData, {isEdit: false, currentOdometerKm: ''}),
    );

    const created = await createVehicle(fake.client, COMPANY_ID, input, 'profile-1');

    expect(fake.tables.vehicles[0]).toMatchObject({
      company_id: COMPANY_ID,
      plate: 'QWE1R23',
      vehicle_type: 'Truck',
      brand: 'SCANIA',
      renavam: '98765432109',
      chassis: '9BSR6X200C3812345',
      load_capacity_kg: 14000,
      axles: 3,
      initial_odometer_km: 5000,
      current_odometer_km: 5000,
      color: null,
      notes: 'NOVO',
      created_by: 'profile-1',
    });
    expect(created.plate).toBe('QWE1R23');
  });
});
