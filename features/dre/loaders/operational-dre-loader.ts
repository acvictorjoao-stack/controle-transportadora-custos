import type {SupabaseClient} from '@supabase/supabase-js';

import {listCostCentersForSelect} from '@/features/cost-centers/queries';
import {listCustomersForSelect} from '@/features/customers/queries';
import {listBranchesForSelect} from '@/features/organization/branches/queries';
import {listRoutesForSelect} from '@/features/routes/queries';

import {
  fetchOperationalDreExpenses,
  fetchOperationalDreRouteLabels,
  fetchOperationalDreTripDetails,
  fetchOperationalDreTrips,
  fetchOperationalDreTripsForVehicles,
  fetchOperationalDreUnlinkedVehicleExpenses,
  fetchOperationalDreVehicleLabels,
} from '../queries';
import {
  calculateOperationalDreByRoute,
  calculateOperationalDreByCustomer,
  calculateOperationalDreByVehicle,
  calculateOperationalDreRouteTrips,
  calculateOperationalDreDimensionTrips,
  OPERATIONAL_DRE_UNASSIGNED_DIMENSION_KEY,
} from '../services/operational-dre-by-dimension';
import {calculateOperationalDre} from '../services';
import type {
  OperationalDreByCustomerData,
  OperationalDreByRouteData,
  OperationalDreByVehicleData,
  OperationalDreCustomerGroup,
  OperationalDreData,
  OperationalDreExpenseRow,
  OperationalDreFilterOptions,
  OperationalDreFilters,
  OperationalDreTripMetrics,
  OperationalDreTripRow,
  OperationalDreVehicleGroup,
} from '../types';

/**
 * Fonte compartilhada da DRE — uma leitura de viagens + despesas.
 * Evita N+1 e consultas duplicadas entre loaders.
 */
export async function fetchOperationalDreSource(
  supabase: SupabaseClient,
  companyId: string,
  filters: OperationalDreFilters = {},
) {
  const trips = await fetchOperationalDreTrips(supabase, companyId, filters);
  const expenses = await fetchOperationalDreExpenses(supabase, companyId, {
    filters,
    tripIds: trips.map((trip) => trip.id),
  });
  return {trips, expenses};
}

/**
 * Dados auxiliares do rateio por KM (base de viagens do veículo + despesas
 * sem trip_id). Executado só quando há veículos no recorte.
 */
