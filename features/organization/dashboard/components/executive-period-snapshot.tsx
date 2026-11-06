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
  const width = max > 0 ? Math.max(1, (Math.abs(value) / max) * 100) : 1;
  const negative = value < 0;

  return (
    <div className="grid grid-cols-[5.5rem_1fr] items-center gap-x-3 gap-y-1 sm:grid-cols-[6.5rem_1fr_9rem]">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p
        className={cn(
          'text-right font-financial text-sm font-semibold sm:order-last',
          negative ? 'text-destructive' : 'text-foreground',
        )}
      >
        {formatCurrencyBr(value)}
      </p>
      <div className="col-span-2 h-3 overflow-hidden rounded-r-sm sm:col-span-1">
        <div
          className={cn('h-full rounded-r-sm', className)}
          style={{width: `${width}%`}}
          title={`${label}: ${formatCurrencyBr(value)}`}
        />
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
    <Card className={className}>
      <CardHeader>
        <CardTitle>Faturamento × Despesas (período)</CardTitle>
        <CardDescription>
          Comparativo operacional do período selecionado com receita, custos e
          lucro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasOperationalData || costsOnlyMode ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sem dados operacionais suficientes para o comparativo neste período.
          </p>
        ) : (
          <div
            className="flex flex-col gap-4"
            role="img"
            aria-label={`Comparativo do período. Faturamento ${formatCurrencyBr(revenue)}, despesas ${formatCurrencyBr(costs)}, lucro ${formatCurrencyBr(profitValue)}.`}
          >
            <Bar label="Faturamento" value={revenue} max={max} className="bg-primary" />
            <Bar label="Despesas" value={costs} max={max} className="bg-muted-foreground/40" />
            <Bar
              label="Lucro"
              value={profitValue}
              max={max}
              className={profitValue < 0 ? 'bg-destructive' : 'bg-success'}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export {ExecutivePeriodSnapshot};
