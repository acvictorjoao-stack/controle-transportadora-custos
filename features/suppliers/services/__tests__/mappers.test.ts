import {describe, expect, it} from 'vitest';

import {formatDateBr} from '../../utils/supplier-format';
import {mapSupplierStats} from '../mappers';

describe('estatísticas do fornecedor', () => {
  it('última compra (data convertida à meia-noite UTC pela RPC) mantém o dia da compra', () => {
    const stats = mapSupplierStats({last_purchase_at: '2026-09-26T00:00:00+00:00'});
    expect(stats.lastPurchaseAt).toBe('2026-09-26');
    expect(formatDateBr(stats.lastPurchaseAt)).toBe('26/09/2026');
  });

  it('aceita a data pura e ausência de compra', () => {
    expect(mapSupplierStats({last_purchase_at: '2026-09-26'}).lastPurchaseAt).toBe('2026-09-26');
    expect(mapSupplierStats({last_purchase_at: null}).lastPurchaseAt).toBeNull();
  });

  it('abastecimento continua instante: 23:30 em Brasília fica no próprio dia', () => {
    const stats = mapSupplierStats({last_fuel_at: '2026-11-06T02:30:00+00:00'});
    expect(formatDateBr(stats.lastFuelAt)).toBe('05/11/2026');
  });
});
