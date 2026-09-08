import {
  DEMO_COUNTS,
  DEMO_CUSTOM_POSITIONS,
  DEMO_EXTRA_COST_CENTERS,
  DEMO_TRIP_BUSY_STATUSES,
} from './constants';
import {demoExternalId, demoUuid} from './ids';

export interface DemoBranchDef {
  key: string;
  code: string;
  name: string;
  city: string;
  state: string;
  isHeadquarters: boolean;
}

export interface DemoVehicleDef {
  key: string;
  plate: string;
  vehicleType: string;
  brand: string;
  model: string;
  branchKey: string;
  fuelType: 'diesel' | 'gasoline' | 'ethanol';
  initialOdometerKm: number;
}

export interface DemoDriverDef {
  key: string;
  name: string;
  cpf: string;
  cnhNumber: string;
  branchKey: string;
}

export interface DemoEmployeeDef {
  key: string;
  name: string;
  positionCode: string;
  costCenterCode: string;
  branchKey: string;
}

export interface DemoCustomerDef {
  key: string;
  legalName: string;
  tradeName: string;
  city: string;
  state: string;
}

export interface DemoSupplierDef {
  key: string;
  corporateName: string;
  categories: Array<'posto' | 'oficina' | 'pneus' | 'outros'>;
  document: string;
  city: string;
  state: string;
}

export interface DemoRouteDef {
  key: string;
  name: string;
  code: string;
  origin: string;
  destination: string;
  distanceKm: number;
  customerKey?: string;
}

export const DEMO_BRANCHES: DemoBranchDef[] = [
  {
    key: 'matriz',
    code: 'MATRIZ',
    name: 'Matriz - São Luís/MA',
    city: 'São Luís',
    state: 'MA',
    isHeadquarters: true,
  },
  {
    key: 'imperatriz',
    code: 'IMP',
    name: 'Filial - Imperatriz/MA',
    city: 'Imperatriz',
    state: 'MA',
    isHeadquarters: false,
  },
  {
    key: 'teresina',
    code: 'THE',
    name: 'Filial - Teresina/PI',
    city: 'Teresina',
    state: 'PI',
    isHeadquarters: false,
  },
];

const DEMO_VEHICLE_BRANCHES = ['matriz', 'imperatriz', 'teresina'] as const;
const DEMO_VEHICLE_TYPES = [
  {vehicleType: 'Caminhão', brand: 'VOLVO', model: 'FH 540'},
  {vehicleType: 'Caminhão', brand: 'SCANIA', model: 'R450'},
  {vehicleType: 'Truck', brand: 'MERCEDES', model: 'ACTROS'},
  {vehicleType: 'Truck', brand: 'VOLVO', model: 'VM 330'},
  {vehicleType: 'Toco', brand: 'MERCEDES', model: 'ATEGO'},
  {vehicleType: 'Toco', brand: 'VOLKSWAGEN', model: 'DELIVERY'},
  {vehicleType: 'Van', brand: 'FIAT', model: 'DUCATO'},
  {vehicleType: 'Van', brand: 'RENAULT', model: 'MASTER'},
  {vehicleType: 'Caminhão', brand: 'IVECO', model: 'STRALIS'},
  {vehicleType: 'Truck', brand: 'DAF', model: 'XF'},
] as const;

const DEMO_DRIVER_FIRST_NAMES = [
  'JOÃO',
  'CARLOS',
  'MARCOS',
  'PEDRO',
  'RAFAEL',
  'LUCAS',
  'BRUNO',
  'FELIPE',
  'ANDRÉ',
  'DIEGO',
] as const;
const DEMO_DRIVER_LAST_NAMES = [
  'SILVA',
  'SOUZA',
  'OLIVEIRA',
  'SANTOS',
  'ALMEIDA',
  'FERREIRA',
  'COSTA',
  'ROCHA',
  'LIMA',
  'NUNES',
] as const;

