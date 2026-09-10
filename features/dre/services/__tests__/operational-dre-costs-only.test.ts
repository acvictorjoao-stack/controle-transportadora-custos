import {describe, expect, it} from 'vitest';

import {
  isOperationalDreCostsOnlyMode,
  OPERATIONAL_DRE_COSTS_ONLY_BANNER,
} from '../operational-dre-costs-only';

describe('isOperationalDreCostsOnlyMode', () => {
  it('is false without cost center', () => {
    expect(isOperationalDreCostsOnlyMode({})).toBe(false);
    expect(isOperationalDreCostsOnlyMode({vehicleId: 'v1'})).toBe(false);
  });

  it('is true when costCenterId is set', () => {
    expect(isOperationalDreCostsOnlyMode({costCenterId: 'cc-1'})).toBe(true);
  });

  it('exposes stable banner copy', () => {
    expect(OPERATIONAL_DRE_COSTS_ONLY_BANNER).toMatch(/apenas custos/i);
    expect(OPERATIONAL_DRE_COSTS_ONLY_BANNER).toMatch(/receita de frete/i);
  });
});
