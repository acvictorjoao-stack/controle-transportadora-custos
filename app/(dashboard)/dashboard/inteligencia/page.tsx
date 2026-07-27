import {redirect} from 'next/navigation';

import {OperationalIntelligencePageView} from '@/features/operational-intelligence/components/operational-intelligence-page-view';
import {getOperationalIntelligenceData} from '@/features/operational-intelligence/loaders/operational-intelligence-loader';
import type {OperationalIntelligenceData} from '@/features/operational-intelligence/types';
import {parseSharedAnalyticsFilters} from '@/features/analytics-nav';
import {
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

const EMPTY_DATA: OperationalIntelligenceData = {
  generatedAt: new Date(0).toISOString(),
  kpis: {
    tripsInProgress: 0,
    tripsCompletedToday: 0,
    tripsDelayed: 0,
    pendingDeliveries: 0,
    averageLeadTimeMinutes: null,
    slaPercent: null,
    openOccurrences: 0,
    averageUnloadMinutes: null,
  },
  branchHeatMap: [],
  branchRanking: [],
  customersByDelay: [],
  customersByOccurrences: [],
  customersBySla: [],
  criticalRoutes: [],
  routesByLeadTime: [],
  alerts: [],
  timeline: null,
  charts: {
    tripsByHour: [],
    dailySla: [],
    leadTimeByDay: [],
    completedDeliveries: [],
    occurrencesByReason: [],
  },
  drillDown: [],
  tripsNeedingAttention: [],
};

interface InteligenciaOperacionalPageProps {
  searchParams: Promise<{
    empresa?: string;
    filial?: string;
    cliente?: string;
    rota?: string;
    veiculo?: string;
    motorista?: string;
    centro?: string;
    de?: string;
    ate?: string;
    periodo?: string;
  }>;
}

export default async function InteligenciaOperacionalPage({
  searchParams,
}: InteligenciaOperacionalPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const params = await searchParams;
  const filters = parseSharedAnalyticsFilters(params);

  let data = EMPTY_DATA;
  let error: string | null = null;

  try {
    data = await getOperationalIntelligenceData(supabase, companyId);
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : 'Erro ao carregar a inteligência operacional.';
  }

  return (
    <OperationalIntelligencePageView
      data={data}
      filters={filters}
      error={error}
    />
  );
}
