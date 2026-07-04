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

import {deleteDriverDocumentAction} from '../actions';
import type {DriverDetailData} from '../types';
import {
  DRIVER_CONTRACT_TYPE_LABELS,
  DRIVER_DOCUMENT_TYPE_LABELS,
  DRIVER_HISTORY_ACTION_LABELS,
  DRIVER_OPERATIONAL_STATUS_LABELS,
} from '../types';
import {
  formatCpf,
  formatDateBr,
  getDriverOperationalStatusVariant,
  isCnhExpired,
  isCnhExpiring,
} from '../utils/driver-status';
import {DriverFileUpload} from './driver-file-upload';
import {DriverFormModal} from './driver-form-modal';

export interface DriverDetailViewProps {
  companyId: string;
  data: DriverDetailData;
  branches: BranchSelectOption[];
}

const TABS = [
  {id: 'dados', label: 'Dados'},
  {id: 'documentos', label: 'Documentos'},
  {id: 'historico', label: 'Histórico'},
  {id: 'veiculos', label: 'Veículos'},
  {id: 'viagens', label: 'Viagens'},
  {id: 'custos', label: 'Custos'},
  {id: 'infracoes', label: 'Infrações'},
  {id: 'treinamentos', label: 'Treinamentos'},
  {id: 'ferias', label: 'Férias'},
  {id: 'observacoes', label: 'Observações'},
] as const;

type TabId = (typeof TABS)[number]['id'];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR');
}

