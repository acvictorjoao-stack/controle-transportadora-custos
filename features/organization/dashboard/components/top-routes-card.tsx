import {buildCrossNavHref} from '@/features/analytics-nav/utils/shared-filters';
import type {SharedAnalyticsFilters} from '@/features/analytics-nav/types';

import {formatMarginStatus} from '../utils/margin-status';
import type {TopRouteRankingItem} from '../utils/rankings';
import {ExecutiveRankingCard} from './executive-ranking-list';

export interface TopRoutesCardProps {
  routes: TopRouteRankingItem[];
  filters?: SharedAnalyticsFilters;
}

function TopRoutesCard({routes, filters = {}}: TopRoutesCardProps) {
  return (
    <ExecutiveRankingCard
      title="Top 5 Rotas"
      description="Maiores lucros no período"
      emptyMessage="Nenhuma rota com resultado no período."
      rows={routes.map((route) => ({
        id: route.id,
        name: route.name,
        href: buildCrossNavHref('rentabilidade-rotas', filters, {routeId: route.id}),
        revenue: route.revenue,
        profit: route.profit,
        marginPercent: route.marginPercent,
        meta: formatMarginStatus(route.status),
      }))}
    />
  );
}

export {TopRoutesCard};
