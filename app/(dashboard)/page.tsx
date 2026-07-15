import {redirect} from 'next/navigation';

import {PageTemplate} from '@/components/layout/page-template';
import {OperationalDashboard} from '@/features/organization/dashboard/components/operational-dashboard';
import {getOperationalDashboardData} from '@/features/organization/dashboard/queries/operational-dashboard';
import {getCurrentCompanyProfile, needsOnboarding} from '@/features/organization/companies/queries';
import {listBranches} from '@/features/organization/branches/queries';
import {OnboardingWizard} from '@/features/organization/onboarding/components';
import {
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

export default async function DashboardPage() {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const [company, dashboardData] = await Promise.all([
    getCurrentCompanyProfile(supabase, companyId),
    getOperationalDashboardData(supabase, companyId),
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
        title="Dashboard Operacional"
        description="Visão rápida da operação: viagens, fretes, frota e cadastros."
        showBreadcrumb={false}
      >
        <OperationalDashboard data={dashboardData} />
      </PageTemplate>
    </>
  );
}
