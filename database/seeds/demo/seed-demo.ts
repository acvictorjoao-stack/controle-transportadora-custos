import type {SupabaseClient} from '@supabase/supabase-js';

import {onFuelRecordCreated} from '@/features/financial/services/integration-events';
import {onMaintenanceRecordCreated} from '@/features/financial/services/integration-events';
import {onTireCostUpdated} from '@/features/financial/services/integration-events';
import {onTripCompleted} from '@/features/financial/services/integration-events';
import {mapFuelRecordRow} from '@/features/fuel/services/mappers';
import type {FuelRecordRow} from '@/features/fuel/types/fuel';
import {mapMaintenanceRecordRow} from '@/features/maintenance/services/mappers';
import type {MaintenanceRecordRow} from '@/features/maintenance/types/maintenance';
import {mapPayrollExpenseRow} from '@/features/payroll/services/mappers';
import {syncPayrollFinancialEntry} from '@/features/payroll/services/payroll-financial.service';
import type {PayrollExpenseRow} from '@/features/payroll/types/payroll';
import {normalizeCompetence} from '@/features/payroll/utils/competence';
import {mapTireRow} from '@/features/tires/services/mappers';
import type {TireRow} from '@/features/tires/types/tire';
import {mapTripRow} from '@/features/trips/services/mappers';
import type {TripRow} from '@/features/trips/types/trip';

import {
  DEMO_BRANCHES,
  DEMO_CUSTOMERS,
  DEMO_DRIVERS,
  DEMO_EMPLOYEES,
  DEMO_ROUTES,
  DEMO_SUPPLIERS,
  DEMO_VEHICLES,
  buildDemoFuelDefinitions,
  buildDemoMaintenanceDefinitions,
  buildDemoPayrollDefinitions,
  buildDemoTireDefinitions,
  buildDemoTripDefinitions,
} from './catalog';
import {
  DEMO_COMPANY_EMAIL,
  DEMO_COMPANY_LEGAL_NAME,
  DEMO_COMPANY_SLUG,
  DEMO_COMPANY_TAX_ID,
  DEMO_COMPANY_TRADE_NAME,
  DEMO_CUSTOM_POSITIONS,
  DEMO_EXTRA_COST_CENTERS,
  DEMO_SETTINGS_FLAG,
} from './constants';
import {createDemoSeedClient} from './client';
import {demoUuid} from './ids';
import {
  countByCompany,
  formatCompetence,
  isoDaysAgo,
  isoDaysAgoDate,
  subtractMonths,
  upsertDemoRecord,
  upsertDemoRecordById,
} from './repository';
import type {DemoSeedContextMaps, DemoSeedSummary} from './types';
import {assertDemoCatalogInvariants} from './validators';

const NULL_PROFILE = null as unknown as string;

async function ensureDemoCompany(supabase: SupabaseClient): Promise<{companyId: string; created: boolean}> {
  const {data: existing, error} = await supabase
    .from('companies')
    .select('id')
    .eq('slug', DEMO_COMPANY_SLUG)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (existing?.id) return {companyId: existing.id as string, created: false};

  const companyId = demoUuid('company', 'main');
  const {error: insertError} = await supabase.from('companies').insert({
    id: companyId,
    legal_name: DEMO_COMPANY_LEGAL_NAME,
    trade_name: DEMO_COMPANY_TRADE_NAME,
    tax_id: DEMO_COMPANY_TAX_ID,
    slug: DEMO_COMPANY_SLUG,
    email: DEMO_COMPANY_EMAIL,
    phone: '(98) 3000-0000',
    address_city: 'São Luís',
    address_state: 'MA',
    provision_status: 'completed',
    settings: {
      [DEMO_SETTINGS_FLAG]: true,
      plan_slug: 'free',
      demo_seed_version: 1,
    },
  });

  if (insertError) throw new Error(insertError.message);
  return {companyId, created: true};
}

