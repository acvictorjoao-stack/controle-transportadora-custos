import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/features/trips/queries', () => ({
  listTripsInOperationalWindow: vi.fn(),
  listCompanyTripOccurrences: vi.fn(),
}));

import {
  listCompanyTripOccurrences,
  listTripsInOperationalWindow,
} from '@/features/trips/queries';
import {parseSharedAnalyticsFilters} from '@/features/analytics-nav/utils/shared-filters';
import {PENDING_DELIVERY_STATUSES} from '../../utils/compose';
import {getOperationalIntelligenceData} from '../operational-intelligence-loader';

const listTripsMock = vi.mocked(listTripsInOperationalWindow);
const listOccurrencesMock = vi.mocked(listCompanyTripOccurrences);

const JULY_BOUNDS = {
  gte: '2026-07-01T03:00:00.000Z',
  lt: '2026-08-01T03:00:00.000Z',
};

function trips(ids: string[] = ['t1']) {
  return ids.map((id) => ({id})) as never[];
}

function tripOptions() {
  return listTripsMock.mock.calls[0]?.[2];
}

function occurrenceOptions() {
  return listOccurrencesMock.mock.calls[0]?.[2];
}

function dimensionsOf(options: ReturnType<typeof tripOptions>) {
  if (!options) return {};
  const {departedAt: _departedAt, openStatuses: _openStatuses, ...rest} = options;
  return Object.fromEntries(
    Object.entries(rest).filter(([, value]) => value !== undefined),
  );
}

