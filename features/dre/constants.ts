import {ACCOUNTS_PAYABLE_SOURCE_MODULE} from '@/features/accounts-payable/constants';

import type {OperationalDreAnalyticalCategory, OperationalDreCostBucket} from './types';

export const DRE_FINANCIAL_SOURCE_MODULES = ['manual', 'financeiro'] as const;

export const DRE_FINANCIAL_CATEGORY_SLUGS = ['impostos', 'seguros'] as const;

export const DRE_ACCOUNTS_PAYABLE_SOURCE_MODULE = ACCOUNTS_PAYABLE_SOURCE_MODULE;

export const DRE_ANALYTICAL_LABELS: Record<OperationalDreAnalyticalCategory, string> = {
  receita: 'Receita',
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
  fuel: 'combustivel',
  maintenance: 'manutencao',
  tires: 'pneus',
  financial: 'financeiro',
  accountsPayable: 'contas_operacionais',
  other: 'outros',
};
