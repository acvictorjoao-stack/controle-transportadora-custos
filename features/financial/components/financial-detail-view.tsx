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
import type {BranchSelectOption} from '@/features/organization/branches/types';
import type {DriverSelectOption} from '@/features/drivers/types';
import type {VehicleSelectOption} from '@/features/vehicles/types';
import type {TripSelectOption} from '@/features/trips/types';

import {deleteFinancialDocumentAction} from '../actions';
import {FINANCIAL_DOCUMENT_TYPES} from '../constants/enums';
import type {
  FinancialCategory,
  FinancialCostCenter,
  FinancialDetailData,
  FinancialDocument,
  FinancialEntryStatus,
  FinancialHistory,
} from '../types';
import {
  FINANCIAL_DOCUMENT_TYPE_LABELS,
  FINANCIAL_ENTRY_STATUS_LABELS,
  FINANCIAL_ENTRY_TYPE_LABELS,
  FINANCIAL_HISTORY_ACTION_LABELS,
} from '../types/financial-entry';
import {FINANCIAL_EXTENSION_REGISTRY} from '../types/integrations';
import {
  formatCurrencyBr,
  formatDateBr,
  formatDateTimeBr,
} from '../utils/financial-format';
import {FinancialFileUpload} from './financial-file-upload';
import {FinancialFormModal} from './financial-form-modal';

export interface FinancialDetailViewProps {
  companyId: string;
  data: FinancialDetailData;
  branches: BranchSelectOption[];
  drivers: DriverSelectOption[];
  vehicles: VehicleSelectOption[];
  trips: TripSelectOption[];
  categories: FinancialCategory[];
  costCenters: FinancialCostCenter[];
}

const TABS = [
  {id: 'resumo', label: 'Resumo'},
  {id: 'dados', label: 'Dados'},
  {id: 'documentos', label: 'Documentos'},
  {id: 'historico', label: 'Histórico'},
  {id: 'origem', label: 'Origem'},
  {id: 'integracoes', label: 'Integrações'},
  {id: 'rateios', label: 'Rateios'},
  {id: 'auditoria', label: 'Auditoria'},
] as const;

type TabId = (typeof TABS)[number]['id'];

function statusBadgeVariant(
  status: FinancialEntryStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'overdue':
    case 'reversed':
      return 'destructive';
    default:
      return 'outline';
  }
}

