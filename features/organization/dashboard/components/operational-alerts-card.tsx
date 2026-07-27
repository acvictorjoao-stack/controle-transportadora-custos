import {AlertTriangle, Info, TriangleAlert} from 'lucide-react';

import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';

import type {OperationalAlertItem} from '../utils/alerts';

const alertIcons = {
  warning: TriangleAlert,
  destructive: AlertTriangle,
  info: Info,
} as const;

export interface OperationalAlertsCardProps {
  alerts: OperationalAlertItem[];
}

function OperationalAlertsCard({alerts}: OperationalAlertsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Alertas Inteligentes</CardTitle>
          {alerts.length > 0 ? (
            <Badge variant="destructive">{alerts.length}</Badge>
          ) : null}
        </div>
        <CardDescription>Sinais para tomada de decisão</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum alerta operacional no momento.
          </p>
        ) : (
          alerts.map((alert) => {
            const Icon = alertIcons[alert.variant];
            return (
              <Alert key={alert.id} variant={alert.variant}>
                <Icon />
                <AlertTitle>⚠ {alert.title}</AlertTitle>
                <AlertDescription>{alert.description}</AlertDescription>
              </Alert>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export {OperationalAlertsCard};
