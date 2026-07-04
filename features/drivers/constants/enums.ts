export const DRIVER_OPERATIONAL_STATUSES = ['active', 'inactive'] as const;

export const DRIVER_LICENSE_CATEGORIES = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'AB',
  'AC',
  'AD',
  'AE',
] as const;

export const DRIVER_CONTRACT_TYPES = [
  'clt',
  'pj',
  'autonomo',
  'agregado',
  'terceiro',
] as const;

export const DRIVER_DOCUMENT_TYPES = [
  'photo',
  'cnh_front',
  'cnh_back',
  'proof',
  'aso',
  'document',
] as const;
