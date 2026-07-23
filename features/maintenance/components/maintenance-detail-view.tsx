'use client';

import {ArrowLeft, Pencil, Plus, Trash2} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import * as React from 'react';

import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {PageTemplate} from '@/components/layout/page-template';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {ROUTES} from '@/constants/routes/paths';
import type {VehicleSelectOption} from '@/features/vehicles/types';

import {
  createMaintenancePartAction,
  createMaintenanceServiceAction,
  deleteMaintenanceDocumentAction,
  deleteMaintenancePartAction,
  deleteMaintenanceServiceAction,
} from '../actions';
import {MAINTENANCE_DOCUMENT_TYPES} from '../constants/enums';
import type {MaintenanceDetailData, MaintenanceDocument} from '../types';
import {
  MAINTENANCE_ALERT_TYPE_LABELS,
  MAINTENANCE_DOCUMENT_TYPE_LABELS,
  MAINTENANCE_HISTORY_ACTION_LABELS,
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_SCHEDULE_TYPE_LABELS,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TYPE_LABELS,
} from '../types';
import {
  formatCurrencyBr,
  formatDateTimeBr,
  formatHours,
} from '../utils/maintenance-format';
import {MaintenanceFileUpload} from './maintenance-file-upload';
import {MaintenanceFormModal} from './maintenance-form-modal';

export interface MaintenanceDetailViewProps {
  companyId: string;
  data: MaintenanceDetailData;
  vehicles: VehicleSelectOption[];
}

const TABS = [
  {id: 'resumo', label: 'Resumo'},
  {id: 'dados', label: 'Dados'},
  {id: 'pecas', label: 'Peças'},
  {id: 'servicos', label: 'Serviços'},
  {id: 'documentos', label: 'Documentos'},
  {id: 'historico', label: 'Histórico'},
  {id: 'custos', label: 'Custos'},
  {id: 'agendamentos', label: 'Agendamentos'},
  {id: 'integracoes', label: 'Integrações'},
] as const;

type TabId = (typeof TABS)[number]['id'];

