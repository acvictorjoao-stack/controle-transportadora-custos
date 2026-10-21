import {HML_COUNTS, HML_NOTES_PREFIX, HML_TRIP_BUSY_STATUSES} from './constants';
import {makeInvalidCnpj, makeInvalidCpf} from './documents';

export interface HmlBranchDef {
  key: string;
  code: string;
  name: string;
  city: string;
  state: string;
}

export interface HmlCostCenterDef {
  key: string;
  code: string;
  name: string;
  description: string;
}

export interface HmlPositionDef {
  key: string;
  code: string;
  name: string;
  description: string;
}

export interface HmlCustomerDef {
  key: string;
  legalName: string;
  tradeName: string;
  taxId: string;
  email: string;
  city: string;
  state: string;
  withAddress: boolean;
  withContact: boolean;
  withContract: boolean;
}

export interface HmlSupplierDef {
  key: string;
  corporateName: string;
  document: string;
  categories: Array<'posto' | 'oficina' | 'pneus' | 'outros'>;
  city: string;
  state: string;
}

export interface HmlDriverDef {
  key: string;
  name: string;
  cpf: string;
  cnhNumber: string;
  licenseCategory: 'C' | 'D' | 'E';
  branchKey: 'hq' | 'imp' | 'the';
}

export interface HmlVehicleDef {
  key: string;
  plate: string;
  vehicleType: string;
  brand: string;
  model: string;
  year: number;
  fuelType: 'diesel';
  initialOdometerKm: number;
  branchKey: 'hq' | 'imp' | 'the';
}

export interface HmlRouteDef {
  key: string;
  code: string;
  name: string;
  origin: string;
  destination: string;
  distanceKm: number;
  leadTimeDays: number;
  customerKey: string;
  branchKey: 'hq' | 'imp' | 'the';
}

export interface HmlEmployeeDef {
  key: string;
  name: string;
  cpf: string;
  email: string;
  positionKey: string;
  costCenterCode: string;
  branchKey: 'hq' | 'imp' | 'the';
}

export interface HmlTripDef {
  key: string;
  routeKey: string;
  vehicleKey: string;
  driverKey: string;
  customerKey: string;
  status: 'completed' | 'in_progress' | 'planned' | 'cancelled';
  daysAgo: number;
  distanceKm: number;
  freight: number;
  /** Odômetro de criação — determinístico por sequência do veículo. */
  initialOdometerKm: number;
  /** Odômetro final (somente completed); demais status = null. */
  finalOdometerKm: number | null;
}

export const HML_BRANCHES: HmlBranchDef[] = [
  {key: 'imp', code: 'HML-IMP', name: `${HML_NOTES_PREFIX} Filial Imperatriz`, city: 'Imperatriz', state: 'MA'},
  {key: 'the', code: 'HML-THE', name: `${HML_NOTES_PREFIX} Filial Teresina`, city: 'Teresina', state: 'PI'},
];

export const HML_COST_CENTERS: HmlCostCenterDef[] = [
  {key: 'cc-frota', code: 'HML-FROTA', name: `${HML_NOTES_PREFIX} Frota`, description: 'Centro de custo de homologação — frota'},
  {key: 'cc-manut', code: 'HML-MANUT', name: `${HML_NOTES_PREFIX} Manutenção`, description: 'Centro de custo de homologação — manutenção'},
  {key: 'cc-fin', code: 'HML-FIN', name: `${HML_NOTES_PREFIX} Financeiro Extra`, description: 'Centro de custo de homologação — financeiro'},
];

export const HML_POSITIONS: HmlPositionDef[] = [
  {
    key: 'pos-analista',
    code: 'HML_ANALISTA_OPS',
    name: `${HML_NOTES_PREFIX} Analista de Operações`,
    description: 'Cargo fictício de homologação',
  },
  {
    key: 'pos-aux',
    code: 'HML_AUX_LOG',
    name: `${HML_NOTES_PREFIX} Auxiliar Logística`,
    description: 'Cargo fictício de homologação',
  },
];

