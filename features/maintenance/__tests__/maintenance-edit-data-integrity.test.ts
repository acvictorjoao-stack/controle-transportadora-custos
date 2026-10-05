import {beforeEach, describe, expect, it, vi} from 'vitest';

type Row = Record<string, unknown>;

const financialSync = vi.hoisted(() => ({records: [] as Row[]}));

vi.mock('@/features/financial/services/integration-events', () => ({
  onMaintenanceRecordCreated: vi.fn(async (_s: unknown, _c: string, record: Row) => {
    financialSync.records.push(record);
  }),
  onLinkedFinancialEntryDeleted: vi.fn(async () => {}),
}));

const {MAINTENANCE_LIST_COLUMNS} = await import('../constants');
const {
  createMaintenanceRecord,
  getMaintenanceRecordDetailRow,
  listMaintenanceRecords,
  updateMaintenanceRecord,
} = await import('../queries/maintenance-records');
const {createMaintenanceRecordSchema, updateMaintenanceRecordSchema} = await import(
  '../validation'
);
const {
  buildMaintenanceFormPayload,
  buildMaintenanceFormState,
  MAINTENANCE_FORM_SOURCE_FIELDS,
} = await import('../utils/maintenance-form-state');

const COMPANY_ID = 'company-a';
const PROFILE_ID = '22222222-2222-4222-8222-222222222222';
const RECORD_ID = 'rec-1';
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const SUPPLIER_ID = '44444444-4444-4444-8444-444444444444';
const VEHICLES = [
  {
    id: VEHICLE_ID,
    plate: 'ABC1D23',
    model: 'FH',
    vehicleType: 'Cavalo',
    bodyType: null,
    brand: 'VOLVO',
    loadCapacityKg: null,
    currentOdometerKm: 1000,
    assetStatus: 'active' as const,
    branchId: null,
  },
];

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
  const writes: Array<{op: 'insert' | 'update'; payload: Row}> = [];
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
      if (mutation && payload && table === 'maintenance_records') {
        writes.push({op: mutation.op, payload});
      }
      if (mutation?.op === 'insert' && payload) {
        const row = {id: `rec-new-${++seq}`, deleted_at: null, ...payload};
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
    builder.select = (columns: string) => ((selected = topLevelColumns(columns)), builder);
    builder.insert = (payload: Row) => ((mutation = {op: 'insert', payload}), builder);
    builder.update = (payload: Row) => ((mutation = {op: 'update', payload}), builder);
    builder.eq = (column: string, value: unknown) => (filters.push([column, value]), builder);
    builder.is = (column: string, value: unknown) => (filters.push([column, value]), builder);
    for (const method of ['ilike', 'or', 'order', 'gte', 'lte']) builder[method] = self;
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

  return {client: {from} as never, tables, writes};
}

