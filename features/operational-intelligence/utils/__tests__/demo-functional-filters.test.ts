import {describe, expect, it} from 'vitest';

import {buildRankingExportPayload} from '@/features/analytics-nav/utils/related-insights';
import type {Trip, TripOccurrence} from '@/features/trips/types';

import {composeOperationalIntelligence} from '../../utils/compose';

/**
 * Validação funcional DEMO (cenários A–J) sobre o compose + export.
 * Simula o dataset já filtrado pelo loader (AND / período), como na UI.
 */
function demoTrip(
  index: number,
  overrides: Partial<Trip> = {},
): Trip {
  const drivers = ['d01', 'd02', 'd03', 'd04'];
  const vehicles = ['v01', 'v02', 'v03', 'v04'];
  const customers = ['c01', 'c02', 'c03'];
  const routes = ['r01', 'r02', 'r03'];
  const branches = ['matriz', 'imperatriz', 'teresina'];
  const day = 10 + (index % 15);

  return {
    id: `demo-t${index}`,
    companyId: 'demo-company',
    branchId: branches[index % branches.length],
    branchName: branches[index % branches.length],
    tripNumber: `DEM-${String(index).padStart(3, '0')}`,
    tripStatus: index % 5 === 0 ? 'in_progress' : 'completed',
    driverId: drivers[index % drivers.length],
    driverName: `Driver ${drivers[index % drivers.length]}`,
    vehicleId: vehicles[index % vehicles.length],
    vehiclePlate: `DEM0A0${(index % vehicles.length) + 1}`,
    vehicleFleetNumber: null,
    clientName: `Cliente ${customers[index % customers.length]}`,
    contractReference: null,
    customerId: customers[index % customers.length],
    customerContractId: null,
    customerName: `Cliente ${customers[index % customers.length]}`,
    freightTable: null,
    contractedFreightValue: null,
    actualFreightValue: null,
    freightMargin: null,
    origin: 'A',
    destination: 'B',
    route: routes[index % routes.length],
    routeId: routes[index % routes.length],
    routeName: routes[index % routes.length],
    routeCode: null,
    plannedDistanceKm: 100,
    plannedDepartureAt: `2026-07-${String(day).padStart(2, '0')}T08:00:00.000Z`,
    leadTimeMinutes: 90,
    unloadTimeMinutes: 30,
    plannedArrivalAt: `2026-07-${String(day).padStart(2, '0')}T12:00:00.000Z`,
    plannedCompletionAt: `2026-07-${String(day).padStart(2, '0')}T13:00:00.000Z`,
    initialOdometerKm: null,
    finalOdometerKm: null,
    initialHourMeter: null,
    finalHourMeter: null,
    departedAt: `2026-07-${String(day).padStart(2, '0')}T08:00:00.000Z`,
    arrivedAt:
      index % 5 === 0
        ? null
        : `2026-07-${String(day).padStart(2, '0')}T11:00:00.000Z`,
    startedAt: `2026-07-${String(day).padStart(2, '0')}T08:00:00.000Z`,
    completedAt:
      index % 5 === 0
        ? null
        : `2026-07-${String(day).padStart(2, '0')}T12:30:00.000Z`,
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
    createdAt: `2026-07-${String(day).padStart(2, '0')}T07:00:00.000Z`,
    updatedAt: `2026-07-${String(day).padStart(2, '0')}T12:30:00.000Z`,
    distanceKm: null,
    ...overrides,
  };
}

