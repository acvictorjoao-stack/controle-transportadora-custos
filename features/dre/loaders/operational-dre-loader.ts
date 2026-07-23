import type {SupabaseClient} from '@supabase/supabase-js';

import {listCostCentersForSelect} from '@/features/cost-centers/queries';
import {listCustomersForSelect} from '@/features/customers/queries';
import {listBranchesForSelect} from '@/features/organization/branches/queries';
import {listRoutesForSelect} from '@/features/routes/queries';

import {
  fetchOperationalDreExpenses,
  fetchOperationalDreTrips,
} from '../queries';
import {calculateOperationalDre} from '../services';
import type {
  OperationalDreData,
  OperationalDreFilterOptions,
  OperationalDreFilters,
} from '../types';

/**
 * Loader da DRE Operacional — único ponto que combina leituras e cálculo.
 * O Dashboard apenas consome `getOperationalDRE()`.
 */
export async function getOperationalDRE(
  supabase: SupabaseClient,
  companyId: string,
  filters: OperationalDreFilters = {},
): Promise<OperationalDreData> {
  const trips = await fetchOperationalDreTrips(supabase, companyId, filters);
  const expenses = await fetchOperationalDreExpenses(supabase, companyId, {
    filters,
    tripIds: trips.map((trip) => trip.id),
  });

  return calculateOperationalDre(trips, expenses, filters);
}

export async function getOperationalDreFilterOptions(
  supabase: SupabaseClient,
  companyId: string,
): Promise<OperationalDreFilterOptions> {
  const [branches, customers, routes, costCenters] = await Promise.all([
    listBranchesForSelect(supabase, companyId),
    listCustomersForSelect(supabase, companyId),
    listRoutesForSelect(supabase, companyId),
    listCostCentersForSelect(supabase, companyId),
  ]);

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
    costCenters: costCenters.map((center) => ({
      id: center.id,
      name: center.name,
      code: center.code,
    })),
  };
}
