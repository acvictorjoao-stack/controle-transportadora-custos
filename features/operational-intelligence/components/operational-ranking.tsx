'use client';

import Link from 'next/link';

import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {Section} from '@/components/layout/section';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {ROUTES} from '@/constants/routes/paths';

import type {
  BranchOperationalRow,
  CustomerOperationalRow,
  RouteOperationalRow,
} from '../types';
import {formatOperationalStatus} from '../utils/compose';

export interface OperationalRankingProps {
  branches: BranchOperationalRow[];
  customersByDelay: CustomerOperationalRow[];
  customersByOccurrences: CustomerOperationalRow[];
  customersBySla: CustomerOperationalRow[];
  criticalRoutes: RouteOperationalRow[];
  routesByLeadTime: RouteOperationalRow[];
}

function formatPercent(value: number | null): string {
  if (value == null) return '—';
  return `${value.toLocaleString('pt-BR', {maximumFractionDigits: 1})}%`;
}

function formatMinutes(value: number | null): string {
  if (value == null) return '—';
  return `${Math.round(value)} min`;
}

function RankingListCard({
  title,
  description,
  emptyMessage,
  items,
}: {
  title: string;
  description: string;
  emptyMessage: string;
  items: Array<{id: string; primary: string; secondary: string}>;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
              >
                <p className="truncate text-sm font-medium">
                  <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                  {item.primary}
                </p>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {item.secondary}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function OperationalRanking({
  branches,
  customersByDelay,
  customersByOccurrences,
  customersBySla,
  criticalRoutes,
  routesByLeadTime,
}: OperationalRankingProps) {
  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Ranking de Filiais"
        description="SLA, lead time, atrasos e ocorrências por unidade."
      >
        <TableContainer>
          <DataTable
            columns={[
              {
                id: 'branch',
                header: 'Filial',
                cell: (row: BranchOperationalRow) => row.name,
              },
              {
                id: 'sla',
                header: 'SLA',
                cell: (row: BranchOperationalRow) => formatPercent(row.slaPercent),
              },
              {
                id: 'lead',
                header: 'Lead Time',
                cell: (row: BranchOperationalRow) =>
                  formatMinutes(row.averageLeadTimeMinutes),
              },
              {
                id: 'delays',
                header: 'Atrasos',
                cell: (row: BranchOperationalRow) => row.delayedTrips,
              },
              {
                id: 'occurrences',
                header: 'Ocorrências',
                cell: (row: BranchOperationalRow) => row.occurrenceCount,
              },
              {
                id: 'status',
                header: 'Status',
                cell: (row: BranchOperationalRow) =>
                  formatOperationalStatus(row.status),
              },
            ]}
            data={branches}
            getRowKey={(row) => row.id}
            emptyTitle="Sem ranking de filiais"
            emptyDescription="Ajuste o recorte operacional para visualizar."
          />
        </TableContainer>
      </Section>

      <Section title="Ranking de Clientes" description="Atrasos, ocorrências e melhor SLA.">
        <div className="grid gap-4 xl:grid-cols-3">
          <RankingListCard
            title="Maior atraso"
            description="Clientes com mais viagens atrasadas"
            emptyMessage="Nenhum cliente com atraso."
            items={customersByDelay.map((item) => ({
              id: item.id,
              primary: item.name,
              secondary: `${item.delayedTrips} atraso${item.delayedTrips === 1 ? '' : 's'}`,
            }))}
          />
          <RankingListCard
            title="Mais ocorrências"
            description="Clientes com maior volume de ocorrências"
            emptyMessage="Nenhuma ocorrência no recorte."
            items={customersByOccurrences.map((item) => ({
              id: item.id,
              primary: item.name,
              secondary: `${item.occurrenceCount} ocorr.`,
            }))}
          />
          <RankingListCard
            title="Melhor SLA"
            description="Clientes com maior aderência"
            emptyMessage="Sem base de SLA por cliente."
            items={customersBySla.map((item) => ({
              id: item.id,
              primary: item.name,
              secondary: formatPercent(item.slaPercent),
            }))}
          />
        </div>
      </Section>

      <Section title="Ranking de Rotas" description="Rotas críticas, lead time e link de rentabilidade.">
        <div className="grid gap-4 xl:grid-cols-2">
          <RankingListCard
            title="Rotas críticas"
            description="Pior SLA / mais atrasos"
            emptyMessage="Nenhuma rota crítica."
            items={criticalRoutes.map((item) => ({
              id: item.id,
              primary: item.name,
              secondary: `${formatOperationalStatus(item.status)} · ${item.delayedTrips} atraso${item.delayedTrips === 1 ? '' : 's'}`,
            }))}
          />
          <RankingListCard
            title="Maior Lead Time"
            description="Rotas com maior tempo médio"
            emptyMessage="Dados insuficientes para calcular previsão."
            items={routesByLeadTime.map((item) => ({
              id: item.id,
              primary: item.name,
              secondary: formatMinutes(item.averageLeadTimeMinutes),
            }))}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Rotas mais lucrativas</CardTitle>
            <CardDescription>
              Análise financeira disponível na Rentabilidade por Rota (sem KPIs
              financeiros nesta tela).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={ROUTES.dashboardRentabilidadeRotas}
              className="text-sm font-medium text-primary hover:underline"
            >
              Abrir Rentabilidade por Rota →
            </Link>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}

export {OperationalRanking};
