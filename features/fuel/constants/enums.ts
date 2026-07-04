export const FUEL_DOCUMENT_TYPES = [
  'invoice',
  'receipt',
  'proof',
  'pump_photo',
  'other',
] as const;

export const FUEL_INCONSISTENCY_FLAGS = [
  'odometer_decrease',
  'odometer_missing',
  'amount_mismatch',
  'consumption_outlier',
  'future_date',
  'duplicate_same_day',
] as const;

/** Reuses vehicle_fuel_type from DB */
export const FUEL_TYPES = [
  'diesel',
  'gasoline',
  'ethanol',
  'flex',
  'gnv',
  'electric',
  'hybrid',
  'other',
] as const;
