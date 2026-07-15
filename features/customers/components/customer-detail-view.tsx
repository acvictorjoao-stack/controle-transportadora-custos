'use client';

import {ArrowLeft, Pencil, Plus, RefreshCw, Trash2} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import * as React from 'react';

import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {PageTemplate} from '@/components/layout/page-template';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {useConfirm} from '@/contexts/feedback/confirm-context';
import {ROUTES} from '@/constants/routes/paths';
import type {BranchSelectOption} from '@/features/organization/branches/types';
import {CUSTOMER_EXTENSION_REGISTRY} from '@/features/customers/types/integrations';
import {MSG} from '@/lib/feedback/messages';

import {
  createCustomerAddressAction,
  createCustomerContactAction,
  deleteCustomerAddressAction,
  deleteCustomerContactAction,
  deleteCustomerContractAction,
  deleteCustomerDocumentAction,
  updateCustomerAddressAction,
  updateCustomerContactAction,
} from '../actions';
import {CUSTOMER_ADDRESS_TYPES} from '../constants/enums';
import type {CustomerTripRecord, CustomerFinancialRecord} from '../types/integrations';
import type {
  CustomerDetailData,
  CustomerAddress,
  CustomerAddressType,
  CustomerContact,
  CustomerContract,
  CustomerDocument,
  CustomerHistory,
} from '../types';
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
  formatPhone,
  formatPhoneInput,
  formatZipCode,
  formatZipCodeInput,
  getContractStatusVariant,
  getCustomerStatusVariant,
  isContractExpired,
  isContractExpiring,
  normalizePhoneDigits,
  normalizeZipCodeDigits,
} from '../utils/customer-format';
import {formatStateRegistration} from '../utils/state-registration';
import type {CustomerAddressInput, CustomerContactInput} from '../validation';
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
  {id: 'dados', label: 'Dados Gerais'},
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
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = React.useState<TabId>('resumo');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [contractModalOpen, setContractModalOpen] = React.useState(false);
  const [editingContract, setEditingContract] = React.useState<CustomerContract | null>(null);
  const [editingAddress, setEditingAddress] = React.useState<string | null>(null);
  const [editingContact, setEditingContact] = React.useState<string | null>(null);
  const [replacingDocument, setReplacingDocument] = React.useState<CustomerDocument | null>(null);
  const {customer, addresses, contacts, contracts, documents, history, trips, financial} = data;

  const activeContracts = contracts.filter((c) => c.contractStatus === 'active');
  const totalContractedRevenue = activeContracts.reduce((sum, c) => sum + c.contractedRevenue, 0);
  const ieStateUf =
    addresses.find((address) => address.isPrimary)?.state ??
    addresses[0]?.state ??
    null;

  function handleRefresh() {
    router.refresh();
  }

  const infoRows = [
    ['Razão Social', customer.legalName],
    ['Nome Fantasia', customer.tradeName ?? '—'],
    ['CNPJ', formatCnpj(customer.taxId)],
    ['IE', formatStateRegistration(customer.stateRegistration, ieStateUf)],
    ['IM', customer.municipalRegistration ?? '—'],
    ['E-mail', customer.email ?? '—'],
    ['Telefone', formatPhone(customer.phone)],
    ['WhatsApp', formatPhone(customer.whatsapp)],
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
              {infoRows
                .filter(([, value]) => value !== '—' && value !== null && value !== undefined)
                .map(([label, value]) => (
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
                {id: 'zip', header: 'CEP', cell: (row) => formatZipCode((row as CustomerAddress).zipCode)},
                {id: 'street', header: 'Rua', cell: (row) => (row as CustomerAddress).street ?? '—'},
                {id: 'number', header: 'Número', cell: (row) => (row as CustomerAddress).number ?? '—'},
                {id: 'complement', header: 'Complemento', cell: (row) => (row as CustomerAddress).complement ?? '—'},
                {id: 'neighborhood', header: 'Bairro', cell: (row) => (row as CustomerAddress).neighborhood ?? '—'},
                {id: 'city', header: 'Cidade', cell: (row) => (row as CustomerAddress).city ?? '—'},
                {id: 'state', header: 'UF', cell: (row) => (row as CustomerAddress).state ?? '—'},
                {id: 'primary', header: 'Principal', cell: (row) => ((row as CustomerAddress).isPrimary ? 'Sim' : '—')},
                {
                  id: 'actions',
                  header: '',
                  cell: (row) => (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingAddress((row as CustomerAddress).id)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: MSG.deleteConfirmTitle,
                            description: MSG.deleteConfirmDescription,
                            confirmLabel: MSG.deleteConfirmLabel,
                            variant: 'destructive',
                          });
                          if (!confirmed) return;
                          await deleteCustomerAddressAction(customer.id, (row as CustomerAddress).id);
                          handleRefresh();
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={addresses}
              emptyTitle="Nenhum endereço cadastrado."
              getRowKey={(row) => (row as CustomerAddress).id}
            />
          </TableContainer>
          <AddressForm
            key={editingAddress ?? 'new'}
            customerId={customer.id}
            address={editingAddress ? addresses.find((a) => a.id === editingAddress) ?? null : null}
            onCancel={() => setEditingAddress(null)}
            onSaved={() => {
              setEditingAddress(null);
              handleRefresh();
            }}
          />
        </div>
      )}

      {activeTab === 'contatos' && (
        <div className="space-y-4">
          <TableContainer>
            <DataTable
              columns={[
                {id: 'name', header: 'Nome', cell: (row) => (row as CustomerContact).name},
                {id: 'job', header: 'Cargo', cell: (row) => (row as CustomerContact).jobTitle ?? '—'},
                {id: 'phone', header: 'Telefone', cell: (row) => formatPhone((row as CustomerContact).phone)},
                {id: 'whatsapp', header: 'WhatsApp', cell: (row) => formatPhone((row as CustomerContact).whatsapp)},
                {id: 'email', header: 'E-mail', cell: (row) => (row as CustomerContact).email ?? '—'},
                {id: 'primary', header: 'Principal', cell: (row) => ((row as CustomerContact).isPrimary ? 'Sim' : '—')},
                {
                  id: 'actions',
                  header: '',
                  cell: (row) => (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingContact((row as CustomerContact).id)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: MSG.deleteConfirmTitle,
                            description: MSG.deleteConfirmDescription,
                            confirmLabel: MSG.deleteConfirmLabel,
                            variant: 'destructive',
                          });
                          if (!confirmed) return;
                          await deleteCustomerContactAction(customer.id, (row as CustomerContact).id);
                          handleRefresh();
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={contacts}
              emptyTitle="Nenhum contato cadastrado."
              getRowKey={(row) => (row as CustomerContact).id}
            />
          </TableContainer>
          <ContactForm
            key={editingContact ?? 'new'}
            customerId={customer.id}
            contact={editingContact ? contacts.find((c) => c.id === editingContact) ?? null : null}
            onCancel={() => setEditingContact(null)}
            onSaved={() => {
              setEditingContact(null);
              handleRefresh();
            }}
          />
        </div>
      )}

      {activeTab === 'contratos' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                setEditingContract(null);
                setContractModalOpen(true);
              }}
            >
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
                {id: 'freightTable', header: 'Tabela', cell: (row) => (row as CustomerContract).freightTable ?? '—'},
                {id: 'vigencia', header: 'Vigência', cell: (row) => `${formatDateBr((row as CustomerContract).startsAt)} — ${formatDateBr((row as CustomerContract).endsAt)}`},
                {id: 'revenue', header: 'Receita', cell: (row) => formatCurrency((row as CustomerContract).contractedRevenue, (row as CustomerContract).currency)},
                {id: 'readjustment', header: 'Reajuste', cell: (row) => CUSTOMER_READJUSTMENT_INDEX_LABELS[(row as CustomerContract).readjustmentIndex]},
                {
                  id: 'actions',
                  header: '',
                  cell: (row) => (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingContract(row as CustomerContract);
                          setContractModalOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: 'Cancelar contrato',
                            description: 'Deseja realmente cancelar este contrato?',
                            confirmLabel: 'Cancelar contrato',
                            variant: 'destructive',
                          });
                          if (!confirmed) return;
                          await deleteCustomerContractAction(customer.id, (row as CustomerContract).id);
                          handleRefresh();
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
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
          <CustomerFileUpload
            companyId={companyId}
            customerId={customer.id}
            replacingDocument={replacingDocument}
            onCancelReplace={() => setReplacingDocument(null)}
            onUploaded={() => {
              setReplacingDocument(null);
              handleRefresh();
            }}
          />
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
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReplacingDocument(row as CustomerDocument)}
                      >
                        <RefreshCw className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: MSG.deleteDocumentTitle,
                            description: MSG.deleteDocumentDescription,
                            confirmLabel: MSG.deleteConfirmLabel,
                            variant: 'destructive',
                          });
                          if (!confirmed) return;
                          await deleteCustomerDocumentAction(customer.id, (row as CustomerDocument).id);
                          handleRefresh();
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
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
        ieStateUf={ieStateUf}
      />

      <ContractFormModal
        open={contractModalOpen}
        onClose={() => {
          setContractModalOpen(false);
          setEditingContract(null);
        }}
        customerId={customer.id}
        contract={editingContract}
        onSaved={() => {
          setEditingContract(null);
          handleRefresh();
        }}
      />
    </PageTemplate>
  );
}

