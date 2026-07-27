import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {formatCurrencyBr, formatPercent} from '@/features/financial/utils/financial-format';
import {ROUTES} from '@/constants/routes/paths';
import Link from 'next/link';

import {formatMarginStatus} from '../utils/margin-status';
import type {TopRouteRankingItem} from '../utils/rankings';

export interface TopRoutesCardProps {
  routes: TopRouteRankingItem[];
}

function TopRoutesCard({routes}: TopRoutesCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top 5 Rotas</CardTitle>
        <CardDescription>Maiores lucros no período</CardDescription>
      </CardHeader>
      <CardContent>
        {routes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma rota com resultado no período.
          </p>
        ) : (
          <ul className="space-y-3">
            {routes.map((route, index) => (
              <li
                key={route.id}
                className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                    <Link
                      href={ROUTES.dashboardRentabilidadeRotas}
                      className="hover:underline"
                    >
                      {route.name}
                    </Link>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatMarginStatus(route.status)}
                    {route.marginPercent == null
                      ? ''
                      : ` · ${formatPercent(route.marginPercent)}`}
                  </p>
                </div>
                <div className="shrink-0 text-right text-sm">
                  <p className="font-financial">{formatCurrencyBr(route.revenue)}</p>
                  <p
                    className={`font-financial text-xs ${
                      route.profit < 0 ? 'text-destructive' : 'text-muted-foreground'
                    }`}
                  >
                    Lucro {formatCurrencyBr(route.profit)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export {TopRoutesCard};