async function seedReferenceData(
  supabase: SupabaseClient,
  companyId: string,
): Promise<Pick<DemoSeedContextMaps, 'positions' | 'costCenters'>> {
  await supabase.rpc('seed_financial_defaults_for_company', {
    p_company_id: companyId,
    p_created_by: null,
  });
  await supabase.rpc('seed_cost_centers_for_company', {
    p_company_id: companyId,
    p_created_by: null,
  });
  await supabase.rpc('seed_positions_for_company', {
    p_company_id: companyId,
    p_created_by: null,
  });

  const positions = new Map<string, string>();
  const costCenters = new Map<string, string>();

  for (const position of DEMO_CUSTOM_POSITIONS) {
    const id = demoUuid('position', position.code);
    const {data: existing} = await supabase
      .from('positions')
      .select('id')
      .eq('company_id', companyId)
      .eq('code', position.code)
      .is('deleted_at', null)
      .maybeSingle();

    if (existing?.id) {
      positions.set(position.code, existing.id as string);
      continue;
    }

    const {error} = await supabase.from('positions').insert({
      id,
      company_id: companyId,
      code: position.code,
      name: position.name,
      description: position.description,
      is_system: false,
      status: 'active',
      metadata: {demo_seed_key: position.code},
    });
    if (error) throw new Error(error.message);
    positions.set(position.code, id);
  }

  const {data: positionRows} = await supabase
    .from('positions')
    .select('id, code')
    .eq('company_id', companyId)
    .is('deleted_at', null);
  for (const row of positionRows ?? []) {
    positions.set((row.code as string).toUpperCase(), row.id as string);
  }

  for (const center of DEMO_EXTRA_COST_CENTERS) {
    const id = demoUuid('cost_center', center.code);
    const {data: existing} = await supabase
      .from('cost_centers')
      .select('id')
      .eq('company_id', companyId)
      .eq('code', center.code)
      .is('deleted_at', null)
      .maybeSingle();

    if (existing?.id) {
      costCenters.set(center.code, existing.id as string);
      continue;
    }

    const {error} = await supabase.from('cost_centers').insert({
      id,
      company_id: companyId,
      code: center.code,
      name: center.name,
      description: center.description,
      is_system: false,
      status: 'active',
      metadata: {demo_seed_key: center.code},
    });
    if (error) throw new Error(error.message);
    costCenters.set(center.code, id);
  }

  const {data: centerRows} = await supabase
    .from('cost_centers')
    .select('id, code')
    .eq('company_id', companyId)
    .is('deleted_at', null);
  for (const row of centerRows ?? []) {
    costCenters.set((row.code as string).toUpperCase(), row.id as string);
  }

  return {positions, costCenters};
}

async function seedBranches(
  supabase: SupabaseClient,
  companyId: string,
): Promise<Map<string, string>> {
  const branches = new Map<string, string>();

  const {data: hqBranch} = await supabase
    .from('branches')
    .select('id')
    .eq('company_id', companyId)
    .eq('is_headquarters', true)
    .is('deleted_at', null)
    .maybeSingle();

  const matriz = DEMO_BRANCHES.find((branch) => branch.key === 'matriz');
  if (!matriz) throw new Error('Definição da filial matriz ausente.');

  if (hqBranch?.id) {
    await supabase
      .from('branches')
      .update({
        code: matriz.code,
        name: matriz.name,
        address_city: matriz.city,
        address_state: matriz.state,
        is_headquarters: true,
        metadata: {demo_seed_key: matriz.key},
      })
      .eq('id', hqBranch.id)
      .eq('company_id', companyId);
    branches.set(matriz.key, hqBranch.id as string);
  }

  for (const branch of DEMO_BRANCHES.filter((item) => item.key !== 'matriz')) {
    const id = demoUuid('branch', branch.key);
    const {data: existing} = await supabase
      .from('branches')
      .select('id')
      .eq('company_id', companyId)
      .eq('code', branch.code)
      .is('deleted_at', null)
      .maybeSingle();

    if (existing?.id) {
      branches.set(branch.key, existing.id as string);
      continue;
    }

    const {error} = await supabase.from('branches').insert({
      id,
      company_id: companyId,
      code: branch.code,
      name: branch.name,
      address_city: branch.city,
      address_state: branch.state,
      is_headquarters: branch.isHeadquarters,
      status: 'active',
      metadata: {demo_seed_key: branch.key},
    });
    if (error) throw new Error(error.message);
    branches.set(branch.key, id);
  }

  return branches;
}

