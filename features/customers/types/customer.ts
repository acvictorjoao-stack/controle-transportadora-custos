import type {EntityStatus} from '@/features/organization/companies/types';

import type {
  CUSTOMER_ADDRESS_TYPES,
  CUSTOMER_CONTRACT_STATUSES,
  CUSTOMER_CONTRACT_TYPES,
  CUSTOMER_DOCUMENT_TYPES,
  CUSTOMER_READJUSTMENT_INDICES,
  CUSTOMER_SEGMENTS,
  CUSTOMER_STATUSES,
} from '../constants/enums';
import type {CustomerIntegrationSections} from './integrations';

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];
export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number];
export type CustomerAddressType = (typeof CUSTOMER_ADDRESS_TYPES)[number];
export type CustomerContractStatus = (typeof CUSTOMER_CONTRACT_STATUSES)[number];
export type CustomerContractType = (typeof CUSTOMER_CONTRACT_TYPES)[number];
export type CustomerReadjustmentIndex = (typeof CUSTOMER_READJUSTMENT_INDICES)[number];
export type CustomerDocumentType = (typeof CUSTOMER_DOCUMENT_TYPES)[number];

export interface CustomerRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  legal_name: string;
  trade_name: string | null;
  tax_id: string | null;
  state_registration: string | null;
  municipal_registration: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  customer_status: CustomerStatus;
  segment: CustomerSegment | null;
  notes: string | null;
  sales_representative: string | null;
  credit_limit: number | null;
  payment_term_days: number | null;
  external_id: string | null;
  integration_source: string | null;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  branches?: {id: string; name: string; code: string} | {id: string; name: string; code: string}[] | null;
}

export interface Customer {
  id: string;
  companyId: string;
  branchId: string | null;
  branchName: string | null;
  legalName: string;
  tradeName: string | null;
  displayName: string;
  taxId: string | null;
  stateRegistration: string | null;
  municipalRegistration: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  customerStatus: CustomerStatus;
  segment: CustomerSegment | null;
  notes: string | null;
  salesRepresentative: string | null;
  creditLimit: number | null;
  paymentTermDays: number | null;
  externalId: string | null;
  integrationSource: string | null;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  activeContractsCount?: number;
  primaryCity?: string | null;
  primaryState?: string | null;
}

export interface CustomerAddressRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  customer_id: string;
  address_type: CustomerAddressType;
  label: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string;
  is_primary: boolean;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  addressType: CustomerAddressType;
  label: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string;
  isPrimary: boolean;
  formattedAddress: string;
}

export interface CustomerContactRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  customer_id: string;
  name: string;
  job_title: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  is_primary: boolean;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface CustomerContact {
  id: string;
  customerId: string;
  name: string;
  jobTitle: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  isPrimary: boolean;
}

export interface CustomerContractRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  customer_id: string;
  contract_number: string;
  contract_status: CustomerContractStatus;
  starts_at: string | null;
  ends_at: string | null;
  contract_type: CustomerContractType;
  freight_table: string | null;
  currency: string;
  notes: string | null;
  readjustment_index: CustomerReadjustmentIndex;
  readjustment_notes: string | null;
  contracted_revenue: number;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface CustomerContract {
  id: string;
  companyId: string;
  customerId: string;
  contractNumber: string;
  contractStatus: CustomerContractStatus;
  startsAt: string | null;
  endsAt: string | null;
  contractType: CustomerContractType;
  freightTable: string | null;
  currency: string;
  notes: string | null;
  readjustmentIndex: CustomerReadjustmentIndex;
  readjustmentNotes: string | null;
  contractedRevenue: number;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  items?: CustomerContractItem[];
}

export interface CustomerContractItemRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  contract_id: string;
  origin: string | null;
  destination: string | null;
  freight_value: number | null;
  minimum_value: number | null;
  weight_kg: number | null;
  volume_m3: number | null;
  toll_included: boolean;
  gris_percent: number | null;
  insurance_percent: number | null;
  additional_value: number | null;
  delivery_days: number | null;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface CustomerContractItem {
  id: string;
  contractId: string;
  origin: string | null;
  destination: string | null;
  freightValue: number | null;
  minimumValue: number | null;
  weightKg: number | null;
  volumeM3: number | null;
  tollIncluded: boolean;
  grisPercent: number | null;
  insurancePercent: number | null;
  additionalValue: number | null;
  deliveryDays: number | null;
}

