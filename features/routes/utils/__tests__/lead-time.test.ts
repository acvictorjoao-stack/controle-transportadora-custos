import {describe, expect, it} from 'vitest';

import {leadDaysFromStored, leadMinutesFromDays} from '../lead-time';
import {buildAutoRouteName, formatRouteDisplayName} from '../route-format';

describe('lead-time helpers (RC 28.1.0)', () => {
  it('converts days to minutes', () => {
    expect(leadMinutesFromDays(2)).toBe(2880);
  });

  it('prefers leadTimeDays when present', () => {
    expect(
      leadDaysFromStored({leadTimeDays: 3, leadTimeMinutes: 100}),
    ).toBe(3);
  });

  it('derives days from legacy minutes', () => {
    expect(leadDaysFromStored({leadTimeMinutes: 1440})).toBe(1);
    expect(leadDaysFromStored({leadTimeMinutes: 100})).toBe(1);
  });
});

describe('route display name', () => {
  it('uses custom name when provided', () => {
    expect(
      formatRouteDisplayName({
        name: 'Norte 01',
        origin: 'A',
        destination: 'B',
      }),
    ).toBe('Norte 01');
  });

  it('falls back to origem → destino', () => {
    expect(
      formatRouteDisplayName({
        name: null,
        origin: 'São Luís',
        destination: 'Imperatriz',
      }),
    ).toBe(buildAutoRouteName('São Luís', 'Imperatriz'));
  });
});
