import {describe, expect, it} from 'vitest';

import {formatDateBr, isContractExpired, isContractExpiring} from '../customer-format';

// 31/10/2026 às 22:30 em Brasília (já 01/11 em UTC)
const LATE_NIGHT = new Date('2026-11-01T01:30:00Z');
// 31/10/2026 às 10:00 em Brasília
const MORNING = new Date('2026-10-31T13:00:00Z');

describe('datas do cliente', () => {
  it('mostra coluna date sem recuar um dia', () => {
    expect(formatDateBr('2026-10-31')).toBe('31/10/2026');
    expect(formatDateBr(null)).toBe('—');
  });

  it('mostra timestamptz no dia de Brasília, não no dia UTC', () => {
    expect(formatDateBr('2026-11-01T01:30:00+00:00')).toBe('31/10/2026');
  });

  it('contrato segue vigente no último dia, mesmo após 21h', () => {
    expect(isContractExpired('2026-10-31', MORNING)).toBe(false);
    expect(isContractExpired('2026-10-31', LATE_NIGHT)).toBe(false);
    expect(isContractExpired('2026-10-30', LATE_NIGHT)).toBe(true);
  });

  it('janela de vencimento parte de hoje em Brasília', () => {
    expect(isContractExpiring('2026-10-31', 30, LATE_NIGHT)).toBe(true);
    expect(isContractExpiring('2026-11-30', 30, LATE_NIGHT)).toBe(true);
    expect(isContractExpiring('2026-12-01', 30, LATE_NIGHT)).toBe(false);
    expect(isContractExpiring(null, 30, LATE_NIGHT)).toBe(false);
  });
});
