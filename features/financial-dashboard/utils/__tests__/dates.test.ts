import {afterEach, describe, expect, it, vi} from 'vitest';

import {localDateIso, paidAtDateIso, startOfMonthIso} from '../dates';

describe('datas do painel financeiro', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('hoje e início do mês seguem Brasília no último dia do mês após 21h', () => {
    vi.useFakeTimers();
    // 22:30 de 31/10 em Brasília = 01:30 UTC de 01/11
    vi.setSystemTime(new Date('2026-11-01T01:30:00Z'));
    expect(localDateIso()).toBe('2026-10-31');
    expect(startOfMonthIso()).toBe('2026-10-01');
  });

  it('mantém dia/mês/ano de uma data local informada', () => {
    expect(localDateIso(new Date(2026, 1, 28))).toBe('2026-02-28');
    expect(startOfMonthIso(new Date(2026, 1, 28))).toBe('2026-02-01');
  });

  it('data do pagamento no dia de Brasília', () => {
    expect(paidAtDateIso('2026-11-06T01:30:00+00:00')).toBe('2026-11-05');
    expect(paidAtDateIso('2026-11-05')).toBe('2026-11-05');
    expect(paidAtDateIso(null)).toBeNull();
  });
});