/** Frota base + expansão determinística até DEMO_COUNTS.vehicles. */
export const DEMO_VEHICLES: DemoVehicleDef[] = Array.from(
  {length: DEMO_COUNTS.vehicles},
  (_, index) => {
    const n = index + 1;
    const type = DEMO_VEHICLE_TYPES[index % DEMO_VEHICLE_TYPES.length];
    return {
      key: `v${String(n).padStart(2, '0')}`,
      plate: `DEM${String(n).padStart(4, '0')}`,
      vehicleType: type.vehicleType,
      brand: type.brand,
      model: type.model,
      branchKey: DEMO_VEHICLE_BRANCHES[index % DEMO_VEHICLE_BRANCHES.length],
      fuelType: 'diesel' as const,
      initialOdometerKm: 35000 + index * 1370,
    };
  },
);

/** Motoristas base + expansão determinística até DEMO_COUNTS.drivers. */
export const DEMO_DRIVERS: DemoDriverDef[] = Array.from(
  {length: DEMO_COUNTS.drivers},
  (_, index) => {
    const n = index + 1;
    const first = DEMO_DRIVER_FIRST_NAMES[index % DEMO_DRIVER_FIRST_NAMES.length];
    const last = DEMO_DRIVER_LAST_NAMES[Math.floor(index / DEMO_DRIVER_FIRST_NAMES.length) % DEMO_DRIVER_LAST_NAMES.length];
    return {
      key: `d${String(n).padStart(2, '0')}`,
      name: `${first} ${last} ${String(n).padStart(2, '0')}`,
      cpf: `90${String(n).padStart(9, '0')}`,
      cnhNumber: `DEM${String(n).padStart(8, '0')}`,
      branchKey: DEMO_VEHICLE_BRANCHES[index % DEMO_VEHICLE_BRANCHES.length],
    };
  },
);

/** Frota usada em custos operacionais densos (fuel/maintenance/tires). */
export function getDemoOperationalFleet(): DemoVehicleDef[] {
  return DEMO_VEHICLES.slice(0, DEMO_COUNTS.operationalFleetSize);
}

export const DEMO_EMPLOYEES: DemoEmployeeDef[] = [
  {key: 'e01', name: 'ANA COSTA', positionCode: 'SUPERVISOR_OPERACOES', costCenterCode: 'OPERACIONAL', branchKey: 'matriz'},
  {key: 'e02', name: 'MARIA LIMA', positionCode: 'COORDENADOR_OPERACOES', costCenterCode: 'OPERACIONAL', branchKey: 'matriz'},
  {key: 'e03', name: 'PAULO MENDES', positionCode: 'GERENTE', costCenterCode: 'ADMINISTRATIVO', branchKey: 'matriz'},
  {key: 'e04', name: 'JULIANA RIBEIRO', positionCode: 'ANALISTA_FINANCEIRO', costCenterCode: 'FINANCEIRO', branchKey: 'matriz'},
  {key: 'e05', name: 'ROBERTO NUNES', positionCode: 'ANALISTA_ADMINISTRATIVO', costCenterCode: 'ADMINISTRATIVO', branchKey: 'imperatriz'},
  {key: 'e06', name: 'CAMILA ARAÚJO', positionCode: 'ASSISTENTE_ADMINISTRATIVO', costCenterCode: 'RH', branchKey: 'teresina'},
  {key: 'e07', name: 'DIEGO MARTINS', positionCode: 'AUXILIAR_LOGISTICA', costCenterCode: 'FROTA', branchKey: 'matriz'},
];

