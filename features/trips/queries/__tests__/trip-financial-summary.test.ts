import {describe, expect, it, vi} from 'vitest';

import {
  listTripFinancialSummaries,
  mapTripFinancialSummaryRow,
} from '../trip-financial-summary';

const row = {
  trip_id: 't1',
  trip_number: 'V1',
  trip_status: 'completed',
  completed_at: '2026-11-05T15:00:00Z',
  freight_amount: '10000.00',
  direct_costs: '2300.00',
  fuel_costs: '2000.00',
  maintenance_costs: '0.00',
  tire_costs: '0.00',
  other_costs: '300.00',
  direct_cost_entries: 2,
  result: '7700.00',
  margin_percent: '77.00',
  advances_total: '0',
  reimbursements_total: '0',
  unposted_trip_expenses_amount: '140.00',
  unposted_trip_expenses_count: 1,
  legacy_advance_expenses_amount: '0',
  legacy_advance_expenses_count: 0,
  receivable_entry_id: null,
  receivable_status: null,
  receivable_amount: null,
  receivable_received: null,
  receivable_balance: null,
  financial_visible: true,
};

describe('trip_financial_summary — leitura', () => {
  it('converte os numéricos que o PostgREST devolve como texto', () => {
    expect(mapTripFinancialSummaryRow(row)).toMatchObject({
      freightAmount: 10000,
      directCosts: 2300,
      result: 7700,
      marginPercent: 77,
      unpostedTripExpensesAmount: 140,
      receivableAmount: null,
      financialVisible: true,
    });
  });

  it('financial_visible nulo conta como sem acesso', () => {
    expect(mapTripFinancialSummaryRow({...row, financial_visible: null}).financialVisible).toBe(false);
  });

  it('não consulta o banco sem viagens', async () => {
    const supabase = {from: vi.fn()};
    const result = await listTripFinancialSummaries(supabase as never, 'c1', []);
    expect(result.size).toBe(0);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('lê só a empresa e as viagens pedidas, sem repetir ids', async () => {
    const inFilter = vi.fn(async () => ({data: [row], error: null}));
    const eq = vi.fn(() => ({in: inFilter}));
    const select = vi.fn(() => ({eq}));
    const supabase = {from: vi.fn(() => ({select}))};

    const result = await listTripFinancialSummaries(supabase as never, 'c1', ['t1', 't1']);

    expect(supabase.from).toHaveBeenCalledWith('trip_financial_summary');
    expect(eq).toHaveBeenCalledWith('company_id', 'c1');
    expect(inFilter).toHaveBeenCalledWith('trip_id', ['t1']);
    expect(result.get('t1')?.result).toBe(7700);
  });
});
