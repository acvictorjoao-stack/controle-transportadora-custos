import {describe, expect, it} from 'vitest';

import type {FinancialEntry} from '@/features/financial/types';

import {getCashFlowAmount, mapCashFlowLine} from '../cash-flow-mappers';

const entry = {
  id: 'title-1',
  sourceModule: 'accounts_receivable',
  entryType: 'revenue',
  entryStatus: 'pending',
  amount: 8500,
  adjustmentTotal: 0,
  paidAmount: 5000,
  client: 'Cliente',
} as FinancialEntry;

describe('mapCashFlowLine', () => {
  it('recebimento entra pelo valor da linha, não pelo valor do título', () => {
    const line = mapCashFlowLine(
      entry,
      {lineId: 'm1', status: 'paid', movementDate: '2026-11-05', amount: 5000},
      5000,
    );

    expect(line.entrada).toBe(5000);
    expect(line.saida).toBeNull();
    expect(line.movementDate).toBe('2026-11-05');
    expect(line.entryStatus).toBe('paid');
    expect(line.id).toBe('title-1');
    expect(line.lineId).toBe('m1');
  });

  it('estorno de recebimento reduz o caixa', () => {
    const line = mapCashFlowLine(
      entry,
      {lineId: 'm2', status: 'paid', movementDate: '2026-11-06', amount: -5000},
      0,
    );

    expect(line.entrada).toBeNull();
    expect(line.saida).toBe(5000);
    expect(line.signedAmount).toBe(-5000);
  });

  it('pagamento sai do caixa', () => {
    const line = mapCashFlowLine(
      {...entry, sourceModule: 'accounts_payable', entryType: 'expense'},
      {lineId: 'p1', status: 'paid', movementDate: '2026-11-06', amount: 300},
      -300,
    );

    expect(line.saida).toBe(300);
    expect(line.signedAmount).toBe(-300);
  });
});

describe('getCashFlowAmount', () => {
  it('título aberto mostra o saldo', () => {
    expect(getCashFlowAmount(entry)).toBe(3500);
  });

  it('título quitado mostra o recebido', () => {
    expect(getCashFlowAmount({...entry, entryStatus: 'paid', paidAmount: 8500})).toBe(8500);
  });
});
