export const TIRE_STATUSES = [
  'in_stock',
  'installed',
  'in_retread',
  'discarded',
  'warranty',
] as const;

export const TIRE_POSITIONS = [
  'front_left',
  'front_right',
  'rear_left_outer',
  'rear_left_inner',
  'rear_right_outer',
  'rear_right_inner',
  'spare',
  'other',
] as const;

export const TIRE_MOVEMENT_TYPES = [
  'install',
  'remove',
  'position_change',
  'rotation',
] as const;

export const TIRE_DOCUMENT_TYPES = [
  'invoice',
  'warranty',
  'photo',
  'report',
  'other',
] as const;

export const TIRE_WEAR_LEVELS = ['good', 'warning', 'critical'] as const;