export const DEMO_CUSTOMERS: DemoCustomerDef[] = [
  {key: 'c01', legalName: 'Cliente Demo Norte Ltda', tradeName: 'Cliente Demo Norte', city: 'Belém', state: 'PA'},
  {key: 'c02', legalName: 'Cliente Demo Sul Ltda', tradeName: 'Cliente Demo Sul', city: 'Goiânia', state: 'GO'},
  {key: 'c03', legalName: 'Cliente Demo Maranhão Ltda', tradeName: 'Cliente Demo Maranhão', city: 'São Luís', state: 'MA'},
  {key: 'c04', legalName: 'Cliente Demo Pará Ltda', tradeName: 'Cliente Demo Pará', city: 'Marabá', state: 'PA'},
  {key: 'c05', legalName: 'Cliente Demo Piauí Ltda', tradeName: 'Cliente Demo Piauí', city: 'Teresina', state: 'PI'},
  {key: 'c06', legalName: 'Cliente Demo Centro Oeste Ltda', tradeName: 'Cliente Demo Centro Oeste', city: 'Brasília', state: 'DF'},
  {key: 'c07', legalName: 'Cliente Demo Nordeste Ltda', tradeName: 'Cliente Demo Nordeste', city: 'Fortaleza', state: 'CE'},
  {key: 'c08', legalName: 'Cliente Demo Sudeste Ltda', tradeName: 'Cliente Demo Sudeste', city: 'São Paulo', state: 'SP'},
  {key: 'c09', legalName: 'Cliente Demo Agro Norte Ltda', tradeName: 'Cliente Demo Agro Norte', city: 'Imperatriz', state: 'MA'},
  {key: 'c10', legalName: 'Cliente Demo Mineração Ltda', tradeName: 'Cliente Demo Mineração', city: 'Parauapebas', state: 'PA'},
  {key: 'c11', legalName: 'Cliente Demo Varejo Ltda', tradeName: 'Cliente Demo Varejo', city: 'São Luís', state: 'MA'},
  {key: 'c12', legalName: 'Cliente Demo Indústria Ltda', tradeName: 'Cliente Demo Indústria', city: 'Timon', state: 'MA'},
  {key: 'c13', legalName: 'Cliente Demo Atacado Ltda', tradeName: 'Cliente Demo Atacado', city: 'Caxias', state: 'MA'},
  {key: 'c14', legalName: 'Cliente Demo Logística Ltda', tradeName: 'Cliente Demo Logística', city: 'Teresina', state: 'PI'},
  {key: 'c15', legalName: 'Cliente Demo Alimentos Ltda', tradeName: 'Cliente Demo Alimentos', city: 'Bacabal', state: 'MA'},
  {key: 'c16', legalName: 'Cliente Demo Construção Ltda', tradeName: 'Cliente Demo Construção', city: 'Parnaíba', state: 'PI'},
  {key: 'c17', legalName: 'Cliente Demo Farmácia Ltda', tradeName: 'Cliente Demo Farmácia', city: 'São Luís', state: 'MA'},
  {key: 'c18', legalName: 'Cliente Demo Papel Ltda', tradeName: 'Cliente Demo Papel', city: 'Imperatriz', state: 'MA'},
  {key: 'c19', legalName: 'Cliente Demo Bebidas Ltda', tradeName: 'Cliente Demo Bebidas', city: 'Teresina', state: 'PI'},
  {key: 'c20', legalName: 'Cliente Demo Eletro Ltda', tradeName: 'Cliente Demo Eletro', city: 'Belém', state: 'PA'},
];

export const DEMO_SUPPLIERS: DemoSupplierDef[] = [
  {key: 's01', corporateName: 'Posto Demo Norte', categories: ['posto'], document: '91000000000001', city: 'São Luís', state: 'MA'},
  {key: 's02', corporateName: 'Posto Demo Sul', categories: ['posto'], document: '91000000000002', city: 'Imperatriz', state: 'MA'},
  {key: 's03', corporateName: 'Posto Demo Leste', categories: ['posto'], document: '91000000000003', city: 'Teresina', state: 'PI'},
  {key: 's04', corporateName: 'Oficina Demo Mecânica', categories: ['oficina'], document: '92000000000001', city: 'São Luís', state: 'MA'},
  {key: 's05', corporateName: 'Oficina Demo Diesel', categories: ['oficina'], document: '92000000000002', city: 'Imperatriz', state: 'MA'},
  {key: 's06', corporateName: 'Pneus Demo Center', categories: ['pneus'], document: '93000000000001', city: 'Teresina', state: 'PI'},
  {key: 's07', corporateName: 'Fornecedor Demo Operacional', categories: ['outros'], document: '94000000000001', city: 'São Luís', state: 'MA'},
  {key: 's08', corporateName: 'Borracharia Demo Express', categories: ['pneus', 'outros'], document: '93000000000002', city: 'Imperatriz', state: 'MA'},
];