const CUSTOMER_CITIES = [
  {city: 'São Luís', state: 'MA'},
  {city: 'Imperatriz', state: 'MA'},
  {city: 'Teresina', state: 'PI'},
  {city: 'Belém', state: 'PA'},
  {city: 'Fortaleza', state: 'CE'},
] as const;

export const HML_CUSTOMERS: HmlCustomerDef[] = Array.from(
  {length: HML_COUNTS.customers},
  (_, index) => {
    const n = index + 1;
    const place = CUSTOMER_CITIES[index % CUSTOMER_CITIES.length];
    return {
      key: `c${String(n).padStart(2, '0')}`,
      legalName: `${HML_NOTES_PREFIX} Cliente Homologação ${n} Ltda`,
      tradeName: `${HML_NOTES_PREFIX} Cliente ${n}`,
      taxId: makeInvalidCnpj(100 + n),
      email: `cliente.hml${n}@example.com`,
      city: place.city,
      state: place.state,
      withAddress: n <= HML_COUNTS.customerAddresses,
      withContact: n <= HML_COUNTS.customerContacts,
      withContract: n <= HML_COUNTS.contracts,
    };
  },
);

export const HML_SUPPLIERS: HmlSupplierDef[] = [
  {key: 's01', corporateName: `${HML_NOTES_PREFIX} Posto Norte`, document: makeInvalidCnpj(201), categories: ['posto'], city: 'São Luís', state: 'MA'},
  {key: 's02', corporateName: `${HML_NOTES_PREFIX} Posto Sul`, document: makeInvalidCnpj(202), categories: ['posto'], city: 'Imperatriz', state: 'MA'},
  {key: 's03', corporateName: `${HML_NOTES_PREFIX} Oficina Diesel`, document: makeInvalidCnpj(203), categories: ['oficina'], city: 'São Luís', state: 'MA'},
  {key: 's04', corporateName: `${HML_NOTES_PREFIX} Oficina Mecânica`, document: makeInvalidCnpj(204), categories: ['oficina'], city: 'Teresina', state: 'PI'},
  {key: 's05', corporateName: `${HML_NOTES_PREFIX} Pneus Center`, document: makeInvalidCnpj(205), categories: ['pneus'], city: 'São Luís', state: 'MA'},
  {key: 's06', corporateName: `${HML_NOTES_PREFIX} Fornecedor Geral`, document: makeInvalidCnpj(206), categories: ['outros'], city: 'Imperatriz', state: 'MA'},
];

const DRIVER_NAMES = [
  'JOÃO HOMOL',
  'CARLOS HOMOL',
  'MARCOS HOMOL',
  'PEDRO HOMOL',
  'RAFAEL HOMOL',
  'LUCAS HOMOL',
  'BRUNO HOMOL',
  'FELIPE HOMOL',
  'ANDRÉ HOMOL',
  'DIEGO HOMOL',
] as const;

const BRANCH_KEYS = ['hq', 'imp', 'the'] as const;

export const HML_DRIVERS: HmlDriverDef[] = Array.from(
  {length: HML_COUNTS.drivers},
  (_, index) => {
    const n = index + 1;
    return {
      key: `d${String(n).padStart(2, '0')}`,
      name: `${HML_NOTES_PREFIX} ${DRIVER_NAMES[index]} ${String(n).padStart(2, '0')}`,
      cpf: makeInvalidCpf(n),
      cnhNumber: `HML${String(n).padStart(8, '0')}`,
      licenseCategory: (['C', 'D', 'E'] as const)[index % 3],
      branchKey: BRANCH_KEYS[index % BRANCH_KEYS.length],
    };
  },
);

