'use client';

import {ArrowLeft, Pencil, Save} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import * as React from 'react';

import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {PageTemplate} from '@/components/layout/page-template';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {useConfirm} from '@/contexts/feedback/confirm-context';
import {ROUTES} from '@/constants/routes/paths';
import type {Customer} from '@/features/customers/types';
import type {BranchSelectOption} from '@/features/organization/branches/types';
import type {DriverSelectOption} from '@/features/drivers/types';
import type {RouteSelectOption} from '@/features/routes/types';
import {formatDistanceKm} from '@/features/routes/utils/route-format';
import type {VehicleSelectOption} from '@/features/vehicles/types';
import {MSG} from '@/lib/feedback/messages';

import {
  createTripOccurrenceAction,
  createTripStopAction,
  deleteTripDocumentAction,
  upsertTripChecklistAction,
} from '../actions';
import {TRIP_DOCUMENT_TYPES, TRIP_OCCURRENCE_TYPES} from '../constants/enums';
import type {TripDetailData, TripOccurrenceType} from '../types';
import {
  TRIP_DOCUMENT_TYPE_LABELS,
  TRIP_HISTORY_ACTION_LABELS,
  TRIP_OCCURRENCE_TYPE_LABELS,
  TRIP_STATUS_LABELS,
} from '../types';
import {formatDateBr, formatDateTimeBr} from '../utils/trip-status';
import {getTripRouteLabel} from '../utils/route-planning';
import {TRIP_NATIVE_SELECT_CLASS} from '../utils/form-styles';
import {TripExpensesTab} from './trip-expenses-tab';
import {TripFileUpload} from './trip-file-upload';
import {TripFormModal} from './trip-form-modal';
import {TripLifecycleCard} from './trip-lifecycle-card';

export interface TripDetailViewProps {
  companyId: string;
  data: TripDetailData;
  branches: BranchSelectOption[];
  drivers: DriverSelectOption[];
  vehicles: VehicleSelectOption[];
  customers: Customer[];
  routes: RouteSelectOption[];
}

const TABS = [
  {id: 'resumo', label: 'Resumo'},
  {id: 'dados', label: 'Dados'},
  {id: 'checklist', label: 'Checklist'},
  {id: 'paradas', label: 'Paradas'},
  {id: 'ocorrencias', label: 'Ocorrências'},
  {id: 'despesas', label: 'Despesas'},
  {id: 'documentos', label: 'Documentos'},
  {id: 'historico', label: 'Histórico'},
  {id: 'mapa', label: 'Mapa'},
  {id: 'timeline', label: 'Timeline'},
  {id: 'integracoes', label: 'Integrações'},
] as const;

type TabId = (typeof TABS)[number]['id'];