export const DEMO_ROUTES: DemoRouteDef[] = [
  {key: 'r01', name: 'São Luís → Imperatriz', code: 'SLZ-IMP', origin: 'São Luís/MA', destination: 'Imperatriz/MA', distanceKm: 480, customerKey: 'c03'},
  {key: 'r02', name: 'São Luís → Teresina', code: 'SLZ-THE', origin: 'São Luís/MA', destination: 'Teresina/PI', distanceKm: 410, customerKey: 'c05'},
  {key: 'r03', name: 'São Luís → Belém', code: 'SLZ-BEL', origin: 'São Luís/MA', destination: 'Belém/PA', distanceKm: 805, customerKey: 'c01'},
  {key: 'r04', name: 'Imperatriz → Marabá', code: 'IMP-MAB', origin: 'Imperatriz/MA', destination: 'Marabá/PA', distanceKm: 520, customerKey: 'c04'},
  {key: 'r05', name: 'Teresina → Fortaleza', code: 'THE-FOR', origin: 'Teresina/PI', destination: 'Fortaleza/CE', distanceKm: 630, customerKey: 'c07'},
  {key: 'r06', name: 'São Luís → Caxias', code: 'SLZ-CAX', origin: 'São Luís/MA', destination: 'Caxias/MA', distanceKm: 360, customerKey: 'c13'},
  {key: 'r07', name: 'Imperatriz → Teresina', code: 'IMP-THE', origin: 'Imperatriz/MA', destination: 'Teresina/PI', distanceKm: 620, customerKey: 'c14'},
  {key: 'r08', name: 'São Luís → Bacabal', code: 'SLZ-BAC', origin: 'São Luís/MA', destination: 'Bacabal/MA', distanceKm: 250, customerKey: 'c15'},
  {key: 'r09', name: 'Teresina → Parnaíba', code: 'THE-PAR', origin: 'Teresina/PI', destination: 'Parnaíba/PI', distanceKm: 360, customerKey: 'c16'},
  {key: 'r10', name: 'São Luís → Timon', code: 'SLZ-TIM', origin: 'São Luís/MA', destination: 'Timon/MA', distanceKm: 390, customerKey: 'c12'},
  {key: 'r11', name: 'Imperatriz → Parauapebas', code: 'IMP-PPB', origin: 'Imperatriz/MA', destination: 'Parauapebas/PA', distanceKm: 710, customerKey: 'c10'},
  {key: 'r12', name: 'São Luís → Brasília', code: 'SLZ-BSB', origin: 'São Luís/MA', destination: 'Brasília/DF', distanceKm: 1980, customerKey: 'c06'},
  {key: 'r13', name: 'Teresina → Goiânia', code: 'THE-GYN', origin: 'Teresina/PI', destination: 'Goiânia/GO', distanceKm: 1540, customerKey: 'c02'},
  {key: 'r14', name: 'São Luís → São Paulo', code: 'SLZ-SPO', origin: 'São Luís/MA', destination: 'São Paulo/SP', distanceKm: 2680, customerKey: 'c08'},
  {key: 'r15', name: 'Imperatriz → Belém', code: 'IMP-BEL', origin: 'Imperatriz/MA', destination: 'Belém/PA', distanceKm: 980, customerKey: 'c20'},
  {key: 'r16', name: 'Teresina → Imperatriz', code: 'THE-IMP', origin: 'Teresina/PI', destination: 'Imperatriz/MA', distanceKm: 620, customerKey: 'c09'},
  {key: 'r17', name: 'São Luís → Parnaíba', code: 'SLZ-PAR', origin: 'São Luís/MA', destination: 'Parnaíba/PI', distanceKm: 430, customerKey: 'c16'},
  {key: 'r18', name: 'Imperatriz → Caxias', code: 'IMP-CAX', origin: 'Imperatriz/MA', destination: 'Caxias/MA', distanceKm: 290, customerKey: 'c13'},
];