const VEHICLE_TYPES = [
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

/** Placas Mercosul fictícias com prefixo HML (ABC1D45). */
export const HML_VEHICLES: HmlVehicleDef[] = Array.from(
  {length: HML_COUNTS.vehicles},
  (_, index) => {
    const n = index + 1;
    const type = VEHICLE_TYPES[index % VEHICLE_TYPES.length];
    const letter = String.fromCharCode(65 + (index % 26));
    return {
      key: `v${String(n).padStart(2, '0')}`,
      plate: `HML1${letter}${String(n).padStart(2, '0')}`,
      vehicleType: type.vehicleType,
      brand: type.brand,
      model: type.model,
      year: 2019 + (index % 6),
      fuelType: 'diesel',
      initialOdometerKm: 40000 + index * 1250,
      branchKey: BRANCH_KEYS[index % BRANCH_KEYS.length],
    };
  },
);

export const HML_ROUTES: HmlRouteDef[] = [
  {key: 'r01', code: 'HML-SLZ-IMP', name: `${HML_NOTES_PREFIX} São Luís → Imperatriz`, origin: 'São Luís/MA', destination: 'Imperatriz/MA', distanceKm: 480, leadTimeDays: 1, customerKey: 'c01', branchKey: 'hq'},
  {key: 'r02', code: 'HML-SLZ-THE', name: `${HML_NOTES_PREFIX} São Luís → Teresina`, origin: 'São Luís/MA', destination: 'Teresina/PI', distanceKm: 410, leadTimeDays: 1, customerKey: 'c03', branchKey: 'hq'},
  {key: 'r03', code: 'HML-IMP-BEL', name: `${HML_NOTES_PREFIX} Imperatriz → Belém`, origin: 'Imperatriz/MA', destination: 'Belém/PA', distanceKm: 980, leadTimeDays: 2, customerKey: 'c04', branchKey: 'imp'},
  {key: 'r04', code: 'HML-THE-FOR', name: `${HML_NOTES_PREFIX} Teresina → Fortaleza`, origin: 'Teresina/PI', destination: 'Fortaleza/CE', distanceKm: 630, leadTimeDays: 2, customerKey: 'c05', branchKey: 'the'},
  {key: 'r05', code: 'HML-SLZ-BEL', name: `${HML_NOTES_PREFIX} São Luís → Belém`, origin: 'São Luís/MA', destination: 'Belém/PA', distanceKm: 805, leadTimeDays: 2, customerKey: 'c04', branchKey: 'hq'},
  {key: 'r06', code: 'HML-IMP-THE', name: `${HML_NOTES_PREFIX} Imperatriz → Teresina`, origin: 'Imperatriz/MA', destination: 'Teresina/PI', distanceKm: 620, leadTimeDays: 1, customerKey: 'c03', branchKey: 'imp'},
  {key: 'r07', code: 'HML-THE-SLZ', name: `${HML_NOTES_PREFIX} Teresina → São Luís`, origin: 'Teresina/PI', destination: 'São Luís/MA', distanceKm: 410, leadTimeDays: 1, customerKey: 'c01', branchKey: 'the'},
  {key: 'r08', code: 'HML-SLZ-FOR', name: `${HML_NOTES_PREFIX} São Luís → Fortaleza`, origin: 'São Luís/MA', destination: 'Fortaleza/CE', distanceKm: 970, leadTimeDays: 2, customerKey: 'c05', branchKey: 'hq'},
];

export const HML_EMPLOYEES: HmlEmployeeDef[] = [
  {key: 'e01', name: `${HML_NOTES_PREFIX} Ana Operações`, cpf: makeInvalidCpf(51), email: 'ana.hml@example.com', positionKey: 'pos-analista', costCenterCode: 'OPERACIONAL', branchKey: 'hq'},
  {key: 'e02', name: `${HML_NOTES_PREFIX} Bruno Admin`, cpf: makeInvalidCpf(52), email: 'bruno.hml@example.com', positionKey: 'pos-aux', costCenterCode: 'ADMINISTRATIVO', branchKey: 'hq'},
  {key: 'e03', name: `${HML_NOTES_PREFIX} Carla Financeiro`, cpf: makeInvalidCpf(53), email: 'carla.hml@example.com', positionKey: 'pos-analista', costCenterCode: 'HML-FIN', branchKey: 'hq'},
  {key: 'e04', name: `${HML_NOTES_PREFIX} Diego Frota`, cpf: makeInvalidCpf(54), email: 'diego.hml@example.com', positionKey: 'pos-aux', costCenterCode: 'HML-FROTA', branchKey: 'imp'},
  {key: 'e05', name: `${HML_NOTES_PREFIX} Elena Manutenção`, cpf: makeInvalidCpf(55), email: 'elena.hml@example.com', positionKey: 'pos-aux', costCenterCode: 'HML-MANUT', branchKey: 'the'},
];

/**
 * Distribuição temporal 20/20/60 (mês corrente / 30 dias / histórico).
 */
export function hmlBucketedDaysAgo(
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
  return 31 + ((olderIndex - 1) % 90);
}

/**
 * 12 completed + 3 in_progress + 3 planned + 2 cancelled = 20.
 * Busy (in_progress + planned) usam slots exclusivos de veículo/motorista.
 *
 * Odômetros: cursor por veículo partindo de `HML_VEHICLES.initialOdometerKm`.
 * Viagem completed avança o cursor para initial+distance (paridade com
 * `completeTrip` → `vehicles.current_odometer_km`). in_progress só fixa o
 * piso do KM inicial (referência de hodômetro da app). planned/cancelled
 * reutilizam o cursor sem avançá-lo além do já registrado.
 */
export function buildHmlTripDefinitions(
  count: number = HML_COUNTS.trips,
  now: Date = new Date(),
): HmlTripDef[] {
  const completedCount = 12;
  const inProgressCount = 3;
  const plannedCount = 3;
  const cancelledCount = 2;
  if (completedCount + inProgressCount + plannedCount + cancelledCount !== count) {
    throw new Error('Distribuição de status de viagens HML inconsistente com HML_COUNTS.trips.');
  }

  const busyCount = inProgressCount + plannedCount;
  if (busyCount > Math.min(HML_VEHICLES.length, HML_DRIVERS.length)) {
    throw new Error('Viagens busy excedem a frota de homologação.');
  }

  const odometerCursor = new Map<string, number>(
    HML_VEHICLES.map((vehicle) => [vehicle.key, vehicle.initialOdometerKm]),
  );

  const trips: HmlTripDef[] = [];

  for (let index = 1; index <= count; index += 1) {
    const route = HML_ROUTES[(index - 1) % HML_ROUTES.length];
    const customer = HML_CUSTOMERS[(index - 1) % HML_CUSTOMERS.length];
    const daysAgo = hmlBucketedDaysAgo(index, count, now);
    const freight = Number((2200 + route.distanceKm * 2.8 + (index % 5) * 120).toFixed(2));

    let status: HmlTripDef['status'];
    let vehicle: (typeof HML_VEHICLES)[number];
    let driver: (typeof HML_DRIVERS)[number];

    if (index <= completedCount) {
      status = 'completed';
      vehicle = HML_VEHICLES[(index - 1) % HML_VEHICLES.length];
      driver = HML_DRIVERS[(index - 1) % HML_DRIVERS.length];
    } else if (index <= completedCount + inProgressCount) {
      status = 'in_progress';
      const slot = index - completedCount - 1;
      vehicle = HML_VEHICLES[slot];
      driver = HML_DRIVERS[slot];
    } else if (index <= completedCount + inProgressCount + plannedCount) {
      status = 'planned';
      const slot = inProgressCount + (index - completedCount - inProgressCount - 1);
      vehicle = HML_VEHICLES[slot];
      driver = HML_DRIVERS[slot];
    } else {
      status = 'cancelled';
      vehicle = HML_VEHICLES[(index - 1) % HML_VEHICLES.length];
      driver = HML_DRIVERS[(index - 1) % HML_DRIVERS.length];
    }

    const initialOdometerKm = odometerCursor.get(vehicle.key) ?? vehicle.initialOdometerKm;
    let finalOdometerKm: number | null = null;

    if (status === 'completed') {
      finalOdometerKm = initialOdometerKm + route.distanceKm;
      odometerCursor.set(vehicle.key, finalOdometerKm);
    } else if (status === 'in_progress') {
      // Piso de referência: create/start grava initial_odometer_km.
      odometerCursor.set(vehicle.key, initialOdometerKm);
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
      freight,
      initialOdometerKm,
      finalOdometerKm,
    });
  }

  assertHmlTripOdometerSequence(trips);
  return trips;
}

