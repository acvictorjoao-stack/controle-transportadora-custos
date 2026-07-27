import {Badge} from '@/components/ui/badge';
import {cn} from '@/lib/utils';

import type {OperationalScore} from '../types';

export interface OperationalScoreCardProps {
  score: OperationalScore;
  className?: string;
}

function OperationalScoreCard({score, className}: OperationalScoreCardProps) {
  const tone =
    score.value >= 85
      ? 'success'
      : score.value >= 70
        ? 'default'
        : score.value >= 50
          ? 'warning'
          : 'destructive';

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-6 shadow-card',
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Score Operacional
          </p>
          <p className="mt-2 font-financial text-5xl font-semibold tracking-tight">
            {score.value}
          </p>
          <Badge variant={tone === 'default' ? 'secondary' : tone} className="mt-2">
            {score.label}
          </Badge>
        </div>
        <ul className="grid flex-1 gap-2 sm:grid-cols-2 lg:max-w-xl">
          {score.breakdown.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">
                {item.label}
                <span className="ml-1 text-xs">({item.weight}%)</span>
              </span>
              <span className="font-financial font-medium">
                {Math.round(item.score)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export {OperationalScoreCard};
