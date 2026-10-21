import {isValidPlate} from '@/features/vehicles/utils/vehicle-format';
import {createBranchSchema} from '@/features/organization/branches/validation/schemas';
import {createCostCenterSchema} from '@/features/cost-centers/validation/schemas';
import {createCustomerSchema} from '@/features/customers/validation/schemas';
import {createDriverSchema} from '@/features/drivers/validation/schemas';
import {createPositionSchema} from '@/features/payroll/validation/schemas';
import {createSupplierSchema} from '@/features/suppliers/validation/schemas';
import {createVehicleSchema} from '@/features/vehicles/validation/schemas';

import {
  HML_BRANCHES,
  HML_COST_CENTERS,
  HML_CUSTOMERS,
  HML_DRIVERS,
  HML_EMPLOYEES,
  HML_POSITIONS,
  HML_ROUTES,
  HML_SUPPLIERS,
  HML_VEHICLES,
  assertHmlTripBusyUniqueness,
  assertHmlTripOdometerSequence,
  buildHmlFuelDefinitions,
  buildHmlMaintenanceDefinitions,
  buildHmlTireDefinitions,
  buildHmlTripDefinitions,
  buildHmlVehicleOdometerAfterTrips,
  getHmlCatalogCounts,
} from './catalog';
import {HML_COUNTS, HML_COMPANY_SLUG, HML_REQUIRED_PLAN_SLUG} from './constants';
import {assertFictitiousDocuments} from './documents';
import {buildHmlExpectedPlan} from './expected-plan';
import type {HmlSeedPlanSummary} from './types';

export function assertHmlCatalogInvariants(): void {
  assertFictitiousDocuments({
    cpfs: [
      ...HML_DRIVERS.map((d) => d.cpf),
      ...HML_EMPLOYEES.map((e) => e.cpf).filter((cpf): cpf is string => Boolean(cpf)),
    ],
    cnpjs: [
      ...HML_CUSTOMERS.map((c) => c.taxId),
      ...HML_SUPPLIERS.map((s) => s.document),
    ],
  });

  const plates = HML_VEHICLES.map((v) => v.plate);
  if (new Set(plates).size !== plates.length) {
    throw new Error('Placas HML duplicadas no catálogo.');
  }
  for (const plate of plates) {
    if (!isValidPlate(plate)) {
      throw new Error(`Placa HML inválida: ${plate}`);
    }
  }

  const driverCpfs = HML_DRIVERS.map((d) => d.cpf);
  if (new Set(driverCpfs).size !== driverCpfs.length) {
    throw new Error('CPFs de motoristas HML duplicados.');
  }

  const employeeCpfs = HML_EMPLOYEES.map((e) => e.cpf);
  if (new Set([...driverCpfs, ...employeeCpfs]).size !== driverCpfs.length + employeeCpfs.length) {
    throw new Error('CPF compartilhado entre motorista e funcionário HML.');
  }

  const driverNames = new Set(HML_DRIVERS.map((d) => d.name));
  const overlap = HML_EMPLOYEES.filter((e) => driverNames.has(e.name));
  if (overlap.length > 0) {
    throw new Error('Nome de motorista reutilizado em funcionário HML.');
  }

  const postos = HML_SUPPLIERS.filter((s) => s.categories.includes('posto'));
  const oficinas = HML_SUPPLIERS.filter((s) => s.categories.includes('oficina'));
  const pneus = HML_SUPPLIERS.filter((s) => s.categories.includes('pneus'));
  if (postos.length === 0 || oficinas.length === 0 || pneus.length === 0) {
    throw new Error('Catálogo HML exige fornecedores posto, oficina e pneus.');
  }
  for (const supplier of HML_SUPPLIERS) {
    if (supplier.categories.includes('posto') && supplier.categories.includes('oficina')) {
      throw new Error(`Fornecedor ${supplier.key} não pode ser posto e oficina.`);
    }
  }

  for (const route of HML_ROUTES) {
    if (!HML_CUSTOMERS.some((c) => c.key === route.customerKey)) {
      throw new Error(`Rota ${route.key} referencia cliente inexistente.`);
    }
    if (route.leadTimeDays < 1) {
      throw new Error(`Rota ${route.key} com lead time inválido.`);
    }
  }

  const trips = buildHmlTripDefinitions();
  assertHmlTripBusyUniqueness(trips);
  assertHmlTripOdometerSequence(trips);

  const odometerAfterTrips = buildHmlVehicleOdometerAfterTrips(trips);
  const fuel = buildHmlFuelDefinitions();
  const byVehicle = new Map<string, typeof fuel>();
  for (const record of fuel) {
    const list = byVehicle.get(record.vehicleKey) ?? [];
    list.push(record);
    byVehicle.set(record.vehicleKey, list);
  }
  for (const [vehicleKey, records] of byVehicle) {
    const sorted = [...records].sort((a, b) => b.daysAgo - a.daysAgo);
    const floor = odometerAfterTrips.get(vehicleKey) ?? 0;
    for (let i = 0; i < sorted.length; i += 1) {
      if (sorted[i]!.odometerKm < floor) {
        throw new Error(
          `Odômetro de combustível abaixo do pós-viagens no veículo ${vehicleKey} ` +
            `(fuel=${sorted[i]!.odometerKm}, trips=${floor}).`,
        );
      }
      if (i > 0 && sorted[i]!.odometerKm < sorted[i - 1]!.odometerKm) {
        throw new Error(`Odômetro regressivo no combustível do veículo ${vehicleKey}.`);
      }
    }
  }

  if (HML_VEHICLES.length > 50) {
    throw new Error('Catálogo HML excede o limite Professional de 50 veículos.');
  }
  if (HML_BRANCHES.length + 1 > 10) {
    throw new Error('Catálogo HML excede o limite Professional de 10 filiais (incluindo HQ).');
  }

  // Garante que as definições derivadas batem com as contagens.
  if (buildHmlTripDefinitions().length !== HML_COUNTS.trips) {
    throw new Error('Quantidade de viagens HML diverge de HML_COUNTS.trips.');
  }
  if (buildHmlFuelDefinitions().length !== HML_COUNTS.fuelRecords) {
    throw new Error('Quantidade de abastecimentos HML diverge de HML_COUNTS.fuelRecords.');
  }
  if (buildHmlMaintenanceDefinitions().length !== HML_COUNTS.maintenanceRecords) {
    throw new Error('Quantidade de manutenções HML diverge de HML_COUNTS.maintenanceRecords.');
  }
  if (buildHmlTireDefinitions().length !== HML_COUNTS.tires) {
    throw new Error('Quantidade de pneus HML diverge de HML_COUNTS.tires.');
  }
}