export function assertHmlTripBusyUniqueness(
  trips: HmlTripDef[] = buildHmlTripDefinitions(),
): void {
  const busy = new Set<string>(HML_TRIP_BUSY_STATUSES);
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
      throw new Error(`Veículo busy duplicado ${vehicleKey}: ${keys.join(', ')}`);
    }
  }
  for (const [driverKey, keys] of drivers) {
    if (keys.length > 1) {
      throw new Error(`Motorista busy duplicado ${driverKey}: ${keys.join(', ')}`);
    }
  }
}

/**
 * Valida sequência de odômetros por veículo (ordem do plano = ordem de criação).
 * Abort claro se o catálogo/plano contiver regressão ou completed inconsistente.
 */
export function assertHmlTripOdometerSequence(trips: HmlTripDef[]): void {
  const lastInitialByVehicle = new Map<string, {key: string; km: number}>();
  const lastKnownByVehicle = new Map<string, {key: string; km: number}>();

  for (const trip of trips) {
    if (!Number.isFinite(trip.initialOdometerKm) || trip.initialOdometerKm < 0) {
      throw new Error(
        `Catálogo HML inválido: viagem ${trip.key} com initialOdometerKm inválido (${trip.initialOdometerKm}).`,
      );
    }

    const previousInitial = lastInitialByVehicle.get(trip.vehicleKey);
    if (previousInitial && trip.initialOdometerKm < previousInitial.km) {
      throw new Error(
        `Catálogo HML inválido: odômetro inicial regressivo no veículo ${trip.vehicleKey} ` +
          `(${previousInitial.key}=${previousInitial.km} → ${trip.key}=${trip.initialOdometerKm}).`,
      );
    }

    const previousKnown = lastKnownByVehicle.get(trip.vehicleKey);
    if (previousKnown && trip.initialOdometerKm < previousKnown.km) {
      throw new Error(
        `Catálogo HML inválido: viagem ${trip.key} inicia abaixo do último hodômetro ` +
          `conhecido do veículo ${trip.vehicleKey} (${previousKnown.key}=${previousKnown.km}).`,
      );
    }

    if (trip.status === 'completed') {
      if (trip.finalOdometerKm === null || !Number.isFinite(trip.finalOdometerKm)) {
        throw new Error(
          `Catálogo HML inválido: viagem completed ${trip.key} sem finalOdometerKm.`,
        );
      }
      if (trip.finalOdometerKm < trip.initialOdometerKm) {
        throw new Error(
          `Catálogo HML inválido: viagem ${trip.key} com finalOdometerKm < initialOdometerKm.`,
        );
      }
      const expectedFinal = trip.initialOdometerKm + trip.distanceKm;
      if (trip.finalOdometerKm !== expectedFinal) {
        throw new Error(
          `Catálogo HML inválido: viagem ${trip.key} finalOdometerKm=${trip.finalOdometerKm}, ` +
            `esperado initial+distance=${expectedFinal}.`,
        );
      }
      lastKnownByVehicle.set(trip.vehicleKey, {
        key: trip.key,
        km: trip.finalOdometerKm,
      });
    } else {
      if (trip.finalOdometerKm !== null) {
        throw new Error(
          `Catálogo HML inválido: viagem ${trip.key} (${trip.status}) não deve ter finalOdometerKm.`,
        );
      }
      if (trip.status === 'in_progress') {
        lastKnownByVehicle.set(trip.vehicleKey, {
          key: trip.key,
          km: trip.initialOdometerKm,
        });
      }
    }

    lastInitialByVehicle.set(trip.vehicleKey, {
      key: trip.key,
      km: trip.initialOdometerKm,
    });
  }
}