/**
 * Distribuição temporal DEMO (index 1-based) — viagens e custos operacionais.
 * - ~20% no mês corrente (daysAgo 1..dia-do-mês UTC);
 * - ~20% no restante dos últimos 30 dias;
 * - ~60% históricas (31–180 dias).
 * Garante amostra útil no Dashboard do mês atual sem concentrar tudo nele.
 */
export function demoBucketedDaysAgo(
  index: number,
  count: number,
  now: Date = new Date(),
): number {
  const safeCount = Math.max(count, 1);
  const dayOfMonth = Math.max(now.getUTCDate(), 1);
  const currentMonthBucket = Math.ceil(safeCount * 0.2);
  const recentBucket = Math.ceil(safeCount * 0.2);

  if (index <= currentMonthBucket) {
    return ((index - 1) % dayOfMonth) + 1;
  }

  if (index <= currentMonthBucket + recentBucket) {
    const local = index - currentMonthBucket;
    const remainingRecentDays = Math.max(30 - dayOfMonth, 1);
    return dayOfMonth + 1 + ((local - 1) % remainingRecentDays);
  }

  const olderIndex = index - currentMonthBucket - recentBucket;
  return 31 + ((olderIndex - 1) % 150);
}

/** Alias estável para viagens — mesma regra 20/20/60. */
export function demoTripDaysAgo(
  index: number,
  count = DEMO_COUNTS.trips,
  now: Date = new Date(),
): number {
  return demoBucketedDaysAgo(index, count, now);
}

/**
 * Distribuição de viagens DEMO compatível com unicidade de recurso busy.
 *
 * Proporção alvo (count=150): 60% completed, 20% in_progress, 20% planned.
 * Trips busy (in_progress + planned) recebem slots exclusivos de veículo e
 * motorista (índices 0..N-1), sem reutilizar o mesmo recurso em outra busy.
 * Trips completed podem reutilizar a frota livremente (round-robin).
 */
export function buildDemoTripDefinitions(
  count = DEMO_COUNTS.trips,
  now: Date = new Date(),
) {
  const completedCount = Math.round(count * 0.6);
  const remaining = count - completedCount;
  const inProgressCount = Math.floor(remaining / 2);
  const plannedCount = remaining - inProgressCount;
  const busyCount = inProgressCount + plannedCount;
  const busyCapacity = Math.min(DEMO_VEHICLES.length, DEMO_DRIVERS.length);

  if (busyCount > busyCapacity) {
    throw new Error(
      `Seed DEMO: ${busyCount} trips busy excedem a capacidade da frota (${busyCapacity}).`,
    );
  }

  const trips = [];

  for (let index = 1; index <= count; index += 1) {
    const route = DEMO_ROUTES[(index - 1) % DEMO_ROUTES.length];
    const customer = DEMO_CUSTOMERS[(index - 1) % DEMO_CUSTOMERS.length];
    const daysAgo = demoTripDaysAgo(index, count, now);
    const freight = 2500 + route.distanceKm * 3.2 + (index % 7) * 150;

    let status: 'completed' | 'in_progress' | 'planned';
    let vehicle: DemoVehicleDef;
    let driver: DemoDriverDef;

    if (index <= completedCount) {
      status = 'completed';
      vehicle = DEMO_VEHICLES[(index - 1) % DEMO_VEHICLES.length];
      driver = DEMO_DRIVERS[(index - 1) % DEMO_DRIVERS.length];
    } else if (index <= completedCount + inProgressCount) {
      status = 'in_progress';
      const slot = index - completedCount - 1;
      vehicle = DEMO_VEHICLES[slot];
      driver = DEMO_DRIVERS[slot];
    } else {
      status = 'planned';
      const slot = inProgressCount + (index - completedCount - inProgressCount - 1);
      vehicle = DEMO_VEHICLES[slot];
      driver = DEMO_DRIVERS[slot];
    }

    trips.push({
      key: `t${String(index).padStart(3, '0')}`,
      routeKey: route.key,
      vehicleKey: vehicle.key,
      driverKey: driver.key,
      customerKey: customer.key,
      status,
      daysAgo,
      distanceKm: route.distanceKm,
      freight: Number(freight.toFixed(2)),
    });
  }

  return trips;
}

