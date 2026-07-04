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
import {ROUTES} from '@/constants/routes/paths';
import type {BranchSelectOption} from '@/features/organization/branches/types';
import {CUSTOMER_EXTENSION_REGISTRY} from '@/features/customers/types/integrations';

import {
  createCustomerAddressAction,
  createCustomerContactAction,
  deleteCustomerAddressAction,
  deleteCustomerContactAction,
  deleteCustomerContractAction,
  deleteCustomerDocumentAction,
} from '../actions';
import type {CustomerTripRecord, CustomerFinancialRecord} from '../types/integrations';
import type {CustomerDetailData, CustomerAddress, CustomerContact, CustomerContract, CustomerDocument, CustomerHistory} from '../types';
import {
  CUSTOMER_ADDRESS_TYPE_LABELS,
  CUSTOMER_CONTRACT_STATUS_LABELS,
  CUSTOMER_CONTRACT_TYPE_LABELS,
  CUSTOMER_DOCUMENT_TYPE_LABELS,
  CUSTOMER_HISTORY_ACTION_LABELS,
  CUSTOMER_READJUSTMENT_INDEX_LABELS,
  CUSTOMER_SEGMENT_LABELS,
  CUSTOMER_STATUS_LABELS,
} from '../types';
import {
  formatCnpj,
  formatCurrency,
  formatDateBr,
  getContractStatusVariant,
  getCustomerStatusVariant,
  isContractExpired,
  isContractExpiring,
} from '../utils/customer-format';
import {ContractFormModal} from './contract-form-modal';
import {CustomerFileUpload} from './customer-file-upload';
import {CustomerFormModal} from './customer-form-modal';

export interface CustomerDetailViewProps {
  companyId: string;
  data: CustomerDetailData;
  branches: BranchSelectOption[];
}

const TABS = [
  {id: 'resumo', label: 'Resumo'},
  {id: 'dados', label: 'Dados'},
  {id: 'enderecos', label: 'Endereços'},
  {id: 'contatos', label: 'Contatos'},
  {id: 'contratos', label: 'Contratos'},
  {id: 'documentos', label: 'Documentos'},
  {id: 'historico', label: 'Histórico'},
  {id: 'financeiro', label: 'Financeiro'},
  {id: 'viagens', label: 'Viagens'},
  {id: 'integracoes', label: 'Integrações'},
] as const;

type TabId = (typeof TABS)[number]['id'];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR');
}

