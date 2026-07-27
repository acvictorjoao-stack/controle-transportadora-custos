import {ArrowDownRight, ArrowRight, ArrowUpRight} from 'lucide-react';

import {cn} from '@/lib/utils';

import type {TrendItem} from '../types';
import {formatCompactDelta} from '../utils/format';

export interface TrendsPanelProps {
  trends: TrendItem[];
  yearAgoNote?: string | null;
  className?: string;
}

function TrendsPanel({trends, yearAgoNote, className}: TrendsPanelProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-5 shadow-card',
        className,
      )}
    >
      <h3 className="text-base font-semibold">Tendências</h3>
      <p className="text-sm text-muted-foreground">
        Comparação automática com o período anterior
        {yearAgoNote ? ` e ${yearAgoNote}` : ''}.
      </p>

      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {trends.map((trend) => {
          const Icon =
            trend.direction === 'up'
              ? ArrowUpRight
              : trend.direction === 'down'
                ? ArrowDownRight
                : ArrowRight;
          const tone =
            trend.favorable == null
              ? 'text-muted-foreground'
              : trend.favorable
                ? 'text-success'
                : 'text-destructive';

          return (
            <li
              key={trend.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <Icon className={cn('size-4', tone)} />
                <span className="text-sm">{trend.message}</span>
              </div>
              <span className={cn('font-financial text-sm font-medium', tone)}>
                {formatCompactDelta(trend.deltaPercent)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export {TrendsPanel};
