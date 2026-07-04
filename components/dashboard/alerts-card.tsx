import {AlertTriangle, Info, TriangleAlert} from 'lucide-react';

import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import type {DashboardAlertData} from '@/features/organization/dashboard/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';

const alertIcons = {
  warning: TriangleAlert,
  destructive: AlertTriangle,
  info: Info,
} as const;

export interface AlertsCardProps {
  alerts: DashboardAlertData[];
}

function AlertsCard({alerts}: AlertsCardProps) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Alertas</CardTitle>
          {alerts.length > 0 && (
            <Badge variant="destructive">{alerts.length}</Badge>
          )}
        </div>
        <CardDescription>Itens que requerem atenção imediata</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum alerta no momento.</p>
        )}
        {alerts.map((alert) => {
          const Icon = alertIcons[alert.variant];
          return (
            <Alert key={alert.id} variant={alert.variant}>
              <Icon />
              <AlertTitle className="flex items-center justify-between gap-2">
                {alert.title}
                <span className="text-xs font-normal text-muted-foreground">
                  {alert.time}
                </span>
              </AlertTitle>
              <AlertDescription>{alert.description}</AlertDescription>
            </Alert>
          );
        })}
      </CardContent>
    </Card>
  );
}

export {AlertsCard};