/** Valida payloads estáticos com os mesmos schemas Zod das Server Actions. */
export function assertHmlZodPayloads(): void {
  for (const branch of HML_BRANCHES) {
    const parsed = createBranchSchema.safeParse({
      code: branch.code,
      name: branch.name,
      isHeadquarters: false,
    });
    if (!parsed.success) {
      throw new Error(`Filial ${branch.key} inválida: ${parsed.error.message}`);
    }
  }

  for (const center of HML_COST_CENTERS) {
    const parsed = createCostCenterSchema.safeParse({
      code: center.code,
      name: center.name,
      description: center.description,
    });
    if (!parsed.success) {
      throw new Error(`Centro ${center.key} inválido: ${parsed.error.message}`);
    }
  }

  for (const position of HML_POSITIONS) {
    const parsed = createPositionSchema.safeParse({
      code: position.code,
      name: position.name,
      description: position.description,
    });
    if (!parsed.success) {
      throw new Error(`Cargo ${position.key} inválido: ${parsed.error.message}`);
    }
  }

  for (const customer of HML_CUSTOMERS) {
    const parsed = createCustomerSchema.safeParse({
      legalName: customer.legalName,
      tradeName: customer.tradeName,
      taxId: customer.taxId,
      email: customer.email,
      phone: '0012345678',
      customerStatus: 'active',
      segment: 'commercial',
    });
    if (!parsed.success) {
      throw new Error(`Cliente ${customer.key} inválido: ${parsed.error.message}`);
    }
  }

  for (const supplier of HML_SUPPLIERS) {
    const parsed = createSupplierSchema.safeParse({
      corporateName: supplier.corporateName,
      document: supplier.document,
      categories: supplier.categories,
      city: supplier.city,
      state: supplier.state,
      phone: '0012345678',
      email: `fornecedor.${supplier.key}@example.com`,
    });
    if (!parsed.success) {
      throw new Error(`Fornecedor ${supplier.key} inválido: ${parsed.error.message}`);
    }
  }

  for (const driver of HML_DRIVERS) {
    const parsed = createDriverSchema.safeParse({
      name: driver.name,
      cpf: driver.cpf,
      cnhNumber: driver.cnhNumber,
      licenseCategory: driver.licenseCategory,
      licenseExpiresAt: '2030-12-31',
      operationalStatus: 'active',
      phone: '00123456789',
    });
    if (!parsed.success) {
      throw new Error(`Motorista ${driver.key} inválido: ${parsed.error.message}`);
    }
  }

  for (const vehicle of HML_VEHICLES) {
    const parsed = createVehicleSchema.safeParse({
      plate: vehicle.plate,
      vehicleType: vehicle.vehicleType,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      fuelType: vehicle.fuelType,
      initialOdometerKm: vehicle.initialOdometerKm,
      assetStatus: 'active',
    });
    if (!parsed.success) {
      throw new Error(`Veículo ${vehicle.key} inválido: ${parsed.error.message}`);
    }
  }
}

export function buildOfflinePlanSummary(mode: 'dry-run' | 'execute'): HmlSeedPlanSummary {
  return {
    mode,
    companySlug: HML_COMPANY_SLUG,
    requiredPlan: HML_REQUIRED_PLAN_SLUG,
    counts: getHmlCatalogCounts(),
    expectedPlan: buildHmlExpectedPlan(),
    modules: [
      'branches',
      'cost_centers',
      'positions',
      'customers',
      'customer_addresses',
      'customer_contacts',
      'customer_contracts',
      'customer_contract_items',
      'suppliers',
      'drivers',
      'vehicles',
      'routes',
      'trips',
      'trip_expenses',
      'trip_stops',
      'trip_occurrences',
      'trip_checklists',
      'fuel_records',
      'maintenance_records',
      'maintenance_parts',
      'maintenance_services',
      'tires',
      'tire_movements',
      'tire_inspections',
      'tire_recaps',
      'employees',
      'payroll_expenses',
      'accounts_payable',
      'accounts_receivable',
      'financial_entries',
    ],
  };
}

export function assertVolumeFitsProfessionalPlan(): void {
  if (HML_COUNTS.vehicles > 50) {
    throw new Error('Volume de veículos excede o plano Professional.');
  }
  if (HML_COUNTS.newBranches + 1 > 10) {
    throw new Error('Volume de filiais excede o plano Professional.');
  }
}