/** Cursor de odômetro por veículo após aplicar o plano de viagens (para fuel/coerência). */
export function buildHmlVehicleOdometerAfterTrips(
  trips: HmlTripDef[] = buildHmlTripDefinitions(),
): Map<string, number> {
  const cursor = new Map<string, number>(
    HML_VEHICLES.map((vehicle) => [vehicle.key, vehicle.initialOdometerKm]),
  );

  for (const trip of trips) {
    if (trip.status === 'completed' && trip.finalOdometerKm !== null) {
      cursor.set(trip.vehicleKey, trip.finalOdometerKm);
    } else if (trip.status === 'in_progress') {
      const current = cursor.get(trip.vehicleKey) ?? trip.initialOdometerKm;
      cursor.set(trip.vehicleKey, Math.max(current, trip.initialOdometerKm));
    }
  }

  return cursor;
}

export interface HmlFuelDef {
  key: string;
  vehicleKey: string;
  driverKey: string;
  supplierKey: string;
  daysAgo: number;
  liters: number;
  pricePerLiter: number;
  totalAmount: number;
  odometerKm: number;
  paymentType: 'cash' | 'credit';
}

export function buildHmlFuelDefinitions(
  count: number = HML_COUNTS.fuelRecords,
  now: Date = new Date(),
): HmlFuelDef[] {
  const postoSuppliers = HML_SUPPLIERS.filter((s) => s.categories.includes('posto'));
  const fleet = HML_VEHICLES;
  const drafts: Array<Omit<HmlFuelDef, 'odometerKm'>> = [];

  for (let index = 1; index <= count; index += 1) {
    const vehicle = fleet[(index - 1) % fleet.length];
    const driver = HML_DRIVERS[(index - 1) % HML_DRIVERS.length];
    const supplier = postoSuppliers[(index - 1) % postoSuppliers.length];
    const liters = 110 + (index % 5) * 20;
    const pricePerLiter = Number((5.79 + (index % 4) * 0.08).toFixed(2));

    drafts.push({
      key: `f${String(index).padStart(3, '0')}`,
      vehicleKey: vehicle.key,
      driverKey: driver.key,
      supplierKey: supplier.key,
      daysAgo: hmlBucketedDaysAgo(index, count, now),
      liters,
      pricePerLiter,
      totalAmount: Number((liters * pricePerLiter).toFixed(2)),
      paymentType: index % 3 === 0 ? 'credit' : 'cash',
    });
  }

  const records: HmlFuelDef[] = [];
  const byVehicle = new Map<string, typeof drafts>();
  for (const draft of drafts) {
    const list = byVehicle.get(draft.vehicleKey) ?? [];
    list.push(draft);
    byVehicle.set(draft.vehicleKey, list);
  }

  // Fuel roda depois das viagens: odômetro ≥ cursor pós-trips (completeTrip atualiza o veículo).
  const odometerAfterTrips = buildHmlVehicleOdometerAfterTrips();

  for (const vehicle of fleet) {
    const vehicleDrafts = byVehicle.get(vehicle.key) ?? [];
    const chronological = [...vehicleDrafts].sort((a, b) => b.daysAgo - a.daysAgo);
    const baseOdometer =
      odometerAfterTrips.get(vehicle.key) ?? vehicle.initialOdometerKm;
    chronological.forEach((draft, seq) => {
      records.push({
        ...draft,
        odometerKm: baseOdometer + seq * 380 + (seq % 3) * 40,
      });
    });
  }

  return records.sort((a, b) => a.key.localeCompare(b.key));
}