async function seedSuppliers(
  supabase: SupabaseClient,
  companyId: string,
): Promise<Map<string, string>> {
  const suppliers = new Map<string, string>();

  for (const supplier of DEMO_SUPPLIERS) {
    const id = await upsertDemoRecordById(supabase, 'suppliers', companyId, 'supplier', supplier.key, {
      corporate_name: supplier.corporateName,
      trade_name: supplier.corporateName,
      document: supplier.document,
      document_type: 'cnpj',
      categories: supplier.categories,
      city: supplier.city,
      state: supplier.state,
      active: true,
      status: 'active',
    });
    suppliers.set(supplier.key, id);
  }

  return suppliers;
}

async function seedCustomers(
  supabase: SupabaseClient,
  companyId: string,
  branches: Map<string, string>,
): Promise<Map<string, string>> {
  const customers = new Map<string, string>();

  for (const [index, customer] of DEMO_CUSTOMERS.entries()) {
    const branchKey = DEMO_BRANCHES[index % DEMO_BRANCHES.length].key;
    const id = await upsertDemoRecord(supabase, 'customers', companyId, 'customer', customer.key, {
      branch_id: branches.get(branchKey) ?? null,
      legal_name: customer.legalName,
      trade_name: customer.tradeName,
      tax_id: `8800000000${String(index + 1).padStart(2, '0')}`,
      email: `cliente.demo${index + 1}@fleetcontrol.local`,
      phone: `(98) 3200-${String(index + 1).padStart(4, '0')}`,
      customer_status: 'active',
      segment: 'commercial',
      status: 'active',
    });
    customers.set(customer.key, id);
  }

  return customers;
}

async function seedVehicles(
  supabase: SupabaseClient,
  companyId: string,
  branches: Map<string, string>,
): Promise<Map<string, string>> {
  const vehicles = new Map<string, string>();

  for (const vehicle of DEMO_VEHICLES) {
    const id = await upsertDemoRecord(supabase, 'vehicles', companyId, 'vehicle', vehicle.key, {
      branch_id: branches.get(vehicle.branchKey) ?? null,
      plate: vehicle.plate,
      fleet_number: vehicle.key.toUpperCase(),
      vehicle_type: vehicle.vehicleType,
      brand: vehicle.brand,
      model: vehicle.model,
      year: 2020 + (Number(vehicle.key.slice(-1)) % 5),
      fuel_type: vehicle.fuelType,
      initial_odometer_km: vehicle.initialOdometerKm,
      current_odometer_km: vehicle.initialOdometerKm + 2500,
      asset_status: 'active',
      status: 'active',
    });
    vehicles.set(vehicle.key, id);
  }

  return vehicles;
}

async function seedDrivers(
  supabase: SupabaseClient,
  companyId: string,
  branches: Map<string, string>,
): Promise<Map<string, string>> {
  const drivers = new Map<string, string>();

  for (const driver of DEMO_DRIVERS) {
    const id = await upsertDemoRecord(supabase, 'drivers', companyId, 'driver', driver.key, {
      branch_id: branches.get(driver.branchKey) ?? null,
      name: driver.name,
      cpf: driver.cpf,
      cnh_number: driver.cnhNumber,
      license_category: 'E',
      license_expires_at: isoDaysAgoDate(-365),
      operational_status: 'active',
      hired_at: isoDaysAgoDate(400),
      status: 'active',
    });
    drivers.set(driver.key, id);
  }

  return drivers;
}

