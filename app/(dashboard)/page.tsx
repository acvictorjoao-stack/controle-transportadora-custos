import {redirect} from 'next/navigation';

import {DashboardHashScroll} from '@/components/layout/dashboard-hash-scroll';
import {PageTemplate} from '@/components/layout/page-template';
import {OperationalDreView} from '@/features/dre/components';
import {
  getOperationalDreBundle,
  getOperationalDreFilterOptions,
} from '@/features/dre/loaders';
import type {
  OperationalDreByRouteData,
  OperationalDreData,
  OperationalDreFilterOptions,
} from '@/features/dre/types';
import {parseOperationalDreFilters} from '@/features/dre/utils/list-url';
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

const EMPTY_DRE: OperationalDreData = {
  revenues: {freightRevenue: 0, totalRevenue: 0},
  costs: {
    fuel: 0,
    maintenance: 0,
    tires: 0,
    financial: 0,
    accountsPayable: 0,
    other: 0,
    totalOperatingCosts: 0,
  },
  result: {operatingProfit: 0, operatingMarginPercent: 0},
  indicators: {
    revenuePerKm: null,
    costPerKm: null,
    profitPerKm: null,
    revenuePerTrip: null,
    costPerTrip: null,
    profitPerTrip: null,
    tripCount: 0,
    totalKm: 0,
    customersServed: 0,
    routesUsed: 0,
    vehiclesUsed: 0,
  },
  analyticalTable: [],
  costCenterBreakdown: {byCode: {}, ranking: [], total: 0},
  filters: {},
};

const EMPTY_BY_ROUTE: OperationalDreByRouteData = {
  groups: [],
  filters: {},
};

const EMPTY_FILTER_OPTIONS: OperationalDreFilterOptions = {
  branches: [],
  customers: [],
  routes: [],
  costCenters: [],
};

interface DashboardPageProps {
  searchParams: Promise<{
    empresa?: string;
    cliente?: string;
    rota?: string;
    centro?: string;
    de?: string;
    ate?: string;
  }>;
}

export default async function DashboardPage({searchParams}: DashboardPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const params = await searchParams;
  const dreFilters = parseOperationalDreFilters(params);

  const [company, dashboardData] = await Promise.all([
    getCurrentCompanyProfile(supabase, companyId),
    getOperationalDashboardData(supabase, companyId),
  ]);
  const showOnboarding = company ? needsOnboarding(company) : false;
  const branches = showOnboarding
    ? await listBranches(supabase, {companyId})
    : null;

  let dreData: OperationalDreData = {...EMPTY_DRE, filters: dreFilters};
  let dreByRoute: OperationalDreByRouteData = {...EMPTY_BY_ROUTE, filters: dreFilters};
  let dreFilterOptions: OperationalDreFilterOptions = EMPTY_FILTER_OPTIONS;
  let dreError: string | null = null;

  try {
    const [bundle, filterOptions] = await Promise.all([
      getOperationalDreBundle(supabase, companyId, dreFilters),
      getOperationalDreFilterOptions(supabase, companyId),
    ]);
    dreData = bundle.dre;
    dreByRoute = bundle.byRoute;
    dreFilterOptions = filterOptions;
  } catch (err) {
    dreError =
      err instanceof Error ? err.message : 'Erro ao carregar a DRE Operacional.';
  }

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
        <DashboardHashScroll />
        <div className="flex flex-col gap-8">
          <div id="visao-geral" className="scroll-mt-4">
            <OperationalDashboard data={dashboardData} />
          </div>
          <div id="dre" className="scroll-mt-4">
            <OperationalDreView
              data={dreData}
              byRoute={dreByRoute}
              filterOptions={dreFilterOptions}
              initialFilters={dreFilters}
              error={dreError}
            />
          </div>
        </div>
      </PageTemplate>
    </>
  );
}