export interface HmlMaintenanceDef {
  key: string;
  vehicleKey: string;
  supplierKey: string;
  maintenanceType: 'preventive' | 'corrective' | 'emergency';
  maintenanceStatus: 'open' | 'completed';
  amount: number;
  paymentType: 'cash' | 'credit';
  daysAgo: number;
}

export function buildHmlMaintenanceDefinitions(
  count: number = HML_COUNTS.maintenanceRecords,
  now: Date = new Date(),
): HmlMaintenanceDef[] {
  const workshops = HML_SUPPLIERS.filter((s) => s.categories.includes('oficina'));
  const types = ['preventive', 'corrective', 'emergency'] as const;

  return Array.from({length: count}, (_, index) => {
    const vehicle = HML_VEHICLES[index % HML_VEHICLES.length];
    const supplier = workshops[index % workshops.length];
    return {
      key: `m${String(index + 1).padStart(3, '0')}`,
      vehicleKey: vehicle.key,
      supplierKey: supplier.key,
      maintenanceType: types[index % types.length],
      maintenanceStatus: index === 0 ? 'open' : 'completed',
      amount: 900 + index * 350,
      paymentType: index % 2 === 0 ? 'cash' : 'credit',
      daysAgo: hmlBucketedDaysAgo(index + 1, count, now),
    };
  });
}