async function seedEmployees(
  supabase: SupabaseClient,
  companyId: string,
  branches: Map<string, string>,
  positions: Map<string, string>,
  costCenters: Map<string, string>,
): Promise<Map<string, string>> {
  const employees = new Map<string, string>();

  for (const [index, employee] of DEMO_EMPLOYEES.entries()) {
    const positionId = positions.get(employee.positionCode);
    const costCenterId = costCenters.get(employee.costCenterCode);
    if (!positionId || !costCenterId) {
      throw new Error(`Referência inválida para funcionário ${employee.key}.`);
    }

    const id = await upsertDemoRecordById(supabase, 'employees', companyId, 'employee', employee.key, {
      branch_id: branches.get(employee.branchKey) ?? null,
      position_id: positionId,
      cost_center_id: costCenterId,
      name: employee.name,
      cpf: `910000000${String(index + 1).padStart(2, '0')}`,
      email: `funcionario.demo${index + 1}@fleetcontrol.local`,
      phone: `(98) 3100-${String(index + 1).padStart(4, '0')}`,
      contract_type: 'clt',
      hired_at: isoDaysAgoDate(500),
      status: 'active',
    });
    employees.set(employee.key, id);
  }

  return employees;
}

async function seedRoutes(
  supabase: SupabaseClient,
  companyId: string,
  customers: Map<string, string>,
): Promise<Map<string, string>> {
  const routes = new Map<string, string>();

  for (const route of DEMO_ROUTES) {
    const id = await upsertDemoRecord(supabase, 'routes', companyId, 'route', route.key, {
      name: route.name,
      code: route.code,
      origin: route.origin,
      destination: route.destination,
      route_type: 'delivery',
      planned_distance_km: route.distanceKm,
      lead_time_minutes: Math.round(route.distanceKm * 1.2),
      operational_status: 'active',
      customer_id: route.customerKey ? customers.get(route.customerKey) ?? null : null,
      status: 'active',
    });
    routes.set(route.key, id);
  }

  return routes;
}

async function seedTrips(
  supabase: SupabaseClient,
  companyId: string,
  maps: DemoSeedContextMaps,
): Promise<number> {
  let count = 0;

  for (const trip of buildDemoTripDefinitions()) {
    const departedAt = isoDaysAgo(trip.daysAgo);
    const arrivedAt = trip.status === 'completed' ? isoDaysAgo(Math.max(trip.daysAgo - 1, 0)) : null;
    const vehicleId = maps.vehicles.get(trip.vehicleKey);
    const driverId = maps.drivers.get(trip.driverKey);
    const customerId = maps.customers.get(trip.customerKey);
    const routeId = maps.routes.get(trip.routeKey);
    const route = DEMO_ROUTES.find((item) => item.key === trip.routeKey);

    if (!vehicleId || !driverId || !customerId || !routeId || !route) continue;

    const initialOdometer = DEMO_VEHICLES.find((vehicle) => vehicle.key === trip.vehicleKey)?.initialOdometerKm ?? 0;
    const finalOdometer = initialOdometer + trip.distanceKm;

    const id = await upsertDemoRecord(supabase, 'trips', companyId, 'trip', trip.key, {
      branch_id: maps.branches.get(DEMO_VEHICLES.find((vehicle) => vehicle.key === trip.vehicleKey)?.branchKey ?? 'matriz') ?? null,
      trip_number: `DEMO-${trip.key.toUpperCase()}`,
      trip_status: trip.status,
      driver_id: driverId,
      vehicle_id: vehicleId,
      customer_id: customerId,
      route_id: routeId,
      client_name: DEMO_CUSTOMERS.find((customer) => customer.key === trip.customerKey)?.tradeName ?? null,
      origin: route.origin,
      destination: route.destination,
      route: route.name,
      initial_odometer_km: initialOdometer,
      final_odometer_km: trip.status === 'completed' ? finalOdometer : null,
      departed_at: departedAt,
      arrived_at: arrivedAt,
      contracted_freight_value: trip.freight,
      actual_freight_value: trip.status === 'completed' ? trip.freight : null,
      status: 'active',
      metadata: {demo_seed: true, distance_km: trip.distanceKm},
    });

    if (trip.status === 'completed') {
      const {data} = await supabase
        .from('trips')
        .select('*')
        .eq('company_id', companyId)
        .eq('id', id)
        .single();
      if (data) {
        await onTripCompleted(supabase, companyId, mapTripRow(data as TripRow), NULL_PROFILE);
      }
    }

    count += 1;
  }

  return count;
}