/** Invariantes de unicidade busy usados por testes do seed. */
export function assertDemoTripBusyUniqueness(
  trips: ReturnType<typeof buildDemoTripDefinitions> = buildDemoTripDefinitions(),
): void {
  const busy = new Set<string>(DEMO_TRIP_BUSY_STATUSES);
  const vehicles = new Map<string, string[]>();
  const drivers = new Map<string, string[]>();

  for (const trip of trips) {
    if (!busy.has(trip.status)) continue;

    const vehicleTrips = vehicles.get(trip.vehicleKey) ?? [];
    vehicleTrips.push(trip.key);
    vehicles.set(trip.vehicleKey, vehicleTrips);

    const driverTrips = drivers.get(trip.driverKey) ?? [];
    driverTrips.push(trip.key);
    drivers.set(trip.driverKey, driverTrips);
  }

  for (const [vehicleKey, keys] of vehicles) {
    if (keys.length > 1) {
      throw new Error(
        `Veículo busy duplicado ${vehicleKey}: ${keys.join(', ')}`,
      );
    }
  }
  for (const [driverKey, keys] of drivers) {
    if (keys.length > 1) {
      throw new Error(
        `Motorista busy duplicado ${driverKey}: ${keys.join(', ')}`,
      );
    }
  }
}

export function buildDemoFuelDefinitions(
  count = DEMO_COUNTS.fuelRecords,
  now: Date = new Date(),
) {
  const drafts: Array<{
    key: string;
    vehicleKey: string;
    driverKey: string;
    supplierKey: string;
    daysAgo: number;
    liters: number;
    pricePerLiter: number;
    totalAmount: number;
    paymentType: 'credit' | 'cash';
  }> = [];
  const postoSuppliers = DEMO_SUPPLIERS.filter((supplier) => supplier.categories.includes('posto'));
  const fleet = getDemoOperationalFleet();
  const vehicleCount = fleet.length;
  const basePerVehicle = Math.floor(count / vehicleCount);
  const remainder = count % vehicleCount;

  let fuelIndex = 0;

  for (let vehicleIndex = 0; vehicleIndex < vehicleCount; vehicleIndex += 1) {
    const vehicle = fleet[vehicleIndex];
    const vehicleRecordCount = basePerVehicle + (vehicleIndex < remainder ? 1 : 0);

    for (let seq = 0; seq < vehicleRecordCount; seq += 1) {
      fuelIndex += 1;
      const driver = DEMO_DRIVERS[(fuelIndex - 1) % DEMO_DRIVERS.length];
      const supplier = postoSuppliers[(fuelIndex - 1) % postoSuppliers.length];
      // 20/20/60 por veículo → vários veículos com custo no mês corrente.
      const daysAgo = demoBucketedDaysAgo(seq + 1, vehicleRecordCount, now);
      const liters = 120 + (fuelIndex % 6) * 15;
      const pricePerLiter = 5.89 + (fuelIndex % 4) * 0.07;

      drafts.push({
        key: `f${String(fuelIndex).padStart(3, '0')}`,
        vehicleKey: vehicle.key,
        driverKey: driver.key,
        supplierKey: supplier.key,
        daysAgo,
        liters,
        pricePerLiter: Number(pricePerLiter.toFixed(2)),
        totalAmount: Number((liters * pricePerLiter).toFixed(2)),
        paymentType: fuelIndex % 3 === 0 ? 'credit' : 'cash',
      });
    }
  }

  // Odômetro crescente na ordem cronológica (fueled_at ASC = daysAgo DESC).
  const records: Array<(typeof drafts)[number] & {odometerKm: number}> = [];
  const byVehicle = new Map<string, typeof drafts>();
  for (const draft of drafts) {
    const list = byVehicle.get(draft.vehicleKey) ?? [];
    list.push(draft);
    byVehicle.set(draft.vehicleKey, list);
  }

  for (const vehicle of fleet) {
    const vehicleDrafts = byVehicle.get(vehicle.key) ?? [];
    const chronological = [...vehicleDrafts].sort((a, b) => b.daysAgo - a.daysAgo);
    chronological.forEach((draft, seq) => {
      records.push({
        ...draft,
        odometerKm: vehicle.initialOdometerKm + seq * 450 + (seq % 5) * 80,
      });
    });
  }

  return records.sort((a, b) => a.key.localeCompare(b.key));
}

