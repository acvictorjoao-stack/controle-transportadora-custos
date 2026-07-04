export const CUSTOMER_STATUSES = ['active', 'inactive', 'prospect', 'blocked'] as const;

export const CUSTOMER_SEGMENTS = [
  'industrial',
  'commercial',
  'retail',
  'services',
  'agribusiness',
  'other',
] as const;

export const CUSTOMER_ADDRESS_TYPES = [
  'delivery',
  'pickup',
  'billing',
  'headquarters',
  'branch',
] as const;

export const CUSTOMER_CONTRACT_STATUSES = [
  'draft',
  'active',
  'suspended',
  'expired',
  'cancelled',
  'renewed',
] as const;

export const CUSTOMER_CONTRACT_TYPES = [
  'spot',
  'dedicated',
  'distribution',
  'milk_run',
  'other',
] as const;

export const CUSTOMER_READJUSTMENT_INDICES = [
  'none',
  'ipca',
  'igpm',
  'inpc',
  'diesel',
  'custom',
] as const;

export const CUSTOMER_DOCUMENT_TYPES = [
  'contract',
  'addendum',
  'power_of_attorney',
  'documentation',
  'other',
] as const;
