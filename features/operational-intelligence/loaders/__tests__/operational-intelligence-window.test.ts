import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import type {OperationalIntelligenceData} from '../../types';
import {getOperationalIntelligenceData} from '../operational-intelligence-loader';

/**
 * Audit #21 — janela temporal única da Inteligência Operacional.
 *
 * Fake PostgREST em memória: avalia de fato eq/is/gte/gt/lt/lte/in/or,
 * ordenação, `.limit()` e o teto `max_rows` (1000) por resposta, para que
 * o teste valide o dataset que chega ao compose — não a forma das chamadas.
 */

type Row = Record<string, unknown>;
type Predicate = (row: Row) => boolean;

const POSTGREST_MAX_ROWS = 1000;
const COMPANY = 'company-1';
const OTHER_COMPANY = 'company-2';

interface QueryLog {
  table: string;
  filters: string[];
  range: [number, number] | null;
}

function compareValues(column: string, left: unknown, right: unknown): number | null {
  if (left == null || right == null) return null;
  if (column.endsWith('_at')) {
    const l = Date.parse(String(left));
    const r = Date.parse(String(right));
    if (!Number.isFinite(l) || !Number.isFinite(r)) return null;
    return l - r;
  }
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}

function unquote(value: string): string {
  return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
}

function splitTopLevel(expr: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quoted = false;
  let current = '';
  for (const char of expr) {
    if (char === '"') quoted = !quoted;
    if (!quoted && char === '(') depth += 1;
    if (!quoted && char === ')') depth -= 1;
    if (!quoted && depth === 0 && char === ',') {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current) parts.push(current);
  return parts;
}

function parseCondition(expr: string): Predicate {
  if (expr.startsWith('and(') && expr.endsWith(')')) {
    const inner = splitTopLevel(expr.slice(4, -1)).map(parseCondition);
    return (row) => inner.every((p) => p(row));
  }
  if (expr.startsWith('or(') && expr.endsWith(')')) {
    const inner = splitTopLevel(expr.slice(3, -1)).map(parseCondition);
    return (row) => inner.some((p) => p(row));
  }
  const first = expr.indexOf('.');
  const second = expr.indexOf('.', first + 1);
  const column = expr.slice(0, first);
  const op = expr.slice(first + 1, second);
  const raw = expr.slice(second + 1);
  if (op === 'in') {
    const values = raw.replace(/^\(|\)$/g, '').split(',').map(unquote);
    return (row) => values.includes(String(row[column]));
  }
  const value = unquote(raw);
  return buildPredicate(column, op, value === 'null' ? null : value);
}

function buildPredicate(column: string, op: string, value: unknown): Predicate {
  return (row) => {
    const cell = row[column];
    switch (op) {
      case 'eq':
        return cell === value;
      case 'neq':
        return cell !== value;
      case 'is':
        return value === null ? cell == null : cell === value;
      case 'gte': {
        const c = compareValues(column, cell, value);
        return c != null && c >= 0;
      }
      case 'gt': {
        const c = compareValues(column, cell, value);
        return c != null && c > 0;
      }
      case 'lte': {
        const c = compareValues(column, cell, value);
        return c != null && c <= 0;
      }
      case 'lt': {
        const c = compareValues(column, cell, value);
        return c != null && c < 0;
      }
      default:
        throw new Error(`fake postgrest: operador não suportado ${op}`);
    }
  };
}

function createFakeSupabase(tables: Record<string, Row[]>) {
  const log: QueryLog[] = [];

  function from(table: string) {
    const predicates: Predicate[] = [];
    const orders: Array<{column: string; ascending: boolean; nullsFirst: boolean}> = [];
    const entry: QueryLog = {table, filters: [], range: null};
    let withCount = false;
    let limit: number | null = null;
    log.push(entry);

    const execute = (range: [number, number] | null) => {
      entry.range = range;
      const matched = (tables[table] ?? []).filter((row) =>
        predicates.every((p) => p(row)),
      );
      matched.sort((a, b) => {
        for (const order of orders) {
          const av = a[order.column];
          const bv = b[order.column];
          if (av == null && bv == null) continue;
          if (av == null) return order.nullsFirst ? -1 : 1;
          if (bv == null) return order.nullsFirst ? 1 : -1;
          const c = compareValues(order.column, av, bv) ?? 0;
          if (c !== 0) return order.ascending ? c : -c;
        }
        return 0;
      });
      let page = matched;
      if (range) page = page.slice(range[0], range[1] + 1);
      if (limit != null) page = page.slice(0, limit);
      page = page.slice(0, POSTGREST_MAX_ROWS);
      return {
        data: page,
        error: null,
        count: withCount ? matched.length : null,
      };
    };

    const builder = {
      select(_columns?: string, options?: {count?: string}) {
        withCount = options?.count === 'exact';
        return builder;
      },
      eq(column: string, value: unknown) {
        entry.filters.push(`${column}.eq.${String(value)}`);
        predicates.push(buildPredicate(column, 'eq', value));
        return builder;
      },
      neq(column: string, value: unknown) {
        entry.filters.push(`${column}.neq.${String(value)}`);
        predicates.push(buildPredicate(column, 'neq', value));
        return builder;
      },
      is(column: string, value: unknown) {
        entry.filters.push(`${column}.is.${String(value)}`);
        predicates.push(buildPredicate(column, 'is', value));
        return builder;
      },
      gte(column: string, value: unknown) {
        entry.filters.push(`${column}.gte.${String(value)}`);
        predicates.push(buildPredicate(column, 'gte', value));
        return builder;
      },
      gt(column: string, value: unknown) {
        entry.filters.push(`${column}.gt.${String(value)}`);
        predicates.push(buildPredicate(column, 'gt', value));
        return builder;
      },
      lte(column: string, value: unknown) {
        entry.filters.push(`${column}.lte.${String(value)}`);
        predicates.push(buildPredicate(column, 'lte', value));
        return builder;
      },
      lt(column: string, value: unknown) {
        entry.filters.push(`${column}.lt.${String(value)}`);
        predicates.push(buildPredicate(column, 'lt', value));
        return builder;
      },
      in(column: string, values: unknown[]) {
        entry.filters.push(`${column}.in.(${values.length})`);
        const set = new Set(values.map(String));
        predicates.push((row) => set.has(String(row[column])));
        return builder;
      },
      or(expr: string) {
        entry.filters.push(`or(${expr})`);
        predicates.push(parseCondition(`or(${expr})`));
        return builder;
      },
      order(column: string, options?: {ascending?: boolean; nullsFirst?: boolean}) {
        const ascending = options?.ascending ?? true;
        orders.push({
          column,
          ascending,
          nullsFirst: options?.nullsFirst ?? !ascending,
        });
        return builder;
      },
      limit(value: number) {
        limit = value;
        return builder;
      },
      range(fromIndex: number, toIndex: number) {
        return Promise.resolve(execute([fromIndex, toIndex]));
      },
      then<T>(resolve: (value: ReturnType<typeof execute>) => T) {
        return Promise.resolve(resolve(execute(null)));
      },
    };
    return builder;
  }

  return {supabase: {from} as never, log};
}

function tripRow(id: string, overrides: Row = {}): Row {
  return {
    id,
    company_id: COMPANY,
    branch_id: 'b1',
    trip_number: id.toUpperCase(),
    trip_status: 'completed',
    driver_id: null,
    vehicle_id: null,
    client_name: 'Cliente',
    contract_reference: null,
    customer_id: 'cu1',
    customer_contract_id: null,
    freight_table: null,
    contracted_freight_value: null,
    actual_freight_value: null,
    freight_margin: null,
    origin: 'A',
    destination: 'B',
    route: 'Rota',
    route_id: 'r1',
    planned_distance_km: null,
    planned_departure_at: null,
    lead_time_minutes: null,
    unload_time_minutes: null,
    planned_arrival_at: null,
    planned_completion_at: null,
    departed_at: null,
    arrived_at: null,
    started_at: null,
    completed_at: null,
    cancelled_at: null,
    cancellation_notes: null,
    initial_odometer_km: null,
    final_odometer_km: null,
    initial_hour_meter: null,
    final_hour_meter: null,
    responsible: null,
    status: 'active',
    created_at: '2026-01-01T12:00:00.000Z',
    updated_at: '2026-01-01T12:00:00.000Z',
    deleted_at: null,
    branches: {id: 'b1', name: 'Matriz', code: 'MTZ'},
    drivers: null,
    vehicles: null,
    customers: null,
    routes: null,
    ...overrides,
  };
}

function occurrenceRow(id: string, tripId: string, occurredAt: string, overrides: Row = {}): Row {
  return {
    id,
    company_id: COMPANY,
    branch_id: 'b1',
    trip_id: tripId,
    occurrence_type: 'delay',
    description: null,
    occurred_at: occurredAt,
    created_at: occurredAt,
    deleted_at: null,
    ...overrides,
  };
}

function tripIdsOf(data: OperationalIntelligenceData): string[] {
  return data.drillDown
    .flatMap((branch) => branch.customers)
    .flatMap((customer) => customer.routes)
    .flatMap((route) => route.trips)
    .map((trip) => trip.id)
    .sort();
}

function occurrenceIdsOf(data: OperationalIntelligenceData): string[] {
  return data.drillDown
    .flatMap((branch) => branch.customers)
    .flatMap((customer) => customer.routes)
    .flatMap((route) => route.trips)
    .flatMap((trip) => trip.occurrences)
    .map((occurrence) => occurrence.id)
    .sort();
}

function occurrenceTotal(data: OperationalIntelligenceData): number {
  return data.charts.occurrencesByReason.reduce((sum, point) => sum + point.value, 0);
}

/** 2026-10-05 10:00 em America/Sao_Paulo. */
const NOW = new Date('2026-10-05T13:00:00.000Z');
/** Visão ao vivo: [2026-09-22, 2026-10-05] civil → [09-22T03:00Z, 10-06T03:00Z). */
const LIVE_START = '2026-09-22T03:00:00.000Z';
const LIVE_END_EXCLUSIVE = '2026-10-06T03:00:00.000Z';

const JULY = {dateFrom: '2026-07-01', dateTo: '2026-07-31'};
/** 2026-07-01 00:00 em America/Sao_Paulo. */
const JULY_START = '2026-07-01T03:00:00.000Z';
/** 2026-08-01 00:00 em America/Sao_Paulo (exclusivo). */
const JULY_END_EXCLUSIVE = '2026-08-01T03:00:00.000Z';

function justBefore(iso: string): string {
  return new Date(Date.parse(iso) - 1).toISOString();
}

describe('Audit #21 — janela temporal única da Inteligência Operacional', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('visão ao vivo (sem período)', () => {
    it('trips e ocorrências usam a mesma janela — created_at recente não traz viagem antiga', async () => {
      const {supabase} = createFakeSupabase({
        trips: [
          tripRow('t-in', {
            departed_at: '2026-10-01T12:00:00.000Z',
            completed_at: '2026-10-01T18:00:00.000Z',
            created_at: '2026-09-30T12:00:00.000Z',
          }),
          // Cadastrada ontem, mas operou em agosto: fora da janela analítica.
          tripRow('t-old', {
            departed_at: '2026-08-01T12:00:00.000Z',
            completed_at: '2026-08-01T18:00:00.000Z',
            created_at: '2026-10-04T12:00:00.000Z',
          }),
        ],
        trip_occurrences: [
          occurrenceRow('o-in', 't-in', '2026-10-01T14:00:00.000Z'),
          // Ocorrência recente de viagem fora do dataset: não pode ser correlacionada.
          occurrenceRow('o-orphan', 't-old', '2026-10-02T14:00:00.000Z'),
        ],
      });

      const data = await getOperationalIntelligenceData(supabase, COMPANY, {});

      expect(tripIdsOf(data)).toEqual(['t-in']);
      expect(occurrenceIdsOf(data)).toEqual(['o-in']);
      expect(occurrenceTotal(data)).toBe(1);
      expect(data.kpis.openOccurrences).toBe(1);
    });

    it('trip fora da janela não entra; trip dentro da janela entra', async () => {
      const {supabase} = createFakeSupabase({
        trips: [
          tripRow('t-start', {departed_at: LIVE_START, completed_at: LIVE_START}),
          tripRow('t-before', {
            departed_at: justBefore(LIVE_START),
            completed_at: '2026-09-23T12:00:00.000Z',
            created_at: '2026-10-05T09:00:00.000Z',
          }),
        ],
        trip_occurrences: [],
      });

      const data = await getOperationalIntelligenceData(supabase, COMPANY, {});

      expect(tripIdsOf(data)).toEqual(['t-start']);
    });

    it('ocorrência fora da janela não entra; ocorrência dentro da janela entra', async () => {
      const {supabase} = createFakeSupabase({
        trips: [tripRow('t1', {departed_at: '2026-10-01T12:00:00.000Z'})],
        trip_occurrences: [
          occurrenceRow('o-start', 't1', LIVE_START),
          // 2026-09-21 23:59:59.999 em America/Sao_Paulo.
          occurrenceRow('o-before', 't1', justBefore(LIVE_START)),
          occurrenceRow('o-end-out', 't1', LIVE_END_EXCLUSIVE),
        ],
      });

      const data = await getOperationalIntelligenceData(supabase, COMPANY, {});

      expect(occurrenceIdsOf(data)).toEqual(['o-start']);
      expect(occurrenceTotal(data)).toBe(1);
    });

    it('regressão: operação em aberto continua visível (atraso, pendências)', async () => {
      const {supabase} = createFakeSupabase({
        trips: [
          // Em trânsito há 30 dias: estado atual da operação, não histórico.
          tripRow('t-stuck', {
            trip_status: 'in_progress',
            departed_at: '2026-09-05T12:00:00.000Z',
            planned_arrival_at: '2026-09-06T12:00:00.000Z',
          }),
          tripRow('t-planned', {trip_status: 'planned'}),
          // Encerrada fora da janela: não volta para a visão ao vivo.
          tripRow('t-closed-old', {
            trip_status: 'completed',
            departed_at: '2026-09-05T12:00:00.000Z',
            completed_at: '2026-09-06T12:00:00.000Z',
          }),
        ],
        trip_occurrences: [
          occurrenceRow('o-stuck-now', 't-stuck', '2026-10-04T12:00:00.000Z'),
          occurrenceRow('o-stuck-old', 't-stuck', '2026-09-06T12:00:00.000Z'),
        ],
      });

      const data = await getOperationalIntelligenceData(supabase, COMPANY, {});

      expect(tripIdsOf(data)).toEqual(['t-planned', 't-stuck']);
      expect(data.kpis.tripsInProgress).toBe(1);
      expect(data.kpis.tripsDelayed).toBe(1);
      expect(data.kpis.pendingDeliveries).toBe(2);
      expect(data.kpis.openOccurrences).toBe(1);
      expect(data.alerts.some((alert) => alert.id === 'trips-delayed')).toBe(true);
      expect(data.hasExplicitPeriod).toBe(false);
    });
  });

  describe('período explícito (de/ate)', () => {
    it('data inicial: início do dia civil entra; instante anterior não (timezone de negócio)', async () => {
      const {supabase} = createFakeSupabase({
        trips: [
          tripRow('t-start', {departed_at: JULY_START}),
          // 2026-06-30 23:59:59.999 em America/Sao_Paulo (já é 07-01 em UTC).
          tripRow('t-before', {departed_at: justBefore(JULY_START)}),
        ],
        trip_occurrences: [
          occurrenceRow('o-start', 't-start', JULY_START),
          occurrenceRow('o-before', 't-start', justBefore(JULY_START)),
        ],
      });

      const data = await getOperationalIntelligenceData(supabase, COMPANY, JULY);

      expect(tripIdsOf(data)).toEqual(['t-start']);
      expect(occurrenceIdsOf(data)).toEqual(['o-start']);
    });

    it('data final: último instante do dia civil entra; início do dia seguinte não', async () => {
      const lastInstant = justBefore(JULY_END_EXCLUSIVE);
      const {supabase} = createFakeSupabase({
        trips: [
          // 2026-07-31 23:59:59.999 em America/Sao_Paulo (já é 08-01 em UTC).
          tripRow('t-last', {
            departed_at: lastInstant,
            completed_at: lastInstant,
          }),
          tripRow('t-after', {departed_at: JULY_END_EXCLUSIVE}),
        ],
        trip_occurrences: [
          occurrenceRow('o-last', 't-last', lastInstant),
          occurrenceRow('o-after', 't-last', JULY_END_EXCLUSIVE),
        ],
      });

      const data = await getOperationalIntelligenceData(supabase, COMPANY, JULY);

      expect(tripIdsOf(data)).toEqual(['t-last']);
      expect(occurrenceIdsOf(data)).toEqual(['o-last']);
      expect(data.kpis.tripsCompletedToday).toBe(1);
    });

    it('limite: período com mais de 1000 viagens/ocorrências não perde dados', async () => {
      const total = 1250;
      const trips: Row[] = [];
      const occurrences: Row[] = [];
      for (let i = 0; i < total; i += 1) {
        const id = `t-${String(i).padStart(4, '0')}`;
        const departedAt = new Date(
          Date.parse(JULY_START) + (i % 30) * 86_400_000 + 3_600_000,
        ).toISOString();
        trips.push(tripRow(id, {departed_at: departedAt}));
        occurrences.push(occurrenceRow(`o-${id}`, id, departedAt));
      }
      const {supabase, log} = createFakeSupabase({
        trips,
        trip_occurrences: occurrences,
      });

      const data = await getOperationalIntelligenceData(supabase, COMPANY, JULY);

      expect(tripIdsOf(data)).toHaveLength(total);
      expect(occurrenceTotal(data)).toBe(total);

      // Performance: toda consulta é paginada (≤ max_rows) e limitada pela janela.
      for (const query of log) {
        expect(query.range).not.toBeNull();
        const [from, to] = query.range!;
        expect(to - from + 1).toBeLessThanOrEqual(POSTGREST_MAX_ROWS);
        const dateColumn = query.table === 'trips' ? 'departed_at' : 'occurred_at';
        expect(query.filters).toContain(`${dateColumn}.gte.${JULY_START}`);
        expect(query.filters).toContain(`${dateColumn}.lt.${JULY_END_EXCLUSIVE}`);
      }
    });

    it('empresa: dados de outra company_id não entram', async () => {
      const {supabase} = createFakeSupabase({
        trips: [
          tripRow('t-mine', {departed_at: '2026-07-10T12:00:00.000Z'}),
          tripRow('t-other', {
            company_id: OTHER_COMPANY,
            departed_at: '2026-07-10T12:00:00.000Z',
          }),
        ],
        trip_occurrences: [
          occurrenceRow('o-mine', 't-mine', '2026-07-10T13:00:00.000Z'),
          occurrenceRow('o-other', 't-other', '2026-07-10T13:00:00.000Z', {
            company_id: OTHER_COMPANY,
          }),
          // Mesmo trip_id, outra empresa.
          occurrenceRow('o-other-same-trip', 't-mine', '2026-07-10T13:00:00.000Z', {
            company_id: OTHER_COMPANY,
          }),
        ],
      });

      const data = await getOperationalIntelligenceData(supabase, COMPANY, JULY);

      expect(tripIdsOf(data)).toEqual(['t-mine']);
      expect(occurrenceIdsOf(data)).toEqual(['o-mine']);
      expect(occurrenceTotal(data)).toBe(1);
    });

    it('filial: respeita branch_id em viagens e ocorrências', async () => {
      const {supabase} = createFakeSupabase({
        trips: [
          tripRow('t-b1', {departed_at: '2026-07-10T12:00:00.000Z'}),
          tripRow('t-b2', {
            branch_id: 'b2',
            branches: {id: 'b2', name: 'Filial 2', code: 'F2'},
            departed_at: '2026-07-10T12:00:00.000Z',
          }),
        ],
        trip_occurrences: [
          occurrenceRow('o-b1', 't-b1', '2026-07-10T13:00:00.000Z'),
          occurrenceRow('o-b2', 't-b2', '2026-07-10T13:00:00.000Z', {branch_id: 'b2'}),
        ],
      });

      const data = await getOperationalIntelligenceData(supabase, COMPANY, {
        ...JULY,
        branchId: 'b1',
      });

      expect(tripIdsOf(data)).toEqual(['t-b1']);
      expect(occurrenceTotal(data)).toBe(1);
      expect(data.branchRanking.map((row) => row.id)).toEqual(['b1']);
    });

    it('soft-delete: viagens e ocorrências excluídas não entram', async () => {
      const {supabase} = createFakeSupabase({
        trips: [
          tripRow('t-live', {departed_at: '2026-07-10T12:00:00.000Z'}),
          tripRow('t-deleted', {
            departed_at: '2026-07-10T12:00:00.000Z',
            deleted_at: '2026-07-11T12:00:00.000Z',
          }),
        ],
        trip_occurrences: [
          occurrenceRow('o-live', 't-live', '2026-07-10T13:00:00.000Z'),
          occurrenceRow('o-deleted', 't-live', '2026-07-10T14:00:00.000Z', {
            deleted_at: '2026-07-11T12:00:00.000Z',
          }),
          // Ocorrência ativa de viagem excluída.
          occurrenceRow('o-on-deleted-trip', 't-deleted', '2026-07-10T13:00:00.000Z'),
        ],
      });

      const data = await getOperationalIntelligenceData(supabase, COMPANY, JULY);

      expect(tripIdsOf(data)).toEqual(['t-live']);
      expect(occurrenceIdsOf(data)).toEqual(['o-live']);
      expect(occurrenceTotal(data)).toBe(1);
    });

    it('soft-delete na visão ao vivo: ocorrência de viagem excluída não entra', async () => {
      const {supabase} = createFakeSupabase({
        trips: [
          tripRow('t-deleted', {
            departed_at: '2026-10-01T12:00:00.000Z',
            deleted_at: '2026-10-02T12:00:00.000Z',
          }),
        ],
        trip_occurrences: [
          occurrenceRow('o-on-deleted-trip', 't-deleted', '2026-10-01T13:00:00.000Z'),
        ],
      });

      const data = await getOperationalIntelligenceData(supabase, COMPANY, {});

      expect(tripIdsOf(data)).toEqual([]);
      expect(occurrenceTotal(data)).toBe(0);
      expect(data.kpis.openOccurrences).toBe(0);
    });
  });
});
