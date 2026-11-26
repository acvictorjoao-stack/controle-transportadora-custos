import {describe, expect, it} from 'vitest';

import {buildOperationalAlerts} from '../alerts';
import type {TopCustomerRankingItem} from '../rankings';

function customer(id: string, profit: number | null): TopCustomerRankingItem {
  return {id, name: `Cliente ${id}`, revenue: 1000, profit, marginPercent: null};
}

function build(input: {
  current: TopCustomerRankingItem[];
  previous: TopCustomerRankingItem[];
  overdue?: number;
}) {
  return buildOperationalAlerts({
    financial: {proximosVencimentos: []} as never,
    maintenance: {overdueSchedules: input.overdue ?? 0},
    currentRoutes: [],
    topCustomers: input.current,
    previousCustomers: input.previous,
  });
}

describe('alertas — comparação e atalho só com base comparável', () => {
  it('queda de lucro traz a comparação com o período anterior e o atalho do cliente', () => {
    const [alert] = build({current: [customer('a', 600)], previous: [customer('a', 1000)]});
    expect(alert.description).toBe('Lucro 40% abaixo do período anterior.');
    expect(alert.comparison).toEqual({metric: 'Lucro', previous: 1000, current: 600, changePercent: -40});
    expect(alert.target).toEqual({kind: 'customer', customerId: 'a'});
  });

  it('sem período anterior, sem lucro anterior positivo ou sem lucro atual: nenhum alerta', () => {
    expect(build({current: [customer('a', 600)], previous: []})).toEqual([]);
    expect(build({current: [customer('a', 600)], previous: [customer('a', 0)]})).toEqual([]);
    expect(build({current: [customer('a', 600)], previous: [customer('a', null)]})).toEqual([]);
    expect(build({current: [customer('a', null)], previous: [customer('a', 1000)]})).toEqual([]);
  });

  it('queda abaixo de 20% não gera alerta', () => {
    expect(build({current: [customer('a', 850)], previous: [customer('a', 1000)]})).toEqual([]);
  });

  it('alertas sem comparação não inventam variação, mas têm atalho', () => {
    const [alert] = build({current: [], previous: [], overdue: 2});
    expect(alert.comparison).toBeUndefined();
    expect(alert.target).toEqual({kind: 'path', href: '/manutencoes'});
  });
});
