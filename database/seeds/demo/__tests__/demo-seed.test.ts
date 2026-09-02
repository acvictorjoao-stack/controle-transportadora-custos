import {describe, expect, it} from 'vitest';

import {
  DEMO_DRIVERS,
  DEMO_EMPLOYEES,
  DEMO_SUPPLIERS,
  buildDemoFuelDefinitions,
  buildDemoPayrollDefinitions,
  buildDemoTripDefinitions,
  getDemoCatalogMetadata,
} from '../catalog';
import {DEMO_COMPANY_SLUG, DEMO_INTEGRATION_SOURCE} from '../constants';
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
