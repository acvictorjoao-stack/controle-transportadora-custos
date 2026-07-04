import type {
  Driver,
  DriverDocument,
  DriverDocumentRow,
  DriverHistory,
  DriverHistoryRow,
  DriverRow,
} from '../types';

function mapBranchName(row: DriverRow): string | null {
  const branch = row.branches;
  if (!branch) return null;
  if (Array.isArray(branch)) {
    return branch[0]?.name ?? null;
  }
  return branch.name ?? null;
}

export function mapDriverRow(row: DriverRow): Driver {
  return {
    id: row.id,
    companyId: row.company_id,
    branchId: row.branch_id,
    branchName: mapBranchName(row),
    name: row.name,
    cpf: row.cpf,
    rg: row.rg,
    cnhNumber: row.cnh_number,
    licenseCategory: row.license_category,
    licenseIssuedAt: row.license_issued_at,
    licenseExpiresAt: row.license_expires_at,
    ear: row.ear,
    birthDate: row.birth_date,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    address: row.address,
    zipCode: row.zip_code,
    city: row.city,
    state: row.state,
    notes: row.notes,
    photoUrl: row.photo_url,
    photoStoragePath: row.photo_storage_path ?? null,
    operationalStatus: row.operational_status,
    hiredAt: row.hired_at,
    terminatedAt: row.terminated_at,
    contractType: row.contract_type,
    emergencyContact: row.emergency_contact,
    externalId: row.external_id ?? null,
    integrationSource: row.integration_source ?? null,
    metadata: row.metadata ?? {},
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDriverHistoryRow(row: DriverHistoryRow): DriverHistory {
  return {
    id: row.id,
    driverId: row.driver_id,
    action: row.action,
    changes: row.changes ?? {},
    previousOperationalStatus: row.previous_operational_status,
    newOperationalStatus: row.new_operational_status,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

export function mapDriverDocumentRow(row: DriverDocumentRow): DriverDocument {
  return {
    id: row.id,
    driverId: row.driver_id,
    name: row.name,
    fileUrl: row.file_url,
    storagePath: row.storage_path ?? null,
    documentType: row.document_type,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
  };
}
