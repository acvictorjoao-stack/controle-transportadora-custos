import {describe, expect, it} from 'vitest';

import type {Trip, TripOccurrence} from '@/features/trips/types';

import {
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

  it('composes kpis, alerts and rankings without financial fields', () => {
    const trips = [
      makeTrip(),
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

    expect(data.kpis.tripsInProgress).toBe(1);
    expect(data.kpis.tripsDelayed).toBeGreaterThanOrEqual(1);
    expect(data.branchRanking[0]?.name).toBe('Belém');
    expect(data.alerts.length).toBeGreaterThan(0);
    expect(data.timeline).not.toBeNull();
    expect(JSON.stringify(data)).not.toMatch(/revenue|profit|freightMargin/i);
  });
});