function MaintenanceDetailView({
  companyId,
  data,
  vehicles,
}: MaintenanceDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<TabId>('resumo');
  const [modalOpen, setModalOpen] = React.useState(false);
  const {record} = data;

  const [partForm, setPartForm] = React.useState({name: '', quantity: '1', unitPrice: ''});
  const [serviceForm, setServiceForm] = React.useState({description: '', hours: '', amount: ''});
  const [partLoading, setPartLoading] = React.useState(false);
  const [serviceLoading, setServiceLoading] = React.useState(false);

  function handleRefresh() {
    router.refresh();
  }

  async function handleDeleteDocument(documentId: string) {
    if (!confirm('Excluir este documento?')) return;
    const result = await deleteMaintenanceDocumentAction(documentId, record.id);
    if (result.success) handleRefresh();
  }

  async function handleAddPart(event: React.FormEvent) {
    event.preventDefault();
    setPartLoading(true);
    const result = await createMaintenancePartAction({
      maintenanceRecordId: record.id,
      name: partForm.name,
      quantity: Number(partForm.quantity),
      unitPrice: Number(partForm.unitPrice),
    });
    setPartLoading(false);
    if (result.success) {
      setPartForm({name: '', quantity: '1', unitPrice: ''});
      handleRefresh();
    }
  }

  async function handleDeletePart(partId: string) {
    if (!confirm('Remover esta peça?')) return;
    const result = await deleteMaintenancePartAction(partId, record.id);
    if (result.success) handleRefresh();
  }

  async function handleAddService(event: React.FormEvent) {
    event.preventDefault();
    setServiceLoading(true);
    const result = await createMaintenanceServiceAction({
      maintenanceRecordId: record.id,
      description: serviceForm.description,
      hours: serviceForm.hours ? Number(serviceForm.hours) : null,
      amount: Number(serviceForm.amount),
    });
    setServiceLoading(false);
    if (result.success) {
      setServiceForm({description: '', hours: '', amount: ''});
      handleRefresh();
    }
  }

  async function handleDeleteService(serviceId: string) {
    if (!confirm('Remover este serviço?')) return;
    const result = await deleteMaintenanceServiceAction(serviceId, record.id);
    if (result.success) handleRefresh();
  }

  const infoRows = [
    ['Veículo', record.vehiclePlate ?? '—'],
    ['Filial', record.branchName ?? '—'],
    ['Tipo', MAINTENANCE_TYPE_LABELS[record.maintenanceType]],
    ['Prioridade', MAINTENANCE_PRIORITY_LABELS[record.priority]],
    ['Status', MAINTENANCE_STATUS_LABELS[record.maintenanceStatus]],
    ['Fornecedor', record.supplier ?? '—'],
    ['Oficina', record.workshop ?? '—'],
    ['Abertura', formatDateTimeBr(record.openedAt)],
    ['Conclusão', formatDateTimeBr(record.completedAt)],
    ['Odômetro', record.odometerKm?.toLocaleString('pt-BR') ?? '—'],
    ['Horímetro', record.hourMeter?.toLocaleString('pt-BR') ?? '—'],
    ['Tempo parado', formatHours(record.downtimeHours)],
    ['Responsável', record.responsible ?? '—'],
    ['Descrição', record.description ?? '—'],
    ['Diagnóstico', record.diagnosis ?? '—'],
    ['Solução', record.solution ?? '—'],
    ['Observações', record.notes ?? '—'],
  ];

  return (
    <PageTemplate
      title={`Manutenção — ${record.vehiclePlate ?? record.id.slice(0, 8)}`}
      description={[record.supplier, record.workshop].filter(Boolean).join(' · ') || 'Registro de manutenção'}
      actions={
        <div className="flex gap-2">
          <Link
            href={ROUTES.manutencoes}
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
        <Badge>{MAINTENANCE_STATUS_LABELS[record.maintenanceStatus]}</Badge>
        <Badge variant="outline">{MAINTENANCE_TYPE_LABELS[record.maintenanceType]}</Badge>
        <span className="text-sm text-muted-foreground">{formatDateTimeBr(record.openedAt)}</span>
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
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Veículo</CardTitle></CardHeader>
            <CardContent className="text-lg font-semibold">{record.vehiclePlate ?? '—'}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Custo total</CardTitle></CardHeader>
            <CardContent className="text-lg font-semibold">{formatCurrencyBr(record.totalCost)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tempo parado</CardTitle></CardHeader>
            <CardContent className="text-lg font-semibold">{formatHours(record.downtimeHours)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Status</CardTitle></CardHeader>
            <CardContent className="text-lg font-semibold">{MAINTENANCE_STATUS_LABELS[record.maintenanceStatus]}</CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'dados' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Dados da manutenção</CardTitle></CardHeader>
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

      {activeTab === 'pecas' && (
        <div className="space-y-4">
          <form onSubmit={handleAddPart} className="flex flex-wrap gap-2">
            <Input placeholder="Nome da peça" value={partForm.name} onChange={(e) => setPartForm((p) => ({...p, name: e.target.value}))} required className="max-w-xs" />
            <Input placeholder="Qtd" type="number" value={partForm.quantity} onChange={(e) => setPartForm((p) => ({...p, quantity: e.target.value}))} className="max-w-24" />
            <Input placeholder="Valor unit." type="number" step="0.01" value={partForm.unitPrice} onChange={(e) => setPartForm((p) => ({...p, unitPrice: e.target.value}))} required className="max-w-32" />
            <Button type="submit" size="sm" disabled={partLoading}><Plus className="size-4" />Adicionar</Button>
          </form>
          <TableContainer>
            <DataTable
              columns={[
                {id: 'name', header: 'Peça', cell: (row) => row.name},
                {id: 'qty', header: 'Qtd', cell: (row) => row.quantity},
                {id: 'unit', header: 'Unit.', cell: (row) => formatCurrencyBr(row.unitPrice)},
                {id: 'total', header: 'Total', cell: (row) => formatCurrencyBr(row.totalPrice)},
                {id: 'actions', header: '', cell: (row) => (
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDeletePart(row.id)}><Trash2 className="size-4" /></Button>
                )},
              ]}
              data={data.parts}
              getRowKey={(row) => row.id}
              emptyTitle="Nenhuma peça registrada"
            />
          </TableContainer>
        </div>
      )}

      {activeTab === 'servicos' && (
        <div className="space-y-4">
          <form onSubmit={handleAddService} className="flex flex-wrap gap-2">
            <Input placeholder="Descrição do serviço" value={serviceForm.description} onChange={(e) => setServiceForm((p) => ({...p, description: e.target.value}))} required className="max-w-xs" />
            <Input placeholder="Horas" type="number" step="0.1" value={serviceForm.hours} onChange={(e) => setServiceForm((p) => ({...p, hours: e.target.value}))} className="max-w-24" />
            <Input placeholder="Valor" type="number" step="0.01" value={serviceForm.amount} onChange={(e) => setServiceForm((p) => ({...p, amount: e.target.value}))} required className="max-w-32" />
            <Button type="submit" size="sm" disabled={serviceLoading}><Plus className="size-4" />Adicionar</Button>
          </form>
          <TableContainer>
            <DataTable
              columns={[
                {id: 'desc', header: 'Descrição', cell: (row) => row.description},
                {id: 'hours', header: 'Horas', cell: (row) => formatHours(row.hours)},
                {id: 'amount', header: 'Valor', cell: (row) => formatCurrencyBr(row.amount)},
                {id: 'actions', header: '', cell: (row) => (
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteService(row.id)}><Trash2 className="size-4" /></Button>
                )},
              ]}
              data={data.services}
              getRowKey={(row) => row.id}
              emptyTitle="Nenhum serviço registrado"
            />
          </TableContainer>
        </div>
      )}

      {activeTab === 'documentos' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {MAINTENANCE_DOCUMENT_TYPES.map((type) => (
              <MaintenanceFileUpload
                key={type}
                companyId={companyId}
                maintenanceRecordId={record.id}
                documentType={type}
                label={MAINTENANCE_DOCUMENT_TYPE_LABELS[type]}
                onUploaded={handleRefresh}
              />
            ))}
          </div>
          <TableContainer>
            <DataTable
              columns={[
                {id: 'name', header: 'Arquivo', cell: (row: MaintenanceDocument) => (
                  <a href={row.fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">{row.name}</a>
                )},
                {id: 'type', header: 'Tipo', cell: (row) => MAINTENANCE_DOCUMENT_TYPE_LABELS[row.documentType]},
                {id: 'date', header: 'Enviado em', cell: (row) => formatDateTimeBr(row.createdAt)},
                {id: 'actions', header: '', cell: (row) => (
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteDocument(row.id)}><Trash2 className="size-4" /></Button>
                )},
              ]}
              data={data.documents}
              getRowKey={(row) => row.id}
              emptyTitle="Nenhum documento anexado"
            />
          </TableContainer>
        </div>
      )}

      {activeTab === 'historico' && (
        <TableContainer>
          <DataTable
            columns={[
              {id: 'date', header: 'Data', cell: (row) => formatDateTimeBr(row.createdAt)},
              {id: 'action', header: 'Ação', cell: (row) => MAINTENANCE_HISTORY_ACTION_LABELS[row.action] ?? row.action},
              {id: 'changes', header: 'Alterações', cell: (row) => (
                <span className="text-xs text-muted-foreground">{JSON.stringify(row.changes).slice(0, 80)}</span>
              )},
            ]}
            data={data.history}
            getRowKey={(row) => row.id}
            emptyTitle="Nenhum histórico registrado"
          />
        </TableContainer>
      )}

      {activeTab === 'custos' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Peças</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{formatCurrencyBr(record.partsTotal)}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Serviços</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{formatCurrencyBr(record.servicesTotal)}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{formatCurrencyBr(record.totalCost)}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Estimado</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{formatCurrencyBr(record.estimatedAmount)}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Final</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{formatCurrencyBr(record.finalAmount)}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Custo/KM</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{record.costPerKm?.toFixed(4) ?? '—'}</CardContent></Card>
        </div>
      )}

      {activeTab === 'agendamentos' && (
        <TableContainer>
          <DataTable
            columns={[
              {id: 'type', header: 'Tipo', cell: (row) => MAINTENANCE_SCHEDULE_TYPE_LABELS[row.scheduleType]},
              {id: 'alert', header: 'Alerta', cell: (row) => MAINTENANCE_ALERT_TYPE_LABELS[row.alertType]},
              {id: 'next', header: 'Próximo vencimento', cell: (row) => formatDateTimeBr(row.nextDueAt)},
              {id: 'active', header: 'Ativo', cell: (row) => row.isActive ? 'Sim' : 'Não'},
            ]}
            data={data.schedules}
            getRowKey={(row) => row.id}
            emptyTitle="Nenhum agendamento para este veículo"
            emptyDescription="Agendamentos preventivos aparecerão aqui quando configurados."
          />
        </TableContainer>
      )}

      {activeTab === 'integracoes' && (
        <div className="space-y-6">
          {[
            {title: 'Financeiro', items: data.financial, empty: 'Integração com Financeiro será exibida aqui.'},
            {title: 'Pneus', items: data.tires, empty: 'Integração com Pneus será exibida aqui.'},
            {title: 'BI', items: data.bi, empty: 'Métricas de BI serão exibidas aqui.'},
            {title: 'Telemetria', items: data.telemetry, empty: 'Dados de telemetria serão exibidos aqui.'},
            {title: 'App Motorista', items: data.driverApp, empty: 'Eventos do app motorista serão exibidos aqui.'},
            {title: 'IA', items: data.ai, empty: 'Insights de IA serão exibidos aqui.'},
          ].map((section) => (
            <Card key={section.title}>
              <CardHeader><CardTitle className="text-base">{section.title}</CardTitle></CardHeader>
              <CardContent>
                {section.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{section.empty}</p>
                ) : (
                  <pre className="text-xs">{JSON.stringify(section.items, null, 2)}</pre>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MaintenanceFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        record={record}
        vehicles={vehicles}
        onSaved={handleRefresh}
      />
    </PageTemplate>
  );
}

export {MaintenanceDetailView};