async function seedFuelRecords(
  supabase: SupabaseClient,
  companyId: string,
  maps: DemoSeedContextMaps,
): Promise<number> {
  let count = 0;

  for (const record of buildDemoFuelDefinitions()) {
    const vehicleId = maps.vehicles.get(record.vehicleKey);
    const driverId = maps.drivers.get(record.driverKey);
    const supplierId = maps.suppliers.get(record.supplierKey);
    const supplier = DEMO_SUPPLIERS.find((item) => item.key === record.supplierKey);
    const branchKey = DEMO_VEHICLES.find((vehicle) => vehicle.key === record.vehicleKey)?.branchKey ?? 'matriz';

    if (!vehicleId || !driverId || !supplierId || !supplier) continue;

    const fueledAt = isoDaysAgo(record.daysAgo);
    const dueDate = record.paymentType === 'credit' ? isoDaysAgoDate(record.daysAgo - 15) : null;

    const id = await upsertDemoRecord(supabase, 'fuel_records', companyId, 'fuel', record.key, {
      branch_id: maps.branches.get(branchKey) ?? null,
      vehicle_id: vehicleId,
      driver_id: driverId,
      supplier_id: supplierId,
      station_name: supplier.corporateName,
      city: supplier.city,
      state: supplier.state,
      fueled_at: fueledAt,
      fuel_type: 'diesel',
      quantity_liters: record.liters,
      price_per_liter: record.pricePerLiter,
      total_amount: record.totalAmount,
      odometer_km: record.odometerKm,
      payment_type: record.paymentType,
      payment_due_date: dueDate,
      installment_count: record.paymentType === 'credit' ? 2 : 1,
      installment_interval_days: 30,
      status: 'active',
    });

    const {data} = await supabase
      .from('fuel_records')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', id)
      .single();

    if (data) {
      await onFuelRecordCreated(supabase, companyId, mapFuelRecordRow(data as FuelRecordRow), NULL_PROFILE);
    }

    count += 1;
  }

  return count;
}

async function seedMaintenanceRecords(
  supabase: SupabaseClient,
  companyId: string,
  maps: DemoSeedContextMaps,
): Promise<number> {
  let count = 0;

  for (const record of buildDemoMaintenanceDefinitions()) {
    const vehicleId = maps.vehicles.get(record.vehicleKey);
    const supplierId = maps.suppliers.get(record.supplierKey);
    const supplier = DEMO_SUPPLIERS.find((item) => item.key === record.supplierKey);
    const branchKey = DEMO_VEHICLES.find((vehicle) => vehicle.key === record.vehicleKey)?.branchKey ?? 'matriz';

    if (!vehicleId || !supplierId || !supplier) continue;

    const openedAt = isoDaysAgo(record.daysAgo);
    const completedAt = record.maintenanceStatus === 'completed' ? isoDaysAgo(record.daysAgo - 2) : null;

    const id = await upsertDemoRecord(supabase, 'maintenance_records', companyId, 'maintenance', record.key, {
      branch_id: maps.branches.get(branchKey) ?? null,
      vehicle_id: vehicleId,
      maintenance_type: record.maintenanceType,
      priority: record.maintenanceType === 'emergency' ? 'high' : 'medium',
      maintenance_status: record.maintenanceStatus,
      supplier_id: supplierId,
      supplier: supplier.corporateName,
      opened_at: openedAt,
      completed_at: completedAt,
      final_amount: record.amount,
      total_cost: record.amount,
      parts_total: Number((record.amount * 0.45).toFixed(2)),
      services_total: Number((record.amount * 0.55).toFixed(2)),
      payment_type: record.paymentType,
      payment_due_date: record.paymentType === 'credit' ? isoDaysAgoDate(record.daysAgo - 20) : null,
      installment_count: record.paymentType === 'credit' ? 3 : 1,
      installment_interval_days: 30,
      status: 'active',
    });

    const {data} = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', id)
      .single();

    if (data) {
      await onMaintenanceRecordCreated(
        supabase,
        companyId,
        mapMaintenanceRecordRow(data as MaintenanceRecordRow),
        NULL_PROFILE,
      );
    }

    count += 1;
  }

  return count;
}

