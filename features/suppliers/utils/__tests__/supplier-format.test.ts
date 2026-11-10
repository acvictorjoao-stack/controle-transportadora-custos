import {describe, expect, it} from 'vitest';

import {formatDateBr} from '../supplier-format';

describe('datas de fornecedores', () => {
  it('coluna date não recua um dia', () => {
    expect(formatDateBr('2026-11-05')).toBe('05/11/2026');
  });

  it('cadastro (timestamptz) após 21h fica no dia de Brasília', () => {
    expect(formatDateBr('2026-11-06T00:15:00Z')).toBe('05/11/2026');
  });

  it('vazio ou inválido vira traço', () => {
    expect(formatDateBr(null)).toBe('—');
    expect(formatDateBr('xyz')).toBe('—');
  });
});