function fullMaintenanceRow(overrides: Row = {}): Row {
  return {
    id: RECORD_ID,
    company_id: COMPANY_ID,
    branch_id: null,
    vehicle_id: VEHICLE_ID,
    driver_id: null,
    trip_id: null,
    maintenance_type: 'corrective',
    priority: 'high',
    maintenance_status: 'completed',
    supplier_id: SUPPLIER_ID,
    supplier: 'Oficina Central',
    workshop: null,
    opened_at: '2026-03-01T10:00:00.000Z',
    completed_at: '2026-03-02T10:00:00.000Z',
    odometer_km: 125000,
    hour_meter: 4200,
    downtime_hours: 24,
    description: 'Troca de embreagem',
    diagnosis: 'Disco de embreagem gasto',
    solution: 'Substituição do kit de embreagem',
    notes: 'Garantia de 6 meses',
    estimated_amount: 3200,
    final_amount: 3500,
    parts_total: 0,
    services_total: 0,
    total_cost: 3500,
    cost_per_km: 0.028,
    responsible: 'Carlos',
    payment_type: 'cash',
    payment_due_date: null,
    installment_count: 1,
    installment_interval_days: 30,
    external_id: null,
    integration_source: null,
    metadata: {},
    status: 'active',
    created_at: '2026-03-01T10:00:00.000Z',
    updated_at: '2026-03-02T10:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

const PRESERVED = ['diagnosis', 'solution', 'notes'] as const;

function pick(row: Row, columns: readonly string[]) {
  return Object.fromEntries(columns.map((column) => [column, row[column]]));
}

async function saveFromForm(
  fake: ReturnType<typeof createFakeSupabase>,
  record: Parameters<typeof buildMaintenanceFormState>[0],
  change: Partial<ReturnType<typeof buildMaintenanceFormState>>,
) {
  const formData = {...buildMaintenanceFormState(record, VEHICLES), ...change};
  const input = updateMaintenanceRecordSchema.parse(buildMaintenanceFormPayload(formData, VEHICLES));
  return updateMaintenanceRecord(fake.client, COMPANY_ID, RECORD_ID, input, PROFILE_ID);
}

beforeEach(() => {
  financialSync.records.length = 0;
});

describe('Manutenções — edição a partir da lista preserva diagnosis/solution/notes', () => {
  it('a linha da listagem não carrega diagnosis, solution e notes (origem do risco)', async () => {
    const fake = createFakeSupabase({maintenance_records: [fullMaintenanceRow()]});
    const [listRow] = (await listMaintenanceRecords(fake.client, {companyId: COMPANY_ID})).items;

    expect(listRow.diagnosis).toBeUndefined();
    expect(listRow.solution).toBeUndefined();
    expect(listRow.notes).toBeUndefined();
  });

  it('altera só a descrição e mantém diagnosis, solution e notes', async () => {
    const fake = createFakeSupabase({maintenance_records: [fullMaintenanceRow()]});
    const [listRow] = (await listMaintenanceRecords(fake.client, {companyId: COMPANY_ID})).items;

    const {record} = await saveFromForm(fake, listRow, {description: 'Troca de embreagem e volante'});

    const after = fake.tables.maintenance_records[0];
    expect(after.description).toBe('Troca de embreagem e volante');
    expect(after.diagnosis).toBe('Disco de embreagem gasto');
    expect(after.solution).toBe('Substituição do kit de embreagem');
    expect(after.notes).toBe('Garantia de 6 meses');
    expect(record).toMatchObject({
      diagnosis: 'Disco de embreagem gasto',
      solution: 'Substituição do kit de embreagem',
      notes: 'Garantia de 6 meses',
    });
  });

  it('o UPDATE vindo do formulário não contém diagnosis/solution/notes', async () => {
    const fake = createFakeSupabase({maintenance_records: [fullMaintenanceRow()]});
    const [listRow] = (await listMaintenanceRecords(fake.client, {companyId: COMPANY_ID})).items;

    await saveFromForm(fake, listRow, {finalAmount: 3600, estimatedAmount: 3600});

    const [update] = fake.writes;
    expect(update.op).toBe('update');
    for (const column of PRESERVED) expect(update.payload).not.toHaveProperty(column);
    expect(fake.tables.maintenance_records[0].final_amount).toBe(3600);
  });

  it('demais campos do formulário seguem iguais ao salvar sem alterações pela lista', async () => {
    const fake = createFakeSupabase({maintenance_records: [fullMaintenanceRow()]});
    const before = {...fake.tables.maintenance_records[0]};
    const [listRow] = (await listMaintenanceRecords(fake.client, {companyId: COMPANY_ID})).items;

    await saveFromForm(fake, listRow, {});

    const columns = [
      'vehicle_id',
      'maintenance_type',
      'priority',
      'maintenance_status',
      'supplier_id',
      'supplier',
      'opened_at',
      'completed_at',
      'odometer_km',
      'hour_meter',
      'description',
      'final_amount',
      'responsible',
      'payment_type',
      ...PRESERVED,
    ];
    expect(pick(fake.tables.maintenance_records[0], columns)).toEqual(pick(before, columns));
  });

  it('a sincronização financeira recebe as observações preservadas', async () => {
    const fake = createFakeSupabase({maintenance_records: [fullMaintenanceRow()]});
    const [listRow] = (await listMaintenanceRecords(fake.client, {companyId: COMPANY_ID})).items;

    await saveFromForm(fake, listRow, {description: 'Editado'});

    expect(financialSync.records.at(-1)).toMatchObject({notes: 'Garantia de 6 meses'});
  });

  it('a listagem traz todas as colunas que o formulário lê e regrava', () => {
    const toColumn = (field: string) => field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    const listColumns = topLevelColumns(MAINTENANCE_LIST_COLUMNS);

    for (const field of MAINTENANCE_FORM_SOURCE_FIELDS) {
      expect(listColumns).toContain(toColumn(field));
    }
  });
});

describe('Manutenções — detalhe, limpeza explícita e criação', () => {
  it('edição pelo detalhe continua preservando diagnosis/solution/notes', async () => {
    const fake = createFakeSupabase({maintenance_records: [fullMaintenanceRow()]});
    const detail = await getMaintenanceRecordDetailRow(fake.client, COMPANY_ID, RECORD_ID);
    if (!detail) throw new Error('record not found');

    await saveFromForm(fake, detail.record, {priority: 'low'});

    const after = fake.tables.maintenance_records[0];
    expect(after.priority).toBe('low');
    expect(pick(after, PRESERVED)).toEqual({
      diagnosis: 'Disco de embreagem gasto',
      solution: 'Substituição do kit de embreagem',
      notes: 'Garantia de 6 meses',
    });
  });

  it('null ou texto vazio enviados explicitamente continuam limpando o campo', async () => {
    const fake = createFakeSupabase({maintenance_records: [fullMaintenanceRow()]});
    const detail = await getMaintenanceRecordDetailRow(fake.client, COMPANY_ID, RECORD_ID);
    if (!detail) throw new Error('record not found');

    const input = updateMaintenanceRecordSchema.parse({
      ...buildMaintenanceFormPayload(buildMaintenanceFormState(detail.record, VEHICLES), VEHICLES),
      diagnosis: null,
      solution: '   ',
    });
    await updateMaintenanceRecord(fake.client, COMPANY_ID, RECORD_ID, input, PROFILE_ID);

    const after = fake.tables.maintenance_records[0];
    expect(after.diagnosis).toBeNull();
    expect(after.solution).toBeNull();
    expect(after.notes).toBe('Garantia de 6 meses');
  });

  it('valor novo enviado explicitamente é gravado', async () => {
    const fake = createFakeSupabase({maintenance_records: [fullMaintenanceRow()]});
    const detail = await getMaintenanceRecordDetailRow(fake.client, COMPANY_ID, RECORD_ID);
    if (!detail) throw new Error('record not found');

    const input = updateMaintenanceRecordSchema.parse({
      ...buildMaintenanceFormPayload(buildMaintenanceFormState(detail.record, VEHICLES), VEHICLES),
      notes: '  Revisar em 30 dias  ',
    });
    await updateMaintenanceRecord(fake.client, COMPANY_ID, RECORD_ID, input, PROFILE_ID);

    expect(fake.tables.maintenance_records[0].notes).toBe('Revisar em 30 dias');
    expect(fake.tables.maintenance_records[0].diagnosis).toBe('Disco de embreagem gasto');
  });

  it('criação pelo formulário grava diagnosis/solution/notes como null', async () => {
    const fake = createFakeSupabase({maintenance_records: []});
    const formData = {
      ...buildMaintenanceFormState(null, VEHICLES),
      supplierId: SUPPLIER_ID,
      supplier: 'Oficina Central',
      description: 'Revisão preventiva',
      finalAmount: 800,
      estimatedAmount: 800,
    };
    const input = createMaintenanceRecordSchema.parse(buildMaintenanceFormPayload(formData, VEHICLES));

    const {record} = await createMaintenanceRecord(fake.client, COMPANY_ID, input, PROFILE_ID);

    const [insert] = fake.writes;
    expect(insert.op).toBe('insert');
    expect(pick(insert.payload, PRESERVED)).toEqual({diagnosis: null, solution: null, notes: null});
    expect(fake.tables.maintenance_records[0]).toMatchObject({
      company_id: COMPANY_ID,
      vehicle_id: VEHICLE_ID,
      supplier_id: SUPPLIER_ID,
      description: 'Revisão preventiva',
      final_amount: 800,
      created_by: PROFILE_ID,
    });
    expect(record.description).toBe('Revisão preventiva');
  });

  it('criação via API com diagnosis/solution/notes informados grava os valores', async () => {
    const fake = createFakeSupabase({maintenance_records: []});
    const input = createMaintenanceRecordSchema.parse({
      ...buildMaintenanceFormPayload(
        {
          ...buildMaintenanceFormState(null, VEHICLES),
          supplierId: SUPPLIER_ID,
          supplier: 'Oficina Central',
        },
        VEHICLES,
      ),
      diagnosis: 'Ruído no freio',
      solution: 'Troca de pastilhas',
      notes: '',
    });

    await createMaintenanceRecord(fake.client, COMPANY_ID, input, PROFILE_ID);

    expect(pick(fake.tables.maintenance_records[0], PRESERVED)).toEqual({
      diagnosis: 'Ruído no freio',
      solution: 'Troca de pastilhas',
      notes: null,
    });
  });
});
