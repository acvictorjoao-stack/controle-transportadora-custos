import {redirect} from 'next/navigation';

import {PageTemplate} from '@/components/layout/page-template';
import {ROUTES} from '@/constants/routes/paths';
import {ExecutiveDashboard} from '@/features/organization/dashboard/components/executive-dashboard';
import {getExecutiveDashboardData} from '@/features/organization/dashboard/loaders/executive-dashboard-loader';
import {currentMonthFilters} from '@/features/organization/dashboard/utils/period';
import {getCurrentCompanyProfile, needsOnboarding} from '@/features/organization/companies/queries';
import {listBranches} from '@/features/organization/branches/queries';
import {OnboardingWizard} from '@/features/organization/onboarding/components';
import {
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';

export default async function DashboardPage() {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const [company, executiveData] = await Promise.all([
    getCurrentCompanyProfile(supabase, companyId),
    getExecutiveDashboardData(supabase, companyId, currentMonthFilters()),
  ]);
  const showOnboarding = company ? needsOnboarding(company) : false;
  const branches = showOnboarding
    ? await listBranches(supabase, {companyId})
    : null;

  return (
    <>
      {showOnboarding && company && branches && (
        <OnboardingWizard company={company} branches={branches} />
      )}
      <PageTemplate
        title="Dashboard Executivo"
        description="Indicadores, rankings e alertas para tomada de decisão."
        breadcrumbItems={[
          {label: 'Dashboard', href: ROUTES.dashboard},
          {label: 'Visão Geral'},
        ]}
      >
        <ExecutiveDashboard data={executiveData} />
      </PageTemplate>
    </>
  );
}