function filterTrips(
  trips: Trip[],
  filters: {
    dateFrom?: string;
    dateTo?: string;
    branchId?: string;
    customerId?: string;
    routeId?: string;
    vehicleId?: string;
    driverId?: string;
  },
): Trip[] {
  return trips.filter((trip) => {
    if (filters.branchId && trip.branchId !== filters.branchId) return false;
    if (filters.customerId && trip.customerId !== filters.customerId) return false;
    if (filters.routeId && trip.routeId !== filters.routeId) return false;
    if (filters.vehicleId && trip.vehicleId !== filters.vehicleId) return false;
    if (filters.driverId && trip.driverId !== filters.driverId) return false;
    if (filters.dateFrom || filters.dateTo) {
      const day = (trip.departedAt ?? '').slice(0, 10);
      if (filters.dateFrom && day < filters.dateFrom) return false;
      if (filters.dateTo && day > filters.dateTo) return false;
    }
    return true;
  });
}

function filterOccurrences(
  occurrences: TripOccurrence[],
  tripIds: Set<string>,
  filters: {dateFrom?: string; dateTo?: string},
): TripOccurrence[] {
  return occurrences.filter((item) => {
    if (!tripIds.has(item.tripId)) return false;
    const day = item.occurredAt.slice(0, 10);
    if (filters.dateFrom && day < filters.dateFrom) return false;
    if (filters.dateTo && day > filters.dateTo) return false;
    return true;
  });
}

