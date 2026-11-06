export const ACCOUNTS_RECEIVABLE_SOURCE_MODULE = 'accounts_receivable';

export const ACCOUNTS_RECEIVABLE_STATUSES = ['pending', 'paid', 'cancelled'] as const;

export const ACCOUNTS_RECEIVABLE_PAGE_SIZE = 10;

export const RECEIVABLE_PAYMENT_METHODS = [
  'pix',
  'boleto',
  'transfer',
  'cash',
  'card',
  'other',
] as const;

export const RECEIVABLE_PAYMENT_METHOD_LABELS: Record<
  (typeof RECEIVABLE_PAYMENT_METHODS)[number],
  string
> = {
  pix: 'Pix',
  boleto: 'Boleto',
  transfer: 'Transferência',
  cash: 'Dinheiro',
  card: 'Cartão',
  other: 'Outros',
};

export const RECEIVABLE_MOVEMENT_KIND_LABELS = {
  receipt: 'Recebimento',
  receipt_reversal: 'Estorno',
  adjustment: 'Ajuste',
} as const;
