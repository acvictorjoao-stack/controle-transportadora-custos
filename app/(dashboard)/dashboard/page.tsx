import {Suspense} from 'react';
import {redirect} from 'next/navigation';

import {PageTemplate} from '@/components/layout/page-template';
import {Section} from '@/components/layout/section';
import {Skeleton} from '@/components/ui/skeleton';
import {ROUTES} from '@/constants/routes/paths';
import {RoutesWithoutLeadTimeAlert} from '@/features/cadastro-quality/components';
import {ExecutiveKpiGrid} from '@/features/organization/dashboard/components/executive-kpi-grid';
import {OperationalAlertsCard} from '@/features/organization/dashboard/components/operational-alerts-card';
import {QuickAccessCards} from '@/features/organization/dashboard/components/quick-access-cards';
import {TopCustomersCard} from '@/features/organization/dashboard/components/top-customers-card';
import {TopRoutesCard} from '@/features/organization/dashboard/components/top-routes-card';
import {
  getExecutiveDashboardCore,
  getExecutiveDashboardSecondary,
  type ExecutiveDashboardCoreData,
} from '@/features/organization/dashboard/loaders/executive-dashboard-loader';
import {currentMonthFilters} from '@/features/organization/dashboard/utils/period';
import {getCurrentCompanyProfile, needsOnboarding} from '@/features/organization/companies/queries';
import {listBranches} from '@/features/organization/branches/queries';
import {OnboardingWizard} from '@/features/organization/onboarding/components';
import {
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';

function RankingsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function AlertsSkeleton() {
  return <Skeleton className="h-40 w-full rounded-xl" />;
}

async function ExecutiveSecondaryPanels({
  companyId,
  core,
}: {
  companyId: string;
  core: ExecutiveDashboardCoreData;
}) {
  const supabase = await getServerSupabaseClient();
  const secondary = await getExecutiveDashboardSecondary(
    supabase,
    companyId,
    core,
  );

  return (
    <>
      <RoutesWithoutLeadTimeAlert
        routes={secondary.routesWithoutLeadTime}
        compact
      />
      <OperationalAlertsCard alerts={secondary.alerts} />
    </>
  );
}

export default async function DashboardPage() {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const [company, core] = await Promise.all([
    getCurrentCompanyProfile(supabase, companyId),
    getExecutiveDashboardCore(supabase, companyId, currentMonthFilters()),
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
        <div className="flex flex-col gap-6">
          <Section
            title="Indicadores executivos"
            description="Visão consolidada para tomada de decisão."
          >
            <ExecutiveKpiGrid kpis={core.kpis} />
          </Section>

          <Section title="Top Rankings" description="Melhores resultados do período.">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <TopRoutesCard routes={core.topRoutes} />
              <TopCustomersCard customers={core.topCustomers} />
            </div>
          </Section>

          <Suspense
            fallback={
              <>
                <AlertsSkeleton />
                <RankingsSkeleton />
              </>
            }
          >
            <ExecutiveSecondaryPanels companyId={companyId} core={core} />
          </Suspense>

          <QuickAccessCards />
        </div>
      </PageTemplate>
    </>
  );
}