describe('DEMO functional validation — Inteligência Operacional filters', () => {
  const allTrips = Array.from({length: 40}, (_, i) => demoTrip(i + 1));
  const allOccurrences: TripOccurrence[] = allTrips.flatMap((trip, index) =>
    index % 3 === 0
      ? [
          {
            id: `o-${trip.id}`,
            tripId: trip.id,
            branchId: trip.branchId,
            occurrenceType: 'delay',
            description: 'DEMO delay',
            occurredAt: trip.departedAt ?? trip.createdAt,
            createdAt: trip.createdAt,
          },
        ]
      : [],
  );

  function run(
    filters: {
      dateFrom?: string;
      dateTo?: string;
      branchId?: string;
      customerId?: string;
      routeId?: string;
      vehicleId?: string;
      driverId?: string;
      costCenterId?: string;
    },
    now = new Date('2026-07-27T15:00:00.000Z'),
  ) {
    const scopedFilters = {...filters};
    delete scopedFilters.costCenterId;
    const trips = filterTrips(allTrips, scopedFilters);
    const hasPeriod = Boolean(filters.dateFrom || filters.dateTo);
    const hasDimensions = Boolean(
      filters.branchId ||
        filters.customerId ||
        filters.routeId ||
        filters.vehicleId ||
        filters.driverId,
    );
    const tripIds = new Set(trips.map((t) => t.id));
    const occurrences =
      hasPeriod || hasDimensions
        ? filterOccurrences(allOccurrences, tripIds, {
            dateFrom: hasPeriod ? filters.dateFrom : undefined,
            dateTo: hasPeriod ? filters.dateTo : undefined,
          })
        : allOccurrences;

    const data = composeOperationalIntelligence({
      trips,
      occurrences,
      now,
      hasExplicitPeriod: hasPeriod,
      period: hasPeriod
        ? {dateFrom: filters.dateFrom, dateTo: filters.dateTo}
        : undefined,
    });

    const exportPayload = buildRankingExportPayload({
      title: 'Inteligência Operacional',
      kpis: [
        {
          label: data.hasExplicitPeriod
            ? 'Concluídas no período'
            : 'Concluídas hoje',
          value: String(data.kpis.tripsCompletedToday),
        },
        {label: 'Atrasadas', value: String(data.kpis.tripsDelayed)},
        {
          label: 'Ocorrências abertas',
          value: String(data.kpis.openOccurrences),
        },
      ],
      columns: [{id: 'name', header: 'Filial'}],
      rows: data.branchRanking.map((row) => ({name: row.name})),
    });

    return {trips, occurrences, data, exportPayload, hasPeriod};
  }

  it('A. sem filtro — dataset amplo e label Concluídas hoje', () => {
    const {trips, data, exportPayload} = run({});
    expect(trips.length).toBe(40);
    expect(data.hasExplicitPeriod).toBe(false);
    expect(exportPayload.kpis?.[0]?.label).toBe('Concluídas hoje');
  });

  it('B. período — charts e concluídas no intervalo', () => {
    const {trips, data, exportPayload} = run({
      dateFrom: '2026-07-12',
      dateTo: '2026-07-18',
    });
    expect(trips.every((t) => {
      const day = (t.departedAt ?? '').slice(0, 10);
      return day >= '2026-07-12' && day <= '2026-07-18';
    })).toBe(true);
    expect(data.hasExplicitPeriod).toBe(true);
    expect(exportPayload.kpis?.[0]?.label).toBe('Concluídas no período');
    expect(
      data.charts.completedDeliveries.every(
        (p) => p.key >= '2026-07-12' && p.key <= '2026-07-18',
      ),
    ).toBe(true);
  });

  it('C. somente motorista', () => {
    const {trips} = run({driverId: 'd01'});
    expect(trips.length).toBeGreaterThan(0);
    expect(trips.every((t) => t.driverId === 'd01')).toBe(true);
  });

  it('D. somente veículo', () => {
    const {trips} = run({vehicleId: 'v02'});
    expect(trips.length).toBeGreaterThan(0);
    expect(trips.every((t) => t.vehicleId === 'v02')).toBe(true);
  });

  it('E. motorista + veículo AND', () => {
    const {trips} = run({driverId: 'd01', vehicleId: 'v01'});
    expect(trips.every((t) => t.driverId === 'd01' && t.vehicleId === 'v01')).toBe(
      true,
    );
  });

  it('F. cliente', () => {
    const {trips} = run({customerId: 'c02'});
    expect(trips.every((t) => t.customerId === 'c02')).toBe(true);
  });

  it('G. rota', () => {
    const {trips} = run({routeId: 'r03'});
    expect(trips.every((t) => t.routeId === 'r03')).toBe(true);
  });

  it('H. combinação completa AND', () => {
    const {trips} = run({
      dateFrom: '2026-07-10',
      dateTo: '2026-07-25',
      branchId: 'matriz',
      customerId: 'c01',
      routeId: 'r01',
      vehicleId: 'v01',
      driverId: 'd01',
    });
    expect(
      trips.every(
        (t) =>
          t.branchId === 'matriz' &&
          t.customerId === 'c01' &&
          t.routeId === 'r01' &&
          t.vehicleId === 'v01' &&
          t.driverId === 'd01',
      ),
    ).toBe(true);
  });

  it('I. ocorrências só de trips elegíveis no período', () => {
    const {trips, occurrences} = run({
      dateFrom: '2026-07-12',
      dateTo: '2026-07-18',
      driverId: 'd02',
    });
    const ids = new Set(trips.map((t) => t.id));
    expect(occurrences.every((o) => ids.has(o.tripId))).toBe(true);
  });

  it('J. centro de custo não altera dataset', () => {
    const without = run({driverId: 'd01'});
    const withCenter = run({driverId: 'd01', costCenterId: 'OPERACIONAL'});
    expect(withCenter.trips.map((t) => t.id)).toEqual(
      without.trips.map((t) => t.id),
    );
    expect(withCenter.data.kpis).toEqual(without.data.kpis);
    expect(withCenter.exportPayload.kpis).toEqual(without.exportPayload.kpis);
  });

  it('UI = CSV/PDF payload (mesmo dataset filtrado)', () => {
    const {data, exportPayload} = run({
      dateFrom: '2026-07-12',
      dateTo: '2026-07-20',
      vehicleId: 'v01',
    });
    expect(exportPayload.kpis?.[0]?.value).toBe(
      String(data.kpis.tripsCompletedToday),
    );
    expect(exportPayload.kpis?.[1]?.value).toBe(String(data.kpis.tripsDelayed));
    expect(exportPayload.rows.map((r) => r.name)).toEqual(
      data.branchRanking.map((r) => r.name),
    );
  });
});
