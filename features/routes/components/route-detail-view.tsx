'use client';

import {ArrowLeft, Pencil} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import * as React from 'react';

import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {PageTemplate} from '@/components/layout/page-template';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {ROUTES} from '@/constants/routes/paths';

import type {RouteDetailData} from '../types';
import {
  ROUTE_HISTORY_ACTION_LABELS,
  ROUTE_OPERATIONAL_STATUS_LABELS,
  ROUTE_TYPE_LABELS,
} from '../types';
import {
  formatDistanceKm,
  formatDurationMinutes,
  getRouteOperationalStatusVariant,
} from '../utils/route-format';
import {RouteFormModal} from './route-form-modal';

export interface RouteDetailViewProps {
  data: RouteDetailData;
}

const TABS = [
  {id: 'dados', label: 'Dados Gerais'},
  {id: 'historico', label: 'Histórico'},
  {id: 'observacoes', label: 'Observações'},
] as const;

type TabId = (typeof TABS)[number]['id'];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR');
}

function RouteDetailView({data}: RouteDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<TabId>('dados');
  const [modalOpen, setModalOpen] = React.useState(false);
  const {route} = data;

  function handleRefresh() {
    router.refresh();
  }

  const infoRows = [
    ['Nome', route.name],
    ['Código', route.code ?? '—'],
    ['Origem', route.origin],
    ['Destino', route.destination],
    ['Tipo', ROUTE_TYPE_LABELS[route.routeType]],
    ['Distância prevista', formatDistanceKm(route.plannedDistanceKm)],
    ['Lead Time previsto', formatDurationMinutes(route.leadTimeMinutes)],
    ['Tempo médio de descarga', formatDurationMinutes(route.unloadTimeMinutes)],
    ['Status', ROUTE_OPERATIONAL_STATUS_LABELS[route.operationalStatus]],
  ];

  return (
    <PageTemplate
      title={route.name}
      description={[route.origin, route.destination].filter(Boolean).join(' → ')}
      actions={
        <div className="flex gap-2">
          <Link
            href={ROUTES.rotas}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium shadow-xs hover:bg-accent"
          >
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Pencil className="size-4" />
            Editar
          </Button>
        </div>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Badge variant={getRouteOperationalStatusVariant(route.operationalStatus)}>
          {ROUTE_OPERATIONAL_STATUS_LABELS[route.operationalStatus]}
        </Badge>
        <Badge variant="outline">{ROUTE_TYPE_LABELS[route.routeType]}</Badge>
        {route.code && <Badge variant="secondary">{route.code}</Badge>}
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === 'dados' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados gerais da rota</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {infoRows.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      {activeTab === 'historico' && (
        <TableContainer>
          <DataTable
            columns={[
              {
                id: 'date',
                header: 'Data',
                cell: (row) => formatDateTime(row.createdAt),
              },
              {
                id: 'action',
                header: 'Ação',
                cell: (row) =>
                  ROUTE_HISTORY_ACTION_LABELS[row.action] ?? row.action,
              },
              {
                id: 'status',
                header: 'Status',
                cell: (row) =>
                  row.newOperationalStatus
                    ? ROUTE_OPERATIONAL_STATUS_LABELS[row.newOperationalStatus]
                    : '—',
              },
              {
                id: 'changes',
                header: 'Alterações',
                cell: (row) => (
                  <span className="text-xs text-muted-foreground">
                    {Object.keys(row.changes).length > 0
                      ? JSON.stringify(row.changes)
                      : '—'}
                  </span>
                ),
              },
            ]}
            data={data.history}
            getRowKey={(row) => row.id}
            emptyTitle="Sem histórico"
            emptyDescription="Alterações da rota aparecerão aqui."
          />
        </TableContainer>
      )}

      {activeTab === 'observacoes' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">
              {route.notes?.trim() || 'Nenhuma observação registrada.'}
            </p>
          </CardContent>
        </Card>
      )}

      <RouteFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        route={route}
        onSaved={handleRefresh}
      />
    </PageTemplate>
  );
}

export {RouteDetailView};