function TripDetailView({
  companyId,
  data,
  branches,
  drivers,
  vehicles,
  customers,
  routes,
}: TripDetailViewProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = React.useState<TabId>('resumo');
  const [modalOpen, setModalOpen] = React.useState(false);
  const {trip} = data;

  function handleRefresh() {
    router.refresh();
  }

  async function handleDeleteDocument(documentId: string) {
    const confirmed = await confirm({
      title: MSG.deleteDocumentTitle,
      description: MSG.deleteDocumentDescription,
      confirmLabel: MSG.deleteConfirmLabel,
      variant: 'destructive',
    });
    if (!confirmed) return;
    const result = await deleteTripDocumentAction(documentId, trip.id);
    if (result.success) handleRefresh();
  }

  const infoRows = [
    ['Número', trip.tripNumber],
    ['Status', TRIP_STATUS_LABELS[trip.tripStatus]],
    ['Motorista', trip.driverName ?? '—'],
    ['Veículo', trip.vehiclePlate ?? '—'],
    ['Filial', trip.branchName ?? '—'],
    ['Cliente', trip.customerName ?? trip.clientName ?? '—'],
    ['Contrato', trip.contractReference ?? '—'],
    ['Rota', getTripRouteLabel(trip)],
    ['Origem', trip.origin ?? '—'],
    ['Destino', trip.destination ?? '—'],
    ['Distância prevista', formatDistanceKm(trip.plannedDistanceKm)],
    ['Data da viagem', formatDateTimeBr(trip.plannedDepartureAt)],
    ['KM inicial', trip.initialOdometerKm?.toLocaleString('pt-BR') ?? '—'],
    ['KM final', trip.finalOdometerKm?.toLocaleString('pt-BR') ?? '—'],
    ['Distância realizada', trip.distanceKm !== null ? `${trip.distanceKm.toLocaleString('pt-BR')} km` : '—'],
    ['Horímetro inicial', trip.initialHourMeter?.toLocaleString('pt-BR') ?? '—'],
    ['Horímetro final', trip.finalHourMeter?.toLocaleString('pt-BR') ?? '—'],
    ['Saída real', formatDateTimeBr(trip.departedAt)],
    ['Chegada real', formatDateTimeBr(trip.arrivedAt)],
    ['Peso', trip.weightKg !== null ? `${trip.weightKg.toLocaleString('pt-BR')} kg` : '—'],
    ['Cubagem', trip.volumeM3 !== null ? `${trip.volumeM3} m³` : '—'],
    ['Tipo da carga', trip.cargoType ?? '—'],
    ['Responsável', trip.responsible ?? '—'],
  ];

  const planningRows = [
    ['Rota', getTripRouteLabel(trip)],
    ['Origem', trip.origin ?? '—'],
    ['Destino', trip.destination ?? '—'],
    ['Distância prevista', formatDistanceKm(trip.plannedDistanceKm)],
    ['Data da viagem', formatDateTimeBr(trip.plannedDepartureAt)],
  ];

  const expensesTotal = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const freightValue = trip.contractedFreightValue ?? trip.actualFreightValue ?? 0;
  const operationalResult = freightValue - expensesTotal;

  function formatMoney(value: number) {
    return value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
  }

  return (
    <PageTemplate
      title={trip.tripNumber}
      description={[trip.origin, trip.destination].filter(Boolean).join(' → ') || 'Viagem operacional'}
      actions={
        <div className="flex gap-2">
          <Link
            href={ROUTES.viagens}
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
      <div className="mb-6">
        <TripLifecycleCard trip={trip} onChanged={handleRefresh} />
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
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Frete</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatMoney(freightValue)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Despesas</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatMoney(expensesTotal)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Resultado</CardTitle>
              </CardHeader>
              <CardContent
                className={`text-2xl font-semibold ${
                  operationalResult < 0 ? 'text-destructive' : ''
                }`}
              >
                {formatMoney(operationalResult)}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Motorista</CardTitle>
              </CardHeader>
              <CardContent className="text-lg font-semibold">
                {trip.driverName ?? '—'}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Veículo</CardTitle>
              </CardHeader>
              <CardContent className="text-lg font-semibold">
                {trip.vehiclePlate ?? '—'}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Distância</CardTitle>
              </CardHeader>
              <CardContent className="text-lg font-semibold">
                {trip.distanceKm !== null
                  ? `${trip.distanceKm.toLocaleString('pt-BR')} km`
                  : '—'}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ocorrências</CardTitle>
              </CardHeader>
              <CardContent className="text-lg font-semibold">
                {data.occurrences.length}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Planejamento</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {planningRows
                  .filter(([, value]) => value !== '—' && value !== null && value !== undefined)
                  .map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'dados' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados da viagem</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {infoRows
                .filter(([, value]) => value !== '—' && value !== null && value !== undefined)
                .map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            {trip.notes && (
              <div className="mt-4">
                <dt className="text-xs text-muted-foreground">Observações</dt>
                <dd className="mt-1 text-sm">{trip.notes}</dd>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'checklist' && (
        <ChecklistTab
          tripId={trip.id}
          checklist={data.checklist}
          onSaved={handleRefresh}
        />
      )}

      {activeTab === 'paradas' && (
        <StopsTab tripId={trip.id} stops={data.stops} onSaved={handleRefresh} />
      )}

      {activeTab === 'ocorrencias' && (
        <OccurrencesTab
          tripId={trip.id}
          occurrences={data.occurrences}
          onSaved={handleRefresh}
        />
      )}

      {activeTab === 'despesas' && (
        <TripExpensesTab
          companyId={companyId}
          tripId={trip.id}
          expenses={data.expenses}
          onSaved={handleRefresh}
        />
      )}

      {activeTab === 'documentos' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {TRIP_DOCUMENT_TYPES.map((type) => (
              <TripFileUpload
                key={type}
                companyId={companyId}
                tripId={trip.id}
                documentType={type}
                label={TRIP_DOCUMENT_TYPE_LABELS[type]}
                onUploaded={handleRefresh}
              />
            ))}
          </div>
          <TableContainer>
            <DataTable
              columns={[
                {
                  id: 'name',
                  header: 'Arquivo',
                  cell: (row) => (
                    <a
                      href={row.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline"
                    >
                      {row.name}
                    </a>
                  ),
                },
                {
                  id: 'type',
                  header: 'Tipo',
                  cell: (row) => TRIP_DOCUMENT_TYPE_LABELS[row.documentType],
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
              emptyTitle="Nenhum documento"
              emptyDescription="Envie CT-e, MDF-e, NF-e, canhotos e outros documentos."
            />
          </TableContainer>
        </div>
      )}

      {activeTab === 'historico' && (
        <TableContainer>
          <DataTable
            columns={[
              {
                id: 'action',
                header: 'Ação',
                cell: (row) =>
                  TRIP_HISTORY_ACTION_LABELS[row.action] ?? row.action,
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
            emptyDescription="Alterações serão registradas automaticamente."
          />
        </TableContainer>
      )}

      {activeTab === 'mapa' && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {data.locations.length > 0 ? (
              <div className="space-y-2 text-left">
                <p>{data.locations.length} pontos GPS registrados.</p>
                <ul className="max-h-64 overflow-auto text-xs">
                  {data.locations.map((loc) => (
                    <li key={loc.id}>
                      {loc.latitude}, {loc.longitude} —{' '}
                      {formatDateTimeBr(loc.recordedAt)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              'Mapa disponível quando houver pontos de telemetria ou paradas com coordenadas.'
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'timeline' && (
        <div className="space-y-3">
          {data.timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento na timeline.</p>
          ) : (
            data.timeline.map((entry) => (
              <div
                key={entry.id}
                className="flex gap-3 border-l-2 border-border pl-4"
              >
                <div>
                  <p className="text-sm font-medium">
                    {TRIP_HISTORY_ACTION_LABELS[entry.action] ?? entry.action}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTimeBr(entry.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'integracoes' && (
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {key: 'financial', label: 'Financeiro', items: data.financial},
            {key: 'fuelRecords', label: 'Abastecimentos', items: data.fuelRecords},
            {key: 'tires', label: 'Pneus', items: data.tires},
            {key: 'maintenances', label: 'Manutenções', items: data.maintenances},
            {key: 'bi', label: 'BI', items: data.bi},
            {key: 'telemetry', label: 'Telemetria', items: data.telemetry},
            {key: 'driverApp', label: 'App Motorista', items: data.driverApp},
            {key: 'ai', label: 'IA', items: data.ai},
          ].map((section) => (
            <Card key={section.key}>
              <CardHeader>
                <CardTitle className="text-base">{section.label}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {section.items.length > 0
                  ? `${section.items.length} registro(s) integrado(s).`
                  : `Integração com o módulo de ${section.label.toLowerCase()} em breve.`}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TripFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        trip={trip}
        branches={branches}
        drivers={drivers}
        vehicles={vehicles}
        customers={customers}
        routes={routes}
        onSaved={handleRefresh}
      />
    </PageTemplate>
  );
}

function ChecklistTab({
  tripId,
  checklist,
  onSaved,
}: {
  tripId: string;
  checklist: TripDetailData['checklist'];
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState({
    tiresOk: checklist?.tiresOk ?? null,
    headlightsOk: checklist?.headlightsOk ?? null,
    brakesOk: checklist?.brakesOk ?? null,
    documentationOk: checklist?.documentationOk ?? null,
    fuelOk: checklist?.fuelOk ?? null,
    odometerReading: checklist?.odometerReading ?? null,
    hourMeterReading: checklist?.hourMeterReading ?? null,
    notes: checklist?.notes ?? '',
  });
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    const result = await upsertTripChecklistAction({
      tripId,
      ...form,
      completedAt: new Date().toISOString(),
    });
    setSaving(false);
    if (result.success) onSaved();
  }

  const items = [
    {key: 'tiresOk' as const, label: 'Pneus'},
    {key: 'headlightsOk' as const, label: 'Faróis'},
    {key: 'brakesOk' as const, label: 'Freios'},
    {key: 'documentationOk' as const, label: 'Documentação'},
    {key: 'fuelOk' as const, label: 'Combustível'},
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Checklist da viagem</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <label key={item.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form[item.key] === true}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    [item.key]: e.target.checked ? true : false,
                  }))
                }
              />
              {item.label}
            </label>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">Odômetro</label>
            <Input
              type="number"
              value={form.odometerReading ?? ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  odometerReading: e.target.value ? Number(e.target.value) : null,
                }))
              }
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Horímetro</label>
            <Input
              type="number"
              value={form.hourMeterReading ?? ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  hourMeterReading: e.target.value ? Number(e.target.value) : null,
                }))
              }
            />
          </div>
        </div>
        <Textarea
          placeholder="Observações do checklist"
          value={form.notes ?? ''}
          onChange={(e) => setForm((prev) => ({...prev, notes: e.target.value}))}
          rows={3}
        />
        <Button onClick={handleSave} disabled={saving}>
          <Save className="size-4" />
          Salvar checklist
        </Button>
      </CardContent>
    </Card>
  );
}

function StopsTab({
  tripId,
  stops,
  onSaved,
}: {
  tripId: string;
  stops: TripDetailData['stops'];
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState({
    clientName: '',
    stopDate: '',
    stopTime: '',
    latitude: '',
    longitude: '',
    stoppedMinutes: '',
    notes: '',
  });
  const [saving, setSaving] = React.useState(false);

  async function handleAdd() {
    setSaving(true);
    const result = await createTripStopAction({
      tripId,
      clientName: form.clientName || null,
      stopDate: form.stopDate || null,
      stopTime: form.stopTime || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      stoppedMinutes: form.stoppedMinutes ? Number(form.stoppedMinutes) : null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (result.success) {
      setForm({
        clientName: '',
        stopDate: '',
        stopTime: '',
        latitude: '',
        longitude: '',
        stoppedMinutes: '',
        notes: '',
      });
      onSaved();
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrar parada</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            placeholder="Cliente"
            value={form.clientName}
            onChange={(e) => setForm((p) => ({...p, clientName: e.target.value}))}
          />
          <Input
            type="date"
            value={form.stopDate}
            onChange={(e) => setForm((p) => ({...p, stopDate: e.target.value}))}
          />
          <Input
            type="time"
            value={form.stopTime}
            onChange={(e) => setForm((p) => ({...p, stopTime: e.target.value}))}
          />
          <Input
            placeholder="Latitude"
            value={form.latitude}
            onChange={(e) => setForm((p) => ({...p, latitude: e.target.value}))}
          />
          <Input
            placeholder="Longitude"
            value={form.longitude}
            onChange={(e) => setForm((p) => ({...p, longitude: e.target.value}))}
          />
          <Input
            placeholder="Tempo parado (min)"
            value={form.stoppedMinutes}
            onChange={(e) => setForm((p) => ({...p, stoppedMinutes: e.target.value}))}
          />
          <Textarea
            placeholder="Observação"
            className="sm:col-span-2"
            value={form.notes}
            onChange={(e) => setForm((p) => ({...p, notes: e.target.value}))}
          />
          <Button onClick={handleAdd} disabled={saving}>
            Adicionar parada
          </Button>
        </CardContent>
      </Card>
      <TableContainer>
        <DataTable
          columns={[
            {id: 'client', header: 'Cliente', cell: (r) => r.clientName ?? '—'},
            {id: 'date', header: 'Data', cell: (r) => formatDateBr(r.stopDate)},
            {id: 'time', header: 'Hora', cell: (r) => r.stopTime ?? '—'},
            {
              id: 'coords',
              header: 'Coordenadas',
              cell: (r) =>
                r.latitude !== null && r.longitude !== null
                  ? `${r.latitude}, ${r.longitude}`
                  : '—',
            },
            {
              id: 'stopped',
              header: 'Parado',
              cell: (r) =>
                r.stoppedMinutes !== null ? `${r.stoppedMinutes} min` : '—',
            },
          ]}
          data={stops}
          getRowKey={(r) => r.id}
          emptyTitle="Nenhuma parada"
          emptyDescription="Registre paradas durante a viagem."
        />
      </TableContainer>
    </div>
  );
}

function OccurrencesTab({
  tripId,
  occurrences,
  onSaved,
}: {
  tripId: string;
  occurrences: TripDetailData['occurrences'];
  onSaved: () => void;
}) {
  const [type, setType] = React.useState<TripOccurrenceType>('delay');
  const [description, setDescription] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  async function handleAdd() {
    setSaving(true);
    const result = await createTripOccurrenceAction({
      tripId,
      occurrenceType: type,
      description: description || null,
    });
    setSaving(false);
    if (result.success) {
      setDescription('');
      onSaved();
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrar ocorrência</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TripOccurrenceType)}
            className={TRIP_NATIVE_SELECT_CLASS}
          >
            {TRIP_OCCURRENCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {TRIP_OCCURRENCE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <Input
            placeholder="Descrição"
            className="max-w-md"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button onClick={handleAdd} disabled={saving}>
            Registrar
          </Button>
        </CardContent>
      </Card>
      <TableContainer>
        <DataTable
          columns={[
            {
              id: 'type',
              header: 'Tipo',
              cell: (r) => TRIP_OCCURRENCE_TYPE_LABELS[r.occurrenceType],
            },
            {id: 'desc', header: 'Descrição', cell: (r) => r.description ?? '—'},
            {
              id: 'at',
              header: 'Data',
              cell: (r) => formatDateTimeBr(r.occurredAt),
            },
          ]}
          data={occurrences}
          getRowKey={(r) => r.id}
          emptyTitle="Nenhuma ocorrência"
          emptyDescription="Registre atrasos, panes, multas e outros eventos."
        />
      </TableContainer>
    </div>
  );
}

export {TripDetailView};
