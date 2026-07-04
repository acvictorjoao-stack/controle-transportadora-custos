import type {
  Customer,
  CustomerAddress,
  CustomerAddressRow,
  CustomerContact,
  CustomerContactRow,
  CustomerContract,
  CustomerContractItem,
  CustomerContractItemRow,
  CustomerContractRow,
  CustomerDocument,
  CustomerDocumentRow,
  CustomerHistory,
  CustomerHistoryRow,
  CustomerRow,
} from '../types/customer';

function mapBranchName(row: CustomerRow): string | null {
  const branch = row.branches;
  if (!branch) return null;
  if (Array.isArray(branch)) return branch[0]?.name ?? null;
  return branch.name ?? null;
}

function formatAddress(row: CustomerAddressRow): string {
  const parts = [
    row.street,
    row.number,
    row.complement,
    row.neighborhood,
    row.city,
    row.state,
    row.zip_code,
  ].filter(Boolean);
  return parts.join(', ') || '—';
}

export function mapCustomerRow(row: CustomerRow): Customer {
  return {
    id: row.id,
    companyId: row.company_id,
    branchId: row.branch_id,
    branchName: mapBranchName(row),
    legalName: row.legal_name,
    tradeName: row.trade_name,
    displayName: row.trade_name?.trim() || row.legal_name,
    taxId: row.tax_id,
    stateRegistration: row.state_registration,
    municipalRegistration: row.municipal_registration,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    website: row.website,
    customerStatus: row.customer_status,
    segment: row.segment,
    notes: row.notes,
    salesRepresentative: row.sales_representative,
    creditLimit: row.credit_limit !== null ? Number(row.credit_limit) : null,
    paymentTermDays: row.payment_term_days,
    externalId: row.external_id ?? null,
    integrationSource: row.integration_source ?? null,
    metadata: row.metadata ?? {},
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCustomerAddressRow(row: CustomerAddressRow): CustomerAddress {
  return {
    id: row.id,
    customerId: row.customer_id,
    addressType: row.address_type,
    label: row.label,
    street: row.street,
    number: row.number,
    complement: row.complement,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    country: row.country,
    isPrimary: row.is_primary,
    formattedAddress: formatAddress(row),
  };
}

export function mapCustomerContactRow(row: CustomerContactRow): CustomerContact {
  return {
    id: row.id,
    customerId: row.customer_id,
    name: row.name,
    jobTitle: row.job_title,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    isPrimary: row.is_primary,
  };
}

export function mapCustomerContractRow(row: CustomerContractRow): CustomerContract {
  return {
    id: row.id,
    companyId: row.company_id,
    customerId: row.customer_id,
    contractNumber: row.contract_number,
    contractStatus: row.contract_status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    contractType: row.contract_type,
    freightTable: row.freight_table,
    currency: row.currency,
    notes: row.notes,
    readjustmentIndex: row.readjustment_index,
    readjustmentNotes: row.readjustment_notes,
    contractedRevenue: Number(row.contracted_revenue ?? 0),
    metadata: row.metadata ?? {},
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCustomerContractItemRow(row: CustomerContractItemRow): CustomerContractItem {
  return {
    id: row.id,
    contractId: row.contract_id,
    origin: row.origin,
    destination: row.destination,
    freightValue: row.freight_value !== null ? Number(row.freight_value) : null,
    minimumValue: row.minimum_value !== null ? Number(row.minimum_value) : null,
    weightKg: row.weight_kg !== null ? Number(row.weight_kg) : null,
    volumeM3: row.volume_m3 !== null ? Number(row.volume_m3) : null,
    tollIncluded: row.toll_included,
    grisPercent: row.gris_percent !== null ? Number(row.gris_percent) : null,
    insurancePercent: row.insurance_percent !== null ? Number(row.insurance_percent) : null,
    additionalValue: row.additional_value !== null ? Number(row.additional_value) : null,
    deliveryDays: row.delivery_days,
  };
}

export function mapCustomerDocumentRow(row: CustomerDocumentRow): CustomerDocument {
  return {
    id: row.id,
    customerId: row.customer_id,
    contractId: row.contract_id,
    name: row.name,
    fileUrl: row.file_url,
    storagePath: row.storage_path ?? null,
    documentType: row.document_type,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
  };
}

export function mapCustomerHistoryRow(row: CustomerHistoryRow): CustomerHistory {
  return {
    id: row.id,
    customerId: row.customer_id,
    contractId: row.contract_id,
    action: row.action,
    changes: row.changes ?? {},
    previousCustomerStatus: row.previous_customer_status,
    newCustomerStatus: row.new_customer_status,
    previousContractStatus: row.previous_contract_status,
    newContractStatus: row.new_contract_status,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}