async function fetchMileageAllocationContext(
  supabase: SupabaseClient,
  companyId: string,
  trips: OperationalDreTripRow[],
  filters: OperationalDreFilters,
): Promise<{
  allocationBaseTrips: OperationalDreTripRow[];
  unlinkedVehicleExpenses: OperationalDreExpenseRow[];
}> {
  const vehicleIds = Array.from(
    new Set(
      trips
        .map((trip) => trip.vehicleId)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (vehicleIds.length === 0) {
    return {allocationBaseTrips: trips, unlinkedVehicleExpenses: []};
  }

  const periodFilters = {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    branchId: filters.branchId,
  };

  const [allocationBaseTrips, unlinkedVehicleExpenses] = await Promise.all([
    fetchOperationalDreTripsForVehicles(
      supabase,
      companyId,
      vehicleIds,
      periodFilters,
    ),
    fetchOperationalDreUnlinkedVehicleExpenses(
      supabase,
      companyId,
      vehicleIds,
      filters,
    ),
  ]);

  return {allocationBaseTrips, unlinkedVehicleExpenses};
}

/**
 * Loader da DRE Operacional — único ponto que combina leituras e cálculo.
 * O Dashboard apenas consome `getOperationalDRE()`.
 */
export async function getOperationalDRE(
  supabase: SupabaseClient,
  companyId: string,
  filters: OperationalDreFilters = {},
): Promise<OperationalDreData> {
  const {trips, expenses} = await fetchOperationalDreSource(
    supabase,
    companyId,
    filters,
  );
  return calculateOperationalDre(trips, expenses, filters);
}

/**
 * Custos agregados por rota — reutiliza viagens/despesas da DRE + rateio por KM.
 * `trips` de cada grupo inicia vazio (lazy load na expansão).
 */
export async function getOperationalDreByRoute(
  supabase: SupabaseClient,
  companyId: string,
  filters: OperationalDreFilters = {},
): Promise<OperationalDreByRouteData> {
  const {trips, expenses} = await fetchOperationalDreSource(
    supabase,
    companyId,
    filters,
  );
  const routeIds = trips
    .map((trip) => trip.routeId)
    .filter((id): id is string => Boolean(id));
  const [routeLabels, mileage] = await Promise.all([
    fetchOperationalDreRouteLabels(supabase, companyId, routeIds),
    fetchMileageAllocationContext(supabase, companyId, trips, filters),
  ]);

  return {
    groups: calculateOperationalDreByRoute(trips, expenses, filters, routeLabels, {
      allocationBaseTrips: mileage.allocationBaseTrips,
      unlinkedVehicleExpenses: mileage.unlinkedVehicleExpenses,
    }),
    filters,
  };
}

/**
 * Bundle DRE + custos por rota/cliente/veículo com uma única leitura.
 */
export async function getOperationalDreBundle(
  supabase: SupabaseClient,
  companyId: string,
  filters: OperationalDreFilters = {},
): Promise<{
  dre: OperationalDreData;
  byRoute: OperationalDreByRouteData;
  byCustomer: OperationalDreCustomerGroup[];
  byVehicle: OperationalDreVehicleGroup[];
}> {
  const {trips, expenses} = await fetchOperationalDreSource(
    supabase,
    companyId,
    filters,
  );
  const routeIds = trips
    .map((trip) => trip.routeId)
    .filter((id): id is string => Boolean(id));
  const customerIds = trips
    .map((trip) => trip.customerId)
    .filter((id): id is string => Boolean(id));
  const vehicleIds = trips
    .map((trip) => trip.vehicleId)
    .filter((id): id is string => Boolean(id));

  const [routeLabels, customers, vehicleLabels, mileage] = await Promise.all([
    fetchOperationalDreRouteLabels(supabase, companyId, routeIds),
    listCustomersForSelect(supabase, companyId),
    fetchOperationalDreVehicleLabels(supabase, companyId, vehicleIds),
    fetchMileageAllocationContext(supabase, companyId, trips, filters),
  ]);

  const customerLabels = new Map(
    customers
      .filter((customer) => customerIds.includes(customer.id))
      .map((customer) => [customer.id, customer.displayName] as const),
  );

  const allocation = {
    allocationBaseTrips: mileage.allocationBaseTrips,
    unlinkedVehicleExpenses: mileage.unlinkedVehicleExpenses,
  };

  return {
    dre: calculateOperationalDre(trips, expenses, filters),
    byRoute: {
      groups: calculateOperationalDreByRoute(
        trips,
        expenses,
        filters,
        routeLabels,
        allocation,
      ),
      filters,
    },
    byCustomer: calculateOperationalDreByCustomer(
      trips,
      expenses,
      filters,
      customerLabels,
      allocation,
    ),
    byVehicle: calculateOperationalDreByVehicle(
      trips,
      expenses,
      filters,
      vehicleLabels,
      allocation,
    ),
  };
}

/**
 * Custos agregados por cliente — reutiliza viagens/despesas da DRE + rateio por KM.
 */
export async function getOperationalDreByCustomer(
  supabase: SupabaseClient,
  companyId: string,
  filters: OperationalDreFilters = {},
): Promise<OperationalDreByCustomerData> {
  const {trips, expenses} = await fetchOperationalDreSource(
    supabase,
    companyId,
    filters,
  );
  const customerIds = trips
    .map((trip) => trip.customerId)
    .filter((id): id is string => Boolean(id));
  const [customers, mileage] = await Promise.all([
    listCustomersForSelect(supabase, companyId),
    fetchMileageAllocationContext(supabase, companyId, trips, filters),
  ]);

  const customerLabels = new Map(
    customers
      .filter((customer) => customerIds.includes(customer.id))
      .map((customer) => [customer.id, customer.displayName] as const),
  );

  return {
    groups: calculateOperationalDreByCustomer(
      trips,
      expenses,
      filters,
      customerLabels,
      {
        allocationBaseTrips: mileage.allocationBaseTrips,
        unlinkedVehicleExpenses: mileage.unlinkedVehicleExpenses,
      },
    ),
    filters,
  };
}

/**
 * Detalhe lazy das viagens de uma rota (ou "Sem rota").
 * Reutiliza queries/loaders da DRE — sem consultas independentes.
 */
export async function getOperationalDreRouteTripDetails(
  supabase: SupabaseClient,
  companyId: string,
  dimensionKey: string,
  filters: OperationalDreFilters = {},
): Promise<OperationalDreTripMetrics[]> {
  const unassigned =
    dimensionKey === OPERATIONAL_DRE_UNASSIGNED_DIMENSION_KEY ||
    dimensionKey === '';
  const scopedFilters: OperationalDreFilters = {
    ...filters,
    routeId: unassigned ? undefined : dimensionKey,
  };

  const trips = await fetchOperationalDreTripDetails(
    supabase,
    companyId,
    scopedFilters,
    {unassignedRouteOnly: unassigned},
  );
  const expenses = await fetchOperationalDreExpenses(supabase, companyId, {
    filters: scopedFilters,
    tripIds: trips.map((trip) => trip.id),
  });
  const mileage = await fetchMileageAllocationContext(
    supabase,
    companyId,
    trips,
    scopedFilters,
  );

  return calculateOperationalDreRouteTrips(trips, expenses, scopedFilters, {
    allocationBaseTrips: mileage.allocationBaseTrips,
    unlinkedVehicleExpenses: mileage.unlinkedVehicleExpenses,
  });
}

/**
 * Detalhe lazy das viagens de um cliente.
 */
export async function getOperationalDreCustomerTripDetails(
  supabase: SupabaseClient,
  companyId: string,
  dimensionKey: string,
  filters: OperationalDreFilters = {},
): Promise<OperationalDreTripMetrics[]> {
  const unassigned =
    dimensionKey === OPERATIONAL_DRE_UNASSIGNED_DIMENSION_KEY ||
    dimensionKey === '';
  const scopedFilters: OperationalDreFilters = {
    ...filters,
    customerId: unassigned ? undefined : dimensionKey,
  };

  const trips = await fetchOperationalDreTripDetails(
    supabase,
    companyId,
    scopedFilters,
    {unassignedCustomerOnly: unassigned},
  );
  const expenses = await fetchOperationalDreExpenses(supabase, companyId, {
    filters: scopedFilters,
    tripIds: trips.map((trip) => trip.id),
  });
  const mileage = await fetchMileageAllocationContext(
    supabase,
    companyId,
    trips,
    scopedFilters,
  );

  return calculateOperationalDreDimensionTrips(trips, expenses, scopedFilters, {
    dimension: 'customer',
    allocationBaseTrips: mileage.allocationBaseTrips,
    unlinkedVehicleExpenses: mileage.unlinkedVehicleExpenses,
  });
}

/**
 * Custos agregados por veículo — reutiliza viagens/despesas da DRE + rateio por KM.
 */
export async function getOperationalDreByVehicle(
  supabase: SupabaseClient,
  companyId: string,
  filters: OperationalDreFilters = {},
): Promise<OperationalDreByVehicleData> {
  const {trips, expenses} = await fetchOperationalDreSource(
    supabase,
    companyId,
    filters,
  );
  const vehicleIds = trips
    .map((trip) => trip.vehicleId)
    .filter((id): id is string => Boolean(id));
  const [vehicleLabels, mileage] = await Promise.all([
    fetchOperationalDreVehicleLabels(supabase, companyId, vehicleIds),
    fetchMileageAllocationContext(supabase, companyId, trips, filters),
  ]);

  return {
    groups: calculateOperationalDreByVehicle(
      trips,
      expenses,
      filters,
      vehicleLabels,
      {
        allocationBaseTrips: mileage.allocationBaseTrips,
        unlinkedVehicleExpenses: mileage.unlinkedVehicleExpenses,
      },
    ),
    filters,
  };
}

/**
 * Detalhe lazy das viagens de um veículo.
 */
export async function getOperationalDreVehicleTripDetails(
  supabase: SupabaseClient,
  companyId: string,
  dimensionKey: string,
  filters: OperationalDreFilters = {},
): Promise<OperationalDreTripMetrics[]> {
  const unassigned =
    dimensionKey === OPERATIONAL_DRE_UNASSIGNED_DIMENSION_KEY ||
    dimensionKey === '';
  const scopedFilters: OperationalDreFilters = {
    ...filters,
    vehicleId: unassigned ? undefined : dimensionKey,
  };

  const trips = await fetchOperationalDreTripDetails(
    supabase,
    companyId,
    scopedFilters,
    {unassignedVehicleOnly: unassigned},
  );
  const expenses = await fetchOperationalDreExpenses(supabase, companyId, {
    filters: scopedFilters,
    tripIds: trips.map((trip) => trip.id),
  });
  const mileage = await fetchMileageAllocationContext(
    supabase,
    companyId,
    trips,
    scopedFilters,
  );

  return calculateOperationalDreDimensionTrips(trips, expenses, scopedFilters, {
    dimension: 'vehicle',
    allocationBaseTrips: mileage.allocationBaseTrips,
    unlinkedVehicleExpenses: mileage.unlinkedVehicleExpenses,
  });
}

export async function getOperationalDreFilterOptions(
  supabase: SupabaseClient,
  companyId: string,
): Promise<OperationalDreFilterOptions> {
  const {listDriversForSelect} = await import('@/features/drivers/queries');
  const {listVehiclesForSelect} = await import('@/features/vehicles/queries');
  const {formatPlate} = await import('@/features/vehicles/utils/vehicle-format');

  const settled = await Promise.allSettled([
    listBranchesForSelect(supabase, companyId),
    listCustomersForSelect(supabase, companyId),
    listRoutesForSelect(supabase, companyId),
    listCostCentersForSelect(supabase, companyId),
    listVehiclesForSelect(supabase, companyId),
    listDriversForSelect(supabase, companyId),
  ]);

  const valueOrEmpty = <T,>(result: PromiseSettledResult<T[]>): T[] =>
    result.status === 'fulfilled' ? result.value : [];

  const branches = valueOrEmpty(settled[0]);
  const customers = valueOrEmpty(settled[1]);
  const routes = valueOrEmpty(settled[2]);
  const costCenters = valueOrEmpty(settled[3]);
  const vehicles = valueOrEmpty(settled[4]);
  const drivers = valueOrEmpty(settled[5]);

  return {
    branches: branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      code: branch.code,
    })),
    customers: customers.map((customer) => ({
      id: customer.id,
      name: customer.tradeName?.trim() || customer.legalName,
    })),
    routes: routes.map((route) => ({
      id: route.id,
      name: route.name,
      code: route.code,
    })),
    vehicles: vehicles.map((vehicle) => ({
      id: vehicle.id,
      label: formatPlate(vehicle.plate),
    })),
    drivers: drivers.map((driver) => ({
      id: driver.id,
      name: driver.name,
    })),
    costCenters: costCenters.map((center) => ({
      id: center.id,
      name: center.name,
      code: center.code,
    })),
  };
}
