import {unstable_cache, revalidateTag} from 'next/cache';
import {cache} from 'react';

import {createAdminClient} from '@/supabase/server/admin';

const REVALIDATE_SECONDS = 120;

export const referenceCacheTags = {
  branches: (companyId: string) => `branches:select:${companyId}`,
  customers: (companyId: string) => `customers:select:${companyId}`,
  suppliers: (companyId: string) => `suppliers:select:${companyId}`,
  costCenters: (companyId: string) => `cost-centers:select:${companyId}`,
  companyProfile: (companyId: string) => `company-profile:${companyId}`,
} as const;

export function revalidateBranchesSelect(companyId: string) {
  revalidateTag(referenceCacheTags.branches(companyId));
}

export function revalidateCustomersSelect(companyId: string) {
  revalidateTag(referenceCacheTags.customers(companyId));
}

export function revalidateSuppliersSelect(companyId: string) {
  revalidateTag(referenceCacheTags.suppliers(companyId));
}

export function revalidateCostCentersSelect(companyId: string) {
  revalidateTag(referenceCacheTags.costCenters(companyId));
}

export function revalidateCompanyProfile(companyId: string) {
  revalidateTag(referenceCacheTags.companyProfile(companyId));
}

function getAdminOrNull() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

export type CachedBranchSelect = {
  id: string;
  name: string;
  code: string | null;
};

/**
 * Cache cross-request de filiais para selects (admin + filtro company_id).
 * Retorna null se service role indisponível — caller usa client do usuário.
 */
export const getCachedBranchesForSelect = cache(
  async (
    companyId: string,
    limit = 100,
  ): Promise<CachedBranchSelect[] | null> => {
    const admin = getAdminOrNull();
    if (!admin) return null;

    return unstable_cache(
      async () => {
        const {data, error} = await admin
          .from('branches')
          .select('id, name, code')
          .eq('company_id', companyId)
          .is('deleted_at', null)
          .order('is_headquarters', {ascending: false})
          .order('name', {ascending: true})
          .limit(limit);

        if (error) throw new Error(error.message);
        return (data ?? []).map((row) => ({
          id: row.id as string,
          name: row.name as string,
          code: (row.code as string | null) ?? null,
        }));
      },
      ['branches-for-select', companyId, String(limit)],
      {
        revalidate: REVALIDATE_SECONDS,
        tags: [referenceCacheTags.branches(companyId)],
      },
    )();
  },
);

export const getCachedCostCentersForSelect = cache(
  async (
    companyId: string,
    limit = 100,
  ): Promise<
    | {id: string; code: string; name: string; active: boolean}[]
    | null
  > => {
    const admin = getAdminOrNull();
    if (!admin) return null;

    return unstable_cache(
      async () => {
        const {data, error} = await admin
          .from('cost_centers')
          .select('id, code, name, status')
          .eq('company_id', companyId)
          .eq('status', 'active')
          .is('deleted_at', null)
          .order('is_system', {ascending: false})
          .order('code', {ascending: true})
          .limit(limit);

        if (error) throw new Error(error.message);
        const rows = (data ?? []) as Array<{
          id: string;
          code: string;
          name: string;
          status: string;
        }>;
        return rows.map((row) => ({
          id: row.id,
          code: row.code,
          name: row.name,
          active: row.status === 'active',
        }));
      },
      ['cost-centers-for-select', companyId, String(limit)],
      {
        revalidate: REVALIDATE_SECONDS,
        tags: [referenceCacheTags.costCenters(companyId)],
      },
    )();
  },
);
