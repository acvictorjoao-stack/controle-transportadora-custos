import {describe, expect, it} from 'vitest';

import {ACCOUNTS_PAYABLE_MANAGED_SOURCE_MODULES} from '@/features/accounts-payable/constants';
import {
  formatAccountsPayableOrigin,
  getAccountsPayableOriginHref,
  isAccountsPayableManagedEntry,
  isManualAccountsPayableEntry,
} from '@/features/accounts-payable/utils/origin';
import {PAYROLL_SOURCE_MODULE} from '@/features/financial/constants/operation-financial';
import {resolveTripFinancialOriginLabel} from '@/features/financial/utils/trip-financial-origin';
import {ROUTES} from '@/constants/routes/paths';

const payrollEntry = {
  sourceModule: PAYROLL_SOURCE_MODULE,
  sourceId: 'expense-1',
  referenceNumber: null,
  fuelRecordId: null,
  maintenanceRecordId: null,
  tireId: null,
};

describe('folha em Contas a Pagar', () => {
  it('payroll está na whitelist de módulos geridos', () => {
    expect(ACCOUNTS_PAYABLE_MANAGED_SOURCE_MODULES).toContain(PAYROLL_SOURCE_MODULE);
  });

  it('lançamento de folha é reconhecido como conta a pagar', () => {
    expect(isAccountsPayableManagedEntry(payrollEntry)).toBe(true);
  });

  it('não é editável em Contas a Pagar: alteração acontece na origem', () => {
    expect(
      isManualAccountsPayableEntry({
        sourceModule: PAYROLL_SOURCE_MODULE,
        isSystemGenerated: true,
      }),
    ).toBe(false);
  });

  it('exibe a origem como Folha', () => {
    expect(formatAccountsPayableOrigin(payrollEntry)).toContain('Folha');
  });

  it('abre a origem na listagem de despesas de pessoal', () => {
    expect(getAccountsPayableOriginHref(payrollEntry)).toBe(
      `${ROUTES.despesasDePessoal}?sourceId=expense-1`,
    );
  });

  it('rotula a ação de abrir origem', () => {
    expect(resolveTripFinancialOriginLabel(PAYROLL_SOURCE_MODULE)).toBe(
      'Abrir despesa de pessoal',
    );
  });

  it('sem source_id não inventa destino', () => {
    expect(
      getAccountsPayableOriginHref({...payrollEntry, sourceId: null}),
    ).toBeNull();
  });
});
