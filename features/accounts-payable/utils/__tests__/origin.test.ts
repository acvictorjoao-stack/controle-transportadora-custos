import {describe, expect, it} from 'vitest';

import {
  formatAccountsPayableOrigin,
  getAccountsPayableOriginHref,
  isManualAccountsPayableEntry,
} from '../origin';

describe('accounts payable origin helpers', () => {
  it('formats manual origin', () => {
    expect(
      formatAccountsPayableOrigin({
        sourceModule: 'accounts_payable',
        sourceId: null,
        referenceNumber: null,
        fuelRecordId: null,
      }),
    ).toContain('Manual');
  });

  it('formats fuel origin with reference', () => {
    const label = formatAccountsPayableOrigin({
      sourceModule: 'fuel',
      sourceId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      referenceNumber: 'AB-000145',
      fuelRecordId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    });
    expect(label).toContain('Abastecimento');
    expect(label).toContain('AB-000145');
  });

  it('resolves origin href from FK', () => {
    expect(
      getAccountsPayableOriginHref({
        sourceModule: 'fuel',
        sourceId: null,
        fuelRecordId: 'fuel-1',
        maintenanceRecordId: null,
        tireId: null,
      }),
    ).toBe('/abastecimentos/fuel-1');

    expect(
      getAccountsPayableOriginHref({
        sourceModule: 'maintenance',
        sourceId: 'maint-1',
        fuelRecordId: null,
        maintenanceRecordId: null,
        tireId: null,
      }),
    ).toBe('/manutencoes/maint-1');

    expect(
      getAccountsPayableOriginHref({
        sourceModule: 'tires',
        sourceId: 'tire-1',
        fuelRecordId: null,
        maintenanceRecordId: null,
        tireId: null,
      }),
    ).toBe('/pneus/tire-1');
  });

  it('detects manual editable entries', () => {
    expect(
      isManualAccountsPayableEntry({
        sourceModule: 'accounts_payable',
        isSystemGenerated: false,
      }),
    ).toBe(true);
    expect(
      isManualAccountsPayableEntry({
        sourceModule: 'fuel',
        isSystemGenerated: true,
      }),
    ).toBe(false);
  });
});
