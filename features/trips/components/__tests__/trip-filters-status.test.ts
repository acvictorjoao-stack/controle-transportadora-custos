import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {scheduleQueryUrlSync} from '@/lib/navigation/sync-query-url';

import {SIMPLE_TRIP_STATUSES, TRIP_STATUSES} from '../../constants/enums';
import {listTrips} from '../../queries/trips';
import type {TripStatus} from '../../types';
import {TRIP_STATUS_LABELS} from '../../types';
import {canCancelTrip, canCompleteTrip, canStartTrip} from '../../utils/trip-lifecycle';
import {buildTripsListUrl} from '../../utils/list-url';

const COMPANY_ID = 'company-1';
const BRANCH_ID = '33333333-3333-3333-3333-333333333333';

function read(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

/**
 * O vitest do projeto não transforma JSX (tsconfig jsx=preserve), então o
 * componente é verificado por contrato de código, como os demais testes de UI.
 */
const filtersSource = read('features/trips/components/trip-filters.tsx');

/** Bloco JSX do <select> de status (primeiro select do filtro). */
function statusSelectBlock(): string {
  const start = filtersSource.indexOf('<select');
  return filtersSource.slice(start, filtersSource.indexOf('</select>', start));
}

/** Constante iterada para gerar as opções do select de status. */
function statusOptionsConstant(): string {
  return /\{(\w+)\.map\(\(status\) =>/.exec(statusSelectBlock())?.[1] ?? '';
}

function filterStatusOptions(): readonly string[] {
  const name = statusOptionsConstant();
  const constants: Record<string, readonly string[]> = {
    TRIP_STATUSES,
    SIMPLE_TRIP_STATUSES,
  };
  return constants[name] ?? [];
}

/** Valores do enum public.trip_status (migration 040), fonte de verdade do banco. */
function dbTripStatusEnum(): string[] {
  const sql = read('supabase/migrations/040_trip_enums.sql');
  const match = sql.match(/create type public\.trip_status as enum \(([\s\S]*?)\);/);
  if (!match) throw new Error('enum trip_status não encontrado');
  return [...match[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}

function createListTripsStub() {
  const calls: Array<[string, string, unknown]> = [];
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'is', 'ilike', 'gte', 'lte', 'or', 'order', 'range']) {
    chain[method] = (column: string, value: unknown) => {
      calls.push([method, column, value]);
      return chain;
    };
  }
  chain.eq = (column: string, value: unknown) => {
    calls.push(['eq', column, value]);
    return chain;
  };
  chain.then = (resolveFn: (r: unknown) => unknown) =>
    Promise.resolve(resolveFn({data: [], count: 0, error: null}));
  return {
    calls,
    client: {
      from(table: string) {
        expect(table).toBe('trips');
        return chain;
      },
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Audit #19 — mapa de status de viagem', () => {
  it('TRIP_STATUSES espelha exatamente o enum public.trip_status do banco', () => {
    expect([...TRIP_STATUSES]).toEqual(dbTripStatusEnum());
    expect([...TRIP_STATUSES]).toEqual([
      'planned',
      'scheduled',
      'loading',
      'in_progress',
      'delivering',
      'waiting',
      'completed',
      'cancelled',
      'returned',
    ]);
  });

  it('todo status válido tem label', () => {
    for (const status of TRIP_STATUSES) {
      expect(TRIP_STATUS_LABELS[status]).toEqual(expect.any(String));
    }
  });
});

describe('Audit #19 — opções do filtro de status', () => {
  it('select de status itera o contrato completo TRIP_STATUSES', () => {
    expect(statusOptionsConstant()).toBe('TRIP_STATUSES');
    expect(filtersSource).not.toContain('SIMPLE_TRIP_STATUSES');
  });

  it('cada status válido aparece como opção, com value = status e label traduzido', () => {
    const block = statusSelectBlock();
    expect(block).toContain('value={filters.tripStatus ?? \'\'}');
    expect(block).toContain('<option value="">Status</option>');
    expect(block).toContain('<option key={status} value={status}>');
    expect(block).toContain('{TRIP_STATUS_LABELS[status]}');

    expect([...filterStatusOptions()]).toEqual(dbTripStatusEnum());
  });

  it('preserva a ordem relativa das opções antigas (subset simplificado)', () => {
    const values = filterStatusOptions();
    const indexes = SIMPLE_TRIP_STATUSES.map((s) => values.indexOf(s));
    expect(indexes.every((i) => i >= 0)).toBe(true);
    expect([...indexes].sort((a, b) => a - b)).toEqual(indexes);
  });

  it('status inexistente (draft etc.) nunca é oferecido', () => {
    const values = filterStatusOptions();
    const dbEnum = dbTripStatusEnum();

    expect(values).not.toContain('draft');
    expect(values.every((v) => dbEnum.includes(v))).toBe(true);
    expect(new Set(values).size).toBe(values.length);
  });

  it('onChange grava o valor escolhido em tripStatus', () => {
    expect(statusSelectBlock()).toContain(
      "updateFilter('tripStatus', (e.target.value || undefined) as TripStatus | undefined)",
    );
  });

  it.each([
    'loading',
    'waiting',
    'delivering',
    'planned',
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
    'returned',
  ] satisfies TripStatus[])('%s pode ser selecionado e filtrado', async (status) => {
    expect(filterStatusOptions()).toContain(status);
    expect(TRIP_STATUS_LABELS[status]).toEqual(expect.any(String));

    const url = buildTripsListUrl({filters: {tripStatus: status}});
    expect(new URL(url, 'http://x').searchParams.get('status')).toBe(status);

    const {client, calls} = createListTripsStub();
    await listTrips(client as never, {companyId: COMPANY_ID, filters: {tripStatus: status}});
    expect(calls).toContainEqual(['eq', 'trip_status', status]);
    expect(calls).toContainEqual(['eq', 'company_id', COMPANY_ID]);
  });
});

describe('Audit #19 — URL/query state', () => {
  it('seleção de status é sincronizada na URL via ?status=', () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', {
      setTimeout,
      clearTimeout,
      location: {pathname: '/viagens', search: ''},
    });
    const push = vi.fn();

    scheduleQueryUrlSync({push}, () =>
      buildTripsListUrl({filters: {tripStatus: 'delivering', branchId: BRANCH_ID}}),
    );
    vi.advanceTimersByTime(300);

    expect(push).toHaveBeenCalledWith(`/viagens?status=delivering&branch=${BRANCH_ID}`);
  });

  it('a página continua lendo o param `status` para tripStatus', () => {
    expect(read('app/(dashboard)/viagens/page.tsx')).toContain(
      'tripStatus: params.status as TripStatus | undefined',
    );
  });

  it('sem status selecionado, a URL não ganha param status', () => {
    expect(buildTripsListUrl({filters: {}})).toBe('/viagens');
  });
});

describe('Audit #19 — regressão', () => {
  it('demais filtros continuam na URL junto com o status', () => {
    const url = buildTripsListUrl({
      search: 'abc',
      page: 2,
      filters: {
        tripStatus: 'waiting',
        driverId: 'driver-1',
        vehicleId: 'vehicle-1',
        clientName: 'ACME',
        branchId: BRANCH_ID,
        routeId: 'route-1',
        origin: 'SAO PAULO',
        destination: 'RIO DE JANEIRO',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      },
      sort: {sortBy: 'trip_status', sortOrder: 'asc'},
    });
    const params = new URL(url, 'http://x').searchParams;

    expect(Object.fromEntries(params)).toEqual({
      q: 'abc',
      page: '2',
      status: 'waiting',
      driver: 'driver-1',
      vehicle: 'vehicle-1',
      client: 'ACME',
      branch: BRANCH_ID,
      route: 'route-1',
      origin: 'SAO PAULO',
      destination: 'RIO DE JANEIRO',
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      sortBy: 'trip_status',
      sortOrder: 'asc',
    });
  });

  it('filtros de empresa e filial seguem aplicados na query com o status', async () => {
    const {client, calls} = createListTripsStub();
    await listTrips(client as never, {
      companyId: COMPANY_ID,
      filters: {tripStatus: 'loading', branchId: BRANCH_ID},
    });

    expect(calls).toContainEqual(['eq', 'company_id', COMPANY_ID]);
    expect(calls).toContainEqual(['is', 'deleted_at', null]);
    expect(calls).toContainEqual(['eq', 'branch_id', BRANCH_ID]);
    expect(calls).toContainEqual(['eq', 'trip_status', 'loading']);
  });

  it('demais filtros do componente continuam ligados aos mesmos campos', () => {
    for (const binding of [
      "updateFilter('routeId', e.target.value || undefined)",
      "updateFilter('origin', e.target.value || undefined)",
      "updateFilter('destination', e.target.value || undefined)",
      "updateFilter('driverId', e.target.value || undefined)",
      "updateFilter('vehicleId', e.target.value || undefined)",
      "updateFilter('branchId', e.target.value || undefined)",
      "updateFilter('clientName', e.target.value || undefined)",
      "updateFilter('dateFrom', e.target.value || undefined)",
      "updateFilter('dateTo', e.target.value || undefined)",
      'buildTripsListUrl({search, filters, sort})',
    ]) {
      expect(filtersSource).toContain(binding);
    }
  });

  it('regra de busy da aplicação não foi alterada', () => {
    expect(read('features/trips/queries/trips.ts')).toContain(
      "const TRIP_BUSY_STATUSES = ['planned', 'in_progress'] as const;",
    );
  });

  it('lifecycle simplificado e transições permanecem iguais', () => {
    expect([...SIMPLE_TRIP_STATUSES]).toEqual([
      'planned',
      'in_progress',
      'completed',
      'cancelled',
    ]);
    expect(TRIP_STATUSES.filter(canStartTrip)).toEqual([
      'planned',
      'scheduled',
      'loading',
      'waiting',
    ]);
    expect(TRIP_STATUSES.filter(canCompleteTrip)).toEqual(['in_progress', 'delivering']);
    expect(TRIP_STATUSES.filter(canCancelTrip)).toEqual([
      'planned',
      'scheduled',
      'loading',
      'in_progress',
      'delivering',
      'waiting',
    ]);
  });
});