function FinancialDetailView({
  companyId,
  data,
  branches,
  drivers,
  vehicles,
  trips,
  categories,
  costCenters,
}: FinancialDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<TabId>('resumo');
  const [modalOpen, setModalOpen] = React.useState(false);
  const {entry} = data;

  function handleRefresh() {
    router.refresh();
  }

  async function handleDeleteDocument(documentId: string) {
    if (!confirm('Excluir este documento?')) return;
    const result = await deleteFinancialDocumentAction(documentId, entry.id);
    if (result.success) handleRefresh();
  }

  const infoRows = [
    ['Tipo', FINANCIAL_ENTRY_TYPE_LABELS[entry.entryType] ?? entry.entryType],
    ['Status', FINANCIAL_ENTRY_STATUS_LABELS[entry.entryStatus] ?? entry.entryStatus],
    ['Valor', formatCurrencyBr(entry.amount, entry.currency)],
    ['Data do lançamento', formatDateBr(entry.entryDate)],
    ['Vencimento', formatDateBr(entry.dueDate)],
    ['Pago em', formatDateTimeBr(entry.paidAt)],
    ['Categoria', entry.categoryName ?? '—'],
    ['Centro de custo', entry.costCenterName ?? '—'],
    ['Filial', entry.branchName ?? '—'],
    ['Veículo', entry.vehiclePlate ?? '—'],
    ['Motorista', entry.driverName ?? '—'],
    ['Viagem', entry.tripNumber ?? '—'],
    ['Descrição', entry.description ?? '—'],
    ['Referência', entry.referenceNumber ?? '—'],
    ['Observações', entry.notes ?? '—'],
  ];

  const metadataAllocations = Array.isArray(entry.metadata?.allocations)
    ? (entry.metadata.allocations as Record<string, unknown>[])
    : [];

  const rateioRows = [
    ...(entry.costCenterName
      ? [{label: 'Centro de custo principal', value: entry.costCenterName, amount: entry.amount}]
      : []),
    ...(entry.branchName
      ? [{label: 'Filial', value: entry.branchName, amount: null}]
      : []),
    ...(entry.vehiclePlate
      ? [{label: 'Veículo', value: entry.vehiclePlate, amount: null}]
      : []),
    ...(entry.driverName
      ? [{label: 'Motorista', value: entry.driverName, amount: null}]
      : []),
    ...(entry.tripNumber
      ? [{label: 'Viagem', value: entry.tripNumber, amount: null}]
      : []),
    ...metadataAllocations.map((item, index) => ({
      label: String(item.label ?? item.name ?? `Rateio ${index + 1}`),
      value: String(item.target ?? item.cost_center ?? item.entity ?? '—'),
      amount: typeof item.amount === 'number' ? item.amount : null,
    })),
  ];

  const sourceLinks = [
    {
      label: 'Abastecimento',
      id: entry.fuelRecordId,
      href: entry.fuelRecordId ? ROUTES.abastecimentoDetail(entry.fuelRecordId) : null,
    },
    {
      label: 'Manutenção',
      id: entry.maintenanceRecordId,
      href: entry.maintenanceRecordId
        ? ROUTES.manutencaoDetail(entry.maintenanceRecordId)
        : null,
    },
    {
      label: 'Pneu',
      id: entry.tireId,
      href: entry.tireId ? ROUTES.pneuDetail(entry.tireId) : null,
    },
    {
      label: 'Viagem',
      id: entry.tripId,
      href: entry.tripId ? ROUTES.viagemDetail(entry.tripId) : null,
    },
  ].filter((link) => link.id);

  return (
    <PageTemplate
      title={`Lançamento — ${entry.description ?? entry.referenceNumber ?? entry.id.slice(0, 8)}`}
      description={
        [entry.categoryName, entry.costCenterName].filter(Boolean).join(' · ') ||
        'Lançamento financeiro'
      }
      actions={
        <div className="flex gap-2">
          <Link
            href={ROUTES.financeiroDashboard}
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
        <Badge variant={statusBadgeVariant(entry.entryStatus)}>
          {FINANCIAL_ENTRY_STATUS_LABELS[entry.entryStatus] ?? entry.entryStatus}
        </Badge>
        <Badge variant="outline">
          {FINANCIAL_ENTRY_TYPE_LABELS[entry.entryType] ?? entry.entryType}
        </Badge>
        {entry.isSystemGenerated && <Badge variant="secondary">Gerado pelo sistema</Badge>}
        <span className="text-sm text-muted-foreground">{formatDateBr(entry.entryDate)}</span>
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

      {activeTab === 'resumo' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Valor</CardTitle>
            </CardHeader>
            <CardContent className="text-lg font-semibold">
              {formatCurrencyBr(entry.amount, entry.currency)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tipo</CardTitle>
            </CardHeader>
            <CardContent className="text-lg font-semibold">
              {FINANCIAL_ENTRY_TYPE_LABELS[entry.entryType] ?? entry.entryType}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Categoria</CardTitle>
            </CardHeader>
            <CardContent className="text-lg font-semibold">
              {entry.categoryName ?? '—'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Centro de custo</CardTitle>
            </CardHeader>
            <CardContent className="text-lg font-semibold">
              {entry.costCenterName ?? '—'}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'dados' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do lançamento</CardTitle>
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

      {activeTab === 'documentos' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {FINANCIAL_DOCUMENT_TYPES.map((type) => (
              <FinancialFileUpload
                key={type}
                companyId={companyId}
                financialEntryId={entry.id}
                documentType={type}
                label={FINANCIAL_DOCUMENT_TYPE_LABELS[type]}
                onUploaded={handleRefresh}
              />
            ))}
          </div>
          <TableContainer>
            <DataTable<FinancialDocument>
              columns={[
                {
                  id: 'name',
                  header: 'Arquivo',
                  cell: (row) => (
                    <a
                      href={row.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium hover:underline"
                    >
                      {row.name}
                    </a>
                  ),
                },
                {
                  id: 'type',
                  header: 'Tipo',
                  cell: (row) => FINANCIAL_DOCUMENT_TYPE_LABELS[row.documentType],
                },
                {
                  id: 'createdAt',
                  header: 'Enviado em',
                  cell: (row) => formatDateTimeBr(row.createdAt),
                },
                {
                  id: 'actions',
                  header: '',
                  cell: (row) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDocument(row.id)}
                    >
                      Excluir
                    </Button>
                  ),
                },
              ]}
              data={data.documents}
              getRowKey={(row) => row.id}
              emptyTitle="Nenhum documento anexado"
              emptyDescription="Envie notas fiscais, boletos, recibos e comprovantes."
            />
          </TableContainer>
        </div>
      )}

      {activeTab === 'historico' && (
        <TableContainer>
          <DataTable<FinancialHistory>
            columns={[
              {
                id: 'action',
                header: 'Ação',
                cell: (row) =>
                  FINANCIAL_HISTORY_ACTION_LABELS[row.action] ?? row.action,
              },
              {
                id: 'createdAt',
                header: 'Data',
                cell: (row) => formatDateTimeBr(row.createdAt),
              },
              {
                id: 'changes',
                header: 'Alterações',
                cell: (row) => (
                  <pre className="max-w-md overflow-x-auto text-xs text-muted-foreground">
                    {JSON.stringify(row.changes, null, 2)}
                  </pre>
                ),
              },
            ]}
            data={data.history}
            getRowKey={(row) => row.id}
            emptyTitle="Nenhum histórico registrado"
            emptyDescription="Alterações e uploads serão registrados automaticamente."
          />
        </TableContainer>
      )}

      {activeTab === 'origem' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Origem do lançamento</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Módulo de origem</dt>
                  <dd className="text-sm font-medium">{entry.sourceModule ?? 'Manual'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Gerado pelo sistema</dt>
                  <dd className="text-sm font-medium">
                    {entry.isSystemGenerated ? 'Sim' : 'Não'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">ID externo</dt>
                  <dd className="text-sm font-medium">{entry.externalId ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Fonte de integração</dt>
                  <dd className="text-sm font-medium">{entry.integrationSource ?? '—'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registros vinculados</CardTitle>
            </CardHeader>
            <CardContent>
              {sourceLinks.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {sourceLinks.map((link) => (
                    <li key={link.label}>
                      {link.href ? (
                        <Link href={link.href} className="font-medium hover:underline">
                          {link.label}
                        </Link>
                      ) : (
                        link.label
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum registro de origem vinculado.
                </p>
              )}
              {data.relatedEntries.length > 0 && (
                <div className="mt-4">
                  <dt className="text-xs text-muted-foreground">Lançamento relacionado</dt>
                  <dd className="mt-1">
                    <Link
                      href={ROUTES.financeiroDetail(data.relatedEntries[0].id)}
                      className="text-sm font-medium hover:underline"
                    >
                      {data.relatedEntries[0].description ??
                        data.relatedEntries[0].referenceNumber ??
                        data.relatedEntries[0].id.slice(0, 8)}
                    </Link>
                  </dd>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'integracoes' && (
        <div className="grid gap-4 md:grid-cols-2">
          {FINANCIAL_EXTENSION_REGISTRY.map((integration) => (
            <Card key={integration.provider}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{integration.label}</CardTitle>
              </CardHeader>
              <CardContent>
                {integration.enabled ? (
                  <pre className="text-xs text-muted-foreground">
                    {JSON.stringify(entry.metadata?.[integration.provider] ?? {}, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Integração {integration.label} não habilitada.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'rateios' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rateios e alocações</CardTitle>
          </CardHeader>
          <CardContent>
            {rateioRows.length > 0 ? (
              <TableContainer>
                <DataTable
                  columns={[
                    {
                      id: 'label',
                      header: 'Dimensão',
                      cell: (row: (typeof rateioRows)[number]) => row.label,
                    },
                    {
                      id: 'value',
                      header: 'Destino',
                      cell: (row: (typeof rateioRows)[number]) => row.value,
                    },
                    {
                      id: 'amount',
                      header: 'Valor',
                      cell: (row: (typeof rateioRows)[number]) =>
                        row.amount !== null
                          ? formatCurrencyBr(row.amount, entry.currency)
                          : '—',
                    },
                  ]}
                  data={rateioRows}
                  getRowKey={(row) => `${row.label}-${row.value}`}
                  emptyTitle="Nenhum rateio configurado"
                  emptyDescription="Rateios serão exibidos quando houver alocações."
                />
              </TableContainer>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum rateio configurado para este lançamento.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'auditoria' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Auditoria</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Status do registro</dt>
                <dd className="text-sm font-medium">{entry.status}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Criado em</dt>
                <dd className="text-sm font-medium">{formatDateTimeBr(entry.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Atualizado em</dt>
                <dd className="text-sm font-medium">{formatDateTimeBr(entry.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Estorno vinculado</dt>
                <dd className="text-sm font-medium">
                  {entry.reversedEntryId ? (
                    <Link
                      href={ROUTES.financeiroDetail(entry.reversedEntryId)}
                      className="hover:underline"
                    >
                      {entry.reversedEntryId.slice(0, 8)}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              {Object.keys(entry.metadata).length > 0 && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <dt className="text-xs text-muted-foreground">Metadados</dt>
                  <dd className="mt-1">
                    <pre className="max-w-full overflow-x-auto rounded-md bg-muted p-3 text-xs">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      <FinancialFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        entry={entry}
        branches={branches}
        drivers={drivers}
        vehicles={vehicles}
        trips={trips}
        categories={categories}
        costCenters={costCenters}
        onSaved={handleRefresh}
      />
    </PageTemplate>
  );
}

export {FinancialDetailView};