function DriverDetailView({companyId, data, branches}: DriverDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<TabId>('dados');
  const [modalOpen, setModalOpen] = React.useState(false);
  const {driver} = data;

  function handleRefresh() {
    router.refresh();
  }

  async function handleDeleteDocument(documentId: string) {
    if (!confirm('Excluir este documento?')) return;
    const result = await deleteDriverDocumentAction(documentId, driver.id);
    if (result.success) handleRefresh();
  }

  const infoRows = [
    ['Nome', driver.name],
    ['CPF', formatCpf(driver.cpf)],
    ['RG', driver.rg ?? '—'],
    ['CNH', driver.cnhNumber],
    ['Categoria', driver.licenseCategory],
    ['Emissão CNH', formatDateBr(driver.licenseIssuedAt)],
    ['Validade CNH', formatDateBr(driver.licenseExpiresAt)],
    ['EAR', driver.ear ? 'Sim' : 'Não'],
    ['Nascimento', formatDateBr(driver.birthDate)],
    ['Telefone', driver.phone ?? '—'],
    ['WhatsApp', driver.whatsapp ?? '—'],
    ['E-mail', driver.email ?? '—'],
    ['Endereço', driver.address ?? '—'],
    ['CEP', driver.zipCode ?? '—'],
    ['Cidade', driver.city ?? '—'],
    ['Estado', driver.state ?? '—'],
    ['Filial', driver.branchName ?? '—'],
    ['Admissão', formatDateBr(driver.hiredAt)],
    ['Desligamento', formatDateBr(driver.terminatedAt)],
    [
      'Contratação',
      driver.contractType ? DRIVER_CONTRACT_TYPE_LABELS[driver.contractType] : '—',
    ],
    ['Contato de emergência', driver.emergencyContact ?? '—'],
  ];

  return (
    <PageTemplate
      title={driver.name}
      description={[formatCpf(driver.cpf), driver.cnhNumber].join(' · ')}
      actions={
        <div className="flex gap-2">
          <Link
            href={ROUTES.motoristas}
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
        <Badge variant={getDriverOperationalStatusVariant(driver.operationalStatus)}>
          {DRIVER_OPERATIONAL_STATUS_LABELS[driver.operationalStatus]}
        </Badge>
        {isCnhExpired(driver.licenseExpiresAt) && (
          <Badge variant="destructive">CNH vencida</Badge>
        )}
        {!isCnhExpired(driver.licenseExpiresAt) && isCnhExpiring(driver.licenseExpiresAt) && (
          <Badge variant="outline">CNH vencendo</Badge>
        )}
        {!driver.ear && driver.operationalStatus === 'active' && (
          <Badge variant="secondary">EAR pendente</Badge>
        )}
        {driver.photoUrl && (
          <div className="relative size-20 overflow-hidden rounded-lg border border-border">
            <Image
              src={driver.photoUrl}
              alt={`Foto de ${driver.name}`}
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
            <CardTitle className="text-base">Dados do motorista</CardTitle>
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
            <div className="mt-6">
              <DriverFileUpload
                companyId={companyId}
                driverId={driver.id}
                documentType="photo"
                label="Enviar foto"
                onUploaded={handleRefresh}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'documentos' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <DriverFileUpload
              companyId={companyId}
              driverId={driver.id}
              documentType="cnh_front"
              label="CNH frente"
              onUploaded={handleRefresh}
            />
            <DriverFileUpload
              companyId={companyId}
              driverId={driver.id}
              documentType="cnh_back"
              label="CNH verso"
              onUploaded={handleRefresh}
            />
            <DriverFileUpload
              companyId={companyId}
              driverId={driver.id}
              documentType="proof"
              label="Comprovante"
              onUploaded={handleRefresh}
            />
            <DriverFileUpload
              companyId={companyId}
              driverId={driver.id}
              documentType="aso"
              label="ASO"
              onUploaded={handleRefresh}
            />
            <DriverFileUpload
              companyId={companyId}
              driverId={driver.id}
              documentType="document"
              label="Documento adicional"
              onUploaded={handleRefresh}
            />
          </div>
          <TableContainer>
            <DataTable
              columns={[
                {id: 'name', header: 'Nome', cell: (row) => row.name},
                {
                  id: 'type',
                  header: 'Tipo',
                  cell: (row) => DRIVER_DOCUMENT_TYPE_LABELS[row.documentType],
                },
                {
                  id: 'date',
                  header: 'Enviado em',
                  cell: (row) => formatDateTime(row.createdAt),
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
              emptyDescription="Envie CNH, ASO, comprovantes ou outros documentos."
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
                cell: (row) => formatDateTime(row.createdAt),
              },
              {
                id: 'action',
                header: 'Ação',
                cell: (row) =>
                  DRIVER_HISTORY_ACTION_LABELS[row.action] ?? row.action,
              },
              {
                id: 'status',
                header: 'Situação',
                cell: (row) =>
                  row.newOperationalStatus
                    ? DRIVER_OPERATIONAL_STATUS_LABELS[row.newOperationalStatus]
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
            emptyDescription="Alterações do motorista aparecerão aqui."
          />
        </TableContainer>
      )}

      {activeTab === 'veiculos' && (
        <EmptySection
          title="Veículos"
          description="Integração com veículos atribuídos ao motorista em breve."
        />
      )}

      {activeTab === 'viagens' && (
        <EmptySection
          title="Viagens"
          description="Integração com o módulo de viagens em breve."
        />
      )}

      {activeTab === 'custos' && (
        <TableContainer>
          <DataTable
            columns={[
              {id: 'date', header: 'Data', cell: (row) => new Date(row.date).toLocaleDateString('pt-BR')},
              {id: 'category', header: 'Categoria', cell: (row) => row.category},
              {id: 'description', header: 'Descrição', cell: (row) => row.description ?? '—'},
              {
                id: 'amount',
                header: 'Valor',
                cell: (row) =>
                  row.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}),
              },
            ]}
            data={data.costs}
            getRowKey={(row) => row.id}
            emptyTitle="Sem lançamentos financeiros"
            emptyDescription="Custos vinculados a este motorista aparecerão aqui."
          />
        </TableContainer>
      )}

      {activeTab === 'infracoes' && (
        <EmptySection
          title="Infrações"
          description="Integração com infrações de trânsito em breve."
        />
      )}

      {activeTab === 'treinamentos' && (
        <EmptySection
          title="Treinamentos"
          description="Integração com treinamentos e certificações em breve."
        />
      )}

      {activeTab === 'ferias' && (
        <EmptySection
          title="Férias"
          description="Integração com gestão de férias em breve."
        />
      )}

      {activeTab === 'observacoes' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {driver.notes?.trim() || 'Nenhuma observação registrada.'}
            </p>
          </CardContent>
        </Card>
      )}

      <DriverFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        driver={driver}
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

export {DriverDetailView};
