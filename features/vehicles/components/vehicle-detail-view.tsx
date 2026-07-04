'use client';

import {ArrowLeft, Pencil} from 'lucide-react';
import Image from 'next/image';
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

import {deleteVehicleDocumentAction} from '../actions';
import type {VehicleDetailData} from '../types';
import {
  VEHICLE_ASSET_STATUS_LABELS,
  VEHICLE_FUEL_TYPE_LABELS,
} from '../types';
import {getVehicleAssetStatusVariant} from '../utils/asset-status';
import {VehicleFileUpload} from './vehicle-file-upload';
import {VehicleFormModal} from './vehicle-form-modal';

export interface VehicleDetailViewProps {
  companyId: string;
  data: VehicleDetailData;
  branches: BranchSelectOption[];
}

const TABS = [
  {id: 'dados', label: 'Dados'},
  {id: 'historico', label: 'Histórico'},
  {id: 'custos', label: 'Custos'},
  {id: 'quilometragem', label: 'Quilometragem'},
  {id: 'documentos', label: 'Documentos'},
  {id: 'pneus', label: 'Pneus'},
  {id: 'abastecimentos', label: 'Abastecimentos'},
  {id: 'manutencoes', label: 'Manutenções'},
  {id: 'viagens', label: 'Viagens'},
] as const;

type TabId = (typeof TABS)[number]['id'];

function formatDate(value: string) {
  return new Date(value).toLocaleString('pt-BR');
}

