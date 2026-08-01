import {describe, expect, it} from 'vitest';

import {LEAD_TIME_REQUIRED_MESSAGE, createRouteSchema} from '../schemas';

const baseInput = {
  name: 'São Luís → Imperatriz',
  code: 'R01',
  origin: 'São Luís',
  destination: 'Imperatriz',
  routeType: 'delivery' as const,
  plannedDistanceKm: 250,
  leadTimeDays: 2,
  customerId: '11111111-1111-4111-8111-111111111111',
  branchId: '22222222-2222-4222-8222-222222222222',
  notes: null,
  operationalStatus: 'active' as const,
};

describe('createRouteSchema (RC 28.1.0)', () => {
  it('accepts valid lead time in days', () => {
    const result = createRouteSchema.safeParse(baseInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.leadTimeDays).toBe(2);
      expect(result.data.name).toBe('São Luís → Imperatriz');
    }
  });

  it('fills name from origin → destination when empty', () => {
    const result = createRouteSchema.safeParse({
      ...baseInput,
      name: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('SÃO LUÍS → IMPERATRIZ');
    }
  });

  it('rejects name longer than 150 characters', () => {
    const result = createRouteSchema.safeParse({
      ...baseInput,
      name: 'A'.repeat(151),
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing lead time', () => {
    const result = createRouteSchema.safeParse({
      ...baseInput,
      leadTimeDays: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((item) =>
        item.path.includes('leadTimeDays'),
      );
      expect(issue?.message).toBe(LEAD_TIME_REQUIRED_MESSAGE);
    }
  });

  it('rejects zero lead time', () => {
    const result = createRouteSchema.safeParse({
      ...baseInput,
      leadTimeDays: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing customer', () => {
    const result = createRouteSchema.safeParse({
      ...baseInput,
      customerId: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing branch', () => {
    const result = createRouteSchema.safeParse({
      ...baseInput,
      branchId: null,
    });
    expect(result.success).toBe(false);
  });

  it('does not require unload time', () => {
    const result = createRouteSchema.safeParse(baseInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect('unloadTimeMinutes' in result.data).toBe(false);
    }
  });
});
