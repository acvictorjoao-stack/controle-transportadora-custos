import {describe, expect, it} from 'vitest';

import {buildRankingExportPayload} from '@/features/analytics-nav/utils/related-insights';
import type {Trip, TripOccurrence} from '@/features/trips/types';

import {
  buildChartDayKeys,
  composeOperationalIntelligence,
  isTripDelayed,
  isTripSlaMet,
} from '../compose';

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 't1',
    companyId: 'c1',
    branchId: 'b1',
    branchName: 'Belém',
    tripNumber: 'VG-001',
    tripStatus: 'completed',
    driverId: null,
    driverName: null,
    vehicleId: 'v1',
    vehiclePlate: 'ABC1D23',
    vehicleFleetNumber: null,
    clientName: 'Cliente XP',
    contractReference: null,
    customerId: 'cu1',
    customerContractId: null,
    customerName: 'Cliente XP',
    freightTable: null,
    contractedFreightValue: null,
    actualFreightValue: null,
    freightMargin: null,
    origin: 'A',
    destination: 'B',
    route: 'Rota Norte',
    routeId: 'r1',
    routeName: 'Rota Norte',
    routeCode: 'RN',
    plannedDistanceKm: 100,
    plannedDepartureAt: '2026-07-27T08:00:00.000Z',
    leadTimeMinutes: 90,
    unloadTimeMinutes: 30,
    plannedArrivalAt: '2026-07-27T09:30:00.000Z',
    plannedCompletionAt: '2026-07-27T10:00:00.000Z',
    initialOdometerKm: null,
    finalOdometerKm: null,
    initialHourMeter: null,
    finalHourMeter: null,
    departedAt: '2026-07-27T08:00:00.000Z',
    arrivedAt: '2026-07-27T09:20:00.000Z',
    startedAt: '2026-07-27T08:00:00.000Z',
    completedAt: '2026-07-27T10:05:00.000Z',
    cancelledAt: null,
    cancellationNotes: null,
    weightKg: null,
    volumeM3: null,
    cargoType: null,
    notes: null,
    responsible: null,
    metadata: {},
    status: 'active',
    externalId: null,
    integrationSource: null,
    createdAt: '2026-07-27T07:00:00.000Z',
    updatedAt: '2026-07-27T10:05:00.000Z',
    distanceKm: null,
    ...overrides,
  };
}