function CustomerDetailView({companyId, data, branches}: CustomerDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<TabId>('resumo');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [contractModalOpen, setContractModalOpen] = React.useState(false);
  const {customer, addresses, contacts, contracts, documents, history, trips, financial} = data;

  const activeContracts = contracts.filter((c) => c.contractStatus === 'active');
  const totalContractedRevenue = activeContracts.reduce((sum, c) => sum + c.contractedRevenue, 0);

  function handleRefresh() {
    router.refresh();
  }

  const infoRows = [
    ['Razão Social', customer.legalName],
    ['Nome Fantasia', customer.tradeName ?? '—'],
    ['CNPJ', formatCnpj(customer.taxId)],
    ['IE', customer.stateRegistration ?? '—'],
    ['IM', customer.municipalRegistration ?? '—'],
    ['E-mail', customer.email ?? '—'],
    ['Telefone', customer.phone ?? '—'],
    ['WhatsApp', customer.whatsapp ?? '—'],
    ['Site', customer.website ?? '—'],
    ['Segmento', customer.segment ? CUSTOMER_SEGMENT_LABELS[customer.segment] : '—'],
    ['Responsável Comercial', customer.salesRepresentative ?? '—'],
    ['Limite de Crédito', formatCurrency(customer.creditLimit)],
    ['Prazo de Pagamento', customer.paymentTermDays ? `${customer.paymentTermDays} dias` : '—'],
    ['Filial', customer.branchName ?? '—'],
  ];

  return (
    <PageTemplate
      title={customer.displayName}
      description={[formatCnpj(customer.taxId), customer.salesRepresentative].filter(Boolean).join(' · ')}
      actions={
        <div className="flex gap-2">
          <Link
            href={ROUTES.clientes}
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
        <Badge variant={getCustomerStatusVariant(customer.customerStatus)}>
          {CUSTOMER_STATUS_LABELS[customer.customerStatus]}
        </Badge>
        <Badge variant="outline">{activeContracts.length} contrato(s) ativo(s)</Badge>
        <Badge variant="secondary">Receita contratada: {formatCurrency(totalContractedRevenue)}</Badge>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'resumo' && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Contratos Ativos</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{activeContracts.length}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Receita Contratada</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{formatCurrency(totalContractedRevenue)}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Viagens</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{trips.length}</CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'dados' && (
        <Card>
          <CardContent className="pt-6">
            <dl className="grid gap-3 sm:grid-cols-2">
              {infoRows.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            {customer.notes && (
              <div className="mt-4 rounded-md bg-muted/50 p-3 text-sm">{customer.notes}</div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'enderecos' && (
        <div className="space-y-4">
          <TableContainer>
            <DataTable
              columns={[
                {id: 'type', header: 'Tipo', cell: (row) => CUSTOMER_ADDRESS_TYPE_LABELS[(row as CustomerAddress).addressType]},
                {id: 'address', header: 'Endereço', cell: (row) => (row as CustomerAddress).formattedAddress},
                {id: 'primary', header: 'Principal', cell: (row) => ((row as CustomerAddress).isPrimary ? 'Sim' : '—')},
                {
                  id: 'actions',
                  header: '',
                  cell: (row) => (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm('Excluir endereço?')) return;
                        await deleteCustomerAddressAction(customer.id, (row as CustomerAddress).id);
                        handleRefresh();
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ),
                },
              ]}
              data={addresses}
              emptyTitle="Nenhum endereço cadastrado."
              getRowKey={(row) => (row as CustomerAddress).id}
            />
          </TableContainer>
          <AddressQuickForm customerId={customer.id} onSaved={handleRefresh} />
        </div>
      )}

      {activeTab === 'contatos' && (
        <div className="space-y-4">
          <TableContainer>
            <DataTable
              columns={[
                {id: 'name', header: 'Nome', cell: (row) => (row as CustomerContact).name},
                {id: 'job', header: 'Cargo', cell: (row) => (row as CustomerContact).jobTitle ?? '—'},
                {id: 'phone', header: 'Telefone', cell: (row) => (row as CustomerContact).phone ?? (row as CustomerContact).whatsapp ?? '—'},
                {id: 'email', header: 'E-mail', cell: (row) => (row as CustomerContact).email ?? '—'},
                {id: 'primary', header: 'Principal', cell: (row) => ((row as CustomerContact).isPrimary ? 'Sim' : '—')},
                {
                  id: 'actions',
                  header: '',
                  cell: (row) => (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm('Excluir contato?')) return;
                        await deleteCustomerContactAction(customer.id, (row as CustomerContact).id);
                        handleRefresh();
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ),
                },
              ]}
              data={contacts}
              emptyTitle="Nenhum contato cadastrado."
              getRowKey={(row) => (row as CustomerContact).id}
            />
          </TableContainer>
          <ContactQuickForm customerId={customer.id} onSaved={handleRefresh} />
        </div>
      )}

      {activeTab === 'contratos' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setContractModalOpen(true)}>
              <Plus className="size-4" /> Novo contrato
            </Button>
          </div>
          <TableContainer>
            <DataTable
              columns={[
                {id: 'number', header: 'Número', cell: (row) => (row as CustomerContract).contractNumber},
                {
                  id: 'status',
                  header: 'Status',
                  cell: (row) => (
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={getContractStatusVariant((row as CustomerContract).contractStatus)}>
                        {CUSTOMER_CONTRACT_STATUS_LABELS[(row as CustomerContract).contractStatus]}
                      </Badge>
                      {isContractExpiring((row as CustomerContract).endsAt) && <Badge variant="outline">Vencendo</Badge>}
                      {isContractExpired((row as CustomerContract).endsAt) && <Badge variant="destructive">Vencido</Badge>}
                    </div>
                  ),
                },
                {id: 'type', header: 'Tipo', cell: (row) => CUSTOMER_CONTRACT_TYPE_LABELS[(row as CustomerContract).contractType]},
                {id: 'vigencia', header: 'Vigência', cell: (row) => `${formatDateBr((row as CustomerContract).startsAt)} — ${formatDateBr((row as CustomerContract).endsAt)}`},
                {id: 'revenue', header: 'Receita', cell: (row) => formatCurrency((row as CustomerContract).contractedRevenue, (row as CustomerContract).currency)},
                {
                  id: 'actions',
                  header: '',
                  cell: (row) => (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm('Cancelar contrato?')) return;
                        await deleteCustomerContractAction(customer.id, (row as CustomerContract).id);
                        handleRefresh();
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ),
                },
              ]}
              data={contracts}
              emptyTitle="Nenhum contrato cadastrado."
              getRowKey={(row) => (row as CustomerContract).id}
            />
          </TableContainer>
        </div>
      )}

      {activeTab === 'documentos' && (
        <div className="space-y-4">
          <CustomerFileUpload companyId={companyId} customerId={customer.id} onUploaded={handleRefresh} />
          <TableContainer>
            <DataTable
              columns={[
                {id: 'name', header: 'Arquivo', cell: (row) => (
                  <a href={(row as CustomerDocument).fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {(row as CustomerDocument).name}
                  </a>
                )},
                {id: 'type', header: 'Tipo', cell: (row) => CUSTOMER_DOCUMENT_TYPE_LABELS[(row as CustomerDocument).documentType]},
                {id: 'date', header: 'Enviado em', cell: (row) => formatDateTime((row as CustomerDocument).createdAt)},
                {
                  id: 'actions',
                  header: '',
                  cell: (row) => (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm('Excluir documento?')) return;
                        await deleteCustomerDocumentAction(customer.id, (row as CustomerDocument).id);
                        handleRefresh();
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ),
                },
              ]}
              data={documents}
              emptyTitle="Nenhum documento enviado."
              getRowKey={(row) => (row as CustomerDocument).id}
            />
          </TableContainer>
        </div>
      )}

      {activeTab === 'historico' && (
        <TableContainer>
          <DataTable
            columns={[
              {id: 'action', header: 'Ação', cell: (row) => CUSTOMER_HISTORY_ACTION_LABELS[(row as CustomerHistory).action] ?? (row as CustomerHistory).action},
              {id: 'date', header: 'Data', cell: (row) => formatDateTime((row as CustomerHistory).createdAt)},
              {id: 'changes', header: 'Detalhes', cell: (row) => (
                <span className="text-xs text-muted-foreground">{JSON.stringify((row as CustomerHistory).changes).slice(0, 80)}</span>
              )},
            ]}
            data={history}
            emptyTitle="Nenhum histórico registrado."
            getRowKey={(row) => (row as CustomerHistory).id}
          />
        </TableContainer>
      )}

      {activeTab === 'financeiro' && (
        <TableContainer>
          <DataTable
            columns={[
              {id: 'date', header: 'Data', cell: (row) => formatDateBr((row as CustomerFinancialRecord).entryDate)},
              {id: 'type', header: 'Tipo', cell: (row) => (row as CustomerFinancialRecord).entryType},
              {id: 'desc', header: 'Descrição', cell: (row) => (row as CustomerFinancialRecord).description ?? '—'},
              {id: 'trip', header: 'Viagem', cell: (row) => (row as CustomerFinancialRecord).tripNumber ?? '—'},
              {id: 'amount', header: 'Valor', cell: (row) => formatCurrency((row as CustomerFinancialRecord).amount)},
            ]}
            data={financial}
            emptyTitle="Nenhum lançamento financeiro vinculado."
            getRowKey={(row) => (row as CustomerFinancialRecord).id}
          />
        </TableContainer>
      )}

      {activeTab === 'viagens' && (
        <TableContainer>
          <DataTable
            columns={[
              {
                id: 'number',
                header: 'Viagem',
                cell: (row) => (
                  <Link href={ROUTES.viagemDetail((row as CustomerTripRecord).id)} className="hover:underline">
                    {(row as CustomerTripRecord).tripNumber}
                  </Link>
                ),
              },
              {id: 'status', header: 'Status', cell: (row) => (row as CustomerTripRecord).tripStatus},
              {id: 'route', header: 'Rota', cell: (row) => `${(row as CustomerTripRecord).origin ?? '—'} → ${(row as CustomerTripRecord).destination ?? '—'}`},
              {id: 'contracted', header: 'Contratado', cell: (row) => formatCurrency((row as CustomerTripRecord).contractedFreightValue)},
              {id: 'actual', header: 'Realizado', cell: (row) => formatCurrency((row as CustomerTripRecord).actualFreightValue)},
              {id: 'margin', header: 'Margem', cell: (row) => formatCurrency((row as CustomerTripRecord).freightMargin)},
            ]}
            data={trips}
            emptyTitle="Nenhuma viagem vinculada."
            getRowKey={(row) => (row as CustomerTripRecord).id}
          />
        </TableContainer>
      )}

      {activeTab === 'integracoes' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {CUSTOMER_EXTENSION_REGISTRY.map((entry) => (
            <Card key={entry.provider}>
              <CardHeader>
                <CardTitle className="text-sm">{entry.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{entry.description}</p>
                <Badge variant="outline" className="mt-2">Preparado</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CustomerFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        customer={customer}
        branches={branches}
        onSaved={handleRefresh}
      />

      <ContractFormModal
        open={contractModalOpen}
        onClose={() => setContractModalOpen(false)}
        customerId={customer.id}
        onSaved={handleRefresh}
      />
    </PageTemplate>
  );
}

function AddressQuickForm({customerId, onSaved}: {customerId: string; onSaved: () => void}) {
  const [street, setStreet] = React.useState('');
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createCustomerAddressAction(customerId, {
      addressType: 'headquarters',
      street: street || null,
      city: city || null,
      state: state || null,
      isPrimary: true,
    });
    setStreet('');
    setCity('');
    setState('');
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 rounded-lg border p-3">
      <input className="h-9 flex-1 rounded-md border px-2 text-sm" placeholder="Rua" value={street} onChange={(e) => setStreet(e.target.value)} />
      <input className="h-9 w-32 rounded-md border px-2 text-sm" placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
      <input className="h-9 w-20 rounded-md border px-2 text-sm" placeholder="UF" value={state} onChange={(e) => setState(e.target.value)} />
      <Button type="submit" size="sm">Adicionar endereço</Button>
    </form>
  );
}

function ContactQuickForm({customerId, onSaved}: {customerId: string; onSaved: () => void}) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createCustomerContactAction(customerId, {name, email: email || null, isPrimary: false});
    setName('');
    setEmail('');
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 rounded-lg border p-3">
      <input className="h-9 flex-1 rounded-md border px-2 text-sm" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="h-9 flex-1 rounded-md border px-2 text-sm" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Button type="submit" size="sm">Adicionar contato</Button>
    </form>
  );
}

export {CustomerDetailView};
