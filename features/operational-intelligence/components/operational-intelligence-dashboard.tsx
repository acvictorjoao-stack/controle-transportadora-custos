'use client';

import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {Section} from '@/components/layout/section';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {
  AnalyticsShell,
  buildCrossNavHref,
  buildRankingExportPayload,
} from '@/features/analytics-nav';
import type {SharedAnalyticsFilters} from '@/features/analytics-nav';
import {ROUTES} from '@/constants/routes/paths';
import Link from 'next/link';
import * as React from 'react';

import type {OperationalIntelligenceData} from '../types';
import {OperationalAlertsCard} from './operational-alerts-card';
import {OperationalCharts} from './operational-charts';
import {OperationalDrillDown} from './operational-drill-down';
import {OperationalHeatMap} from './operational-heat-map';
import {OperationalKpiGrid} from './operational-kpi-grid';
import {OperationalQuickLinks} from './operational-quick-links';
import {OperationalRanking} from './operational-ranking';
import {OperationalTimeline} from './operational-timeline';

export interface OperationalIntelligenceDashboardProps {
  data: OperationalIntelligenceData;
  filters?: SharedAnalyticsFilters;
  error?: string | null;
}

function OperationalIntelligenceDashboard({
  data,
  filters = {},
  error = null,
}: OperationalIntelligenceDashboardProps) {
  const exportPayload = React.useMemo(
    () =>
      buildRankingExportPayload({
        title: 'Inteligência Operacional',
        kpis: [
          {
            label: 'Viagens em andamento',
            value: String(data.kpis.tripsInProgress),
          },
          {label: 'Atrasadas', value: String(data.kpis.tripsDelayed)},
          {
            label: 'SLA',
            value:
              data.kpis.slaPercent == null
                ? '—'
                : `${data.kpis.slaPercent.toFixed(1)}%`,
          },
          {
            label: 'Ocorrências abertas',
            value: String(data.kpis.openOccurrences),
          },
        ],
        columns: [
          {id: 'name', header: 'Filial'},
          {id: 'active', header: 'Ativas'},
          {id: 'delayed', header: 'Atrasadas'},
          {id: 'sla', header: 'SLA %'},
          {id: 'status', header: 'Status'},
        ],
        rows: data.branchRanking.map((row) => ({
          name: row.name,
          active: row.activeTrips,
          delayed: row.delayedTrips,
          sla: row.slaPercent,
          status: row.status,
        })),
      }),
    [data],
  );

  const crossLinks = React.useMemo(
    () => [
      {label: 'Rotas', href: buildCrossNavHref('rentabilidade-rotas', filters)},
      {
        label: 'Cliente',
        href: buildCrossNavHref('rentabilidade-clientes', filters),
      },
      {
        label: 'Rentabilidade',
        href: buildCrossNavHref('rentabilidade-veiculos', filters),
      },
      {label: 'DRE', href: buildCrossNavHref('dre', filters)},
    ],
    [filters],
  );

  const insights = React.useMemo(() => {
    const topBranch = data.branchRanking[0];
    const topCustomer = data.customersByDelay[0];
    const topRoute = data.criticalRoutes[0];
    const items = [];

    if (topBranch) {
      items.push({
        id: 'branch',
        title: 'Filial responsável',
        label: topBranch.name,
        subtitle: `${topBranch.delayedTrips} atrasos`,
        href: buildCrossNavHref('inteligencia', filters, {
          branchId: topBranch.id,
        }),
      });
    }
    if (topCustomer) {
      items.push({
        id: 'customer',
        title: 'Cliente com mais atrasos',
        label: topCustomer.name,
        href: buildCrossNavHref('rentabilidade-clientes', filters, {
          customerId: topCustomer.id,
        }),
      });
    }
    if (topRoute) {
      items.push({
        id: 'route',
        title: 'Rota crítica',
        label: topRoute.name,
        href: buildCrossNavHref('rentabilidade-rotas', filters, {
          routeId: topRoute.id,
        }),
      });
    }
    items.push({
      id: 'dre',
      title: 'Ver DRE',
      label: 'Resultado operacional',
      href: buildCrossNavHref('dre', filters),
    });
    return items;
  }, [data, filters]);

  return (
    <AnalyticsShell
      filters={filters}
      currentModule="inteligencia"
      basePath={ROUTES.dashboardInteligencia}
      filenameBase="inteligencia-operacional"
      exportPayload={exportPayload}
      insights={insights}
      crossLinks={crossLinks}
    >
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Section
        title="Saúde operacional"
        description="O que está acontecendo agora — sem indicadores financeiros."
      >
        <OperationalKpiGrid kpis={data.kpis} />
      </Section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <OperationalAlertsCard alerts={data.alerts} />
        </div>
        <OperationalTimeline timeline={data.timeline} />
      </div>

      <OperationalHeatMap rows={data.branchHeatMap} />

      <Section
        title="Viagens que precisam de atenção"
        description="Atrasos e viagens próximas do SLA."
      >
        <TableContainer>
          <DataTable
            columns={[
              {
                id: 'trip',
                header: 'Viagem',
                cell: (row: (typeof data.tripsNeedingAttention)[number]) => (
                  <Link
                    href={ROUTES.viagemDetail(row.id)}
                    className="font-medium hover:underline"
                  >
                    {row.tripNumber}
                  </Link>
                ),
              },
              {
                id: 'customer',
                header: 'Cliente',
                cell: (row: (typeof data.tripsNeedingAttention)[number]) =>
                  row.customerName ?? '—',
              },
              {
                id: 'branch',
                header: 'Filial',
                cell: (row: (typeof data.tripsNeedingAttention)[number]) =>
                  row.branchName ?? '—',
              },
              {
                id: 'reason',
                header: 'Motivo',
                cell: (row: (typeof data.tripsNeedingAttention)[number]) =>
                  row.reason,
              },
            ]}
            data={data.tripsNeedingAttention}
            getRowKey={(row) => row.id}
            emptyTitle="Nenhuma viagem crítica"
            emptyDescription="Nenhum atraso ou risco de SLA no momento."
          />
        </TableContainer>
      </Section>

      <OperationalRanking
        branches={data.branchRanking}
        customersByDelay={data.customersByDelay}
        customersByOccurrences={data.customersByOccurrences}
        customersBySla={data.customersBySla}
        criticalRoutes={data.criticalRoutes}
        routesByLeadTime={data.routesByLeadTime}
      />

      <OperationalCharts charts={data.charts} />

      <OperationalDrillDown nodes={data.drillDown} />

      <OperationalQuickLinks filters={filters} />
    </AnalyticsShell>
  );
}

export {OperationalIntelligenceDashboard};
