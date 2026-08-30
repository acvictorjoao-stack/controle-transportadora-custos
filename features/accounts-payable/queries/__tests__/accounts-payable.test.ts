import {beforeEach, describe, expect, it, vi} from 'vitest';

import {listAccountsPayable} from '../accounts-payable';

const listFinancialEntries = vi.fn();

vi.mock('@/features/financial/queries', () => ({
  listFinancialEntries: (...args: unknown[]) => listFinancialEntries(...args),
  createFinancialEntry: vi.fn(),
  getFinancialDetail: vi.fn(),
  getFinancialEntryById: vi.fn(),
  cancelFinancialEntry: vi.fn(),
  listFinancialFilterOptions: vi.fn(),
  listFinancialHistory: vi.fn(),
  markFinancialEntryPaid: vi.fn(),
  softDeleteFinancialEntry: vi.fn(),
  updateFinancialEntry: vi.fn(),
}));

beforeEach(() => {
  listFinancialEntries.mockReset();
  listFinancialEntries.mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  });
});

describe('Contas a Pagar e estornos', () => {
  it('exclui lançamentos reversed da consulta ativa', async () => {
    const supabase = {};

    await listAccountsPayable(supabase as never, {companyId: 'company-1'});

    expect(listFinancialEntries).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({excludeReversed: true}),
    );
  });
});
