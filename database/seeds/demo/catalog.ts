import {DEMO_COUNTS, DEMO_CUSTOM_POSITIONS, DEMO_EXTRA_COST_CENTERS} from './constants';
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

export const DEMO_VEHICLES: DemoVehicleDef[] = [
  {key: 'v01', plate: 'DEM0A01', vehicleType: 'Caminhão', brand: 'VOLVO', model: 'FH 540', branchKey: 'matriz', fuelType: 'diesel', initialOdometerKm: 98500},
  {key: 'v02', plate: 'DEM0A02', vehicleType: 'Caminhão', brand: 'SCANIA', model: 'R450', branchKey: 'matriz', fuelType: 'diesel', initialOdometerKm: 112300},
  {key: 'v03', plate: 'DEM0A03', vehicleType: 'Truck', brand: 'MERCEDES', model: 'ACTROS', branchKey: 'imperatriz', fuelType: 'diesel', initialOdometerKm: 87400},
  {key: 'v04', plate: 'DEM0A04', vehicleType: 'Truck', brand: 'VOLVO', model: 'VM 330', branchKey: 'imperatriz', fuelType: 'diesel', initialOdometerKm: 76500},
  {key: 'v05', plate: 'DEM0A05', vehicleType: 'Toco', brand: 'MERCEDES', model: 'ATEGO', branchKey: 'teresina', fuelType: 'diesel', initialOdometerKm: 65400},
  {key: 'v06', plate: 'DEM0A06', vehicleType: 'Toco', brand: 'VOLKSWAGEN', model: 'DELIVERY', branchKey: 'teresina', fuelType: 'diesel', initialOdometerKm: 54200},
  {key: 'v07', plate: 'DEM0A07', vehicleType: 'Van', brand: 'FIAT', model: 'DUCATO', branchKey: 'matriz', fuelType: 'diesel', initialOdometerKm: 43800},
  {key: 'v08', plate: 'DEM0A08', vehicleType: 'Van', brand: 'RENAULT', model: 'MASTER', branchKey: 'imperatriz', fuelType: 'diesel', initialOdometerKm: 39200},
  {key: 'v09', plate: 'DEM0A09', vehicleType: 'Caminhão', brand: 'IVECO', model: 'STRALIS', branchKey: 'matriz', fuelType: 'diesel', initialOdometerKm: 120800},
  {key: 'v10', plate: 'DEM0A10', vehicleType: 'Truck', brand: 'DAF', model: 'XF', branchKey: 'teresina', fuelType: 'diesel', initialOdometerKm: 90300},
];

export const DEMO_DRIVERS: DemoDriverDef[] = [
  {key: 'd01', name: 'JOÃO SILVA', cpf: '90000000001', cnhNumber: 'DEM00000001', branchKey: 'matriz'},
  {key: 'd02', name: 'CARLOS SOUZA', cpf: '90000000002', cnhNumber: 'DEM00000002', branchKey: 'matriz'},
  {key: 'd03', name: 'MARCOS OLIVEIRA', cpf: '90000000003', cnhNumber: 'DEM00000003', branchKey: 'imperatriz'},
  {key: 'd04', name: 'PEDRO SANTOS', cpf: '90000000004', cnhNumber: 'DEM00000004', branchKey: 'imperatriz'},
  {key: 'd05', name: 'RAFAEL ALMEIDA', cpf: '90000000005', cnhNumber: 'DEM00000005', branchKey: 'teresina'},
  {key: 'd06', name: 'LUCAS FERREIRA', cpf: '90000000006', cnhNumber: 'DEM00000006', branchKey: 'teresina'},
  {key: 'd07', name: 'BRUNO COSTA', cpf: '90000000007', cnhNumber: 'DEM00000007', branchKey: 'matriz'},
  {key: 'd08', name: 'FELIPE ROCHA', cpf: '90000000008', cnhNumber: 'DEM00000008', branchKey: 'imperatriz'},
];

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
 * Distribuição temporal das viagens DEMO (index 1-based).
 * - ~20% no mês corrente (daysAgo 1..dia-do-mês UTC);
 * - ~20% no restante dos últimos 30 dias;
 * - ~60% históricas (31–180 dias).
 * Garante amostra útil no Dashboard do mês atual sem concentrar tudo nele.
 */
