'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {formatCurrencyBr, formatPercent} from '@/features/financial/utils/financial-format';
import type {TopCustomerRankingItem} from '@/features/organization/dashboard/utils/rankings';

export interface CustomerSideRankingCardProps {
  title: string;
  description: string;
  customers: TopCustomerRankingItem[];
  emptyMessage: string;
  showMargin?: boolean;
}

function CustomerSideRankingCard({
  title,
  description,
  customers,
  emptyMessage,
  showMargin = true,
}: CustomerSideRankingCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {customers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="space-y-3">
            {customers.map((customer, index) => (
              <li
                key={customer.id}
                className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                    {customer.name}
                  </p>
                </div>
                <div className="shrink-0 text-right text-sm">
                  <p
                    className={`font-financial ${
                      customer.profit < 0 ? 'text-destructive' : ''
                    }`}
                  >
                    {formatCurrencyBr(customer.profit)}
                  </p>
                  {showMargin ? (
                    <p className="font-financial text-xs text-muted-foreground">
                      Margem{' '}
                      {customer.marginPercent == null
                        ? '—'
                        : formatPercent(customer.marginPercent)}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export {CustomerSideRankingCard};
