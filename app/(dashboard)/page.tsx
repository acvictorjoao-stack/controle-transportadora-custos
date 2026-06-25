import {Calendar, Plus} from 'lucide-react';

import {
  DashboardCharts,
  DashboardKpis,
  DashboardRankings,
  DashboardSideCards,
} from '@/components/dashboard';
import {dashboardMock} from '@/components/dashboard/mock-data';
import {PageTemplate} from '@/components/layout/page-template';
import {Section} from '@/components/layout/section';
import {Button} from '@/components/ui/button';

export default function DashboardPage() {
  const {title, description} = dashboardMock.header;

  return (
    <PageTemplate
      title={title}
      description={description}
      showBreadcrumb={false}
      actions={
        <>
          <Button variant="outline" size="sm" disabled>
            <Calendar className="size-4" />
            Últimos 30 dias
          </Button>
          <Button size="sm" disabled>
            <Plus className="size-4" />
            Nova Ação
          </Button>
        </>
      }
    >
      <Section>
        <DashboardKpis />
      </Section>

      <div className="grid grid-cols-1 gap-4 lg:gap-5 xl:grid-cols-3 2xl:grid-cols-4">
        <div className="flex flex-col gap-4 lg:gap-5 xl:col-span-2 2xl:col-span-3">
          <DashboardCharts />
          <DashboardRankings />
        </div>
        <div className="xl:col-span-1">
          <DashboardSideCards />
        </div>
      </div>
    </PageTemplate>
  );
}
