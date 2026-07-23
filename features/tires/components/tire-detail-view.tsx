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
import type {BranchSelectOption} from '@/features/organization/branches/types';
import {SupplierSelect} from '@/features/suppliers/components';
import {useSupplierOptions} from '@/features/suppliers/hooks/use-supplier-options';
import type {SupplierSelectOption} from '@/features/suppliers/types';
import type {VehicleSelectOption} from '@/features/vehicles/types';

import {
  createTireInspectionAction,
  createTireMovementAction,
  createTireRecapAction,
  deleteTireDocumentAction,
} from '../actions';
import {TIRE_DOCUMENT_TYPES, TIRE_MOVEMENT_TYPES, TIRE_WEAR_LEVELS} from '../constants/enums';
import type {TireDetailData} from '../types';
import {
  TIRE_DOCUMENT_TYPE_LABELS,
  TIRE_HISTORY_ACTION_LABELS,
  TIRE_MOVEMENT_TYPE_LABELS,
  TIRE_POSITION_LABELS,
  TIRE_STATUS_LABELS,
  TIRE_WEAR_LEVEL_LABELS,
} from '../types';
import {
  formatCurrencyBr,
  formatDateBr,
  formatDateTimeBr,
  formatKm,
} from '../utils/tire-format';
import {isReplacementDue} from '../utils/tire-calculations';
import {TIRE_NATIVE_SELECT_CLASS} from '../utils/form-styles';
import {TireFileUpload} from './tire-file-upload';
import {TireFormModal} from './tire-form-modal';

export interface TireDetailViewProps {
  companyId: string;
  data: TireDetailData;
  branches: BranchSelectOption[];
  vehicles: VehicleSelectOption[];
  suppliers: SupplierSelectOption[];
}

const TABS = [
  {id: 'resumo', label: 'Resumo'},
  {id: 'dados', label: 'Dados'},
  {id: 'movimentacoes', label: 'Movimentações'},
  {id: 'inspecoes', label: 'Inspeções'},
  {id: 'recapagens', label: 'Recapagens'},
  {id: 'documentos', label: 'Documentos'},
  {id: 'historico', label: 'Histórico'},
  {id: 'custos', label: 'Custos'},
  {id: 'integracoes', label: 'Integrações'},
] as const;

type TabId = (typeof TABS)[number]['id'];

