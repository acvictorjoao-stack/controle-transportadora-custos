import {COMPANY_LOGOS_STORAGE_BUCKET} from '@/lib/storage/buckets';
import {buildStorageFileUrl} from '@/lib/storage/private-files';

import {mapCompanySettings} from '../../settings/services/settings-mapper';
import type {CompanyProfile, CompanyProfileRow} from '../types';

export function mapCompanyProfileRow(row: CompanyProfileRow): CompanyProfile {
  return {
    id: row.id,
    legalName: row.legal_name,
    tradeName: row.trade_name,
    taxId: row.tax_id,
    slug: row.slug,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    website: row.website,
    stateRegistration: row.state_registration,
    municipalRegistration: row.municipal_registration,
    addressStreet: row.address_street,
    addressNumber: row.address_number,
    addressComplement: row.address_complement,
    addressNeighborhood: row.address_neighborhood,
    addressCity: row.address_city,
    addressState: row.address_state,
    addressZip: row.address_zip,
    addressCountry: row.address_country,
    logoUrl: buildStorageFileUrl(COMPANY_LOGOS_STORAGE_BUCKET, row.logo_url, row.updated_at),
    settings: mapCompanySettings(row.settings),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
