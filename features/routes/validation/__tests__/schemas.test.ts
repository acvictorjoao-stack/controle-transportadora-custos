import {describe, expect, it} from 'vitest';

import {
  LEAD_TIME_REQUIRED_MESSAGE,
  UNLOAD_TIME_REQUIRED_MESSAGE,
  createRouteSchema,
} from '../schemas';

const baseInput = {
  name: 'São Luís → Bacabal',
  code: 'R01',
  origin: 'São Luís',
  destination: 'Bacabal',
  routeType: 'delivery' as const,
  plannedDistanceKm: 250,
  leadTimeMinutes: 240,
  unloadTimeMinutes: 60,
  notes: null,
  operationalStatus: 'active' as const,
};

describe('createRouteSchema (RC 28.0.2)', () => {
  it('accepts valid lead time and unload time', () => {
    const result = createRouteSchema.safeParse(baseInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.leadTimeMinutes).toBe(240);
      expect(result.data.unloadTimeMinutes).toBe(60);
    }
  });

  it('rejects missing lead time', () => {
    const result = createRouteSchema.safeParse({
      ...baseInput,
      leadTimeMinutes: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((item) =>
        item.path.includes('leadTimeMinutes'),
      );
      expect(issue?.message).toBe(LEAD_TIME_REQUIRED_MESSAGE);
    }
  });

  it('rejects zero lead time', () => {
    const result = createRouteSchema.safeParse({
      ...baseInput,
      leadTimeMinutes: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing unload time', () => {
    const result = createRouteSchema.safeParse({
      ...baseInput,
      unloadTimeMinutes: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((item) =>
        item.path.includes('unloadTimeMinutes'),
      );
      expect(issue?.message).toBe(UNLOAD_TIME_REQUIRED_MESSAGE);
    }
  });
});
