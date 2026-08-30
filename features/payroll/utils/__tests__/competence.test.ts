import {describe, expect, it} from 'vitest';

import {
  competenceEndDate,
  competenceToMonthInput,
  formatCompetenceBr,
  normalizeCompetence,
} from '../competence';

describe('normalizeCompetence', () => {
  it('normaliza para o primeiro dia do mês, atendendo ao check do banco', () => {
    expect(normalizeCompetence('2026-03')).toBe('2026-03-01');
    expect(normalizeCompetence('2026-03-27')).toBe('2026-03-01');
  });

  it('rejeita valores fora do formato e meses inválidos', () => {
    expect(normalizeCompetence('')).toBeNull();
    expect(normalizeCompetence(null)).toBeNull();
    expect(normalizeCompetence('03/2026')).toBeNull();
    expect(normalizeCompetence('2026-13')).toBeNull();
    expect(normalizeCompetence('2026-00')).toBeNull();
  });
});

describe('competenceEndDate', () => {
  it('usa o último dia do mês como data do lançamento financeiro', () => {
    expect(competenceEndDate('2026-01')).toBe('2026-01-31');
    expect(competenceEndDate('2026-04')).toBe('2026-04-30');
  });

  it('respeita ano bissexto', () => {
    expect(competenceEndDate('2024-02')).toBe('2024-02-29');
    expect(competenceEndDate('2026-02')).toBe('2026-02-28');
  });
});

describe('formatação da competência', () => {
  it('exibe MM/AAAA e volta para o input type=month', () => {
    expect(formatCompetenceBr('2026-03-01')).toBe('03/2026');
    expect(formatCompetenceBr(null)).toBe('—');
    expect(competenceToMonthInput('2026-03-01')).toBe('2026-03');
    expect(competenceToMonthInput(null)).toBe('');
  });
});
