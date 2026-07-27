import {StatCard} from '@/components/data-display/stat-card';

import type {OperationalKpis} from '../types';

export interface OperationalKpiGridProps {
  kpis: OperationalKpis;
}

function formatMinutes(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value < 60) {
    return `${Math.round(value)} min`;
  }
  const hours = value / 60;
  return `${hours.toLocaleString('pt-BR', {maximumFractionDigits: 1})} h`;
}

function formatPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toLocaleString('pt-BR', {maximumFractionDigits: 1})}%`;
}

function OperationalKpiGrid({kpis}: OperationalKpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4">
      <StatCard title="Viagens em andamento" value={kpis.tripsInProgress} />
      <StatCard title="Viagens concluídas hoje" value={kpis.tripsCompletedToday} />
      <StatCard
        title="Viagens atrasadas"
        value={
          <span className={kpis.tripsDelayed > 0 ? 'text-destructive' : undefined}>
            {kpis.tripsDelayed}
          </span>
        }
      />
      <StatCard title="Entregas pendentes" value={kpis.pendingDeliveries} />
      <StatCard title="Lead Time médio" value={formatMinutes(kpis.averageLeadTimeMinutes)} />
      <StatCard title="SLA atendido" value={formatPercent(kpis.slaPercent)} />
      <StatCard title="Ocorrências abertas" value={kpis.openOccurrences} />
      <StatCard
        title="Tempo médio de descarga"
        value={formatMinutes(kpis.averageUnloadMinutes)}
      />
    </div>
  );
}

export {OperationalKpiGrid};