describe('getOperationalIntelligenceData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTripsMock.mockResolvedValue(trips());
    listOccurrencesMock.mockResolvedValue([]);
  });

  it('page contract: parseSharedAnalyticsFilters output is passed through to loader', async () => {
    const filters = parseSharedAnalyticsFilters({
      filial: 'b1',
      cliente: 'c1',
      rota: 'r1',
      veiculo: 'v1',
      motorista: 'd1',
      centro: 'cc1',
      de: '2026-07-01',
      ate: '2026-07-31',
    });

    await getOperationalIntelligenceData({} as never, 'session-company', filters);

    expect(listTripsMock.mock.calls[0]?.[1]).toBe('session-company');
    expect(dimensionsOf(tripOptions())).toEqual({
      branchId: 'b1',
      customerId: 'c1',
      routeId: 'r1',
      vehicleId: 'v1',
      driverId: 'd1',
    });
    expect(tripOptions()?.departedAt).toEqual(JULY_BOUNDS);
    // costCenterId is parsed for URL/nav but ignored by trip query filters
    expect(filters.costCenterId).toBe('cc1');
    expect(tripOptions()).not.toHaveProperty('costCenterId');
  });

  it('uses companyId from session argument (never from URL filters)', async () => {
    await getOperationalIntelligenceData({} as never, 'session-company', {
      branchId: 'b1',
    });

    expect(listTripsMock.mock.calls[0]?.[1]).toBe('session-company');
    expect(listOccurrencesMock.mock.calls[0]?.[1]).toBe('session-company');
  });

  it('explicit period: departed_at / occurred_at share the same business-timezone bounds', async () => {
    await getOperationalIntelligenceData({} as never, 'company-1', {
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    });

    expect(tripOptions()?.departedAt).toEqual(JULY_BOUNDS);
    expect(tripOptions()?.openStatuses).toBeUndefined();
    expect(occurrenceOptions()?.occurredAt).toEqual(JULY_BOUNDS);
    expect(occurrenceOptions()?.tripIds).toEqual(['t1']);
  });

  it('live view: one 14-day window for trips and occurrences, plus open trips', async () => {
    // 2026-10-05 10:00 em America/Sao_Paulo
    await getOperationalIntelligenceData(
      {} as never,
      'company-1',
      {},
      new Date('2026-10-05T13:00:00.000Z'),
    );

    const liveBounds = {
      gte: '2026-09-22T03:00:00.000Z',
      lt: '2026-10-06T03:00:00.000Z',
    };
    expect(tripOptions()?.departedAt).toEqual(liveBounds);
    expect(tripOptions()?.openStatuses).toEqual(PENDING_DELIVERY_STATUSES);
    expect(occurrenceOptions()?.occurredAt).toEqual(liveBounds);
    expect(occurrenceOptions()?.tripIds).toEqual(['t1']);
  });

  it('live view window follows the business civil day, not the UTC day', async () => {
    // 2026-10-05 22:30 em America/Sao_Paulo = 2026-10-06 01:30 UTC
    await getOperationalIntelligenceData(
      {} as never,
      'company-1',
      {},
      new Date('2026-10-06T01:30:00.000Z'),
    );

    expect(tripOptions()?.departedAt).toEqual({
      gte: '2026-09-22T03:00:00.000Z',
      lt: '2026-10-06T03:00:00.000Z',
    });
  });

  it('applies branchId AND on trips and occurrences', async () => {
    await getOperationalIntelligenceData({} as never, 'company-1', {
      branchId: 'b1',
    });

    expect(dimensionsOf(tripOptions())).toEqual({branchId: 'b1'});
    expect(occurrenceOptions()).toEqual(
      expect.objectContaining({branchId: 'b1', tripIds: ['t1']}),
    );
  });

  it('applies customerId AND', async () => {
    await getOperationalIntelligenceData({} as never, 'company-1', {
      customerId: 'c1',
    });
    expect(dimensionsOf(tripOptions())).toEqual({customerId: 'c1'});
    expect(occurrenceOptions()?.tripIds).toEqual(['t1']);
  });

  it('applies routeId AND', async () => {
    await getOperationalIntelligenceData({} as never, 'company-1', {
      routeId: 'r1',
    });
    expect(dimensionsOf(tripOptions())).toEqual({routeId: 'r1'});
  });

  it('applies vehicleId AND', async () => {
    await getOperationalIntelligenceData({} as never, 'company-1', {
      vehicleId: 'v1',
    });
    expect(dimensionsOf(tripOptions())).toEqual({vehicleId: 'v1'});
  });

  it('applies driverId AND', async () => {
    await getOperationalIntelligenceData({} as never, 'company-1', {
      driverId: 'd1',
    });
    expect(dimensionsOf(tripOptions())).toEqual({driverId: 'd1'});
  });

  it('applies driver AND vehicle cumulatively', async () => {
    await getOperationalIntelligenceData({} as never, 'company-1', {
      driverId: 'd1',
      vehicleId: 'v1',
    });
    expect(dimensionsOf(tripOptions())).toEqual({
      driverId: 'd1',
      vehicleId: 'v1',
    });
  });

  it('applies customer AND route cumulatively', async () => {
    await getOperationalIntelligenceData({} as never, 'company-1', {
      customerId: 'c1',
      routeId: 'r1',
    });
    expect(dimensionsOf(tripOptions())).toEqual({
      customerId: 'c1',
      routeId: 'r1',
    });
  });

  it('applies full dimensional AND with period', async () => {
    await getOperationalIntelligenceData({} as never, 'company-1', {
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
      branchId: 'b1',
      customerId: 'c1',
      routeId: 'r1',
      vehicleId: 'v1',
      driverId: 'd1',
      costCenterId: 'cc-ignored',
    });

    expect(dimensionsOf(tripOptions())).toEqual({
      branchId: 'b1',
      customerId: 'c1',
      routeId: 'r1',
      vehicleId: 'v1',
      driverId: 'd1',
    });
    expect(tripOptions()?.departedAt).toEqual(JULY_BOUNDS);
    expect(occurrenceOptions()).toEqual({
      occurredAt: JULY_BOUNDS,
      branchId: 'b1',
      tripIds: ['t1'],
    });
  });

  it('returns empty composed data when trips and occurrences are empty', async () => {
    listTripsMock.mockResolvedValue(trips([]));
    const data = await getOperationalIntelligenceData({} as never, 'company-1', {
      driverId: 'missing',
    });

    expect(occurrenceOptions()?.tripIds).toEqual([]);
    expect(data.kpis.tripsInProgress).toBe(0);
    expect(data.branchRanking).toEqual([]);
    expect(data.charts.completedDeliveries).toEqual([]);
  });

  it('single-sided period keeps the open side unbounded on both sources', async () => {
    await getOperationalIntelligenceData({} as never, 'company-1', {
      dateFrom: '2026-08-01',
    });

    expect(tripOptions()?.departedAt).toEqual({gte: '2026-08-01T03:00:00.000Z'});
    expect(occurrenceOptions()?.occurredAt).toEqual({
      gte: '2026-08-01T03:00:00.000Z',
    });
  });

  it('scopes occurrences to filtered tripIds', async () => {
    listTripsMock.mockResolvedValue(trips(['ta', 'tb']));
    await getOperationalIntelligenceData({} as never, 'company-1', {
      vehicleId: 'v9',
    });
    expect(occurrenceOptions()?.tripIds).toEqual(['ta', 'tb']);
  });

  it('ignores costCenterId and does not change trip filters', async () => {
    const withCenter = await getOperationalIntelligenceData(
      {} as never,
      'company-1',
      {costCenterId: 'cc-1', branchId: 'b1'},
    );
    expect(dimensionsOf(tripOptions())).toEqual({branchId: 'b1'});
    expect(tripOptions()).not.toHaveProperty('costCenterId');

    vi.clearAllMocks();
    listTripsMock.mockResolvedValue(trips());
    listOccurrencesMock.mockResolvedValue([]);

    const withoutCenter = await getOperationalIntelligenceData(
      {} as never,
      'company-1',
      {branchId: 'b1'},
    );

    expect(withCenter.kpis).toEqual(withoutCenter.kpis);
    expect(dimensionsOf(tripOptions())).toEqual({branchId: 'b1'});
  });

  it('marks hasExplicitPeriod for export/UI labels', async () => {
    const live = await getOperationalIntelligenceData({} as never, 'company-1', {});
    expect(live.hasExplicitPeriod).toBe(false);

    const ranged = await getOperationalIntelligenceData({} as never, 'company-1', {
      dateFrom: '2026-07-01',
      dateTo: '2026-07-02',
    });
    expect(ranged.hasExplicitPeriod).toBe(true);
  });
});
