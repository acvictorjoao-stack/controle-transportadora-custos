'use server';

import type {ActionResult} from '@/features/organization/shared/action-result';
import {
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';

import {getTripFinancialBreakdown} from '../loaders/trip-financial-breakdown-loader';
import type {TripFinancialBreakdownData} from '../types/trip-financial-breakdown';

/**
 * Lazy load do detalhamento financeiro ao expandir uma viagem.
 */
export async function loadTripFinancialBreakdownAction(input: {
  tripId: string;
}): Promise<ActionResult<TripFinancialBreakdownData>> {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    return {success: false, error: 'Empresa não encontrada.'};
  }

  if (!input.tripId) {
    return {success: false, error: 'Viagem não informada.'};
  }

  try {
    const data = await getTripFinancialBreakdown(
      supabase,
      companyId,
      input.tripId,
    );
    return {success: true, data};
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'Erro ao carregar o detalhamento financeiro da viagem.',
    };
  }
}