function emptyAddressForm(): CustomerAddressInput {
  return {
    addressType: 'headquarters',
    label: null,
    street: null,
    number: null,
    complement: null,
    neighborhood: null,
    city: null,
    state: null,
    zipCode: null,
    country: 'BR',
    isPrimary: false,
  };
}

function addressToForm(address: CustomerAddress): CustomerAddressInput {
  return {
    addressType: address.addressType,
    label: address.label,
    street: address.street,
    number: address.number,
    complement: address.complement,
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
    country: address.country,
    isPrimary: address.isPrimary,
  };
}

function AddressForm({
  customerId,
  address,
  onCancel,
  onSaved,
}: {
  customerId: string;
  address: CustomerAddress | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(address);
  const [form, setForm] = React.useState<CustomerAddressInput>(() =>
    address ? addressToForm(address) : emptyAddressForm(),
  );
  const [submitting, setSubmitting] = React.useState(false);

  function updateField<K extends keyof CustomerAddressInput>(field: K, value: CustomerAddressInput[K]) {
    setForm((prev) => ({...prev, [field]: value}));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload: CustomerAddressInput = {
      ...form,
      street: form.street?.toUpperCase() ?? null,
      complement: form.complement?.toUpperCase() ?? null,
      neighborhood: form.neighborhood?.toUpperCase() ?? null,
      city: form.city?.toUpperCase() ?? null,
      state: form.state?.toUpperCase() ?? null,
      label: form.label?.toUpperCase() ?? null,
    };

    if (isEdit && address) {
      await updateCustomerAddressAction(customerId, address.id, payload);
    } else {
      await createCustomerAddressAction(customerId, payload);
    }

    setSubmitting(false);
    if (!isEdit) setForm(emptyAddressForm());
    onSaved();
  }

  const inputClass = 'h-9 rounded-md border px-2 text-sm';

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-3">
      <p className="text-sm font-medium">{isEdit ? 'Editar endereço' : 'Adicionar endereço'}</p>
      <div className="grid gap-2 md:grid-cols-4">
        <select
          className={inputClass}
          value={form.addressType}
          onChange={(e) => updateField('addressType', e.target.value as CustomerAddressType)}
        >
          {CUSTOMER_ADDRESS_TYPES.map((type) => (
            <option key={type} value={type}>{CUSTOMER_ADDRESS_TYPE_LABELS[type]}</option>
          ))}
        </select>
        <input
          className={inputClass}
          placeholder="CEP"
          inputMode="numeric"
          value={formatZipCodeInput(form.zipCode)}
          onChange={(e) => updateField('zipCode', normalizeZipCodeDigits(e.target.value))}
          maxLength={9}
        />
        <input
          className={`${inputClass} md:col-span-2`}
          placeholder="Rua"
          value={form.street ?? ''}
          onChange={(e) => updateField('street', e.target.value.toUpperCase() || null)}
        />
        <input
          className={inputClass}
          placeholder="Número"
          value={form.number ?? ''}
          onChange={(e) => updateField('number', e.target.value || null)}
        />
        <input
          className={inputClass}
          placeholder="Complemento"
          value={form.complement ?? ''}
          onChange={(e) => updateField('complement', e.target.value.toUpperCase() || null)}
        />
        <input
          className={inputClass}
          placeholder="Bairro"
          value={form.neighborhood ?? ''}
          onChange={(e) => updateField('neighborhood', e.target.value.toUpperCase() || null)}
        />
        <input
          className={inputClass}
          placeholder="Cidade"
          value={form.city ?? ''}
          onChange={(e) => updateField('city', e.target.value.toUpperCase() || null)}
        />
        <input
          className={inputClass}
          placeholder="UF"
          value={form.state ?? ''}
          onChange={(e) => updateField('state', e.target.value.toUpperCase() || null)}
          maxLength={2}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isPrimary ?? false}
            onChange={(e) => updateField('isPrimary', e.target.checked)}
          />
          Endereço principal
        </label>
      </div>
      <div className="flex gap-2">
        {isEdit && (
          <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" size="sm" disabled={submitting}>
          {isEdit ? 'Salvar endereço' : 'Adicionar endereço'}
        </Button>
      </div>
    </form>
  );
}

function emptyContactForm(): CustomerContactInput {
  return {
    name: '',
    jobTitle: null,
    phone: null,
    whatsapp: null,
    email: null,
    isPrimary: false,
  };
}

function contactToForm(contact: CustomerContact): CustomerContactInput {
  return {
    name: contact.name,
    jobTitle: contact.jobTitle,
    phone: contact.phone,
    whatsapp: contact.whatsapp,
    email: contact.email,
    isPrimary: contact.isPrimary,
  };
}

function ContactForm({
  customerId,
  contact,
  onCancel,
  onSaved,
}: {
  customerId: string;
  contact: CustomerContact | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(contact);
  const [form, setForm] = React.useState<CustomerContactInput>(() =>
    contact ? contactToForm(contact) : emptyContactForm(),
  );
  const [submitting, setSubmitting] = React.useState(false);

  function updateField<K extends keyof CustomerContactInput>(field: K, value: CustomerContactInput[K]) {
    setForm((prev) => ({...prev, [field]: value}));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);

    if (isEdit && contact) {
      await updateCustomerContactAction(customerId, contact.id, form);
    } else {
      await createCustomerContactAction(customerId, form);
    }

    setSubmitting(false);
    if (!isEdit) setForm(emptyContactForm());
    onSaved();
  }

  const inputClass = 'h-9 rounded-md border px-2 text-sm';

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-3">
      <p className="text-sm font-medium">{isEdit ? 'Editar contato' : 'Adicionar contato'}</p>
      <div className="grid gap-2 md:grid-cols-3">
        <input
          className={inputClass}
          placeholder="Nome"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          required
        />
        <input
          className={inputClass}
          placeholder="Cargo"
          value={form.jobTitle ?? ''}
          onChange={(e) => updateField('jobTitle', e.target.value || null)}
        />
        <input
          className={inputClass}
          placeholder="E-mail"
          type="email"
          value={form.email ?? ''}
          onChange={(e) => updateField('email', e.target.value || null)}
        />
        <input
          className={inputClass}
          placeholder="Telefone"
          inputMode="numeric"
          value={formatPhoneInput(form.phone)}
          onChange={(e) => updateField('phone', normalizePhoneDigits(e.target.value))}
          maxLength={15}
        />
        <input
          className={inputClass}
          placeholder="WhatsApp"
          inputMode="numeric"
          value={formatPhoneInput(form.whatsapp)}
          onChange={(e) => updateField('whatsapp', normalizePhoneDigits(e.target.value))}
          maxLength={15}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isPrimary ?? false}
            onChange={(e) => updateField('isPrimary', e.target.checked)}
          />
          Contato principal
        </label>
      </div>
      <div className="flex gap-2">
        {isEdit && (
          <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" size="sm" disabled={submitting}>
          {isEdit ? 'Salvar contato' : 'Adicionar contato'}
        </Button>
      </div>
    </form>
  );
}

export {CustomerDetailView};
