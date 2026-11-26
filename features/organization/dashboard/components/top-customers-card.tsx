import {buildCrossNavHref} from '@/features/analytics-nav/utils/shared-filters';
import type {SharedAnalyticsFilters} from '@/features/analytics-nav/types';

import type {TopCustomerRankingItem} from '../utils/rankings';
import {ExecutiveRankingCard} from './executive-ranking-list';

export interface TopCustomersCardProps {
  customers: TopCustomerRankingItem[];
  filters?: SharedAnalyticsFilters;
}

function TopCustomersCard({customers, filters = {}}: TopCustomersCardProps) {
  return (
    <ExecutiveRankingCard
      title="Top 5 Clientes"
      description="Maiores lucros no período"
      emptyMessage="Nenhum cliente com resultado no período."
      rows={customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        href: buildCrossNavHref('rentabilidade-clientes', filters, {
          customerId: customer.id,
        }),
        revenue: customer.revenue,
        profit: customer.profit,
        marginPercent: customer.marginPercent,
      }))}
    />
  );
}

export {TopCustomersCard};