export function demoTripDaysAgo(
  index: number,
  count = DEMO_COUNTS.trips,
  now: Date = new Date(),
): number {
  const dayOfMonth = Math.max(now.getUTCDate(), 1);
  const currentMonthBucket = Math.ceil(count * 0.2);
  const recentBucket = Math.ceil(count * 0.2);

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

export function buildDemoTripDefinitions(
  count = DEMO_COUNTS.trips,
  now: Date = new Date(),
) {
  const statuses = ['completed', 'completed', 'completed', 'in_progress', 'planned'] as const;
  const trips = [];

  for (let index = 1; index <= count; index += 1) {
    const route = DEMO_ROUTES[(index - 1) % DEMO_ROUTES.length];
    const vehicle = DEMO_VEHICLES[(index - 1) % DEMO_VEHICLES.length];
    const driver = DEMO_DRIVERS[(index - 1) % DEMO_DRIVERS.length];
    const customer = DEMO_CUSTOMERS[(index - 1) % DEMO_CUSTOMERS.length];
    const status = statuses[index % statuses.length];
    const daysAgo = demoTripDaysAgo(index, count, now);
    const freight = 2500 + (route.distanceKm * 3.2) + (index % 7) * 150;

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

export function buildDemoFuelDefinitions(count = DEMO_COUNTS.fuelRecords) {
  const records = [];
  const postoSuppliers = DEMO_SUPPLIERS.filter((supplier) => supplier.categories.includes('posto'));
  const vehicleCount = DEMO_VEHICLES.length;
  const basePerVehicle = Math.floor(count / vehicleCount);
  const remainder = count % vehicleCount;

  let fuelIndex = 0;

  for (let vehicleIndex = 0; vehicleIndex < vehicleCount; vehicleIndex += 1) {
    const vehicle = DEMO_VEHICLES[vehicleIndex];
    const vehicleRecordCount = basePerVehicle + (vehicleIndex < remainder ? 1 : 0);
    const dayStep = vehicleRecordCount > 1 ? Math.floor(120 / (vehicleRecordCount - 1)) : 0;

    for (let seq = 0; seq < vehicleRecordCount; seq += 1) {
      fuelIndex += 1;
      const driver = DEMO_DRIVERS[(fuelIndex - 1) % DEMO_DRIVERS.length];
      const supplier = postoSuppliers[(fuelIndex - 1) % postoSuppliers.length];
      const daysAgo = 140 - seq * dayStep;
      const odometerKm = vehicle.initialOdometerKm + seq * 450 + (seq % 5) * 80;
      const liters = 120 + (fuelIndex % 6) * 15;
      const pricePerLiter = 5.89 + (fuelIndex % 4) * 0.07;

      records.push({
        key: `f${String(fuelIndex).padStart(3, '0')}`,
        vehicleKey: vehicle.key,
        driverKey: driver.key,
        supplierKey: supplier.key,
        daysAgo,
        odometerKm,
        liters,
        pricePerLiter: Number(pricePerLiter.toFixed(2)),
        totalAmount: Number((liters * pricePerLiter).toFixed(2)),
        paymentType: fuelIndex % 3 === 0 ? 'credit' : 'cash',
      });
    }
  }

  return records;
}

export function buildDemoMaintenanceDefinitions(count = DEMO_COUNTS.maintenanceRecords) {
  const types = ['preventive', 'corrective', 'emergency'] as const;
  const workshopSuppliers = DEMO_SUPPLIERS.filter((supplier) => supplier.categories.includes('oficina'));

  return Array.from({length: count}, (_, index) => {
    const vehicle = DEMO_VEHICLES[index % DEMO_VEHICLES.length];
    const supplier = workshopSuppliers[index % workshopSuppliers.length];
    const amount = 850 + (index % 9) * 420;

    return {
      key: `m${String(index + 1).padStart(3, '0')}`,
      vehicleKey: vehicle.key,
      supplierKey: supplier.key,
      maintenanceType: types[index % types.length],
      daysAgo: (index % 120) + 5,
      amount,
      paymentType: index % 4 === 0 ? 'credit' : 'cash',
      maintenanceStatus: index % 5 === 0 ? 'open' : 'completed',
    };
  });
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

export function buildDemoTireDefinitions(count = DEMO_COUNTS.tires) {
  const tireSupplier = DEMO_SUPPLIERS.find((supplier) => supplier.categories.includes('pneus'));

  return Array.from({length: count}, (_, index) => ({
    key: `tire-${String(index + 1).padStart(2, '0')}`,
    vehicleKey: DEMO_VEHICLES[index % DEMO_VEHICLES.length].key,
    supplierKey: tireSupplier?.key ?? 's06',
    brand: 'MICHELIN',
    model: 'X MULTI',
    purchaseValue: 2800 + (index % 4) * 250,
    daysAgo: (index % 90) + 10,
  }));
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
