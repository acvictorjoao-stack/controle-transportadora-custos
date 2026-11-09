import {describe, expect, it} from 'vitest';

import {formatDateBr, formatDateTimeBr} from '../financial-format';

describe('datas do financeiro', () => {
  it('vencimento (coluna date) não recua um dia', () => {
    expect(formatDateBr('2026-11-05')).toBe('05/11/2026');
    expect(formatDateBr('2026-01-01')).toBe('01/01/2026');
  });

  it('pagamento (timestamptz) após 21h fica no dia de Brasília', () => {
    expect(formatDateBr('2026-11-06T01:30:00+00:00')).toBe('05/11/2026');
    expect(formatDateTimeBr('2026-11-06T01:30:00+00:00')).toBe('05/11/2026, 22:30:00');
  });

  it('valor vazio ou inválido vira traço', () => {
    expect(formatDateBr(null)).toBe('—');
    expect(formatDateTimeBr(null)).toBe('—');
    expect(formatDateTimeBr('xyz')).toBe('—');
  });
});