describe('operational intelligence compose', () => {
  it('marks delayed trips when arrival exceeds planned arrival', () => {
    const trip = makeTrip({
      tripStatus: 'in_progress',
      arrivedAt: null,
      completedAt: null,
      plannedArrivalAt: '2026-07-27T09:00:00.000Z',
    });
    expect(isTripDelayed(trip, new Date('2026-07-27T10:00:00.000Z'))).toBe(true);
  });

  it('detects SLA met/unmet for completed trips', () => {
    expect(isTripSlaMet(makeTrip())).toBe(true);
    expect(
      isTripSlaMet(
        makeTrip({
          arrivedAt: '2026-07-27T10:00:00.000Z',
        }),
      ),
    ).toBe(false);
  });

  it('composes kpis without financial fields and counts completed today without period', () => {
    const trips = [
      makeTrip({
        completedAt: '2026-07-27T10:05:00.000Z',
      }),
      makeTrip({
        id: 't2',
        tripNumber: 'VG-002',
        tripStatus: 'in_progress',
        arrivedAt: null,
        completedAt: null,
        plannedArrivalAt: '2026-07-27T08:00:00.000Z',
        customerName: 'Cliente Y',
        customerId: 'cu2',
      }),
    ];
    const occurrences: TripOccurrence[] = [
      {
        id: 'o1',
        tripId: 't2',
        branchId: 'b1',
        occurrenceType: 'delay',
        description: 'Trânsito',
        occurredAt: '2026-07-27T09:00:00.000Z',
        createdAt: '2026-07-27T09:00:00.000Z',
      },
    ];

    const data = composeOperationalIntelligence({
      trips,
      occurrences,
      now: new Date('2026-07-27T11:00:00.000Z'),
    });

    expect(data.hasExplicitPeriod).toBe(false);
    expect(data.kpis.tripsCompletedToday).toBe(1);
    expect(data.kpis.tripsInProgress).toBe(1);
    expect(JSON.stringify(data)).not.toMatch(/revenue|profit|freightMargin/i);
  });

  it('counts completed trips in explicit period (value, not only label)', () => {
    const trips = [
      makeTrip({
        id: 't1',
        completedAt: '2026-07-20T10:00:00.000Z',
      }),
      makeTrip({
        id: 't2',
        tripNumber: 'VG-002',
        completedAt: '2026-07-25T10:00:00.000Z',
      }),
      makeTrip({
        id: 't3',
        tripNumber: 'VG-003',
        tripStatus: 'in_progress',
        completedAt: null,
        arrivedAt: null,
      }),
    ];

    const data = composeOperationalIntelligence({
      trips,
      occurrences: [],
      now: new Date('2026-07-27T12:00:00.000Z'),
      hasExplicitPeriod: true,
      period: {dateFrom: '2026-07-20', dateTo: '2026-07-22'},
    });

    expect(data.hasExplicitPeriod).toBe(true);
    expect(data.kpis.tripsCompletedToday).toBe(1);
  });

  it('charts respect explicit period instead of hardcoded 7 days', () => {
    expect(
      buildChartDayKeys(new Date('2026-07-27T12:00:00.000Z'), {
        dateFrom: '2026-07-20',
        dateTo: '2026-07-22',
      }),
    ).toEqual(['2026-07-20', '2026-07-21', '2026-07-22']);

    const data = composeOperationalIntelligence({
      trips: [
        makeTrip({
          completedAt: '2026-07-20T10:00:00.000Z',
        }),
      ],
      occurrences: [],
      now: new Date('2026-07-27T12:00:00.000Z'),
      hasExplicitPeriod: true,
      period: {dateFrom: '2026-07-20', dateTo: '2026-07-22'},
    });

    expect(data.charts.completedDeliveries.map((p) => p.key)).toEqual([
      '2026-07-20',
    ]);
    expect(data.charts.completedDeliveries.some((p) => p.key === '2026-07-26')).toBe(
      false,
    );
  });

  it('keeps last-7-day chart axis without explicit period', () => {
    const keys = buildChartDayKeys(new Date(2026, 6, 27));
    expect(keys).toHaveLength(7);
    expect(keys[0]).toBe('2026-07-21');
    expect(keys[6]).toBe('2026-07-27');
  });

  it('exportPayload mirrors the composed filtered dataset', () => {
    const data = composeOperationalIntelligence({
      trips: [
        makeTrip({
          tripStatus: 'in_progress',
          arrivedAt: null,
          completedAt: null,
          plannedArrivalAt: '2026-07-27T08:00:00.000Z',
        }),
      ],
      occurrences: [],
      now: new Date('2026-07-27T11:00:00.000Z'),
      hasExplicitPeriod: true,
      period: {dateFrom: '2026-07-01', dateTo: '2026-07-31'},
    });

    const payload = buildRankingExportPayload({
      title: 'Inteligência Operacional',
      kpis: [
        {
          label: data.hasExplicitPeriod
            ? 'Concluídas no período'
            : 'Concluídas hoje',
          value: String(data.kpis.tripsCompletedToday),
        },
        {label: 'Atrasadas', value: String(data.kpis.tripsDelayed)},
      ],
      columns: [{id: 'name', header: 'Filial'}],
      rows: data.branchRanking.map((row) => ({name: row.name})),
    });

    expect(payload.kpis?.[0]?.label).toBe('Concluídas no período');
    expect(payload.kpis?.[0]?.value).toBe(String(data.kpis.tripsCompletedToday));
    expect(payload.kpis?.[1]?.value).toBe(String(data.kpis.tripsDelayed));
    expect(payload.rows[0]?.name).toBe(data.branchRanking[0]?.name);
  });
});
