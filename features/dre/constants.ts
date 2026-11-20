import {ACCOUNTS_PAYABLE_SOURCE_MODULE} from '@/features/accounts-payable/constants';
import {TRIP_EXPENSE_SOURCE_MODULE} from '@/features/financial/constants/operation-financial';

import type {OperationalDreAnalyticalCategory, OperationalDreCostBucket} from './types';

export const DRE_FINANCIAL_SOURCE_MODULES = ['manual', 'financeiro'] as const;

export const DRE_FINANCIAL_CATEGORY_SLUGS = ['impostos', 'seguros'] as const;

export const DRE_ACCOUNTS_PAYABLE_SOURCE_MODULE = ACCOUNTS_PAYABLE_SOURCE_MODULE;

/** Origem das despesas da aba da viagem (migration 111): grupo próprio na DRE. */
export const DRE_TRIP_EXPENSE_SOURCE_MODULE = TRIP_EXPENSE_SOURCE_MODULE;

export const DRE_ANALYTICAL_LABELS: Record<OperationalDreAnalyticalCategory, string> = {
  receita: 'Receita',
  despesas_viagem: 'Despesas de viagem',
  combustivel: 'Combustível',
  manutencao: 'Manutenção',
  pneus: 'Pneus',
  financeiro: 'Financeiro',
  contas_operacionais: 'Contas Operacionais',
  outros: 'Outros',
  lucro: 'Lucro',
};

export const DRE_COST_BUCKET_TO_ANALYTICAL: Record<
  OperationalDreCostBucket,
  OperationalDreAnalyticalCategory
> = {
  tripExpenses: 'despesas_viagem',
  fuel: 'combustivel',
  maintenance: 'manutencao',
  tires: 'pneus',
  financial: 'financeiro',
  accountsPayable: 'contas_operacionais',
  other: 'outros',
};
