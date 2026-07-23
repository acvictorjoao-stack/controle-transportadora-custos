import {notFound, redirect} from 'next/navigation';

import {SupplierDetailView} from '@/features/suppliers/components';
import {composeSupplierDetail} from '@/features/suppliers/loaders';
import type {SupplierDetailData} from '@/features/suppliers/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface FornecedorDetailPageProps {
  params: Promise<{id: string}>;
}

export default async function FornecedorDetailPage({params}: FornecedorDetailPageProps) {
  const {id} = await params;
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'suppliers:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  let data: SupplierDetailData | null;

  try {
    data = await composeSupplierDetail(supabase, companyId, id);
  } catch {
    notFound();
  }

  if (!data) {
    notFound();
  }

  return <SupplierDetailView data={data} />;
}
