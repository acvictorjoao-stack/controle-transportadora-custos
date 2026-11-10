import {describe, expect, it} from 'vitest';

import {
  BUSINESS_TIMEZONE,
  addCivilDays,
  dateTimeInputToIso,
  formatDate,
  formatDateTime,
  formatTime,
  hourInBusinessTimezone,
  startOfBusinessDay,
  toCivilDate,
  toDateTimeInputValue,
  todayCivilDate,
} from '../date';

describe('horário, hoje e campos datetime-local no fuso de negócio', () => {
  it('mostra HH:mm de Brasília mesmo quando já é outro dia em UTC', () => {
    expect(formatTime('2026-11-06T01:30:00Z')).toBe('22:30');
    expect(formatTime('2026-11-05T03:00:00Z')).toBe('00:00');
    expect(formatTime(null)).toBe('—');
    expect(formatTime('xyz')).toBe('—');
  });

  it('extrai a hora de Brasília para agrupamentos', () => {
    expect(hourInBusinessTimezone('2026-11-06T02:32:00Z')).toBe(23);
    expect(hourInBusinessTimezone('2026-11-06T03:00:00Z')).toBe(0);
    expect(hourInBusinessTimezone(null)).toBeNull();
    expect(hourInBusinessTimezone('xyz')).toBeNull();
  });

  it('parte do dia de Brasília para a aritmética de calendário', () => {
    // 22:30 de 31/10 em Brasília = 01:30 UTC de 01/11
    const today = startOfBusinessDay(new Date('2026-11-01T01:30:00Z'));
    expect([today.getFullYear(), today.getMonth() + 1, today.getDate()]).toEqual([
      2026, 10, 31,
    ]);
    expect([today.getHours(), today.getMinutes()]).toEqual([0, 0]);
  });

  it('preenche o datetime-local com o horário de Brasília', () => {
    expect(toDateTimeInputValue(new Date('2026-11-06T01:30:00Z'))).toBe('2026-11-05T22:30');
    expect(toDateTimeInputValue('2026-11-05T15:07:59Z')).toBe('2026-11-05T12:07');
    expect(toDateTimeInputValue(null)).toBe('');
    expect(toDateTimeInputValue('xyz')).toBe('');
  });

  it('grava o horário digitado como horário de Brasília', () => {
    expect(dateTimeInputToIso('2026-11-05T22:30')).toBe('2026-11-06T01:30:00.000Z');
    expect(dateTimeInputToIso('2026-11-06T00:00')).toBe('2026-11-06T03:00:00.000Z');
    expect(dateTimeInputToIso('')).toBeNull();
    expect(dateTimeInputToIso('05/11/2026 22:30')).toBeNull();
  });

  it('ida e volta do datetime-local preserva o instante', () => {
    const iso = '2026-12-31T23:45:00.000Z';
    expect(dateTimeInputToIso(toDateTimeInputValue(iso))).toBe(iso);
  });
});

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
