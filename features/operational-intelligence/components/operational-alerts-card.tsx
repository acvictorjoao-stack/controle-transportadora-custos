'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {cn} from '@/lib/utils';

import type {OperationalAlertItem} from '../types';

export interface OperationalAlertsCardProps {
  alerts: OperationalAlertItem[];
}

function OperationalAlertsCard({alerts}: OperationalAlertsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas Operacionais</CardTitle>
        <CardDescription>O que precisa de atenção agora.</CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum alerta operacional no momento.
          </p>
        ) : (
          <ul className="space-y-3">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className="rounded-md border border-border/70 px-3 py-2"
              >
                <p
                  className={cn(
                    'text-sm font-medium',
                    alert.tone === 'critical' ? 'text-destructive' : undefined,
                  )}
                >
                  {alert.tone === 'critical' ? '🔴' : '🟡'} {alert.title}
                </p>
                {alert.description ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {alert.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export {OperationalAlertsCard};
