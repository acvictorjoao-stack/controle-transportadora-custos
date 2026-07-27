import {Section} from '@/components/layout/section';
import {RoutesWithoutLeadTimeAlert} from '@/features/cadastro-quality/components';

import type {ExecutiveDashboardData} from '../loaders/executive-dashboard-loader';
import {ExecutiveKpiGrid} from './executive-kpi-grid';
import {OperationalAlertsCard} from './operational-alerts-card';
import {QuickAccessCards} from './quick-access-cards';
import {TopCustomersCard} from './top-customers-card';
import {TopRoutesCard} from './top-routes-card';

export interface ExecutiveDashboardProps {
  data: ExecutiveDashboardData;
}

/**
 * Dashboard executivo — KPIs, rankings, alertas e atalhos.
 * Sem conteúdo analítico detalhado (DRE / tabelas).
 */
function ExecutiveDashboard({data}: ExecutiveDashboardProps) {
  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Indicadores executivos"
        description="Visão consolidada para tomada de decisão."
      >
        <ExecutiveKpiGrid kpis={data.kpis} />
      </Section>

      <Section title="Top Rankings" description="Melhores resultados do período.">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <TopRoutesCard routes={data.topRoutes} />
          <TopCustomersCard customers={data.topCustomers} />
        </div>
      </Section>

      <RoutesWithoutLeadTimeAlert
        routes={data.routesWithoutLeadTime}
        compact
      />

      <OperationalAlertsCard alerts={data.alerts} />

      <QuickAccessCards />
    </div>
  );
}

export {ExecutiveDashboard};