function TireDetailView({companyId, data, branches, vehicles, suppliers: initialSuppliers}: TireDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<TabId>('resumo');
  const [modalOpen, setModalOpen] = React.useState(false);
  const {tire} = data;
  const {options: suppliers, onOptionsChange} = useSupplierOptions(initialSuppliers);

  const [movementForm, setMovementForm] = React.useState({
    movementType: 'install' as (typeof TIRE_MOVEMENT_TYPES)[number],
    vehicleId: tire.vehicleId ?? '',
    position: tire.currentPosition ?? '',
    installedAt: '',
    reason: '',
    responsible: '',
  });
  const [inspectionForm, setInspectionForm] = React.useState({
    treadDepthMm: '',
    pressurePsi: '',
    wearLevel: '' as string,
    inspectedAt: new Date().toISOString().slice(0, 16),
    responsible: '',
  });
  const [recapForm, setRecapForm] = React.useState({
    supplierId: null as string | null,
    supplier: '',
    recapNumber: '',
    amount: '',
    odometerKm: '',
    recappedAt: new Date().toISOString().slice(0, 16),
    warranty: '',
  });
  const [formLoading, setFormLoading] = React.useState(false);

  function handleRefresh() {
    router.refresh();
  }

  async function handleDeleteDocument(documentId: string) {
    if (!confirm('Excluir este documento?')) return;
    const result = await deleteTireDocumentAction(documentId, tire.id);
    if (result.success) handleRefresh();
  }

  async function handleAddMovement(event: React.FormEvent) {
    event.preventDefault();
    setFormLoading(true);
    const result = await createTireMovementAction({
      tireId: tire.id,
      movementType: movementForm.movementType,
      vehicleId: movementForm.vehicleId || null,
      position: (movementForm.position || null) as typeof tire.currentPosition,
      installedAt: movementForm.installedAt || null,
      reason: movementForm.reason || null,
      responsible: movementForm.responsible || null,
    });
    setFormLoading(false);
    if (result.success) handleRefresh();
  }

  async function handleAddInspection(event: React.FormEvent) {
    event.preventDefault();
    setFormLoading(true);
    const result = await createTireInspectionAction({
      tireId: tire.id,
      treadDepthMm: Number(inspectionForm.treadDepthMm) || null,
      pressurePsi: Number(inspectionForm.pressurePsi) || null,
      wearLevel: (inspectionForm.wearLevel || null) as 'good' | 'warning' | 'critical' | null,
      inspectedAt: inspectionForm.inspectedAt,
      responsible: inspectionForm.responsible || null,
    });
    setFormLoading(false);
    if (result.success) handleRefresh();
  }

  async function handleAddRecap(event: React.FormEvent) {
    event.preventDefault();
    setFormLoading(true);
    const result = await createTireRecapAction({
      tireId: tire.id,
      supplierId: recapForm.supplierId,
      supplier: recapForm.supplier || null,
      recapNumber: recapForm.recapNumber || null,
      amount: Number(recapForm.amount) || null,
      odometerKm: Number(recapForm.odometerKm) || null,
      recappedAt: recapForm.recappedAt,
      warranty: recapForm.warranty || null,
    });
    setFormLoading(false);
    if (result.success) handleRefresh();
  }

  const replacementDue = isReplacementDue(
    tire.remainingLifeKm,
    tire.lastTreadDepthMm,
    tire.tireStatus,
  );

  const title = tire.assetNumber ?? tire.internalCode ?? tire.fireNumber ?? 'Pneu';

  return (
    <PageTemplate
      title={title}
      description={`${tire.brand ?? ''} ${tire.model ?? ''} ${tire.tireSize ?? ''}`.trim()}
      actions={
        <div className="flex gap-2">
          <Link
            href={ROUTES.pneus}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium shadow-xs hover:bg-accent"
          >
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
          <Button variant="outline" onClick={() => setModalOpen(true)}>
            <Pencil className="size-4" />
            Editar
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2 border-b pb-2">
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
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge>{TIRE_STATUS_LABELS[tire.tireStatus]}</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Veículo</CardTitle>
            </CardHeader>
            <CardContent>{tire.vehiclePlate ?? '—'}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">KM acumulado</CardTitle>
            </CardHeader>
            <CardContent>{formatKm(tire.accumulatedKm)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Vida útil restante</CardTitle>
            </CardHeader>
            <CardContent>
              {formatKm(tire.remainingLifeKm)}
              {replacementDue && (
                <Badge variant="destructive" className="ml-2">
                  Troca próxima
                </Badge>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recapagens</CardTitle>
            </CardHeader>
            <CardContent>{tire.recapCount}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Custo por KM</CardTitle>
            </CardHeader>
            <CardContent>{formatCurrencyBr(tire.costPerKm)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Último sulco</CardTitle>
            </CardHeader>
            <CardContent>
              {tire.lastTreadDepthMm !== null ? `${tire.lastTreadDepthMm} mm` : '—'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Posição</CardTitle>
            </CardHeader>
            <CardContent>
              {tire.currentPosition ? TIRE_POSITION_LABELS[tire.currentPosition] : '—'}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'dados' && (
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ['Patrimônio', tire.assetNumber],
            ['Código interno', tire.internalCode],
            ['Marca', tire.brand],
            ['Modelo', tire.model],
            ['Medida', tire.tireSize],
            ['Fabricante', tire.manufacturer],
            ['DOT', tire.dotNumber],
            ['Nº de fogo', tire.fireNumber],
            ['Nº de série', tire.serialNumber],
            ['Vida útil prevista', formatKm(tire.expectedLifeKm)],
            ['KM atual', formatKm(tire.currentKm)],
            ['KM acumulado', formatKm(tire.accumulatedKm)],
            ['Data de compra', formatDateBr(tire.purchaseDate)],
            ['Valor de compra', formatCurrencyBr(tire.purchaseValue)],
            ['Fornecedor', tire.supplier],
            ['Garantia', tire.warranty],
            ['Filial', tire.branchName],
            ['Observações', tire.notes],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded border p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-medium">{value ?? '—'}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'movimentacoes' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nova movimentação</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddMovement} className="grid gap-3 sm:grid-cols-2">
                <select
                  value={movementForm.movementType}
                  onChange={(e) =>
                    setMovementForm((prev) => ({
                      ...prev,
                      movementType: e.target.value as typeof movementForm.movementType,
                    }))
                  }
                  className={TIRE_NATIVE_SELECT_CLASS}
                >
                  {TIRE_MOVEMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {TIRE_MOVEMENT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
                <select
                  value={movementForm.vehicleId}
                  onChange={(e) =>
                    setMovementForm((prev) => ({...prev, vehicleId: e.target.value}))
                  }
                  className={TIRE_NATIVE_SELECT_CLASS}
                >
                  <option value="">Veículo</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate}
                    </option>
                  ))}
                </select>
                <Input
                  type="datetime-local"
                  value={movementForm.installedAt}
                  onChange={(e) =>
                    setMovementForm((prev) => ({...prev, installedAt: e.target.value}))
                  }
                />
                <Input
                  placeholder="Responsável"
                  value={movementForm.responsible}
                  onChange={(e) =>
                    setMovementForm((prev) => ({...prev, responsible: e.target.value}))
                  }
                />
                <Input
                  placeholder="Motivo"
                  value={movementForm.reason}
                  onChange={(e) =>
                    setMovementForm((prev) => ({...prev, reason: e.target.value}))
                  }
                />
                <Button type="submit" disabled={formLoading}>
                  <Plus className="size-4" />
                  Registrar
                </Button>
              </form>
            </CardContent>
          </Card>
          <TableContainer>
            <DataTable
              columns={[
                {
                  id: 'type',
                  header: 'Tipo',
                  cell: (m) => TIRE_MOVEMENT_TYPE_LABELS[m.movementType],
                },
                {id: 'vehicle', header: 'Veículo', cell: (m) => m.vehiclePlate ?? '—'},
                {
                  id: 'position',
                  header: 'Posição',
                  cell: (m) => (m.position ? TIRE_POSITION_LABELS[m.position] : '—'),
                },
                {
                  id: 'installed',
                  header: 'Instalação',
                  cell: (m) => formatDateTimeBr(m.installedAt),
                },
                {
                  id: 'removed',
                  header: 'Remoção',
                  cell: (m) => formatDateTimeBr(m.removedAt),
                },
                {id: 'reason', header: 'Motivo', cell: (m) => m.reason ?? '—'},
                {id: 'responsible', header: 'Responsável', cell: (m) => m.responsible ?? '—'},
              ]}
              data={data.movements}
              getRowKey={(row) => row.id}
              emptyTitle="Sem movimentações"
              emptyDescription="Registre instalações, remoções e rodízios."
            />
          </TableContainer>
        </div>
      )}

      {activeTab === 'inspecoes' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nova inspeção</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddInspection} className="grid gap-3 sm:grid-cols-2">
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Sulco (mm)"
                  value={inspectionForm.treadDepthMm}
                  onChange={(e) =>
                    setInspectionForm((prev) => ({...prev, treadDepthMm: e.target.value}))
                  }
                />
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Pressão (PSI)"
                  value={inspectionForm.pressurePsi}
                  onChange={(e) =>
                    setInspectionForm((prev) => ({...prev, pressurePsi: e.target.value}))
                  }
                />
                <select
                  value={inspectionForm.wearLevel}
                  onChange={(e) =>
                    setInspectionForm((prev) => ({...prev, wearLevel: e.target.value}))
                  }
                  className={TIRE_NATIVE_SELECT_CLASS}
                >
                  <option value="">Desgaste</option>
                  {TIRE_WEAR_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {TIRE_WEAR_LEVEL_LABELS[level]}
                    </option>
                  ))}
                </select>
                <Input
                  type="datetime-local"
                  value={inspectionForm.inspectedAt}
                  onChange={(e) =>
                    setInspectionForm((prev) => ({...prev, inspectedAt: e.target.value}))
                  }
                />
                <Input
                  placeholder="Responsável"
                  value={inspectionForm.responsible}
                  onChange={(e) =>
                    setInspectionForm((prev) => ({...prev, responsible: e.target.value}))
                  }
                />
                <Button type="submit" disabled={formLoading}>
                  <Plus className="size-4" />
                  Registrar
                </Button>
              </form>
            </CardContent>
          </Card>
          <TableContainer>
            <DataTable
              columns={[
                {
                  id: 'date',
                  header: 'Data',
                  cell: (i) => formatDateTimeBr(i.inspectedAt),
                },
                {
                  id: 'tread',
                  header: 'Sulco',
                  cell: (i) => (i.treadDepthMm !== null ? `${i.treadDepthMm} mm` : '—'),
                },
                {
                  id: 'pressure',
                  header: 'Pressão',
                  cell: (i) => (i.pressurePsi !== null ? `${i.pressurePsi} PSI` : '—'),
                },
                {
                  id: 'wear',
                  header: 'Desgaste',
                  cell: (i) => (i.wearLevel ? TIRE_WEAR_LEVEL_LABELS[i.wearLevel] : '—'),
                },
                {id: 'responsible', header: 'Responsável', cell: (i) => i.responsible ?? '—'},
              ]}
              data={data.inspections}
              getRowKey={(row) => row.id}
              emptyTitle="Sem inspeções"
              emptyDescription="Registre inspeções de sulco e pressão."
            />
          </TableContainer>
        </div>
      )}

      {activeTab === 'recapagens' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nova recapagem</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddRecap} className="grid gap-3 sm:grid-cols-2">
                <SupplierSelect
                  id="tire-recap-supplier"
                  value={recapForm.supplierId}
                  options={suppliers}
                  onOptionsChange={onOptionsChange}
                  defaultCategories={['pneus']}
                  placeholder="Fornecedor"
                  onChange={(supplierId, option) => {
                    setRecapForm((prev) => ({
                      ...prev,
                      supplierId,
                      supplier: option?.displayName ?? '',
                    }));
                  }}
                />
                <Input
                  placeholder="Nº recapagem"
                  value={recapForm.recapNumber}
                  onChange={(e) =>
                    setRecapForm((prev) => ({...prev, recapNumber: e.target.value}))
                  }
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Valor"
                  value={recapForm.amount}
                  onChange={(e) => setRecapForm((prev) => ({...prev, amount: e.target.value}))}
                />
                <Input
                  type="number"
                  placeholder="KM"
                  value={recapForm.odometerKm}
                  onChange={(e) =>
                    setRecapForm((prev) => ({...prev, odometerKm: e.target.value}))
                  }
                />
                <Input
                  type="datetime-local"
                  value={recapForm.recappedAt}
                  onChange={(e) =>
                    setRecapForm((prev) => ({...prev, recappedAt: e.target.value}))
                  }
                />
                <Input
                  placeholder="Garantia"
                  value={recapForm.warranty}
                  onChange={(e) => setRecapForm((prev) => ({...prev, warranty: e.target.value}))}
                />
                <Button type="submit" disabled={formLoading}>
                  <Plus className="size-4" />
                  Registrar
                </Button>
              </form>
            </CardContent>
          </Card>
          <TableContainer>
            <DataTable
              columns={[
                {id: 'date', header: 'Data', cell: (r) => formatDateTimeBr(r.recappedAt)},
                {id: 'supplier', header: 'Fornecedor', cell: (r) => r.supplier ?? '—'},
                {id: 'number', header: 'Nº', cell: (r) => r.recapNumber ?? '—'},
                {id: 'amount', header: 'Valor', cell: (r) => formatCurrencyBr(r.amount)},
                {id: 'km', header: 'KM', cell: (r) => formatKm(r.odometerKm)},
                {id: 'warranty', header: 'Garantia', cell: (r) => r.warranty ?? '—'},
              ]}
              data={data.recaps}
              getRowKey={(row) => row.id}
              emptyTitle="Sem recapagens"
              emptyDescription="Registre recapagens do pneu."
            />
          </TableContainer>
        </div>
      )}

      {activeTab === 'documentos' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {TIRE_DOCUMENT_TYPES.map((type) => (
              <TireFileUpload
                key={type}
                companyId={companyId}
                tireId={tire.id}
                documentType={type}
                label={TIRE_DOCUMENT_TYPE_LABELS[type]}
                onUploaded={handleRefresh}
              />
            ))}
          </div>
          <TableContainer>
            <DataTable
              columns={[
                {id: 'name', header: 'Nome', cell: (d) => d.name},
                {
                  id: 'type',
                  header: 'Tipo',
                  cell: (d) => TIRE_DOCUMENT_TYPE_LABELS[d.documentType],
                },
                {
                  id: 'date',
                  header: 'Data',
                  cell: (d) => formatDateTimeBr(d.createdAt),
                },
                {
                  id: 'actions',
                  header: '',
                  cell: (d) => (
                    <div className="flex justify-end gap-2">
                      <a
                        href={d.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium shadow-xs hover:bg-accent"
                      >
                        Abrir
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleDeleteDocument(d.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={data.documents}
              getRowKey={(row) => row.id}
              emptyTitle="Sem documentos"
              emptyDescription="Envie notas fiscais, fotos e laudos."
            />
          </TableContainer>
        </div>
      )}

      {activeTab === 'historico' && (
        <TableContainer>
          <DataTable
            columns={[
              {
                id: 'date',
                header: 'Data',
                cell: (h) => formatDateTimeBr(h.createdAt),
              },
              {
                id: 'action',
                header: 'Ação',
                cell: (h) => TIRE_HISTORY_ACTION_LABELS[h.action] ?? h.action,
              },
              {
                id: 'changes',
                header: 'Detalhes',
                cell: (h) => JSON.stringify(h.changes),
              },
            ]}
            data={data.history}
            getRowKey={(row) => row.id}
            emptyTitle="Sem histórico"
            emptyDescription="O histórico será registrado automaticamente."
          />
        </TableContainer>
      )}

      {activeTab === 'custos' && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Valor de compra</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {formatCurrencyBr(tire.purchaseValue)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total recapagens</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {formatCurrencyBr(tire.totalRecapCost)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Custo por KM</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {formatCurrencyBr(tire.costPerKm)}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'integracoes' && (
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {title: 'Financeiro', items: data.financial},
            {title: 'BI', items: data.bi},
            {title: 'Manutenção', items: data.maintenance},
            {title: 'Telemetria', items: data.telemetry},
            {title: 'App Motorista', items: data.driverApp},
            {title: 'IA', items: data.ai},
          ].map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle className="text-base">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {section.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Integração preparada — aguardando módulo {section.title}.
                  </p>
                ) : (
                  <pre className="text-xs">{JSON.stringify(section.items, null, 2)}</pre>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TireFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        tire={tire}
        branches={branches}
        vehicles={vehicles}
        suppliers={suppliers}
        onSaved={handleRefresh}
      />
    </PageTemplate>
  );
}

export {TireDetailView};