export interface HmlTireDef {
  key: string;
  vehicleKey: string;
  supplierKey: string;
  brand: string;
  model: string;
  purchaseValue: number;
  daysAgo: number;
}

export function buildHmlTireDefinitions(
  count: number = HML_COUNTS.tires,
  now: Date = new Date(),
): HmlTireDef[] {
  const tireSupplier = HML_SUPPLIERS.find((s) => s.categories.includes('pneus'));
  if (!tireSupplier) throw new Error('Fornecedor de pneus HML ausente.');

  return Array.from({length: count}, (_, index) => ({
    key: `tire-${String(index + 1).padStart(2, '0')}`,
    vehicleKey: HML_VEHICLES[index % HML_VEHICLES.length].key,
    supplierKey: tireSupplier.key,
    brand: 'MICHELIN',
    model: 'X MULTI HML',
    purchaseValue: 2600 + (index % 4) * 200,
    daysAgo: hmlBucketedDaysAgo(index + 1, count, now),
  }));
}

export function getHmlCatalogCounts(): Record<string, number> {
  return {
    branches: HML_BRANCHES.length,
    costCenters: HML_COST_CENTERS.length,
    positions: HML_POSITIONS.length,
    customers: HML_CUSTOMERS.length,
    suppliers: HML_SUPPLIERS.length,
    drivers: HML_DRIVERS.length,
    vehicles: HML_VEHICLES.length,
    routes: HML_ROUTES.length,
    employees: HML_EMPLOYEES.length,
    trips: HML_COUNTS.trips,
    fuelRecords: HML_COUNTS.fuelRecords,
    maintenanceRecords: HML_COUNTS.maintenanceRecords,
    tires: HML_COUNTS.tires,
    accountsPayable: HML_COUNTS.accountsPayable,
    accountsReceivable: HML_COUNTS.accountsReceivable,
    manualFinancialEntries: HML_COUNTS.manualFinancialEntries,
    contracts: HML_COUNTS.contracts,
  };
}

export function hmlNotes(entity: string, key: string): string {
  return `${HML_NOTES_PREFIX} ${entity}:${key}`;
}

export function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

export function isoDaysAgoDate(days: number): string {
  return isoDaysAgo(days).slice(0, 10);
}

export function subtractMonths(baseDate: Date, months: number): Date {
  const date = new Date(baseDate);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date;
}

export function formatCompetence(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
