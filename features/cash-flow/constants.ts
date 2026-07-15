import {ACCOUNTS_PAYABLE_SOURCE_MODULE} from '@/features/accounts-payable/constants';
import {ACCOUNTS_RECEIVABLE_SOURCE_MODULE} from '@/features/accounts-receivable/constants';

export const CASH_FLOW_SOURCE_MODULES = [
  ACCOUNTS_PAYABLE_SOURCE_MODULE,
  ACCOUNTS_RECEIVABLE_SOURCE_MODULE,
] as const;

export const CASH_FLOW_TYPES = ['recebimento', 'pagamento'] as const;

export const CASH_FLOW_STATUSES = ['pending', 'paid', 'cancelled'] as const;

export const CASH_FLOW_PAGE_SIZE = 10;

export const CASH_FLOW_TYPE_LABELS: Record<(typeof CASH_FLOW_TYPES)[number], string> = {
  recebimento: 'Recebimento',
  pagamento: 'Pagamento',
};

export const CASH_FLOW_STATUS_LABELS: Record<(typeof CASH_FLOW_STATUSES)[number], string> = {
  pending: 'Em aberto',
  paid: 'Pago / Recebido',
  cancelled: 'Cancelado',
};
