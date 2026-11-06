import {describe, expect, it} from 'vitest';

import {
  getReceivableBalance,
  getReceivableEffectiveAmount,
  isPartiallyReceived,
} from '../receivable-balance';

describe('saldo do título', () => {
  it('calcula o exemplo de frete parcial', () => {
    expect(
      getReceivableBalance({amount: 8500, adjustmentTotal: 0, paidAmount: 5000}),
    ).toBe(3500);
  });

  it('considera ajustes rastreáveis', () => {
    const entry = {amount: 8500, adjustmentTotal: 500, paidAmount: 5000};
    expect(getReceivableEffectiveAmount(entry)).toBe(9000);
    expect(getReceivableBalance(entry)).toBe(4000);
  });

  it('título sem recebimento tem saldo integral', () => {
    expect(getReceivableBalance({amount: 100, adjustmentTotal: 0, paidAmount: null})).toBe(100);
  });

  it('não acumula erro de ponto flutuante', () => {
    expect(getReceivableBalance({amount: 0.3, adjustmentTotal: 0, paidAmount: 0.1})).toBe(0.2);
  });
});

describe('isPartiallyReceived', () => {
  const entry = {amount: 100, adjustmentTotal: 0, paidAmount: 40};

  it('aberto com recebimento é parcial', () => {
    expect(isPartiallyReceived({...entry, entryStatus: 'pending'})).toBe(true);
    expect(isPartiallyReceived({...entry, entryStatus: 'overdue'})).toBe(true);
  });

  it('quitado ou sem recebimento não é parcial', () => {
    expect(isPartiallyReceived({...entry, entryStatus: 'paid'})).toBe(false);
    expect(isPartiallyReceived({...entry, paidAmount: null, entryStatus: 'pending'})).toBe(false);
  });
});
