import type {EntityStatus} from '@/features/organization/companies/types';

import type {SUPPLIER_CATEGORIES, SUPPLIER_DOCUMENT_TYPES} from '../constants/enums';

export type SupplierDocumentType = (typeof SUPPLIER_DOCUMENT_TYPES)[number];
export type SupplierCategory = (typeof SUPPLIER_CATEGORIES)[number];

export const SUPPLIER_DOCUMENT_TYPE_LABELS: Record<SupplierDocumentType, string> = {
  cnpj: 'CNPJ',
  cpf: 'CPF',
};

export const SUPPLIER_CATEGORY_LABELS: Record<SupplierCategory, string> = {
  posto: 'Posto',
  oficina: 'Oficina',
  auto_pecas: 'Auto Peças',
  pneus: 'Pneus',
  borracharia: 'Borracharia',
  guincho: 'Guincho',
  lavagem: 'Lavagem',
  eletrica: 'Elétrica',
  mecanica: 'Mecânica',
  lanternagem: 'Lanternagem',
  administrativo: 'Administrativo',
  outros: 'Outros',
};

export interface SupplierRow {
  id: string;
  company_id: string;
  corporate_name: string;
  trade_name: string | null;
  document: string | null;
  document_type: SupplierDocumentType | null;
  categories: SupplierCategory[] | null;
  phone: string | null;
  email: string | null;
  contact_name: string | null;
  zip_code: string | null;
  address: string | null;
  number: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  active: boolean;
  notes: string | null;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface Supplier {
  id: string;
  companyId: string;
  corporateName: string;
  tradeName: string | null;
  displayName: string;
  document: string | null;
  documentType: SupplierDocumentType | null;
  categories: SupplierCategory[];
  phone: string | null;
  email: string | null;
  contactName: string | null;
  zipCode: string | null;
  address: string | null;
  number: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  active: boolean;
  notes: string | null;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierSelectOption {
  id: string;
  displayName: string;
  corporateName: string;
  tradeName: string | null;
  document: string | null;
  categories: SupplierCategory[];
  city: string | null;
  state: string | null;
  active: boolean;
}

export interface SupplierListFilters {
  category?: SupplierCategory;
  city?: string;
  state?: string;
  active?: boolean;
}

export interface SupplierSortOptions {
  sortBy?: 'corporate_name' | 'trade_name' | 'city' | 'created_at' | 'active';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedSuppliers {
  items: Supplier[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** KPIs da ficha / aba Resumo Financeiro. */
export interface SupplierStats {
  totalSpent: number;
  totalRevenue: number;
  serviceCount: number;
  orderCount: number;
  averageOrderAmount: number;
  openPayables: number;
  paidPayables: number;
  openInstallments: number;
  paidInstallments: number;
  lastPurchaseAt: string | null;
  lastFuelAt: string | null;
  lastMaintenanceAt: string | null;
  maintenanceCount: number;
  fuelCount: number;
  tireCount: number;
}

export interface SupplierDetailData {
  supplier: Supplier;
  stats: SupplierStats;
  /** Estrutura preparada para histórico completo de serviços (evolução futura). */
  recentFinancial: SupplierFinancialSnippet[];
}

export interface SupplierFinancialSnippet {
  id: string;
  description: string | null;
  amount: number;
  entryDate: string;
  entryStatus: string;
  sourceModule: string | null;
}

/**
 * Placeholders de analytics — implementação futura.
 * @see get_supplier_analytics_placeholders
 */
export interface SupplierAnalyticsPlaceholders {
  companyId: string;
  ready: boolean;
  metrics: string[];
  note: string;
}
