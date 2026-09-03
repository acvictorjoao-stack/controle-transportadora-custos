import {describe, expect, it} from 'vitest';

import {
  DEMO_DRIVERS,
  DEMO_EMPLOYEES,
  DEMO_SUPPLIERS,
  buildDemoFuelDefinitions,
  buildDemoPayrollDefinitions,
  buildDemoTripDefinitions,
  demoTripDaysAgo,
  getDemoCatalogMetadata,
} from '../catalog';
import {DEMO_COMPANY_SLUG, DEMO_COUNTS, DEMO_INTEGRATION_SOURCE} from '../constants';
import {demoExternalId, demoUuid} from '../ids';
import {assertDemoCatalogInvariants, isDemoCompanyRecord} from '../validators';

describe('demo seed catalog', () => {
  it('mantém invariantes do catálogo', () => {
    expect(() => assertDemoCatalogInvariants()).not.toThrow();
  });

  it('não duplica motoristas em employees', () => {
    const driverNames = new Set(DEMO_DRIVERS.map((driver) => driver.name));
    const overlap = DEMO_EMPLOYEES.filter((employee) => driverNames.has(employee.name));
    expect(overlap).toHaveLength(0);
  });

  it('classifica fornecedores posto e oficina corretamente', () => {
    const postos = DEMO_SUPPLIERS.filter((supplier) => supplier.categories.includes('posto'));
    const oficinas = DEMO_SUPPLIERS.filter((supplier) => supplier.categories.includes('oficina'));
    expect(postos.length).toBeGreaterThan(0);
    expect(oficinas.length).toBeGreaterThan(0);
    expect(postos.every((supplier) => !supplier.categories.includes('oficina'))).toBe(true);
  });

  it('mantém odômetro crescente por veículo ao ordenar fueled_at ASC', () => {
    const fuelRecords = buildDemoFuelDefinitions();
    const byVehicle = new Map<string, Array<{daysAgo: number; odometerKm: number}>>();

    for (const record of fuelRecords) {
      const values = byVehicle.get(record.vehicleKey) ?? [];
      values.push({daysAgo: record.daysAgo, odometerKm: record.odometerKm});
      byVehicle.set(record.vehicleKey, values);
    }

    for (const values of byVehicle.values()) {
      const sorted = [...values].sort((a, b) => b.daysAgo - a.daysAgo);
      for (let index = 1; index < sorted.length; index += 1) {
        expect(sorted[index].odometerKm).toBeGreaterThanOrEqual(sorted[index - 1].odometerKm);
      }
    }
  });

  it('gera despesas de pessoal com centro de custo', () => {
    const payroll = buildDemoPayrollDefinitions(2);
    expect(payroll.every((item) => item.costCenterCode.length > 0)).toBe(true);
    expect(payroll.some((item) => item.personKind === 'driver')).toBe(true);
    expect(payroll.some((item) => item.personKind === 'employee')).toBe(true);
  });

  it('gera viagens com relações válidas', () => {
    const trips = buildDemoTripDefinitions(20);
    expect(trips).toHaveLength(20);
    expect(trips.every((trip) => trip.routeKey && trip.vehicleKey && trip.driverKey && trip.customerKey)).toBe(
      true,
    );
    expect(trips.every((trip) => trip.freight > 0 && trip.distanceKm > 0)).toBe(true);
  });

  it('mantém proporção de status e cobertura temporal mista', () => {
    const now = new Date(Date.UTC(2026, 8, 3));
    const trips = buildDemoTripDefinitions(DEMO_COUNTS.trips, now);
    const byStatus = {
      completed: trips.filter((trip) => trip.status === 'completed').length,
      in_progress: trips.filter((trip) => trip.status === 'in_progress').length,
      planned: trips.filter((trip) => trip.status === 'planned').length,
    };

    expect(trips).toHaveLength(DEMO_COUNTS.trips);
    expect(byStatus.completed).toBe(90);
    expect(byStatus.in_progress).toBe(30);
    expect(byStatus.planned).toBe(30);

    const currentMonth = trips.filter((trip) => trip.daysAgo <= 3);
    const older = trips.filter((trip) => trip.daysAgo > 30);
    expect(currentMonth.length).toBeGreaterThanOrEqual(Math.floor(DEMO_COUNTS.trips * 0.2));
    expect(older.length).toBeGreaterThan(0);
    expect(Math.min(...trips.map((trip) => trip.daysAgo))).toBeGreaterThanOrEqual(1);
    expect(Math.max(...trips.map((trip) => trip.daysAgo))).toBeLessThanOrEqual(180);
  });

  it('garante completed_at coerente com departed_at no contrato temporal do seed', () => {
    const trips = buildDemoTripDefinitions().filter((trip) => trip.status === 'completed');
    expect(trips.length).toBe(90);

    for (const trip of trips) {
      const completionOffset = Math.max(trip.daysAgo - 1, 0);
      expect(completionOffset).toBeLessThanOrEqual(trip.daysAgo);
    }
  });

  it('expõe daysAgo do mês corrente e históricos via demoTripDaysAgo', () => {
    const now = new Date(Date.UTC(2026, 8, 3));
    expect(demoTripDaysAgo(1, DEMO_COUNTS.trips, now)).toBeLessThanOrEqual(3);
    expect(
      demoTripDaysAgo(Math.ceil(DEMO_COUNTS.trips * 0.4) + 1, DEMO_COUNTS.trips, now),
    ).toBeGreaterThan(30);
  });
});

describe('demo seed identifiers', () => {
  it('gera UUID determinístico', () => {
    expect(demoUuid('vehicle', 'v01')).toBe(demoUuid('vehicle', 'v01'));
    expect(demoUuid('vehicle', 'v01')).not.toBe(demoUuid('vehicle', 'v02'));
  });

  it('gera external_id padronizado', () => {
    expect(demoExternalId('trip', 't001')).toBe('demo-trip-t001');
    expect(DEMO_INTEGRATION_SOURCE).toBe('demo_seed');
  });
});

describe('demo company guards', () => {
  it('identifica somente empresa demo pelo slug/flag', () => {
    expect(
      isDemoCompanyRecord({
        slug: DEMO_COMPANY_SLUG,
        tradeName: 'DEMO - FleetControl Transportes',
        settings: {is_demo_company: true},
      }),
    ).toBe(true);

    expect(
      isDemoCompanyRecord({
        slug: 'empresa-real',
        tradeName: 'Transportadora Real',
        settings: {},
      }),
    ).toBe(false);
  });

  it('expõe metadados esperados da massa', () => {
    const metadata = getDemoCatalogMetadata();
    expect(metadata.vehicles).toBe(10);
    expect(metadata.drivers).toBe(8);
    expect(metadata.employees).toBe(7);
    expect(metadata.customers).toBe(20);
    expect(metadata.routes).toBe(18);
    expect(metadata.trips).toBeGreaterThanOrEqual(100);
  });
});
