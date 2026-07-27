import {redirect} from 'next/navigation';

import {PageTemplate} from '@/components/layout/page-template';
import {ROUTES} from '@/constants/routes/paths';
import {ExecutiveCockpit} from '@/features/executive-cockpit/components/executive-cockpit';
import {getExecutiveCockpitData} from '@/features/executive-cockpit/loaders/executive-cockpit-loader';
import {parseCockpitPeriodPreset} from '@/features/executive-cockpit/utils/period';
import {
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';

interface ExecutiveCockpitPageProps {
  searchParams: Promise<{
    periodo?: string;
  }>;
}

export default async function ExecutiveCockpitPage({
  searchParams,
}: ExecutiveCockpitPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const params = await searchParams;
  const periodPreset = parseCockpitPeriodPreset(params.periodo);
  const data = await getExecutiveCockpitData(supabase, companyId, periodPreset);

  return (
    <PageTemplate
      title="Central de Indicadores"
      description="Cockpit executivo personalizável para gestão diária."
      breadcrumbItems={[
        {label: 'Dashboard', href: ROUTES.dashboard},
        {label: 'Central de Indicadores'},
      ]}
    >
      <ExecutiveCockpit data={data} />
    </PageTemplate>
  );
}
