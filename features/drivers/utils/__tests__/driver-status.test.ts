import {describe, expect, it} from 'vitest';

import {formatDateBr, isCnhExpired, isCnhExpiring} from '../driver-status';

// 05/11/2026 às 10:00 em Brasília
const MORNING = new Date('2026-11-05T13:00:00Z');
// 05/11/2026 às 23:30 em Brasília (já 06/11 em UTC)
const LATE_NIGHT = new Date('2026-11-06T02:30:00Z');

describe('datas do motorista', () => {
  it('mostra a data de coluna date sem recuar um dia', () => {
    expect(formatDateBr('2026-11-05')).toBe('05/11/2026');
    expect(formatDateBr('1990-01-01')).toBe('01/01/1990');
    expect(formatDateBr(null)).toBe('—');
  });

  it('CNH continua válida no próprio dia da validade', () => {
    expect(isCnhExpired('2026-11-05', MORNING)).toBe(false);
    expect(isCnhExpired('2026-11-05', LATE_NIGHT)).toBe(false);
    expect(isCnhExpired('2026-11-04', MORNING)).toBe(true);
  });

  it('não antecipa o vencimento quando já é outro dia em UTC', () => {
    expect(isCnhExpired('2026-11-05', LATE_NIGHT)).toBe(false);
    expect(isCnhExpiring('2026-11-05', 30, LATE_NIGHT)).toBe(true);
  });

  it('marca como a vencer dentro da janela, incluindo os extremos', () => {
    expect(isCnhExpiring('2026-11-05', 30, MORNING)).toBe(true);
    expect(isCnhExpiring('2026-12-05', 30, MORNING)).toBe(true);
    expect(isCnhExpiring('2026-12-06', 30, MORNING)).toBe(false);
    expect(isCnhExpiring('2026-11-04', 30, MORNING)).toBe(false);
  });

  it('ignora validade ausente ou inválida', () => {
    expect(isCnhExpired(null, MORNING)).toBe(false);
    expect(isCnhExpiring(null, 30, MORNING)).toBe(false);
    expect(isCnhExpired('xyz', MORNING)).toBe(false);
  });
});
