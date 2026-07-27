import {Badge} from '@/components/ui/badge';
import {cn} from '@/lib/utils';

import type {InsightItem} from '../types';

export interface InsightsPanelProps {
  insights: InsightItem[];
  className?: string;
}

function InsightsPanel({insights, className}: InsightsPanelProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-5 shadow-card',
        className,
      )}
    >
      <h3 className="text-base font-semibold">Insights automáticos</h3>
      <p className="text-sm text-muted-foreground">
        Regras determinísticas sobre DRE, rotas, clientes e frota.
      </p>

      {insights.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Ainda não há dados suficientes para gerar recomendações.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {insights.map((insight) => (
            <li
              key={insight.id}
              className="rounded-lg border border-border/70 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{insight.title}</p>
                <Badge
                  variant={
                    insight.severity === 'critical'
                      ? 'destructive'
                      : insight.severity === 'warning'
                        ? 'warning'
                        : 'info'
                  }
                >
                  {insight.severity === 'critical'
                    ? 'Crítico'
                    : insight.severity === 'warning'
                      ? 'Atenção'
                      : 'Info'}
                </Badge>
              </div>
              {insight.cause && (
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                  {insight.cause}
                </p>
              )}
              {insight.suggestion && (
                <p className="mt-2 text-sm">
                  <span className="font-medium">Sugestão: </span>
                  {insight.suggestion}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export {InsightsPanel};
