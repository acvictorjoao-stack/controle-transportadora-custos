import Link from 'next/link';

import {buildCrossNavHref} from '@/features/analytics-nav/utils/shared-filters';
import type {SharedAnalyticsFilters} from '@/features/analytics-nav/types';
import {formatCurrencyBr, formatPercent} from '@/features/financial/utils/financial-format';
import {cn} from '@/lib/utils';

import type {TopRouteRankingItem} from '../utils/rankings';

export interface ExecutiveTopHighlightProps {
  route: TopRouteRankingItem | null;
  filters?: SharedAnalyticsFilters;
  className?: string;
}

/**
 * Destaque da rota mais rentável já presente nos rankings do core
 * (sem consulta adicional de veículos).
 */
function ExecutiveTopHighlight({
  route,
  filters = {},
  className,
}: ExecutiveTopHighlightProps) {
  if (!route) return null;

  const href = buildCrossNavHref('rentabilidade-rotas', filters, {
    routeId: route.id,
  });
  const negative = route.profit != null && route.profit < 0;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary px-5 py-4 text-primary-foreground shadow-card sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/80">
          Rota mais rentável no período
        </p>
        <p className="truncate text-base font-semibold">{route.name}</p>
        <p className="text-sm text-primary-foreground/85">
          Faturou {formatCurrencyBr(route.revenue)} com lucro líquido de{' '}
          {route.profit == null ? '—' : formatCurrencyBr(route.profit)}
          {route.marginPercent == null
            ? ''
            : ` (${formatPercent(route.marginPercent)} de margem)`}
        </p>
      </div>
      <Link
        href={href}
        className={cn(
          'inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-background/90',
          negative && 'ring-1 ring-destructive/40',
        )}
      >
        Ver análise da rota
      </Link>
    </div>
  );
}

export {ExecutiveTopHighlight};
