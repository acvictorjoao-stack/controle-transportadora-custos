'use client';

import Link from 'next/link';
import {Pencil} from 'lucide-react';

import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {PageTemplate} from '@/components/layout/page-template';
import {Section} from '@/components/layout/section';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {buttonVariants} from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {ROUTES} from '@/constants/routes/paths';
import {ROUTE_OPERATIONAL_STATUS_LABELS} from '@/features/routes/types';
import {
  formatLeadTimeDays,
  formatRouteDisplayName,
  getRouteOperationalStatusVariant,
} from '@/features/routes/utils/route-format';
import {cn} from '@/lib/utils';

import type {CadastroQualityData, CadastroQualityRouteItem} from '../types';
import {RoutesWithoutLeadTimeAlert} from './routes-without-lead-time-alert';

export interface CadastroQualityPageProps {
  data: CadastroQualityData;
  error?: string | null;
}

function QualityTable({
  title,
  description,
  rows,
  emptyTitle,
}: {
  title: string;
  description: string;
  rows: CadastroQualityRouteItem[];
  emptyTitle: string;
}) {
  return (
    <Section title={title} description={description}>
      <TableContainer>
        <DataTable
          columns={[
            {
              id: 'name',
              header: 'Rota',
              cell: (row: CadastroQualityRouteItem) => (
                <Link
                  href={ROUTES.rotaDetail(row.id)}
                  className="font-medium hover:underline"
                >
                  {formatRouteDisplayName(row)}
                </Link>
              ),
            },
            {
              id: 'origin',
              header: 'Origem',
              cell: (row: CadastroQualityRouteItem) => row.origin,
            },
            {
              id: 'destination',
              header: 'Destino',
              cell: (row: CadastroQualityRouteItem) => row.destination,
            },
            {
              id: 'customer',
              header: 'Cliente',
              cell: (row: CadastroQualityRouteItem) => row.customerName ?? '—',
            },
            {
              id: 'lead',
              header: 'Lead Time',
              cell: (row: CadastroQualityRouteItem) =>
                formatLeadTimeDays(row.leadTimeDays),
            },
            {
              id: 'status',
              header: 'Status',
              cell: (row: CadastroQualityRouteItem) => (
                <Badge
                  variant={getRouteOperationalStatusVariant(
                    row.operationalStatus,
                  )}
                >
                  {ROUTE_OPERATIONAL_STATUS_LABELS[row.operationalStatus]}
                </Badge>
              ),
            },
            {
              id: 'actions',
              header: '',
              className: 'w-32',
              cell: (row: CadastroQualityRouteItem) => (
                <Link
                  href={ROUTES.rotaDetail(row.id)}
                  className={cn(buttonVariants({size: 'sm', variant: 'outline'}))}
                >
                  <Pencil className="size-3.5" />
                  Editar rota
                </Link>
              ),
            },
          ]}
          data={rows}
          getRowKey={(row) => row.id}
          emptyTitle={emptyTitle}
          emptyDescription="Nenhuma pendência neste grupo."
        />
      </TableContainer>
    </Section>
  );
}

function CadastroQualityPage({data, error = null}: CadastroQualityPageProps) {
  const {summary} = data;

  return (
    <PageTemplate
      title="Qualidade dos Cadastros"
      description="Regularize rotas sem Lead Time (dias) para manter a camada analítica confiável."
    >
      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de rotas</CardDescription>
            <CardTitle className="text-2xl">{summary.totalRoutes}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sem Lead Time</CardDescription>
            <CardTitle className="text-2xl text-destructive">
              {summary.missingLeadTime}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inativas</CardDescription>
            <CardTitle className="text-2xl">{summary.inactive}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Empresa: {data.companyName}
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <RoutesWithoutLeadTimeAlert
          routes={data.withoutLeadTime}
          showQualityLink={false}
        />
      </div>

      <div className="flex flex-col gap-8">
        <QualityTable
          title="Rotas sem Lead Time"
          description="Pendências que impedem o cálculo de SLA e chegada prevista."
          rows={data.withoutLeadTime}
          emptyTitle="Todas as rotas possuem Lead Time"
        />
        <QualityTable
          title="Rotas inativas"
          description="Cadastros inativos — revise se ainda são necessários."
          rows={data.inactive}
          emptyTitle="Nenhuma rota inativa"
        />
      </div>
    </PageTemplate>
  );
}

export {CadastroQualityPage};
