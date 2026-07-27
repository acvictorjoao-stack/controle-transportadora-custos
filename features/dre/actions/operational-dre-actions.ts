'use server';

import type {ActionResult} from '@/features/organization/shared/action-result';
import {
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';

import {
  getOperationalDreCustomerTripDetails,
  getOperationalDreRouteTripDetails,
  getOperationalDreVehicleTripDetails,
} from '../loaders';
import type {OperationalDreFilters, OperationalDreTripMetrics} from '../types';

/**
 * Lazy load do detalhe de viagens ao expandir uma rota na DRE.
 */
export async function loadOperationalDreRouteTripsAction(input: {
  dimensionKey: string;
  filters: OperationalDreFilters;
}): Promise<ActionResult<OperationalDreTripMetrics[]>> {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    return {success: false, error: 'Empresa não encontrada.'};
  }

  if (!input.dimensionKey) {
    return {success: false, error: 'Rota não informada.'};
  }

  try {
    const trips = await getOperationalDreRouteTripDetails(
      supabase,
      companyId,
      input.dimensionKey,
      input.filters ?? {},
    );
    return {success: true, data: trips};
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'Erro ao carregar viagens da rota.',
    };
  }
}

/**
 * Lazy load do detalhe de viagens ao expandir um cliente.
 */
export async function loadOperationalDreCustomerTripsAction(input: {
  dimensionKey: string;
  filters: OperationalDreFilters;
}): Promise<ActionResult<OperationalDreTripMetrics[]>> {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    return {success: false, error: 'Empresa não encontrada.'};
  }

  if (!input.dimensionKey) {
    return {success: false, error: 'Cliente não informado.'};
  }

  try {
    const trips = await getOperationalDreCustomerTripDetails(
      supabase,
      companyId,
      input.dimensionKey,
      input.filters ?? {},
    );
    return {success: true, data: trips};
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'Erro ao carregar viagens do cliente.',
    };
  }
}

/**
 * Lazy load do detalhe de viagens ao expandir um veículo.
 */
export async function loadOperationalDreVehicleTripsAction(input: {
  dimensionKey: string;
  filters: OperationalDreFilters;
}): Promise<ActionResult<OperationalDreTripMetrics[]>> {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    return {success: false, error: 'Empresa não encontrada.'};
  }

  if (!input.dimensionKey) {
    return {success: false, error: 'Veículo não informado.'};
  }

  try {
    const trips = await getOperationalDreVehicleTripDetails(
      supabase,
      companyId,
      input.dimensionKey,
      input.filters ?? {},
    );
    return {success: true, data: trips};
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'Erro ao carregar viagens do veículo.',
    };
  }
}
