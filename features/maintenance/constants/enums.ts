export const MAINTENANCE_TYPES = [
  'preventive',
  'corrective',
  'emergency',
  'warranty',
  'review',
  'oil_change',
  'brakes',
  'suspension',
  'engine',
  'electrical',
  'cooling',
  'transmission',
  'tires',
  'other',
] as const;

export const MAINTENANCE_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

export const MAINTENANCE_STATUSES = [
  'open',
  'in_progress',
  'waiting_parts',
  'completed',
  'cancelled',
] as const;

export const MAINTENANCE_DOCUMENT_TYPES = [
  'budget',
  'invoice',
  'photo',
  'service_order',
  'report',
  'other',
] as const;

export const MAINTENANCE_SCHEDULE_TYPES = ['oil_change', 'review', 'preventive'] as const;

export const MAINTENANCE_ALERT_TYPES = ['km', 'date', 'hour_meter'] as const;
