import {describe, expect, it} from 'vitest';

import type {CockpitMetricSnapshot} from '../../types';
import {buildGoalProgress, buildOperationalScore} from '../goals-and-score';
import {parseCockpitPeriodPreset, resolveCockpitPeriod} from '../period';

function snapshot(
  overrides: Partial<CockpitMetricSnapshot> = {},
): CockpitMetricSnapshot {
  return {
    receita: 1_820_000,
    lucro: 200_000,
    margem: 11,
    custos: 1_620_000,
    sla: 92,
    leadTime: 180,
    custoKm: 4.5,
    receitaKm: 5,
    lucroKm: 0.5,
    ocorrencias: 2,
    tripCount: 40,
    totalKm: 40000,
    ...overrides,
  };
}

describe('buildOperationalScore', () => {
  it('returns excellent score for strong operations', () => {
    const goals = {
      receita: 2_000_000,
      lucro: 250_000,
      margem: 20,
      sla: 90,
      leadTime: 240,
      custoKm: 5,
      receitaKm: 4,
      lucroKm: 0.4,
    };
    const progress = buildGoalProgress(snapshot({margem: 22, sla: 95}), goals);
    const score = buildOperationalScore(
      snapshot({margem: 22, sla: 95, ocorrencias: 1}),
      progress,
      goals,
    );

    expect(score.value).toBeGreaterThanOrEqual(70);
    expect(score.breakdown).toHaveLength(5);
    expect(score.label).toMatch(/Excelente|Bom|Atenção/);
  });
});

describe('resolveCockpitPeriod', () => {
  it('resolves hoje / semana / mes / ano', () => {
    const now = new Date(2026, 6, 27); // Jul 27 2026
    expect(resolveCockpitPeriod('hoje', now)).toEqual({
      dateFrom: '2026-07-27',
      dateTo: '2026-07-27',
    });
    expect(resolveCockpitPeriod('semana', now).dateFrom).toBe('2026-07-21');
    expect(resolveCockpitPeriod('mes', now).dateFrom).toBe('2026-07-01');
    expect(resolveCockpitPeriod('ano', now).dateFrom).toBe('2026-01-01');
  });

  it('parses period preset from query', () => {
    expect(parseCockpitPeriodPreset('hoje')).toBe('hoje');
    expect(parseCockpitPeriodPreset('invalid')).toBe('mes');
  });
});
