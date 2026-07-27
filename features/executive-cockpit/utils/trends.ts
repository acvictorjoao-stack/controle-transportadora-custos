import type {CockpitMetricSnapshot, TrendDirection, TrendItem} from '../types';
import {percentChange} from './format';

function directionOf(delta: number | null): TrendDirection {
  if (delta == null || !Number.isFinite(delta) || Math.abs(delta) < 1) {
    return 'stable';
  }
  return delta > 0 ? 'up' : 'down';
}

function messageFor(
  label: string,
  direction: TrendDirection,
  favorable: boolean | null,
): string {
  if (direction === 'stable') return `${label} estável`;
  if (direction === 'up') {
    if (favorable === false) return `${label} aumentando`;
    if (label === 'SLA') return `${label} melhorando`;
    return `${label} subindo`;
  }
  if (favorable === false) return `${label} caindo`;
  return `${label} melhorando`;
}

/**
 * Detecta tendências automáticas vs período anterior.
 */
export function buildTrends(
  current: CockpitMetricSnapshot,
  previous: CockpitMetricSnapshot,
): TrendItem[] {
  const defs: Array<{
    id: string;
    label: string;
    current: number | null;
    previous: number | null;
    invertGood?: boolean;
  }> = [
    {
      id: 'receita',
      label: 'Receita',
      current: current.receita,
      previous: previous.receita,
    },
    {
      id: 'margem',
      label: 'Margem',
      current: current.margem,
      previous: previous.margem,
    },
    {
      id: 'custos',
      label: 'Custos',
      current: current.custos,
      previous: previous.custos,
      invertGood: true,
    },
    {
      id: 'sla',
      label: 'SLA',
      current: current.sla,
      previous: previous.sla,
    },
    {
      id: 'leadTime',
      label: 'Lead Time',
      current: current.leadTime,
      previous: previous.leadTime,
      invertGood: true,
    },
  ];

  return defs.map((def) => {
    const delta = percentChange(def.current, def.previous);
    const direction = directionOf(delta);
    let favorable: boolean | null = null;
    if (direction !== 'stable' && delta != null) {
      favorable = def.invertGood ? delta < 0 : delta > 0;
    }

    return {
      id: def.id,
      label: def.label,
      direction,
      message: messageFor(def.label, direction, favorable),
      deltaPercent: delta,
      favorable,
    };
  });
}