export function buildDemoMaintenanceDefinitions(
  count = DEMO_COUNTS.maintenanceRecords,
  now: Date = new Date(),
) {
  const types = ['preventive', 'corrective', 'emergency'] as const;
  const workshopSuppliers = DEMO_SUPPLIERS.filter((supplier) =>
    supplier.categories.includes('oficina'),
  );

  const drafts = Array.from({length: count}, (_, index) => {
    const fleet = getDemoOperationalFleet();
    const vehicle = fleet[index % fleet.length];
    const supplier = workshopSuppliers[index % workshopSuppliers.length];
    const amount = 850 + (index % 9) * 420;

    return {
      key: `m${String(index + 1).padStart(3, '0')}`,
      vehicleKey: vehicle.key,
      supplierKey: supplier.key,
      maintenanceType: types[index % types.length],
      amount,
      paymentType: (index % 4 === 0 ? 'credit' : 'cash') as 'credit' | 'cash',
      maintenanceStatus: (index % 5 === 0 ? 'open' : 'completed') as 'open' | 'completed',
    };
  });

  const byVehicle = new Map<string, typeof drafts>();
  for (const draft of drafts) {
    const list = byVehicle.get(draft.vehicleKey) ?? [];
    list.push(draft);
    byVehicle.set(draft.vehicleKey, list);
  }

  const records: Array<(typeof drafts)[number] & {daysAgo: number}> = [];
  for (const vehicle of getDemoOperationalFleet()) {
    const vehicleDrafts = byVehicle.get(vehicle.key) ?? [];
    vehicleDrafts.forEach((draft, seq) => {
      records.push({
        ...draft,
        daysAgo: demoBucketedDaysAgo(seq + 1, vehicleDrafts.length, now),
      });
    });
  }

  return records.sort((a, b) => a.key.localeCompare(b.key));
}

