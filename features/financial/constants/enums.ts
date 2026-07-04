export const FINANCIAL_ENTRY_TYPES = [
  'revenue',
  'expense',
  'transfer',
  'reimbursement',
  'advance',
  'reversal',
  'adjustment',
] as const;

export const FINANCIAL_ENTRY_STATUSES = [
  'pending',
  'paid',
  'cancelled',
  'reversed',
  'overdue',
] as const;

export const FINANCIAL_COST_CENTER_TYPES = [
  'company',
  'branch',
  'vehicle',
  'driver',
  'trip',
  'client',
  'contract',
  'custom',
] as const;

export const FINANCIAL_DOCUMENT_TYPES = [
  'invoice',
  'boleto',
  'receipt',
  'proof',
  'other',
] as const;

export const FINANCIAL_CATEGORY_SLUGS = [
  'combustivel',
  'pedagio',
  'manutencao',
  'pneus',
  'salarios',
  'diarias',
  'hospedagem',
  'alimentacao',
  'impostos',
  'seguros',
  'multas',
  'fretes',
  'receitas',
  'outros',
] as const;
