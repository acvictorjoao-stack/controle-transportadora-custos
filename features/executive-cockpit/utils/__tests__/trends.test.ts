import {describe, expect, it} from 'vitest';

import type {CockpitMetricSnapshot} from '../../types';
import {buildTrends} from '../trends';

function snapshot(
  overrides: Partial<CockpitMetricSnapshot> = {},
): CockpitMetricSnapshot {
  return {
    receita: 100,
    lucro: 20,
    margem: 20,
    custos: 80,
    sla: 90,
    leadTime: 200,
    custoKm: 2,
    receitaKm: 3,
    lucroKm: 1,
    ocorrencias: 1,
    tripCount: 10,
    totalKm: 1000,
    ...overrides,
  };
}

describe('buildTrends', () => {
  it('detects rising revenue and falling margin', () => {
    const trends = buildTrends(
      snapshot({receita: 120, margem: 15, custos: 100, sla: 95}),
      snapshot({receita: 100, margem: 20, custos: 80, sla: 90}),
    );

    const byId = Object.fromEntries(trends.map((t) => [t.id, t]));
    expect(byId.receita.message).toBe('Receita subindo');
    expect(byId.margem.message).toBe('Margem caindo');
    expect(byId.custos.message).toBe('Custos aumentando');
    expect(byId.sla.message).toBe('SLA melhorando');
  });
});
