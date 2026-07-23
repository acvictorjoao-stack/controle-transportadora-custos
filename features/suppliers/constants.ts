export const SUPPLIER_LIST_COLUMNS = `
  id, company_id, corporate_name, trade_name, document, document_type,
  categories, phone, email, contact_name, zip_code, address, number,
  district, city, state, active, notes, metadata, status,
  created_at, updated_at, deleted_at, created_by, updated_by
`;

export const SUPPLIER_DETAIL_COLUMNS = SUPPLIER_LIST_COLUMNS;

export const SUPPLIER_SELECT_COLUMNS = `
  id, company_id, corporate_name, trade_name, document, document_type,
  categories, phone, email, contact_name, city, state, active,
  status, created_at, updated_at
`;

export const SUPPLIERS_PAGE_SIZE = 10;

/** Categorias sugeridas no cadastro rápido por módulo de origem. */
export const SUPPLIER_DEFAULT_CATEGORIES_BY_MODULE = {
  maintenance: ['oficina'] as const,
  fuel: ['posto'] as const,
  tires: ['pneus'] as const,
  accounts_payable: ['administrativo'] as const,
} as const;
