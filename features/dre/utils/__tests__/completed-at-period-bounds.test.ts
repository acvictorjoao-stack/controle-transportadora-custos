import {describe, expect, it} from 'vitest';

import {
  BUSINESS_TIMEZONE,
  addCivilDays,
  buildCompletedAtPeriodBounds,
  civilDateEndExclusiveUtcIso,
  civilDateStartUtcIso,
  isUtcInstantInCivilPeriod,
} from '../completed-at-period-bounds';

describe('Audit #15 — completed_at bounds in business timezone', () => {
  it('reuses project business timezone America/Sao_Paulo', () => {
    expect(BUSINESS_TIMEZONE).toBe('America/Sao_Paulo');
  });

  it('interprets date-only strings as local civil days, not raw UTC midnight', () => {
    // 2026-09-01 00:00 BRT = 2026-09-01T03:00:00.000Z
    expect(civilDateStartUtcIso('2026-09-01')).toBe('2026-09-01T03:00:00.000Z');
    // Exclusive end of 2026-09-01 = start of 2026-09-02 BRT
    expect(civilDateEndExclusiveUtcIso('2026-09-01')).toBe(
      '2026-09-02T03:00:00.000Z',
    );

    const bounds = buildCompletedAtPeriodBounds({
      dateFrom: '2026-09-01',
      dateTo: '2026-09-01',
    });
    expect(bounds).toEqual({
      gte: '2026-09-01T03:00:00.000Z',
      lt: '2026-09-02T03:00:00.000Z',
    });
    // Must NOT be the old UTC-literal end bound
    expect(bounds.lt).not.toBe('2026-09-01T23:59:59.999Z');
  });

  it('same local day: trip inside enters; trip after local end stays out', () => {
    const from = '2026-09-12';
    const to = '2026-09-12';

    // 23:30 BRT on Sep 12 = 02:30 UTC Sep 13 — still inside local day
    expect(
      isUtcInstantInCivilPeriod('2026-09-13T02:30:00.000Z', from, to),
    ).toBe(true);

    // Exactly local midnight next day = 03:00 UTC Sep 13 — outside
    expect(
      isUtcInstantInCivilPeriod('2026-09-13T03:00:00.000Z', from, to),
    ).toBe(false);

    // Mid-day clearly inside (unchanged vs old UTC filter for mid-day)
    expect(
      isUtcInstantInCivilPeriod('2026-09-12T15:00:00.000Z', from, to),
    ).toBe(true);
  });

  it('midnight boundary: 00:00:00 of next local day is outside previous period', () => {
    expect(
      isUtcInstantInCivilPeriod(
        '2026-10-01T03:00:00.000Z', // 00:00 BRT Oct 1
        '2026-09-01',
        '2026-09-30',
      ),
    ).toBe(false);

    // Last instant before next local midnight still inside September
    expect(
      isUtcInstantInCivilPeriod(
        '2026-10-01T02:59:59.999Z', // 23:59:59.999 BRT Sep 30
        '2026-09-01',
        '2026-09-30',
      ),
    ).toBe(true);
  });

  it('critical near-midnight Brazil case classifies by local civil day', () => {
    // 2026-09-30 22:30 BRT = 2026-10-01T01:30:00.000Z
    // Old filter lte(...T23:59:59.999Z) would EXCLUDE this (UTC Oct 1).
    // Correct local September period must INCLUDE it.
    expect(
      isUtcInstantInCivilPeriod(
        '2026-10-01T01:30:00.000Z',
        '2026-09-01',
        '2026-09-30',
      ),
    ).toBe(true);

    // 2026-08-31 22:00 BRT = 2026-09-01T01:00:00.000Z
    // Old filter gte('2026-09-01') as UTC midnight would INCLUDE this.
    // Correct local September must EXCLUDE (still Aug 31 local).
    expect(
      isUtcInstantInCivilPeriod(
        '2026-09-01T01:00:00.000Z',
        '2026-09-01',
        '2026-09-30',
      ),
    ).toBe(false);
  });

  it('monthly period: start of month, end of month, first instant of next month', () => {
    const bounds = buildCompletedAtPeriodBounds({
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
    });

    expect(bounds.gte).toBe('2026-09-01T03:00:00.000Z');
    expect(bounds.lt).toBe('2026-10-01T03:00:00.000Z');
    expect(addCivilDays('2026-09-30', 1)).toBe('2026-10-01');

    expect(
      isUtcInstantInCivilPeriod(
        bounds.gte!,
        '2026-09-01',
        '2026-09-30',
      ),
    ).toBe(true);
    expect(
      isUtcInstantInCivilPeriod(
        bounds.lt!,
        '2026-09-01',
        '2026-09-30',
      ),
    ).toBe(false);
  });

  it('regression: clearly mid-period instants remain inside (only borders change)', () => {
    const cases = [
      '2026-09-01T12:00:00.000Z',
      '2026-09-15T18:00:00.000Z',
      '2026-09-30T12:00:00.000Z',
    ];
    for (const iso of cases) {
      expect(
        isUtcInstantInCivilPeriod(iso, '2026-09-01', '2026-09-30'),
      ).toBe(true);
    }
  });

  it('omits missing bounds when dateFrom/dateTo absent', () => {
    expect(buildCompletedAtPeriodBounds({})).toEqual({});
    expect(buildCompletedAtPeriodBounds({dateFrom: '2026-01-01'})).toEqual({
      gte: '2026-01-01T03:00:00.000Z',
    });
    expect(buildCompletedAtPeriodBounds({dateTo: '2026-01-31'})).toEqual({
      lt: '2026-02-01T03:00:00.000Z',
    });
  });
});
