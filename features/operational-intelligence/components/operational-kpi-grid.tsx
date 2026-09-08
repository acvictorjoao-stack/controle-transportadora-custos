import {StatCard} from '@/components/data-display/stat-card';

import type {OperationalKpis} from '../types';

export interface OperationalKpiGridProps {
  kpis: OperationalKpis;
  /** Quando true, o KPI de concluídas usa o rótulo "no período". */
  hasExplicitPeriod?: boolean;
}

function formatLeadTimeDays(valueMinutes: number | null): string {
  if (valueMinutes == null || !Number.isFinite(valueMinutes)) {
    return 'Dados insuficientes para calcular previsão.';
  }
  const days = valueMinutes / 1440;
  const rounded = Math.round(days * 10) / 10;
  const label = rounded === 1 ? 'dia' : 'dias';
  return `${rounded.toLocaleString('pt-BR')} ${label}`;
}

function formatPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toLocaleString('pt-BR', {maximumFractionDigits: 1})}%`;
}

function OperationalKpiGrid({
  kpis,
  hasExplicitPeriod = false,
}: OperationalKpiGridProps) {
  const completedTitle = hasExplicitPeriod
    ? 'Viagens concluídas no período'
    : 'Viagens concluídas hoje';

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4">
      <StatCard title="Viagens em andamento" value={kpis.tripsInProgress} />
      <StatCard title={completedTitle} value={kpis.tripsCompletedToday} />
      <StatCard
        title="Viagens atrasadas"
        value={
          <span className={kpis.tripsDelayed > 0 ? 'text-destructive' : undefined}>
            {kpis.tripsDelayed}
          </span>
        }
      />
      <StatCard title="Entregas pendentes" value={kpis.pendingDeliveries} />
      <StatCard
        title="Lead Time médio"
        value={formatLeadTimeDays(kpis.averageLeadTimeMinutes)}
      />
      <StatCard title="SLA atendido" value={formatPercent(kpis.slaPercent)} />
      <StatCard title="Ocorrências abertas" value={kpis.openOccurrences} />
    </div>
  );
}

export {OperationalKpiGrid};