export function buildDemoPayrollDefinitions(months = DEMO_COUNTS.payrollMonths) {
  const items = [
    {personKind: 'driver' as const, personKey: 'd01', expenseType: 'salario' as const, amount: 3500, costCenterCode: 'OPERACIONAL'},
    {personKind: 'driver' as const, personKey: 'd01', expenseType: 'hora_extra' as const, amount: 400, costCenterCode: 'OPERACIONAL'},
    {personKind: 'driver' as const, personKey: 'd02', expenseType: 'salario' as const, amount: 3400, costCenterCode: 'OPERACIONAL'},
    {personKind: 'employee' as const, personKey: 'e01', expenseType: 'salario' as const, amount: 5500, costCenterCode: 'OPERACIONAL', positionCode: 'SUPERVISOR_OPERACOES'},
    {personKind: 'employee' as const, personKey: 'e02', expenseType: 'salario' as const, amount: 6200, costCenterCode: 'OPERACIONAL', positionCode: 'COORDENADOR_OPERACOES'},
    {personKind: 'employee' as const, personKey: 'e03', expenseType: 'salario' as const, amount: 8000, costCenterCode: 'ADMINISTRATIVO', positionCode: 'GERENTE'},
    {personKind: 'employee' as const, personKey: 'e04', expenseType: 'salario' as const, amount: 4000, costCenterCode: 'FINANCEIRO', positionCode: 'ANALISTA_FINANCEIRO'},
    {personKind: 'employee' as const, personKey: 'e05', expenseType: 'salario' as const, amount: 3800, costCenterCode: 'ADMINISTRATIVO', positionCode: 'ANALISTA_ADMINISTRATIVO'},
    {personKind: 'employee' as const, personKey: 'e06', expenseType: 'salario' as const, amount: 2800, costCenterCode: 'RH', positionCode: 'ASSISTENTE_ADMINISTRATIVO'},
    {personKind: 'employee' as const, personKey: 'e07', expenseType: 'salario' as const, amount: 2600, costCenterCode: 'FROTA', positionCode: 'AUXILIAR_LOGISTICA'},
  ];

  const payroll = [];
  for (let monthOffset = 0; monthOffset < months; monthOffset += 1) {
    for (const item of items) {
      payroll.push({
        key: `p-${monthOffset}-${item.personKey}-${item.expenseType}`,
        monthOffset,
        ...item,
        expenseStatus: monthOffset < 2 ? 'paid' : monthOffset === 2 ? 'pending' : monthOffset === 3 ? 'pending' : 'paid',
      });
    }
  }

  return payroll;
}

export function buildDemoTireDefinitions(
  count = DEMO_COUNTS.tires,
  now: Date = new Date(),
) {
  const tireSupplier = DEMO_SUPPLIERS.find((supplier) =>
    supplier.categories.includes('pneus'),
  );

  const fleet = getDemoOperationalFleet();
  const drafts = Array.from({length: count}, (_, index) => ({
    key: `tire-${String(index + 1).padStart(2, '0')}`,
    vehicleKey: fleet[index % fleet.length].key,
    supplierKey: tireSupplier?.key ?? 's06',
    brand: 'MICHELIN',
    model: 'X MULTI',
    purchaseValue: 2800 + (index % 4) * 250,
  }));

  const byVehicle = new Map<string, typeof drafts>();
  for (const draft of drafts) {
    const list = byVehicle.get(draft.vehicleKey) ?? [];
    list.push(draft);
    byVehicle.set(draft.vehicleKey, list);
  }

  const records: Array<(typeof drafts)[number] & {daysAgo: number}> = [];
  for (const vehicle of fleet) {
    const vehicleDrafts = byVehicle.get(vehicle.key) ?? [];
    vehicleDrafts.forEach((draft, seq) => {
      records.push({
        ...draft,
        daysAgo: demoBucketedDaysAgo(seq + 1, vehicleDrafts.length, now),
      });
    });
  }

  return records.sort((a, b) => a.key.localeCompare(b.key));
}

export function getDemoCatalogMetadata() {
  return {
    branches: DEMO_BRANCHES.length,
    vehicles: DEMO_VEHICLES.length,
    drivers: DEMO_DRIVERS.length,
    employees: DEMO_EMPLOYEES.length,
    customers: DEMO_CUSTOMERS.length,
    suppliers: DEMO_SUPPLIERS.length,
    routes: DEMO_ROUTES.length,
    trips: DEMO_COUNTS.trips,
    fuelRecords: DEMO_COUNTS.fuelRecords,
    maintenanceRecords: DEMO_COUNTS.maintenanceRecords,
    tires: DEMO_COUNTS.tires,
    customPositions: DEMO_CUSTOM_POSITIONS.length,
    extraCostCenters: DEMO_EXTRA_COST_CENTERS.length,
    companyId: demoUuid('company', 'main'),
    companyExternalId: demoExternalId('company', 'main'),
  };
}