export interface CustomerDocumentRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  customer_id: string;
  contract_id: string | null;
  name: string;
  file_url: string;
  storage_path: string | null;
  document_type: CustomerDocumentType;
  mime_type: string | null;
  file_size: number | null;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface CustomerDocument {
  id: string;
  customerId: string;
  contractId: string | null;
  name: string;
  fileUrl: string;
  storagePath: string | null;
  documentType: CustomerDocumentType;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
}

export interface CustomerHistoryRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  customer_id: string;
  contract_id: string | null;
  action: string;
  changes: Record<string, unknown>;
  previous_customer_status: CustomerStatus | null;
  new_customer_status: CustomerStatus | null;
  previous_contract_status: CustomerContractStatus | null;
  new_contract_status: CustomerContractStatus | null;
  created_at: string;
  created_by: string | null;
}

export interface CustomerHistory {
  id: string;
  customerId: string;
  contractId: string | null;
  action: string;
  changes: Record<string, unknown>;
  previousCustomerStatus: CustomerStatus | null;
  newCustomerStatus: CustomerStatus | null;
  previousContractStatus: CustomerContractStatus | null;
  newContractStatus: CustomerContractStatus | null;
  createdAt: string;
  createdBy: string | null;
}

export interface PaginatedCustomers {
  items: Customer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CustomerListFilters {
  customerStatus?: CustomerStatus;
  segment?: CustomerSegment;
  hasActiveContract?: boolean;
  city?: string;
  state?: string;
  salesRepresentative?: string;
  branchId?: string;
}

export interface CustomerSortOptions {
  sortBy?: 'legal_name' | 'trade_name' | 'tax_id' | 'customer_status' | 'segment' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerTopEntry {
  customerId: string;
  customerName: string;
  totalRevenue: number;
  contractCount: number;
}

export interface CustomerTopContract {
  contractId: string;
  contractNumber: string;
  customerId: string;
  customerName: string;
  contractedRevenue: number;
  endsAt: string | null;
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  activeContracts: number;
  expiringContracts: number;
  expiredContracts: number;
  contractedRevenue: number;
  topCustomers: CustomerTopEntry[];
  topContracts: CustomerTopContract[];
}

export interface CustomerDetailData extends CustomerIntegrationSections {
  customer: Customer;
  addresses: CustomerAddress[];
  contacts: CustomerContact[];
  contracts: CustomerContract[];
  documents: CustomerDocument[];
  history: CustomerHistory[];
}

/** Alias for list row payloads. */
export type CustomerListItem = Customer;

/** Alias for the detail page aggregate payload. */
export type CustomerDetail = CustomerDetailData;

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  prospect: 'Prospect',
  blocked: 'Bloqueado',
};

export const CUSTOMER_SEGMENT_LABELS: Record<CustomerSegment, string> = {
  industrial: 'Industrial',
  commercial: 'Comercial',
  retail: 'Varejo',
  services: 'Serviços',
  agribusiness: 'Agro',
  other: 'Outro',
};

export const CUSTOMER_ADDRESS_TYPE_LABELS: Record<CustomerAddressType, string> = {
  delivery: 'Entrega',
  pickup: 'Coleta',
  billing: 'Cobrança',
  headquarters: 'Matriz',
  branch: 'Filial',
};

export const CUSTOMER_CONTRACT_STATUS_LABELS: Record<CustomerContractStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  suspended: 'Suspenso',
  expired: 'Vencido',
  cancelled: 'Cancelado',
  renewed: 'Renovado',
};

export const CUSTOMER_CONTRACT_TYPE_LABELS: Record<CustomerContractType, string> = {
  spot: 'Spot',
  dedicated: 'Dedicado',
  distribution: 'Distribuição',
  milk_run: 'Milk Run',
  other: 'Outro',
};

export const CUSTOMER_READJUSTMENT_INDEX_LABELS: Record<CustomerReadjustmentIndex, string> = {
  none: 'Sem reajuste',
  ipca: 'IPCA',
  igpm: 'IGP-M',
  inpc: 'INPC',
  diesel: 'Diesel',
  custom: 'Personalizado',
};

export const CUSTOMER_DOCUMENT_TYPE_LABELS: Record<CustomerDocumentType, string> = {
  contract: 'Contrato',
  addendum: 'Aditivo',
  power_of_attorney: 'Procuração',
  documentation: 'Documentação',
  other: 'Outros',
};

export const CUSTOMER_HISTORY_ACTION_LABELS: Record<string, string> = {
  create: 'Cadastro',
  update: 'Edição',
  delete: 'Exclusão',
  status_change: 'Mudança de status',
  contract_create: 'Novo contrato',
  contract_renewal: 'Renovação',
  contract_cancel: 'Cancelamento',
  contract_status_change: 'Status do contrato',
  document_upload: 'Upload',
};
