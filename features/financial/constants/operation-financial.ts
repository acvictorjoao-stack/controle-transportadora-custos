/** Operational modules that auto-create financial entries (RC 26.7.1). */
export const OPERATION_FINANCIAL_SOURCE_MODULES = [
  'fuel',
  'maintenance',
  'tires',
  'fines',
  'tolls',
] as const;

export type OperationFinancialSourceModule =
  (typeof OPERATION_FINANCIAL_SOURCE_MODULES)[number];

/** Payment settlement for operational costs. */
export const OPERATION_PAYMENT_TYPES = ['cash', 'credit'] as const;

export type OperationPaymentType = (typeof OPERATION_PAYMENT_TYPES)[number];

export const OPERATION_PAYMENT_TYPE_LABELS: Record<OperationPaymentType, string> = {
  cash: 'À vista',
  credit: 'A prazo',
};

/** Categories that must come from operational modules, not Contas a Pagar. */
export const OPERATIONAL_EXPENSE_CATEGORY_SLUGS = [
  'combustivel',
  'manutencao',
  'pneus',
  'multas',
  'pedagio',
] as const;

export type OperationalExpenseCategorySlug =
  (typeof OPERATIONAL_EXPENSE_CATEGORY_SLUGS)[number];

export const OPERATION_SOURCE_LABELS: Record<string, string> = {
  fuel: 'Abastecimento',
  maintenance: 'Manutenção',
  tires: 'Pneus',
  fines: 'Multa',
  tolls: 'Pedágio',
  accounts_payable: 'Manual',
  manual: 'Manual',
  trips: 'Viagem',
};

export const OPERATION_SOURCE_ICONS: Record<string, string> = {
  fuel: '🚛',
  maintenance: '🔧',
  tires: '🛞',
  fines: '🚨',
  tolls: '🛣️',
  accounts_payable: '📄',
  manual: '📄',
  trips: '🗺️',
};
