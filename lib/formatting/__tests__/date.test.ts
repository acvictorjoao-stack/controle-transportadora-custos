import {describe, expect, it} from 'vitest';

import {
  BUSINESS_TIMEZONE,
  addCivilDays,
  formatDate,
  formatDateTime,
  toCivilDate,
  todayCivilDate,
} from '../date';

describe('formatação de datas no fuso de negócio', () => {
  it('usa o fuso configurado da empresa', () => {
    expect(BUSINESS_TIMEZONE).toBe('America/Sao_Paulo');
  });

  it('mantém o dia de uma coluna date, sem recuar para o dia anterior', () => {
    expect(formatDate('2026-11-05')).toBe('05/11/2026');
    expect(formatDate('2026-01-01')).toBe('01/01/2026');
    expect(formatDateTime('2026-11-05')).toBe('05/11/2026');
  });

  it('mostra timestamptz no horário de Brasília, inclusive perto da meia-noite', () => {
    // 22:30 em Brasília = 01:30 UTC do dia seguinte
    expect(formatDate('2026-11-06T01:30:00+00:00')).toBe('05/11/2026');
    expect(formatDateTime('2026-11-06T01:30:00+00:00')).toBe('05/11/2026, 22:30:00');
    expect(formatDateTime('2026-11-06T01:30:00.000Z', {seconds: false})).toBe(
      '05/11/2026, 22:30',
    );
    // 00:15 em Brasília
    expect(formatDateTime('2026-11-06T03:15:00Z')).toBe('06/11/2026, 00:15:00');
  });

  it('devolve traço para vazio ou valor inválido, sem "Invalid Date"', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
    expect(formatDate('não é data')).toBe('—');
    expect(formatDateTime('não é data')).toBe('—');
  });

  it('converte valores do banco em data civil', () => {
    expect(toCivilDate('2026-11-05')).toBe('2026-11-05');
    expect(toCivilDate('2026-11-06T01:30:00+00:00')).toBe('2026-11-05');
    expect(toCivilDate(null)).toBeNull();
    expect(toCivilDate('xyz')).toBeNull();
  });

  it('calcula hoje no fuso de negócio, não em UTC', () => {
    // 23:30 em Brasília de 05/11 = 02:30 UTC de 06/11
    expect(todayCivilDate(new Date('2026-11-06T02:30:00Z'))).toBe('2026-11-05');
    expect(todayCivilDate(new Date('2026-11-06T03:00:00Z'))).toBe('2026-11-06');
  });

  it('soma dias atravessando meses e anos', () => {
    expect(addCivilDays('2026-11-05', 30)).toBe('2026-12-05');
    expect(addCivilDays('2026-12-20', 30)).toBe('2027-01-19');
    expect(addCivilDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(() => addCivilDays('05/11/2026', 1)).toThrow(/Data civil inválida/);
  });
});
