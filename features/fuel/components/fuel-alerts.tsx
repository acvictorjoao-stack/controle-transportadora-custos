import {CircleCheck, Gauge, TrendingDown, TriangleAlert} from 'lucide-react';

import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';

import type {FuelConsumptionAlert} from '../types';
import {formatKmPerLiter} from '../utils/fuel-format';

export interface FuelAlertsProps {
  alerts: FuelConsumptionAlert[];
}

function formatPercentageValue(value: number): string {
  return value.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1});
}

function renderAlertContent(alert: FuelConsumptionAlert) {
  if (alert.type === 'below_average') {
    return {
      icon: <TrendingDown className="size-4" />,
      variant: 'warning' as const,
      title: `Veículo ${alert.plate} abaixo da média`,
      description: `${formatKmPerLiter(alert.kmPerLiter)} — ${formatPercentageValue(alert.gapPercentage)}% abaixo da média da frota.`,
    };
  }

  if (alert.type === 'high_operational') {
    return {
      icon: <TriangleAlert className="size-4" />,
      variant: 'warning' as const,
      title: `Alto consumo operacional — Veículo ${alert.plate}`,
      description: `Mais de ${formatPercentageValue(alert.operationalPercentage)}% da distância foi operacional.`,
    };
  }

  return {
    icon: <Gauge className="size-4" />,
    variant: 'info' as const,
    title: `Veículo ${alert.plate} sem consumo`,
    description: 'Veículo sem períodos processados.',
  };
}

/**
 * "Alertas" section for the Fuel Consumption Dashboard (RC 26.6.7). Every
 * alert already arrives fully computed from `buildConsumptionAlerts` — this
 * component only maps each alert to its icon/copy and renders it.
 */
function FuelAlerts({alerts}: FuelAlertsProps) {
  if (alerts.length === 0) {
    return (
      <Alert variant="success">
        <CircleCheck className="size-4" />
        <AlertTitle>Nenhum alerta identificado</AlertTitle>
        <AlertDescription>A frota está operando dentro dos padrões esperados.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {alerts.map((alert, index) => {
        const {icon, variant, title, description} = renderAlertContent(alert);

        return (
          <Alert key={`${alert.type}-${alert.vehicleId}-${index}`} variant={variant}>
            {icon}
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>{description}</AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}

export {FuelAlerts};
