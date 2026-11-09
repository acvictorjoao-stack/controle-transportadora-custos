import {afterEach, describe, expect, it, vi} from 'vitest';

import {resolveCockpitPeriod} from '@/features/executive-cockpit/utils/period';
import {buildChartDayKeys} from '@/features/operational-intelligence/utils/compose';
import {currentMonthFilters} from '@/features/organization/dashboard/utils/period';
import {currentCompetenceMonthInput} from '@/features/payroll/utils/competence';

import {matchNamedPeriodPreset, resolveNamedPeriodRange, resolvePeriodPreset} from '../list-url';

/**
 * 22:30 de 31/10/2026 em Brasília = 01:30 UTC de 01/11/2026.
 * O servidor (UTC) já está em novembro; o negócio ainda está em outubro.
 */
const LAST_DAY_LATE_NIGHT = new Date('2026-11-01T01:30:00Z');

describe('períodos partem de hoje no fuso de negócio', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('presets de calendário da DRE ficam em outubro', () => {
    expect(resolveNamedPeriodRange('hoje', LAST_DAY_LATE_NIGHT)).toEqual({
      dateFrom: '2026-10-31',
      dateTo: '2026-10-31',
    });
    expect(resolveNamedPeriodRange('este-mes', LAST_DAY_LATE_NIGHT)).toEqual({
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
    });
    expect(resolveNamedPeriodRange('mes-anterior', LAST_DAY_LATE_NIGHT)).toEqual({
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
    });
  });

  it('janela rolante termina hoje em Brasília', () => {
    expect(resolvePeriodPreset('7d', LAST_DAY_LATE_NIGHT)).toEqual({
      dateFrom: '2026-10-25',
      dateTo: '2026-10-31',
    });
  });

  it('o preset selecionado continua reconhecido após 21h', () => {
    expect(
      matchNamedPeriodPreset(
        {dateFrom: '2026-10-01', dateTo: '2026-10-31'},
        LAST_DAY_LATE_NIGHT,
      ),
    ).toBe('este-mes');
  });

  it('mês padrão do dashboard é o mês de Brasília', () => {
    vi.useFakeTimers();
    vi.setSystemTime(LAST_DAY_LATE_NIGHT);
    expect(currentMonthFilters()).toEqual({
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
    });
  });

  it('cockpit executivo usa o dia de Brasília', () => {
    expect(resolveCockpitPeriod('hoje', LAST_DAY_LATE_NIGHT)).toEqual({
      dateFrom: '2026-10-31',
      dateTo: '2026-10-31',
    });
    expect(resolveCockpitPeriod('mes', LAST_DAY_LATE_NIGHT)).toEqual({
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
    });
  });

  it('eixo diário da inteligência operacional termina hoje em Brasília', () => {
    const keys = buildChartDayKeys(LAST_DAY_LATE_NIGHT);
    expect(keys).toHaveLength(7);
    expect(keys[0]).toBe('2026-10-25');
    expect(keys[6]).toBe('2026-10-31');
  });

  it('competência atual da folha é o mês de Brasília', () => {
    expect(currentCompetenceMonthInput(LAST_DAY_LATE_NIGHT)).toBe('2026-10');
    expect(currentCompetenceMonthInput(new Date('2026-11-01T03:00:00Z'))).toBe('2026-11');
  });
});
