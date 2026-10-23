import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {formatCurrencyBr} from '@/features/financial/utils/financial-format';
import {cn} from '@/lib/utils';

export interface ExecutivePeriodSnapshotProps {
  revenue: number;
  costs: number;
  profit: number | null;
  costsOnlyMode?: boolean;
  hasOperationalData?: boolean;
  className?: string;
}

function Bar({
  label,
  value,
  max,
  className,
}: {
  label: string;
  value: number;
  max: number;
  className: string;
}) {
  const height = max > 0 ? Math.max(4, Math.round((Math.abs(value) / max) * 100)) : 4;
  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <div className="flex h-40 w-full items-end justify-center">
        <div
          className={cn('w-10 rounded-t-md sm:w-12', className)}
          style={{height: `${height}%`}}
          title={`${label}: ${formatCurrencyBr(value)}`}
        />
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="font-financial text-xs text-muted-foreground">
          {formatCurrencyBr(value)}
        </p>
      </div>
    </div>
  );
}

/**
 * Comparativo visual do período já carregado (sem consultas extras).
 */
function ExecutivePeriodSnapshot({
  revenue,
  costs,
  profit,
  costsOnlyMode = false,
  hasOperationalData = true,
  className,
}: ExecutivePeriodSnapshotProps) {
  const profitValue = profit ?? 0;
  const max = Math.max(1, Math.abs(revenue), Math.abs(costs), Math.abs(profitValue));

  return (
    <Card className={cn('shadow-card', className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">
              Faturamento × Despesas (período)
            </CardTitle>
            <CardDescription>
              Comparativo operacional do período selecionado com receita, custos e
              lucro.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-sky-500" aria-hidden />
              Faturamento
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-slate-400" aria-hidden />
              Despesas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-emerald-500" aria-hidden />
              Lucro
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasOperationalData || costsOnlyMode ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Sem dados operacionais suficientes para o comparativo neste período.
          </p>
        ) : (
          <div
            className="flex items-end gap-4 sm:gap-8"
            role="img"
            aria-label="Comparativo de faturamento, despesas e lucro do período"
          >
            <Bar label="Faturamento" value={revenue} max={max} className="bg-sky-500/90" />
            <Bar label="Despesas" value={costs} max={max} className="bg-slate-400/90" />
            <Bar
              label="Lucro"
              value={profitValue}
              max={max}
              className={
                profitValue < 0 ? 'bg-destructive/90' : 'bg-emerald-500/90'
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export {ExecutivePeriodSnapshot};
