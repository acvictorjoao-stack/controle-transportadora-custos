import {describe, expect, it} from 'vitest';

import {resolveCostCenterCode} from '../resolve-cost-center';

describe('resolveCostCenterCode', () => {
  it('returns explicit code uppercased', () => {
    expect(resolveCostCenterCode({code: 'rh'})).toBe('RH');
    expect(resolveCostCenterCode({code: ' COMERCIAL '})).toBe('COMERCIAL');
  });

  it('maps operational source modules to OPERACIONAL', () => {
    expect(resolveCostCenterCode({sourceModule: 'fuel'})).toBe('OPERACIONAL');
    expect(resolveCostCenterCode({sourceModule: 'maintenance'})).toBe(
      'OPERACIONAL',
    );
    expect(resolveCostCenterCode({sourceModule: 'tires'})).toBe('OPERACIONAL');
    expect(resolveCostCenterCode({sourceModule: 'tolls'})).toBe('OPERACIONAL');
    expect(resolveCostCenterCode({sourceModule: 'fines'})).toBe('OPERACIONAL');
  });

  it('prefers explicit code over source module', () => {
    expect(
      resolveCostCenterCode({code: 'TI', sourceModule: 'fuel'}),
    ).toBe('TI');
  });

  it('returns null when nothing maps', () => {
    expect(resolveCostCenterCode({})).toBeNull();
    expect(resolveCostCenterCode({sourceModule: 'accounts_payable'})).toBeNull();
  });
});
