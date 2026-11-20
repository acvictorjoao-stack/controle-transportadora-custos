import {describe, expect, it} from 'vitest';

import {formatCustomerTripResult, resolveCustomerTripResult} from '../customer-trip-result';

const brl = (value: number) => `R$ ${value}`;

describe('resultado da viagem na ficha do cliente', () => {
  it('viagem concluída com acesso ao financeiro: valor definitivo', () => {
    const result = resolveCustomerTripResult({result: 8000, financialVisible: true}, 'completed');
    expect(result).toEqual({kind: 'final', value: 8000});
    expect(formatCustomerTripResult(result, brl)).toBe('R$ 8000');
  });

  it('viagem concluída com prejuízo também é definitiva', () => {
    expect(resolveCustomerTripResult({result: -150, financialVisible: true}, 'completed')).toEqual({
      kind: 'final',
      value: -150,
    });
  });

  it.each(['planned', 'scheduled', 'loading', 'in_progress', 'delivering', 'waiting'])(
    'viagem %s mostra "Parcial", sem número que pareça lucro',
    (status) => {
      // Sem custos ainda, o resumo daria resultado = frete inteiro.
      const result = resolveCustomerTripResult({result: 21290, financialVisible: true}, status);
      expect(result).toEqual({kind: 'partial'});
      expect(formatCustomerTripResult(result, brl)).toBe('Parcial');
    },
  );

  it('viagem cancelada não tem resultado', () => {
    const result = resolveCustomerTripResult({result: 5000, financialVisible: true}, 'cancelled');
    expect(formatCustomerTripResult(result, brl)).toBe('—');
  });

  it('usuário com trips:read e sem financeiro:read vê "—", mesmo em viagem concluída', () => {
    // A view devolve result NULL e financial_visible false para esse usuário.
    const result = resolveCustomerTripResult({result: null, financialVisible: false}, 'completed');
    expect(result).toEqual({kind: 'unavailable'});
    expect(formatCustomerTripResult(result, brl)).toBe('—');
  });

  it('sem acesso, nenhum valor aparece mesmo que viesse preenchido', () => {
    expect(
      resolveCustomerTripResult({result: 10000, financialVisible: false}, 'completed'),
    ).toEqual({kind: 'unavailable'});
  });

  it('sem resumo (view ausente ou erro) mostra "—"', () => {
    expect(formatCustomerTripResult(resolveCustomerTripResult(undefined, 'completed'), brl)).toBe('—');
  });
});
