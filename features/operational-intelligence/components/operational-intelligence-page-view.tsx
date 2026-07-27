'use client';

import {PageTemplate} from '@/components/layout/page-template';
import {ROUTES} from '@/constants/routes/paths';
import type {SharedAnalyticsFilters} from '@/features/analytics-nav';
import type {BreadcrumbItem} from '@/types/global/navigation';

import type {OperationalIntelligenceData} from '../types';
import {OperationalIntelligenceDashboard} from './operational-intelligence-dashboard';

const CRUMBS: BreadcrumbItem[] = [
  {label: 'Dashboard', href: ROUTES.dashboard},
  {label: 'Inteligência Operacional'},
];

export interface OperationalIntelligencePageViewProps {
  data: OperationalIntelligenceData;
  filters?: SharedAnalyticsFilters;
  error?: string | null;
}

function OperationalIntelligencePageView({
  data,
  filters = {},
  error = null,
}: OperationalIntelligencePageViewProps) {
  return (
    <PageTemplate
      title="Inteligência Operacional"
      description="Monitoramento em tempo real da saúde logística — atrasos, SLA, filiais e ocorrências."
      breadcrumbItems={CRUMBS}
    >
      <OperationalIntelligenceDashboard
        data={data}
        filters={filters}
        error={error}
      />
    </PageTemplate>
  );
}

export {OperationalIntelligencePageView};
