import {notFound, redirect} from 'next/navigation';

import {ROUTES} from '@/constants/routes/paths';
import {RouteDetailView} from '@/features/routes/components';
import {getRouteDetail} from '@/features/routes/queries';
import type {RouteDetailData} from '@/features/routes/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';

interface RotaDetailPageProps {
  params: Promise<{id: string}>;
}

export default async function RotaDetailPage({params}: RotaDetailPageProps) {
  const {id} = await params;
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'routes:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  let data: RouteDetailData | null;

  try {
    data = await getRouteDetail(supabase, companyId, id);
  } catch {
    notFound();
  }

  if (!data) {
    notFound();
  }

  return <RouteDetailView data={data} />;
}
