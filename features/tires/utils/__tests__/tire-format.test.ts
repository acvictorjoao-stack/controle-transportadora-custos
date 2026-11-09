import {describe, expect, it} from 'vitest';

import {formatDateBr, formatDateTimeBr} from '../tire-format';

describe('datas de pneus', () => {
  it('compra (coluna date) não recua um dia', () => {
    expect(formatDateBr('2026-11-05')).toBe('05/11/2026');
  });

  it('inspeção (timestamptz) perto da meia-noite usa o horário de Brasília', () => {
    expect(formatDateTimeBr('2026-11-06T02:59:00Z')).toBe('05/11/2026, 23:59:00');
    expect(formatDateTimeBr('2026-11-06T03:00:00Z')).toBe('06/11/2026, 00:00:00');
    expect(formatDateBr('2026-11-06T02:59:00Z')).toBe('05/11/2026');
  });

  it('vazio vira traço, sem "Invalid Date"', () => {
    expect(formatDateBr(undefined)).toBe('—');
    expect(formatDateTimeBr('xyz')).toBe('—');
  });
});
