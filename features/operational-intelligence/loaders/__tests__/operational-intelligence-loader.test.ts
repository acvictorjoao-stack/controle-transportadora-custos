import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/features/trips/queries', () => ({
  listTrips: vi.fn(),
  listCompanyTripOccurrences: vi.fn(),
}));

import {
  listCompanyTripOccurrences,
  listTrips,
} from '@/features/trips/queries';
import {parseSharedAnalyticsFilters} from '@/features/analytics-nav/utils/shared-filters';
import {getOperationalIntelligenceData} from '../operational-intelligence-loader';

const listTripsMock = vi.mocked(listTrips);
const listOccurrencesMock = vi.mocked(listCompanyTripOccurrences);

function emptyPage(items: Array<{id: string}> = []) {
  return {
    items: items as never[],
    total: items.length,
    page: 1,
    pageSize: 500,
    totalPages: Math.max(1, Math.ceil(items.length / 500)),
  };
}

describe('getOperationalIntelligenceData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTripsMock.mockResolvedValue(emptyPage([{id: 't1'}]));
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

    expect(listTripsMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: 'session-company',
        filters: {
          branchId: 'b1',
          customerId: 'c1',
          routeId: 'r1',
          vehicleId: 'v1',
          driverId: 'd1',
          dateFrom: '2026-07-01',
          dateTo: '2026-07-31',
        },
      }),
    );
    // costCenterId is parsed for URL/nav but ignored by trip query filters
    expect(filters.costCenterId).toBe('cc1');
    expect(listTripsMock.mock.calls[0]?.[1]?.filters).not.toHaveProperty(
      'costCenterId',
    );
  });

  it('uses companyId from session argument (never from URL filters)', async () => {
    await getOperationalIntelligenceData({} as never, 'session-company', {
      branchId: 'b1',
    });

    expect(listTripsMock.mock.calls[0]?.[1]?.companyId).toBe('session-company');
    expect(listOccurrencesMock.mock.calls[0]?.[1]).toBe('session-company');
  });

  it('applies explicit period on departed_at / occurred_at with tripIds scope', async () => {
    await getOperationalIntelligenceData({} as never, 'company-1', {
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    });

    expect(listTripsMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        sort: {sortBy: 'departed_at', sortOrder: 'desc'},
        filters: {
          dateFrom: '2026-07-01',
          dateTo: '2026-07-31',
        },
      }),
    );
    expect(listOccurrencesMock).toHaveBeenCalledWith(
      expect.anything(),
      'company-1',
      expect.objectContaining({
        dateFrom: '2026-07-01',
        dateTo: '2026-07-31',
        tripIds: ['t1'],
      }),
    );
  });

  it('applies branchId AND', async () => {
    await getOperationalIntelligenceData({} as never, 'company-1', {
      branchId: 'b1',
    });

    expect(listTripsMock.mock.calls[0]?.[1]?.filters).toEqual({branchId: 'b1'});
    expect(listOccurrencesMock).toHaveBeenCalledWith(
      expect.anything(),
      'company-1',
      expect.objectContaining({branchId: 'b1', tripIds: ['t1']}),
    );
  });

  it('applies customerId AND', async () => {
    await getOperationalIntelligenceData({} as never, 'company-1', {
      customerId: 'c1',
    });
    expect(listTripsMock.mock.calls[0]?.[1]?.filters).toEqual({
      customerId: 'c1',
    });
    expect(listOccurrencesMock.mock.calls[0]?.[2]?.tripIds).toEqual(['t1']);
  });

  it('applies routeId AND', async () => {
    await getOperationalIntelligenceData({} as never, 'company-1', {
      routeId: 'r1',
    });
    expect(listTripsMock.mock.calls[0]?.[1]?.filters).toEqual({routeId: 'r1'});
  });

  it('applies vehicleId AND', async () => {
    await getOperationalIntelligenceData({} as never, 'company-1', {
      vehicleId: 'v1',
    });
    expect(listTripsMock.mock.calls[0]?.[1]?.filters).toEqual({
      vehicleId: 'v1',
    });
  });

  it('applies driverId AND', async () => {
    await getOperationalIntelligenceData({} as never, 'company-1', {
      driverId: 'd1',
    });
    expect(listTripsMock.mock.calls[0]?.[1]?.filters).toEqual({driverId: 'd1'});
  });

  it('applies driver AND vehicle cumulatively', async () => {
    await getOperationalIntelligenceData({} as never, 'company-1', {
      driverId: 'd1',
      vehicleId: 'v1',
    });
    expect(listTripsMock.mock.calls[0]?.[1]?.filters).toEqual({
      driverId: 'd1',
      vehicleId: 'v1',
    });
  });

  it('applies customer AND route cumulatively', async () => {
    await getOperationalIntelligenceData({} as never, 'company-1', {
      customerId: 'c1',
      routeId: 'r1',
    });
    expect(listTripsMock.mock.calls[0]?.[1]?.filters).toEqual({
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

    expect(listTripsMock.mock.calls[0]?.[1]?.filters).toEqual({
      branchId: 'b1',
      customerId: 'c1',
      routeId: 'r1',
      vehicleId: 'v1',
      driverId: 'd1',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    });
    expect(listOccurrencesMock.mock.calls[0]?.[2]).toEqual(
      expect.objectContaining({
        dateFrom: '2026-07-01',
        dateTo: '2026-07-31',
        branchId: 'b1',
        tripIds: ['t1'],
        limit: 500,
      }),
    );
  });

  it('returns empty composed data when trips and occurrences are empty', async () => {
    listTripsMock.mockResolvedValue(emptyPage([]));
    const data = await getOperationalIntelligenceData({} as never, 'company-1', {
      driverId: 'missing',
    });

    expect(listOccurrencesMock).toHaveBeenCalledWith(
      expect.anything(),
      'company-1',
      expect.objectContaining({tripIds: []}),
    );
    expect(data.kpis.tripsInProgress).toBe(0);
    expect(data.branchRanking).toEqual([]);
    expect(data.charts.completedDeliveries).toEqual([]);
  });

  it('passes occurrence dateFrom and dateTo from explicit period', async () => {
    await getOperationalIntelligenceData({} as never, 'company-1', {
      dateFrom: '2026-08-01',
      dateTo: '2026-08-15',
    });

    expect(listOccurrencesMock.mock.calls[0]?.[2]?.dateFrom).toBe('2026-08-01');
    expect(listOccurrencesMock.mock.calls[0]?.[2]?.dateTo).toBe('2026-08-15');
  });

  it('scopes occurrences to filtered tripIds', async () => {
    listTripsMock.mockResolvedValue(emptyPage([{id: 'ta'}, {id: 'tb'}]));
    await getOperationalIntelligenceData({} as never, 'company-1', {
      vehicleId: 'v9',
    });
    expect(listOccurrencesMock.mock.calls[0]?.[2]?.tripIds).toEqual([
      'ta',
      'tb',
    ]);
  });

  it('preserves live defaults without period (500 trips, recent occurrences)', async () => {
    await getOperationalIntelligenceData({} as never, 'company-1', {});

    expect(listTripsMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        pageSize: 500,
        sort: {sortBy: 'created_at', sortOrder: 'desc'},
        filters: undefined,
      }),
    );
    expect(listOccurrencesMock.mock.calls[0]?.[2]?.dateTo).toBeUndefined();
    expect(listOccurrencesMock.mock.calls[0]?.[2]?.tripIds).toBeUndefined();
    expect(listOccurrencesMock.mock.calls[0]?.[2]?.dateFrom).toBeTruthy();
    expect(listOccurrencesMock.mock.calls[0]?.[2]?.limit).toBe(500);
  });

  it('ignores costCenterId and does not change trip filters', async () => {
    const withCenter = await getOperationalIntelligenceData(
      {} as never,
      'company-1',
      {costCenterId: 'cc-1', branchId: 'b1'},
    );
    const tripFilters = listTripsMock.mock.calls[0]?.[1]?.filters;
    expect(tripFilters).toEqual({branchId: 'b1'});
    expect(tripFilters).not.toHaveProperty('costCenterId');

    vi.clearAllMocks();
    listTripsMock.mockResolvedValue(emptyPage([{id: 't1'}]));
    listOccurrencesMock.mockResolvedValue([]);

    const withoutCenter = await getOperationalIntelligenceData(
      {} as never,
      'company-1',
      {branchId: 'b1'},
    );

    expect(withCenter.kpis).toEqual(withoutCenter.kpis);
    expect(listTripsMock.mock.calls[0]?.[1]?.filters).toEqual({branchId: 'b1'});
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
