import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {formatCurrencyBr} from '@/features/financial/utils/financial-format';
import {ROUTES} from '@/constants/routes/paths';
import Link from 'next/link';

import type {TopCustomerRankingItem} from '../utils/rankings';

export interface TopCustomersCardProps {
  customers: TopCustomerRankingItem[];
}

function TopCustomersCard({customers}: TopCustomersCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top 5 Clientes</CardTitle>
        <CardDescription>Maiores lucros no período</CardDescription>
      </CardHeader>
      <CardContent>
        {customers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum cliente com resultado no período.
          </p>
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
                    <Link
                      href={ROUTES.dashboardRentabilidadeClientes}
                      className="hover:underline"
                    >
                      {customer.name}
                    </Link>
                  </p>
                </div>
                <div className="shrink-0 text-right text-sm">
                  <p className="font-financial">{formatCurrencyBr(customer.revenue)}</p>
                  <p
                    className={`font-financial text-xs ${
                      customer.profit < 0
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Lucro {formatCurrencyBr(customer.profit)}
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

export {TopCustomersCard};
