import type {ReactNode} from 'react';

import {Badge} from '@/components/ui/badge';
import {cn} from '@/lib/utils';

import type {GoalProgressItem} from '../types';

export interface GoalsPanelProps {
  goals: GoalProgressItem[];
  className?: string;
  footer?: ReactNode;
}

function progressBar(value: number | null, status: GoalProgressItem['status']) {
  const width = value == null ? 0 : Math.min(100, value);
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          'h-full rounded-full',
          status === 'acima' && 'bg-success',
          status === 'atencao' && 'bg-warning',
          status === 'abaixo' && 'bg-destructive',
          value == null && 'bg-muted-foreground/30',
        )}
        style={{width: `${width}%`}}
      />
    </div>
  );
}

function GoalsPanel({goals, className, footer}: GoalsPanelProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-5 shadow-card',
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">Metas</h3>
          <p className="text-sm text-muted-foreground">
            Meta × atual e cumprimento percentual.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {goals.map((goal) => (
          <div
            key={goal.metric}
            className="rounded-lg border border-border/70 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{goal.label}</p>
              {goal.progressPercent != null ? (
                <Badge
                  variant={
                    goal.status === 'acima'
                      ? 'success'
                      : goal.status === 'atencao'
                        ? 'warning'
                        : goal.status === 'indefinido'
                          ? 'outline'
                          : 'destructive'
                  }
                >
                  {goal.progressPercent}%
                </Badge>
              ) : (
                <Badge variant="outline">Sem meta</Badge>
              )}
            </div>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Meta</dt>
                <dd className="font-financial">{goal.formattedGoal}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Atual</dt>
                <dd className="font-financial">{goal.formattedActual}</dd>
              </div>
            </dl>
            {progressBar(goal.progressPercent, goal.status)}
            {goal.progressPercent != null && (
              <p className="mt-1 font-mono text-xs tracking-widest text-muted-foreground">
                {'█'.repeat(Math.min(10, Math.round((goal.progressPercent ?? 0) / 10)))}
                {'░'.repeat(
                  Math.max(
                    0,
                    10 - Math.min(10, Math.round((goal.progressPercent ?? 0) / 10)),
                  ),
                )}
              </p>
            )}
          </div>
        ))}
      </div>

      {footer && <div className="mt-4 border-t border-border pt-4">{footer}</div>}
    </div>
  );
}

export {GoalsPanel};
