import type {EntityStatus} from '@/features/organization/companies/types';

import type {
  DRIVER_CONTRACT_TYPES,
  DRIVER_DOCUMENT_TYPES,
  DRIVER_LICENSE_CATEGORIES,
  DRIVER_OPERATIONAL_STATUSES,
} from '../constants/enums';
import type {DriverIntegrationSections} from './integrations';

export type DriverOperationalStatus = (typeof DRIVER_OPERATIONAL_STATUSES)[number];

export type DriverLicenseCategory = (typeof DRIVER_LICENSE_CATEGORIES)[number];

export type DriverContractType = (typeof DRIVER_CONTRACT_TYPES)[number];

export type DriverDocumentType = (typeof DRIVER_DOCUMENT_TYPES)[number];

export interface DriverRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  name: string;
  cpf: string;
  rg: string | null;
  cnh_number: string;
  license_category: DriverLicenseCategory;
  license_issued_at: string | null;
  license_expires_at: string | null;
  ear: boolean;
  birth_date: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  zip_code: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  photo_url: string | null;
  photo_storage_path: string | null;
  operational_status: DriverOperationalStatus;
  hired_at: string | null;
  terminated_at: string | null;
  contract_type: DriverContractType | null;
  emergency_contact: string | null;
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

export interface Driver {
  id: string;
  companyId: string;
  branchId: string | null;
  branchName: string | null;
  name: string;
  cpf: string;
  rg: string | null;
  cnhNumber: string;
  licenseCategory: DriverLicenseCategory;
  licenseIssuedAt: string | null;
  licenseExpiresAt: string | null;
  ear: boolean;
  birthDate: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  zipCode: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  photoUrl: string | null;
  photoStoragePath: string | null;
  operationalStatus: DriverOperationalStatus;
  hiredAt: string | null;
  terminatedAt: string | null;
  contractType: DriverContractType | null;
  emergencyContact: string | null;
  externalId: string | null;
  integrationSource: string | null;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export type DriverSelectOption = Pick<
  Driver,
  'id' | 'name' | 'phone' | 'cnhNumber' | 'licenseCategory' | 'branchName'
>;

export interface DriverHistoryRow {
  id: string;
  company_id: string;
  driver_id: string;
  action: string;
  changes: Record<string, unknown>;
  previous_operational_status: DriverOperationalStatus | null;
  new_operational_status: DriverOperationalStatus | null;
  created_at: string;
  created_by: string | null;
}

export interface DriverHistory {
  id: string;
  driverId: string;
  action: string;
  changes: Record<string, unknown>;
  previousOperationalStatus: DriverOperationalStatus | null;
  newOperationalStatus: DriverOperationalStatus | null;
  createdAt: string;
  createdBy: string | null;
}

export interface DriverDocumentRow {
  id: string;
  company_id: string;
  driver_id: string;
  name: string;
  file_url: string;
  storage_path: string | null;
  document_type: DriverDocumentType;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  deleted_at: string | null;
  created_by: string | null;
}

export interface DriverDocument {
  id: string;
  driverId: string;
  name: string;
  fileUrl: string;
  storagePath: string | null;
  documentType: DriverDocumentType;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
}

export interface PaginatedDrivers {
  items: Driver[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DriverListFilters {
  operationalStatus?: DriverOperationalStatus;
  branchId?: string;
  licenseCategory?: DriverLicenseCategory;
  contractType?: DriverContractType;
  cnhExpiring?: boolean;
  cnhExpired?: boolean;
  earPending?: boolean;
}

export interface DriverSortOptions {
  sortBy?: 'name' | 'cpf' | 'cnh_number' | 'license_expires_at' | 'operational_status' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface DriverBranchStats {
  branchId: string | null;
  branchName: string;
  total: number;
  active: number;
}

export interface DriverStats {
  total: number;
  active: number;
  inactive: number;
  cnhExpiring: number;
  cnhExpired: number;
  earPending: number;
  byBranch: DriverBranchStats[];
}

export interface DriverDetailData extends DriverIntegrationSections {
  driver: Driver;
  history: DriverHistory[];
  documents: DriverDocument[];
}

export const DRIVER_OPERATIONAL_STATUS_LABELS: Record<DriverOperationalStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
};

export const DRIVER_LICENSE_CATEGORY_LABELS: Record<DriverLicenseCategory, string> = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  E: 'E',
  AB: 'AB',
  AC: 'AC',
  AD: 'AD',
  AE: 'AE',
};

export const DRIVER_CONTRACT_TYPE_LABELS: Record<DriverContractType, string> = {
  clt: 'CLT',
  pj: 'PJ',
  autonomo: 'Autônomo',
  agregado: 'Agregado',
  terceiro: 'Terceiro',
};

export const DRIVER_DOCUMENT_TYPE_LABELS: Record<DriverDocumentType, string> = {
  photo: 'Foto',
  cnh_front: 'CNH (frente)',
  cnh_back: 'CNH (verso)',
  proof: 'Comprovante',
  aso: 'ASO',
  document: 'Documento adicional',
};

export const DRIVER_HISTORY_ACTION_LABELS: Record<string, string> = {
  create: 'Cadastro',
  update: 'Edição',
  status_change: 'Mudança de status',
  branch_change: 'Troca de filial',
  document_upload: 'Upload de documento',
  delete: 'Exclusão',
};
