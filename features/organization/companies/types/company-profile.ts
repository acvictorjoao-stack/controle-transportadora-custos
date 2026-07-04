import type {CompanySettings} from '../../settings/types';

export type EntityStatus = 'active' | 'inactive' | 'blocked' | 'archived';

export interface CompanyProfileRow {
  id: string;
  legal_name: string;
  trade_name: string | null;
  tax_id: string;
  slug: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  state_registration: string | null;
  municipal_registration: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  address_country: string | null;
  logo_url: string | null;
  settings: unknown;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

export interface CompanyProfile {
  id: string;
  legalName: string;
  tradeName: string | null;
  taxId: string;
  slug: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  stateRegistration: string | null;
  municipalRegistration: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  addressCountry: string | null;
  logoUrl: string | null;
  settings: CompanySettings;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}
