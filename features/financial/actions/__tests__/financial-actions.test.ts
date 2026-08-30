import {beforeEach, describe, expect, it, vi} from 'vitest';

const supabase = {};
const getCurrentCompanyId = vi.fn();
const getUserCompanyMembership = vi.fn();
const assertCompanyPermission = vi.fn();
const getFinancialEntryById = vi.fn();
const updateFinancialEntry = vi.fn();
const cancelFinancialEntry = vi.fn();
const reverseFinancialEntry = vi.fn();
const softDeleteFinancialEntry = vi.fn();

vi.mock('@/lib/auth/company', () => ({
  COMPANY_ACCESS_DENIED: 'Acesso negado',
  getCurrentCompanyId: (...args: unknown[]) => getCurrentCompanyId(...args),
  getServerSupabaseClient: async () => supabase,
  getUserCompanyMembership: (...args: unknown[]) => getUserCompanyMembership(...args),
  assertCompanyPermission: (...args: unknown[]) => assertCompanyPermission(...args),
}));

vi.mock('@/features/financial/queries', () => ({
  createFinancialDocument: vi.fn(),
  createFinancialEntry: vi.fn(),
  getFinancialEntryById: (...args: unknown[]) => getFinancialEntryById(...args),
  cancelFinancialEntry: (...args: unknown[]) => cancelFinancialEntry(...args),
  markFinancialEntryPaid: vi.fn(),
  reverseFinancialEntry: (...args: unknown[]) => reverseFinancialEntry(...args),
  softDeleteFinancialDocument: vi.fn(),
  softDeleteFinancialEntry: (...args: unknown[]) => softDeleteFinancialEntry(...args),
  updateFinancialEntry: (...args: unknown[]) => updateFinancialEntry(...args),
}));

vi.mock('next/cache', () => ({revalidatePath: vi.fn()}));

const {
  cancelFinancialEntryAction,
  deleteFinancialEntryAction,
  reverseFinancialEntryAction,
  updateFinancialEntryAction,
} = await import('../financial-actions');

const payrollEntry = {
  id: 'entry-1',
  sourceModule: 'payroll',
  sourceId: 'payroll-1',
};

function validInput() {
  return {
    entryType: 'expense',
    entryStatus: 'pending',
    amount: 100,
    entryDate: '2026-03-01',
    dueDate: '2026-04-01',
    categoryId: null,
    costCenterId: null,
    branchId: null,
    vehicleId: null,
    driverId: null,
    tripId: null,
    description: 'Folha',
    referenceNumber: null,
    supplierId: null,
    supplier: null,
    client: null,
    currency: 'BRL',
    notes: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentCompanyId.mockResolvedValue('company-1');
  getUserCompanyMembership.mockResolvedValue({
    companyId: 'company-1',
    profileId: 'profile-1',
    roleId: 'role-1',
    defaultBranchId: null,
  });
  assertCompanyPermission.mockResolvedValue(true);
  getFinancialEntryById.mockResolvedValue(payrollEntry);
});

describe('origem payroll no Financeiro genérico', () => {
  it('bloqueia edição, cancelamento, estorno e exclusão', async () => {
    const results = await Promise.all([
      updateFinancialEntryAction('entry-1', validInput()),
      cancelFinancialEntryAction('entry-1'),
      reverseFinancialEntryAction('entry-1'),
      deleteFinancialEntryAction('entry-1'),
    ]);

    for (const result of results) {
      expect(result).toEqual({
        success: false,
        error: 'Despesas de pessoal devem ser alteradas pelo módulo de Despesas de Pessoal.',
      });
    }
    expect(updateFinancialEntry).not.toHaveBeenCalled();
    expect(cancelFinancialEntry).not.toHaveBeenCalled();
    expect(reverseFinancialEntry).not.toHaveBeenCalled();
    expect(softDeleteFinancialEntry).not.toHaveBeenCalled();
  });
});