async function seedTires(
  supabase: SupabaseClient,
  companyId: string,
  maps: DemoSeedContextMaps,
): Promise<number> {
  let count = 0;

  for (const tire of buildDemoTireDefinitions()) {
    const vehicleId = maps.vehicles.get(tire.vehicleKey);
    const supplierId = maps.suppliers.get(tire.supplierKey);
    const supplier = DEMO_SUPPLIERS.find((item) => item.key === tire.supplierKey);
    const branchKey = DEMO_VEHICLES.find((vehicle) => vehicle.key === tire.vehicleKey)?.branchKey ?? 'matriz';

    if (!vehicleId || !supplierId || !supplier) continue;

    const id = await upsertDemoRecord(supabase, 'tires', companyId, 'tire', tire.key, {
      branch_id: maps.branches.get(branchKey) ?? null,
      vehicle_id: vehicleId,
      supplier_id: supplierId,
      supplier: supplier.corporateName,
      brand: tire.brand,
      model: tire.model,
      tire_size: '295/80R22.5',
      purchase_date: isoDaysAgoDate(tire.daysAgo),
      purchase_value: tire.purchaseValue,
      tire_status: 'installed',
      current_position: 'rear_right_outer',
      payment_type: tire.purchaseValue > 3000 ? 'credit' : 'cash',
      payment_due_date: tire.purchaseValue > 3000 ? isoDaysAgoDate(tire.daysAgo - 25) : null,
      installment_count: tire.purchaseValue > 3000 ? 2 : 1,
      installment_interval_days: 30,
      status: 'active',
    });

    const {data} = await supabase
      .from('tires')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', id)
      .single();

    if (data) {
      await onTireCostUpdated(supabase, companyId, mapTireRow(data as TireRow), NULL_PROFILE);
    }

    count += 1;
  }

  return count;
}

async function seedPayroll(
  supabase: SupabaseClient,
  companyId: string,
  maps: DemoSeedContextMaps,
): Promise<number> {
  let count = 0;
  const now = new Date();

  for (const item of buildDemoPayrollDefinitions()) {
    const competenceDate = subtractMonths(now, item.monthOffset);
    const competence = normalizeCompetence(formatCompetence(competenceDate));
    if (!competence) {
      throw new Error(`Competência inválida para despesa demo ${item.key}.`);
    }
    const dueDate = isoDaysAgoDate(item.monthOffset * 28 + 5);
    const paidAt = item.expenseStatus === 'paid' ? `${dueDate}T12:00:00.000Z` : null;
    const positionCode = 'positionCode' in item ? item.positionCode : undefined;
    const positionId = positionCode ? maps.positions.get(positionCode) ?? null : null;
    const costCenterId = maps.costCenters.get(item.costCenterCode);
    if (!costCenterId) throw new Error(`Centro de custo ausente: ${item.costCenterCode}`);

    const personId =
      item.personKind === 'driver'
        ? maps.drivers.get(item.personKey)
        : maps.employees.get(item.personKey);

    if (!personId) continue;

    const payload =
      item.personKind === 'driver'
        ? {
            personKind: 'driver' as const,
            personId,
            positionId,
            costCenterId,
            branchId: maps.branches.get('matriz') ?? null,
            competence,
            expenseType: item.expenseType,
            expenseStatus: item.expenseStatus,
            amount: item.amount,
            paymentMethod: 'transfer',
            dueDate,
            paidAt,
            notes: 'Despesa demo seed',
          }
        : {
            personKind: 'employee' as const,
            personId,
            positionId,
            costCenterId,
            branchId: maps.branches.get('matriz') ?? null,
            competence,
            expenseType: item.expenseType,
            expenseStatus: item.expenseStatus,
            amount: item.amount,
            paymentMethod: 'transfer',
            dueDate,
            paidAt,
            notes: 'Despesa demo seed',
          };

    const expenseId = demoUuid('payroll', item.key);
    const row = {
      id: expenseId,
      company_id: companyId,
      driver_id: item.personKind === 'driver' ? personId : null,
      employee_id: item.personKind === 'employee' ? personId : null,
      position_id: positionId,
      cost_center_id: costCenterId,
      branch_id: payload.branchId,
      competence,
      expense_type: item.expenseType,
      expense_status: item.expenseStatus,
      amount: item.amount,
      payment_method: 'transferencia',
      due_date: dueDate,
      paid_at: paidAt,
      notes: 'Despesa demo seed',
      status: 'active',
      deleted_at: null,
      metadata: {demo_seed_key: item.key},
      created_by: null,
      updated_by: null,
    };

    const {data: existing} = await supabase
      .from('payroll_expenses')
      .select('id')
      .eq('company_id', companyId)
      .eq('id', expenseId)
      .maybeSingle();

    const {data: expense, error} = existing?.id
      ? await supabase
          .from('payroll_expenses')
          .update(row)
          .eq('id', expenseId)
          .eq('company_id', companyId)
          .select('*')
          .single()
      : await supabase.from('payroll_expenses').insert(row).select('*').single();

    if (error) throw new Error(error.message);

    if (expense) {
      await syncPayrollFinancialEntry(
        supabase,
        companyId,
        mapPayrollExpenseRow(expense as PayrollExpenseRow),
        NULL_PROFILE,
      );
    }

    count += 1;
  }

  return count;
}

