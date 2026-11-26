import Link from 'next/link';
import type {ReactNode} from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {formatCurrencyBr, formatPercent} from '@/features/financial/utils/financial-format';
import {cn} from '@/lib/utils';

export interface ExecutiveRankingRow {
  id: string;
  name: string;
  href: string;
  revenue: number;
  profit: number | null;
  marginPercent: number | null;
  /** Linha auxiliar opcional (ex.: situação da margem da rota). */
  meta?: ReactNode;
}

export interface ExecutiveRankingCardProps {
  title: string;
  description: string;
  emptyMessage: string;
  rows: ExecutiveRankingRow[];
}

function signedClass(value: number | null): string {
  return value != null && value < 0 ? 'text-destructive' : 'text-foreground';
}

/**
 * Ranking compacto do Dashboard Executivo (Top 5 Rotas / Clientes).
 * Mostra só as linhas existentes: o card não reserva espaço vazio.
 */
function ExecutiveRankingCard({
  title,
  description,
  emptyMessage,
  rows,
}: ExecutiveRankingCardProps) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        {rows.length === 0 ? (
          <p className="rounded-lg bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <div>
            <div className="hidden grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_3.75rem] gap-3 border-b border-border/70 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:grid">
              <span>Nome</span>
              <span className="text-right">Faturamento</span>
              <span className="text-right">Lucro</span>
              <span className="text-right">Margem</span>
            </div>
            <ol>
              {rows.map((row, index) => (
                <li
                  key={row.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-border/50 py-2.5 last:border-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_3.75rem]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={row.href}
                        className="line-clamp-2 break-words text-sm font-medium leading-snug text-foreground hover:underline"
                        title={row.name}
                      >
                        {row.name}
                      </Link>
                      {row.meta ? (
                        <p className="truncate text-xs text-muted-foreground">{row.meta}</p>
                      ) : null}
                    </div>
                  </div>
                  <p
                    className="text-right font-financial text-sm font-medium text-foreground"
                    data-financial="true"
                  >
                    <span className="sr-only">Faturamento: </span>
                    {formatCurrencyBr(row.revenue)}
                  </p>
                  <p
                    className={cn(
                      'col-start-2 text-right font-financial text-xs sm:col-start-auto sm:text-sm',
                      signedClass(row.profit),
                    )}
                    data-financial="true"
                  >
                    <span className="text-muted-foreground sm:sr-only">Lucro </span>
                    {row.profit == null ? '—' : formatCurrencyBr(row.profit)}
                  </p>
                  <p
                    className={cn(
                      'col-start-2 text-right font-financial text-xs sm:col-start-auto sm:text-sm',
                      signedClass(row.marginPercent),
                    )}
                    data-financial="true"
                  >
                    <span className="text-muted-foreground sm:sr-only">Margem </span>
                    {row.marginPercent == null ? '—' : formatPercent(row.marginPercent)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export {ExecutiveRankingCard};
