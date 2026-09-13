import {beforeEach, describe, expect, it, vi} from 'vitest';

import {
  fetchOperationalDreTripDetails,
  fetchOperationalDreTrips,
  fetchOperationalDreTripsForVehicles,
} from '../operational-dre-data';
import {buildCompletedAtPeriodBounds} from '../../utils/completed-at-period-bounds';

/**
 * Captura gte/lte/lt aplicados em completed_at nas queries de viagens DRE.
 */
function createTripBoundCaptureMock() {
  const gteCalls: Array<[string, string]> = [];
  const lteCalls: Array<[string, string]> = [];
  const ltCalls: Array<[string, string]> = [];

  function tripBuilder() {
    const api: Record<string, unknown> = {};
    const self = () => api;
    api.select = vi.fn(self);
    api.eq = vi.fn(self);
    api.is = vi.fn(self);
    api.in = vi.fn(self);
    api.gte = vi.fn((column: string, value: string) => {
      gteCalls.push([column, value]);
      return self();
    });
    api.lte = vi.fn((column: string, value: string) => {
      lteCalls.push([column, value]);
      return self();
    });
    api.lt = vi.fn((column: string, value: string) => {
      ltCalls.push([column, value]);
      return self();
    });
    api.order = vi.fn(self);
    api.range = vi.fn(async () => ({
      data: [],
      error: null,
      count: 0,
    }));
    return api;
  }

  return {
    gteCalls,
    lteCalls,
    ltCalls,
    supabase: {
      from: vi.fn(() => tripBuilder()),
    },
  };
}

describe('Audit #15 — DRE completed_at query paths use local→UTC bounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const period = {dateFrom: '2026-09-01', dateTo: '2026-09-30'} as const;
  const expected = buildCompletedAtPeriodBounds(period);

  it('fetchOperationalDreTrips sends UTC bounds for America/Sao_Paulo civil period', async () => {
    const {supabase, gteCalls, lteCalls, ltCalls} = createTripBoundCaptureMock();

    await fetchOperationalDreTrips(supabase as never, 'company-1', period);

    expect(gteCalls.filter(([col]) => col === 'completed_at')).toEqual([
      ['completed_at', expected.gte],
    ]);
    expect(ltCalls.filter(([col]) => col === 'completed_at')).toEqual([
      ['completed_at', expected.lt],
    ]);
    // No longer uses inclusive UTC-literal end
    expect(lteCalls.filter(([col]) => col === 'completed_at')).toEqual([]);
    expect(expected.gte).toBe('2026-09-01T03:00:00.000Z');
    expect(expected.lt).toBe('2026-10-01T03:00:00.000Z');
  });

  it('fetchOperationalDreTripDetails uses the same completed_at bounds', async () => {
    const {supabase, gteCalls, lteCalls, ltCalls} = createTripBoundCaptureMock();

    await fetchOperationalDreTripDetails(supabase as never, 'company-1', {
      ...period,
      routeId: 'route-1',
    });

    expect(gteCalls.filter(([col]) => col === 'completed_at')).toEqual([
      ['completed_at', expected.gte],
    ]);
    expect(ltCalls.filter(([col]) => col === 'completed_at')).toEqual([
      ['completed_at', expected.lt],
    ]);
    expect(lteCalls.filter(([col]) => col === 'completed_at')).toEqual([]);
  });

  it('fetchOperationalDreTripsForVehicles uses the same completed_at bounds', async () => {
    const {supabase, gteCalls, lteCalls, ltCalls} = createTripBoundCaptureMock();

    await fetchOperationalDreTripsForVehicles(
      supabase as never,
      'company-1',
      ['vehicle-1'],
      period,
    );

    expect(gteCalls.filter(([col]) => col === 'completed_at')).toEqual([
      ['completed_at', expected.gte],
    ]);
    expect(ltCalls.filter(([col]) => col === 'completed_at')).toEqual([
      ['completed_at', expected.lt],
    ]);
    expect(lteCalls.filter(([col]) => col === 'completed_at')).toEqual([]);
  });
});
