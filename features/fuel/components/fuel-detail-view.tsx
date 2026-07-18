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

import {deleteFuelDocumentAction} from '../actions';
import {FUEL_DOCUMENT_TYPES} from '../constants/enums';
import type {FuelDetailData, FuelDocument, FuelHistory} from '../types';
import {
  FUEL_DOCUMENT_TYPE_LABELS,
  FUEL_HISTORY_ACTION_LABELS,
  FUEL_INCONSISTENCY_LABELS,
  FUEL_TYPE_LABELS,
} from '../types';
import {
  formatCurrencyBr,
  formatDateTimeBr,
  formatKmPerLiter,
  formatLiters,
} from '../utils/fuel-format';
import {FuelFileUpload} from './fuel-file-upload';
import {FuelFormModal} from './fuel-form-modal';

export interface FuelDetailViewProps {
  companyId: string;
  data: FuelDetailData;
  branches: BranchSelectOption[];
  drivers: DriverSelectOption[];
  vehicles: VehicleSelectOption[];
}

const TABS = [
  {id: 'resumo', label: 'Resumo'},
  {id: 'dados', label: 'Dados'},
  {id: 'documentos', label: 'Documentos'},
  {id: 'historico', label: 'Histórico'},
  {id: 'veiculo', label: 'Veículo'},
  {id: 'motorista', label: 'Motorista'},
  {id: 'consumo', label: 'Consumo'},
  {id: 'integracoes', label: 'Integrações'},
] as const;

type TabId = (typeof TABS)[number]['id'];

