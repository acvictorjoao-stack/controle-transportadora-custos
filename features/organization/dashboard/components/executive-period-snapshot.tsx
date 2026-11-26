import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {formatCurrencyBr, formatPercent} from '@/features/financial/utils/financial-format';
import {cn} from '@/lib/utils';

export interface ExecutivePeriodSnapshotProps {
  revenue: number;
  costs: number;
  profit: number | null;
  /** Margem operacional já calculada pelo loader (mesmo valor do card de Margem). */
  marginPercent?: number | null;
  costsOnlyMode?: boolean;
  hasOperationalData?: boolean;
  className?: string;
}

interface SnapshotSeries {
  key: 'revenue' | 'costs' | 'profit';
  label: string;
  value: number;
  /** Participação no faturamento; null quando não se aplica. */
  share: number | null;
  shareLabel: string;
  /** Cor de identidade da série (paleta categórica do tema, ordem fixa). */
  swatch: string;
}

/**
 * Participação das despesas no faturamento, só para exibição.
 * Sem faturamento positivo não há base e o percentual não aparece.
 */
function shareOfRevenue(value: number, revenue: number): number | null {
  if (!(revenue > 0)) return null;
  return (value / revenue) * 100;
}

/**
 * Comparativo visual do período já carregado (sem consultas extras).
 * Valores e margem chegam prontos do loader; aqui só se desenha.
 */
function ExecutivePeriodSnapshot({
  revenue,
  costs,
  profit,
  marginPercent = null,
  costsOnlyMode = false,
  hasOperationalData = true,
  className,
}: ExecutivePeriodSnapshotProps) {
  const profitValue = profit ?? 0;
  const loss = profitValue < 0;
  const max = Math.max(1, Math.abs(revenue), Math.abs(costs), Math.abs(profitValue));

  const series: SnapshotSeries[] = [
    {
      key: 'revenue',
      label: 'Faturamento',
      value: revenue,
      share: null,
      shareLabel: 'base do comparativo',
      swatch: 'bg-chart-1',
    },
    {
      key: 'costs',
      label: 'Despesas',
      value: costs,
      share: shareOfRevenue(costs, revenue),
      shareLabel: 'do faturamento',
      swatch: 'bg-chart-2',
    },
    {
      key: 'profit',
      label: loss ? 'Prejuízo' : 'Lucro',
      value: profitValue,
      share: revenue > 0 ? marginPercent : null,
      shareLabel: 'de margem',
      swatch: 'bg-chart-3',
    },
  ];

  const showChart = hasOperationalData && !costsOnlyMode;

  return (
    <Card className={cn('gap-5', className)}>
      <CardHeader>
        <CardTitle>Faturamento × Despesas</CardTitle>
        <CardDescription>
          Receita, custos e resultado do período selecionado, na mesma escala.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!showChart ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Sem dados operacionais suficientes para o comparativo neste período.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {series.map((item) => (
                <div
                  key={item.key}
                  className="@container min-w-0 rounded-lg border border-border/70 bg-muted/30 px-3.5 py-3"
                >
                  <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <span aria-hidden className={cn('size-2.5 shrink-0 rounded-[3px]', item.swatch)} />
                    {item.label}
                  </dt>
                  <dd
                    className={cn(
                      'mt-1.5 truncate font-financial text-lg font-semibold tracking-tight @[10.5rem]:text-xl',
                      item.value < 0 ? 'text-destructive' : 'text-foreground',
                    )}
                    data-financial="true"
                  >
                    {formatCurrencyBr(item.value)}
                  </dd>
                  <dd className="mt-0.5 text-xs text-muted-foreground">
                    {item.share == null
                      ? item.key === 'revenue'
                        ? item.shareLabel
                        : '—'
                      : `${formatPercent(item.share)} ${item.shareLabel}`}
                  </dd>
                </div>
              ))}
            </dl>

            <div
              className="flex flex-col gap-2.5"
              role="img"
              aria-label={`Comparativo do período. Faturamento ${formatCurrencyBr(revenue)}, despesas ${formatCurrencyBr(costs)}, ${loss ? 'prejuízo' : 'lucro'} ${formatCurrencyBr(profitValue)}.`}
            >
              {series.map((item) => {
                const width = Math.max(0.75, (Math.abs(item.value) / max) * 100);
                return (
                  <div
                    key={item.key}
                    className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3"
                  >
                    <span className="truncate text-xs font-medium text-muted-foreground">
                      {item.label}
                    </span>
                    <div className="h-2.5 rounded-r-[4px] bg-muted/40">
                      <div
                        className={cn('h-full rounded-r-[4px] transition-[width]', item.swatch)}
                        style={{width: `${width}%`}}
                        title={`${item.label}: ${formatCurrencyBr(item.value)}${
                          item.share == null ? '' : ` (${formatPercent(item.share)} ${item.shareLabel})`
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export {ExecutivePeriodSnapshot};
