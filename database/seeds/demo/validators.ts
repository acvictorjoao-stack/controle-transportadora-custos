import {DEMO_CUSTOM_POSITIONS} from './constants';
import {DEMO_DRIVERS, DEMO_EMPLOYEES, DEMO_SUPPLIERS, buildDemoFuelDefinitions} from './catalog';

export function assertDemoCatalogInvariants(): void {
  const driverNames = new Set(DEMO_DRIVERS.map((driver) => driver.name));
  const employeeDriverOverlap = DEMO_EMPLOYEES.filter((employee) => driverNames.has(employee.name));
  if (employeeDriverOverlap.length > 0) {
    throw new Error('Motoristas não podem existir em employees.');
  }

  const postoSuppliers = DEMO_SUPPLIERS.filter((supplier) => supplier.categories.includes('posto'));
  const oficinaSuppliers = DEMO_SUPPLIERS.filter((supplier) => supplier.categories.includes('oficina'));

  if (postoSuppliers.length === 0) {
    throw new Error('É necessário ao menos um fornecedor com categoria posto.');
  }

  if (oficinaSuppliers.length === 0) {
    throw new Error('É necessário ao menos um fornecedor com categoria oficina.');
  }

  for (const supplier of DEMO_SUPPLIERS) {
    if (supplier.categories.includes('posto') && supplier.categories.includes('oficina')) {
      throw new Error('Fornecedor não pode ser posto e oficina ao mesmo tempo.');
    }
  }

  const systemCodes = new Set(['MOTORISTA', 'SUPERVISOR', 'GERENTE', 'COORDENADOR', 'ANALISTA', 'ADMINISTRATIVO', 'OUTROS']);
  for (const position of DEMO_CUSTOM_POSITIONS) {
    if (systemCodes.has(position.code)) {
      throw new Error(`Cargo customizado duplica cargo system: ${position.code}`);
    }
  }

  const fuelRecords = buildDemoFuelDefinitions();
  const fuelByVehicle = new Map<string, typeof fuelRecords>();

  for (const record of fuelRecords) {
    const vehicleRecords = fuelByVehicle.get(record.vehicleKey) ?? [];
    vehicleRecords.push(record);
    fuelByVehicle.set(record.vehicleKey, vehicleRecords);
  }

  for (const [vehicleKey, vehicleRecords] of fuelByVehicle) {
    const sorted = [...vehicleRecords].sort((a, b) => b.daysAgo - a.daysAgo);
    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index].odometerKm < sorted[index - 1].odometerKm) {
        throw new Error(`Odômetro regressivo para veículo ${vehicleKey}.`);
      }
    }
  }
}

export function isDemoCompanyRecord(record: {
  slug?: string | null;
  tradeName?: string | null;
  settings?: Record<string, unknown> | null;
}): boolean {
  if (record.slug === 'demo-fleetcontrol-transportes') return true;
  if (record.tradeName?.startsWith('DEMO -')) return true;
  return record.settings?.is_demo_company === true;
}