function FuelDetailView({
  companyId,
  data,
  branches,
  drivers,
  vehicles,
}: FuelDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<TabId>('resumo');
  const [modalOpen, setModalOpen] = React.useState(false);
  const {record} = data;

  function handleRefresh() {
    router.refresh();
  }

  async function handleDeleteDocument(documentId: string) {
    if (!confirm('Excluir este documento?')) return;
    const result = await deleteFuelDocumentAction(documentId, record.id);
    if (result.success) handleRefresh();
  }

  const linkedVehicle = vehicles.find((v) => v.id === record.vehicleId);
  const linkedDriver = drivers.find((d) => d.id === record.driverId);

  const infoRows = [
    ['Veículo', record.vehiclePlate ?? '—'],
    ['Motorista', record.driverName ?? '—'],
    ['Filial', record.branchName ?? '—'],
    ['Posto', record.stationName ?? '—'],
    ['Bandeira', record.stationBrand ?? '—'],
    ['Cidade', record.city ?? '—'],
    ['Estado', record.state ?? '—'],
    ['Data', formatDateTimeBr(record.fueledAt)],
    ['Combustível', FUEL_TYPE_LABELS[record.fuelType] ?? record.fuelType],
    ['Litros', formatLiters(record.quantityLiters)],
    ['Valor/L', formatCurrencyBr(record.pricePerLiter)],
    ['Valor total', formatCurrencyBr(record.totalAmount)],
    ['Odômetro', record.odometerKm?.toLocaleString('pt-BR') ?? '—'],
    ['Responsável', record.responsible ?? '—'],
    ['Observações', record.notes ?? '—'],
  ];

  return (
    <PageTemplate
      title={`Abastecimento — ${record.vehiclePlate ?? record.id.slice(0, 8)}`}
      description={[record.stationName, record.city].filter(Boolean).join(' · ') || 'Registro de abastecimento'}
      actions={
        <div className="flex gap-2">
          <Link
            href={ROUTES.abastecimentos}
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
        {record.isInconsistent ? (
          <Badge variant="destructive">Inconsistente</Badge>
        ) : (
          <Badge variant="secondary">Consistente</Badge>
        )}
        <span className="text-sm text-muted-foreground">
          {formatDateTimeBr(record.fueledAt)}
        </span>
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
              <CardTitle className="text-sm font-medium">Veículo</CardTitle>
            </CardHeader>
            <CardContent className="text-lg font-semibold">
              {record.vehiclePlate ?? '—'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Motorista</CardTitle>
            </CardHeader>
            <CardContent className="text-lg font-semibold">
              {record.driverName ?? '—'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Valor total</CardTitle>
            </CardHeader>
            <CardContent className="text-lg font-semibold">
              {formatCurrencyBr(record.totalAmount)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">KM/L</CardTitle>
            </CardHeader>
            <CardContent className="text-lg font-semibold">
              {formatKmPerLiter(record.kmPerLiter)}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'dados' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do abastecimento</CardTitle>
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
            {FUEL_DOCUMENT_TYPES.map((type) => (
              <FuelFileUpload
                key={type}
                companyId={companyId}
                fuelRecordId={record.id}
                documentType={type}
                label={FUEL_DOCUMENT_TYPE_LABELS[type]}
                onUploaded={handleRefresh}
              />
            ))}
          </div>
          <TableContainer>
            <DataTable<FuelDocument>
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
                  cell: (row) => FUEL_DOCUMENT_TYPE_LABELS[row.documentType],
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
              emptyDescription="Envie notas fiscais, cupons, comprovantes e fotos da bomba."
            />
          </TableContainer>
        </div>
      )}

      {activeTab === 'historico' && (
        <TableContainer>
          <DataTable<FuelHistory>
            columns={[
              {
                id: 'action',
                header: 'Ação',
                cell: (row) =>
                  FUEL_HISTORY_ACTION_LABELS[row.action] ?? row.action,
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

      {activeTab === 'veiculo' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Veículo</CardTitle>
          </CardHeader>
          <CardContent>
            {linkedVehicle ? (
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Placa</dt>
                  <dd>
                    <Link
                      href={ROUTES.veiculoDetail(linkedVehicle.id)}
                      className="text-sm font-medium hover:underline"
                    >
                      {linkedVehicle.plate}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Modelo</dt>
                  <dd className="text-sm font-medium">{linkedVehicle.model ?? '—'}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Veículo não encontrado.</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'motorista' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Motorista</CardTitle>
          </CardHeader>
          <CardContent>
            {linkedDriver ? (
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Nome</dt>
                  <dd>
                    <Link
                      href={ROUTES.motoristaDetail(linkedDriver.id)}
                      className="text-sm font-medium hover:underline"
                    >
                      {linkedDriver.name}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">CNH</dt>
                  <dd className="text-sm font-medium">—</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Motorista não encontrado.</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'consumo' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">KM percorridos</CardTitle>
            </CardHeader>
            <CardContent className="text-lg font-semibold">
              {record.kmTraveled !== null
                ? `${record.kmTraveled.toLocaleString('pt-BR')} km`
                : '—'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Consumo (L/100km)</CardTitle>
            </CardHeader>
            <CardContent className="text-lg font-semibold">
              {record.consumptionLPer100km !== null
                ? `${record.consumptionLPer100km.toLocaleString('pt-BR')} L/100km`
                : '—'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Média KM/L</CardTitle>
            </CardHeader>
            <CardContent className="text-lg font-semibold">
              {formatKmPerLiter(record.kmPerLiter)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Custo por KM</CardTitle>
            </CardHeader>
            <CardContent className="text-lg font-semibold">
              {record.costPerKm !== null ? formatCurrencyBr(record.costPerKm) : '—'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Autonomia estimada</CardTitle>
            </CardHeader>
            <CardContent className="text-lg font-semibold">
              {record.autonomyKm !== null
                ? `${record.autonomyKm.toLocaleString('pt-BR')} km`
                : '—'}
            </CardContent>
          </Card>
          {record.isInconsistent && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-destructive">
                  Inconsistências detectadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {record.inconsistencyFlags.map((flag) => (
                    <li key={flag}>{FUEL_INCONSISTENCY_LABELS[flag]}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'integracoes' && (
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {title: 'Financeiro', items: data.financial, empty: 'Módulo financeiro não integrado.'},
            {title: 'BI', items: data.bi, empty: 'Módulo BI não integrado.'},
            {title: 'Telemetria', items: data.telemetry, empty: 'Telemetria não integrada.'},
            {title: 'App Motorista', items: data.driverApp, empty: 'App motorista não integrado.'},
            {title: 'IA', items: data.ai, empty: 'Módulo IA não integrado.'},
          ].map((section) => (
            <Card key={section.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {section.items.length > 0 ? (
                  <pre className="text-xs text-muted-foreground">
                    {JSON.stringify(section.items, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">{section.empty}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FuelFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        record={record}
        branches={branches}
        drivers={drivers}
        vehicles={vehicles}
        onSaved={handleRefresh}
      />
    </PageTemplate>
  );
}

export {FuelDetailView};