export async function runDemoSeed(): Promise<DemoSeedSummary> {
  assertDemoCatalogInvariants();

  const supabase = createDemoSeedClient();
  const {companyId, created} = await ensureDemoCompany(supabase);
  const {positions, costCenters} = await seedReferenceData(supabase, companyId);
  const branches = await seedBranches(supabase, companyId);
  const suppliers = await seedSuppliers(supabase, companyId);
  const customers = await seedCustomers(supabase, companyId, branches);
  const vehicles = await seedVehicles(supabase, companyId, branches);
  const drivers = await seedDrivers(supabase, companyId, branches);
  const employees = await seedEmployees(supabase, companyId, branches, positions, costCenters);
  const routes = await seedRoutes(supabase, companyId, customers);

  const maps: DemoSeedContextMaps = {
    branches,
    vehicles,
    drivers,
    employees,
    customers,
    suppliers,
    routes,
    positions,
    costCenters,
  };

  const trips = await seedTrips(supabase, companyId, maps);
  const fuelRecords = await seedFuelRecords(supabase, companyId, maps);
  const maintenanceRecords = await seedMaintenanceRecords(supabase, companyId, maps);
  const tires = await seedTires(supabase, companyId, maps);
  const payrollExpenses = await seedPayroll(supabase, companyId, maps);

  return {
    companyId,
    created,
    branches: await countByCompany(supabase, 'branches', companyId),
    vehicles: await countByCompany(supabase, 'vehicles', companyId),
    drivers: await countByCompany(supabase, 'drivers', companyId),
    employees: await countByCompany(supabase, 'employees', companyId),
    customers: await countByCompany(supabase, 'customers', companyId),
    suppliers: await countByCompany(supabase, 'suppliers', companyId),
    routes: await countByCompany(supabase, 'routes', companyId),
    trips: await countByCompany(supabase, 'trips', companyId),
    fuelRecords: await countByCompany(supabase, 'fuel_records', companyId),
    maintenanceRecords: await countByCompany(supabase, 'maintenance_records', companyId),
    tires: await countByCompany(supabase, 'tires', companyId),
    payrollExpenses: await countByCompany(supabase, 'payroll_expenses', companyId),
    financialEntries: await countByCompany(supabase, 'financial_entries', companyId),
  };
}
