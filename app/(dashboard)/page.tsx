import {redirect} from 'next/navigation';

import {
  DashboardCharts,
  DashboardKpis,
  DashboardRankings,
  DashboardSideCards,
} from '@/components/dashboard';
import {PageTemplate} from '@/components/layout/page-template';
import {Section} from '@/components/layout/section';
import {getCompanyDashboardData} from '@/features/organization/dashboard/queries';
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
    getCompanyDashboardData(supabase, companyId),
  ]);
  const showOnboarding = company ? needsOnboarding(company) : false;
  const branches = showOnboarding
    ? await listBranches(supabase, {companyId})
    : null;

  const {title, description} = dashboardData.header;

  return (
    <>
      {showOnboarding && company && branches && (
        <OnboardingWizard company={company} branches={branches} />
      )}
      <PageTemplate
        title={title}
        description={description}
        showBreadcrumb={false}
      >
        <Section>
          <DashboardKpis kpis={dashboardData.kpis} />
        </Section>

        <div className="grid grid-cols-1 gap-4 lg:gap-5 xl:grid-cols-3 2xl:grid-cols-4">
          <div className="flex flex-col gap-4 lg:gap-5 xl:col-span-2 2xl:col-span-3">
            <DashboardCharts charts={dashboardData.charts} />
            <DashboardRankings rankings={dashboardData.rankings} />
          </div>
          <div className="xl:col-span-1">
            <DashboardSideCards
              alerts={dashboardData.alerts}
              activities={dashboardData.activities}
              upcomingDue={dashboardData.upcomingDue}
            />
          </div>
        </div>
      </PageTemplate>
    </>
  );
}
