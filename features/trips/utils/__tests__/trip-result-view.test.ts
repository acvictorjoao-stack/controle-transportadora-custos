import {describe, expect, it} from 'vitest';

import type {TripFinancialSummary} from '../../types/trip-financial-summary';
import {buildTripResultView} from '../trip-result-view';

function summary(overrides: Partial<TripFinancialSummary> = {}): TripFinancialSummary {
  return {
    tripId: 't1',
    tripNumber: 'V1',
    tripStatus: 'completed',
    completedAt: '2026-11-05T15:00:00Z',
    freightAmount: 10000,
    directCosts: 2300,
    fuelCosts: 2000,
    maintenanceCosts: 0,
    tireCosts: 0,
    otherCosts: 300,
    directCostEntries: 2,
    tripExpenseCosts: 0,
    result: 7700,
    marginPercent: 77,
    advancesTotal: 0,
    reimbursementsTotal: 0,
    unpostedTripExpensesAmount: 0,
    unpostedTripExpensesCount: 0,
    legacyAdvanceExpensesAmount: 0,
    legacyAdvanceExpensesCount: 0,
    receivableEntryId: null,
    receivableStatus: null,
    receivableAmount: null,
    receivableReceived: null,
    receivableBalance: null,
    financialVisible: true,
    ...overrides,
  };
}

describe('buildTripResultView', () => {
  it('usa frete, custo e resultado do resumo (mesma conta da DRE)', () => {
    const view = buildTripResultView(summary(), 0);
    expect(view).toMatchObject({
      state: 'ready',
      freight: 10000,
      directCosts: 2300,
      result: 7700,
      marginPercent: 77,
      unpostedNotice: null,
      advanceNotice: null,
    });
    if (view.state === 'ready') {
      expect(view.costLines).toEqual([
        {label: 'Combustível', amount: 2000},
        {label: 'Outros', amount: 300},
      ]);
    }
  });

  it('sem resumo não inventa resultado com a aba Despesas', () => {
    expect(buildTripResultView(null, 8000)).toEqual({state: 'unavailable', freight: 8000});
  });

  it('usuário com trips:read e sem financeiro:read (campos nulos da view) não vê resultado', () => {
    const view = buildTripResultView(
      summary({
        financialVisible: false,
        directCosts: null,
        fuelCosts: null,
        otherCosts: null,
        result: null,
        marginPercent: null,
        advancesTotal: null,
        unpostedTripExpensesAmount: null,
        unpostedTripExpensesCount: null,
      }),
      0,
    );
    expect(view).toEqual({state: 'restricted', freight: 10000});
  });

  it('com acesso mas resultado nulo não troca nulo por zero', () => {
    expect(buildTripResultView(summary({result: null, directCosts: null}), 0)).toEqual({
      state: 'unavailable',
      freight: 10000,
    });
  });

  it('sem acesso ao financeiro não mostra um resultado incompleto', () => {
    expect(buildTripResultView(summary({financialVisible: false}), 0)).toEqual({
      state: 'restricted',
      freight: 10000,
    });
  });

  it('avisa as despesas da aba fora do financeiro e o adiantamento', () => {
    const view = buildTripResultView(
      summary({
        unpostedTripExpensesAmount: 450,
        unpostedTripExpensesCount: 2,
        advancesTotal: 300,
        legacyAdvanceExpensesAmount: 200,
      }),
      0,
    );
    if (view.state !== 'ready') throw new Error('esperava ready');
    expect(view.result).toBe(7700);
    expect(view.unpostedNotice).toContain('450,00');
    expect(view.unpostedNotice).toContain('2 despesa(s)');
    expect(view.advanceNotice).toContain('500,00');
  });
});