function VehicleDetailView({companyId, data, branches}: VehicleDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<TabId>('dados');
  const [modalOpen, setModalOpen] = React.useState(false);
  const {vehicle} = data;

  function handleRefresh() {
    router.refresh();
  }

  async function handleDeleteDocument(documentId: string) {
    if (!confirm('Excluir este documento?')) return;
    const result = await deleteVehicleDocumentAction(documentId, vehicle.id);
    if (result.success) handleRefresh();
  }

  const infoRows = [
    ['Placa', vehicle.plate],
    ['Frota', vehicle.fleetNumber ?? '—'],
    ['Tipo', vehicle.vehicleType],
    ['Marca', vehicle.brand ?? '—'],
    ['Modelo', vehicle.model ?? '—'],
    ['Ano', vehicle.year?.toString() ?? '—'],
    ['Renavam', vehicle.renavam ?? '—'],
    ['Chassi', vehicle.chassis ?? '—'],
    ['Cor', vehicle.color ?? '—'],
    [
      'Combustível',
      vehicle.fuelType ? VEHICLE_FUEL_TYPE_LABELS[vehicle.fuelType] : '—',
    ],
    [
      'Capacidade de carga',
      vehicle.loadCapacityKg != null
        ? `${vehicle.loadCapacityKg.toLocaleString('pt-BR')} kg`
        : '—',
    ],
    [
      'Peso bruto',
      vehicle.grossWeightKg != null
        ? `${vehicle.grossWeightKg.toLocaleString('pt-BR')} kg`
        : '—',
    ],
    [
      'Tara',
      vehicle.tareKg != null ? `${vehicle.tareKg.toLocaleString('pt-BR')} kg` : '—',
    ],
    ['Eixos', vehicle.axles?.toString() ?? '—'],
    [
      'Hodômetro inicial',
      `${vehicle.initialOdometerKm.toLocaleString('pt-BR')} km`,
    ],
    [
      'Hodômetro atual',
      `${vehicle.currentOdometerKm.toLocaleString('pt-BR')} km`,
    ],
    [
      'Horímetro',
      vehicle.hourMeter != null
        ? `${vehicle.hourMeter.toLocaleString('pt-BR')} h`
        : '—',
    ],
    ['Filial', vehicle.branchName ?? '—'],
    ['Observações', vehicle.notes ?? '—'],
  ];

  return (
    <PageTemplate
      title={vehicle.plate}
      description={[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || vehicle.vehicleType}
      actions={
        <div className="flex gap-2">
          <Link
            href={ROUTES.veiculos}
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
        <Badge variant={getVehicleAssetStatusVariant(vehicle.assetStatus)}>
          {VEHICLE_ASSET_STATUS_LABELS[vehicle.assetStatus]}
        </Badge>
        {vehicle.photoUrl && (
          <div className="relative size-20 overflow-hidden rounded-lg border border-border">
            <Image
              src={vehicle.photoUrl}
              alt={`Foto do veículo ${vehicle.plate}`}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
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
            <CardTitle className="text-base">Dados do veículo</CardTitle>
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
            <div className="mt-6 flex flex-wrap gap-3">
              <VehicleFileUpload
                companyId={companyId}
                vehicleId={vehicle.id}
                documentType="photo"
                label="Enviar foto"
                onUploaded={handleRefresh}
              />
              <VehicleFileUpload
                companyId={companyId}
                vehicleId={vehicle.id}
                documentType="crlv"
                label="Enviar CRLV"
                onUploaded={handleRefresh}
              />
            </div>
            {vehicle.crlvUrl && (
              <p className="mt-3 text-sm">
                <a
                  href={vehicle.crlvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Ver CRLV atual
                </a>
              </p>
            )}
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
                cell: (row) => formatDate(row.createdAt),
              },
              {
                id: 'action',
                header: 'Ação',
                cell: (row) => row.action,
              },
              {
                id: 'status',
                header: 'Situação',
                cell: (row) =>
                  row.newAssetStatus
                    ? VEHICLE_ASSET_STATUS_LABELS[row.newAssetStatus]
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
            emptyDescription="Alterações do veículo aparecerão aqui."
          />
        </TableContainer>
      )}

      {activeTab === 'custos' && (
        <TableContainer>
          <DataTable
            columns={[
              {id: 'date', header: 'Data', cell: (row) => formatDate(row.date)},
              {id: 'category', header: 'Categoria', cell: (row) => row.category},
              {id: 'description', header: 'Descrição', cell: (row) => row.description ?? '—'},
              {
                id: 'amount',
                header: 'Valor',
                cell: (row) =>
                  row.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}),
              },
              {id: 'source', header: 'Origem', cell: (row) => row.sourceModule},
            ]}
            data={data.costs}
            getRowKey={(row) => row.id}
            emptyTitle="Sem lançamentos financeiros"
            emptyDescription="Custos vinculados a este veículo aparecerão aqui."
          />
        </TableContainer>
      )}

      {activeTab === 'quilometragem' && (
        <TableContainer>
          <DataTable
            columns={[
              {id: 'date', header: 'Data', cell: (row) => formatDate(row.date)},
              {
                id: 'odometer',
                header: 'Hodômetro',
                cell: (row) => `${row.odometerKm.toLocaleString('pt-BR')} km`,
              },
            ]}
            data={data.mileage}
            getRowKey={(row) => `${row.date}-${row.odometerKm}-${row.source}`}
            emptyTitle="Sem registros de quilometragem"
            emptyDescription="Histórico detalhado será integrado com viagens e abastecimentos."
          />
        </TableContainer>
      )}

      {activeTab === 'documentos' && (
        <div className="space-y-4">
          <VehicleFileUpload
            companyId={companyId}
            vehicleId={vehicle.id}
            documentType="document"
            label="Adicionar documento"
            onUploaded={handleRefresh}
          />
          <TableContainer>
            <DataTable
              columns={[
                {id: 'name', header: 'Nome', cell: (row) => row.name},
                {
                  id: 'type',
                  header: 'Tipo',
                  cell: (row) => row.documentType,
                },
                {
                  id: 'date',
                  header: 'Enviado em',
                  cell: (row) => formatDate(row.createdAt),
                },
                {
                  id: 'link',
                  header: '',
                  cell: (row) => (
                    <div className="flex gap-2">
                      <a
                        href={row.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Abrir
                      </a>
                      <button
                        type="button"
                        className="text-sm text-destructive hover:underline"
                        onClick={() => handleDeleteDocument(row.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  ),
                },
              ]}
              data={data.documents}
              getRowKey={(row) => row.id}
              emptyTitle="Nenhum documento"
              emptyDescription="Envie CRLV, fotos ou outros documentos do veículo."
            />
          </TableContainer>
        </div>
      )}

      {activeTab === 'pneus' && (
        <TableContainer>
          <DataTable
            columns={[
              {
                id: 'position',
                header: 'Posição',
                cell: (row) => row.position,
              },
              {
                id: 'brand',
                header: 'Marca',
                cell: (row) => row.brand ?? '—',
              },
              {
                id: 'tread',
                header: 'Sulco',
                cell: (row) =>
                  row.treadDepthMm !== null ? `${row.treadDepthMm} mm` : '—',
              },
              {
                id: 'status',
                header: 'Status',
                cell: (row) => row.status,
              },
              {
                id: 'installed',
                header: 'Instalado em',
                cell: (row) => formatDate(row.installedAt),
              },
              {
                id: 'actions',
                header: '',
                cell: (row) => (
                  <Link
                    href={ROUTES.pneuDetail(row.id)}
                    className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium shadow-xs hover:bg-accent"
                  >
                    Ver
                  </Link>
                ),
              },
            ]}
            data={data.tires}
            getRowKey={(row) => row.id}
            emptyTitle="Nenhum pneu instalado"
            emptyDescription="Instale pneus neste veículo pelo módulo de Pneus."
          />
        </TableContainer>
      )}

      {activeTab === 'abastecimentos' && (
        <EmptySection
          title="Abastecimentos"
          description="Integração com o módulo de abastecimentos em breve."
        />
      )}

      {activeTab === 'manutencoes' && (
        <EmptySection
          title="Manutenções"
          description="Integração com o módulo de manutenções em breve."
        />
      )}

      {activeTab === 'viagens' && (
        <EmptySection
          title="Viagens"
          description="Integração com o módulo de viagens em breve."
        />
      )}

      <VehicleFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        vehicle={vehicle}
        branches={branches}
        onSaved={handleRefresh}
      />
    </PageTemplate>
  );
}

function EmptySection({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export {VehicleDetailView};
