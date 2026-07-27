import {describe, expect, it} from 'vitest';

import {
  classifyAgainstGoal,
  progressAgainstGoal,
  statusLabelFor,
} from '../semaphore';

describe('classifyAgainstGoal', () => {
  it('marks receita above goal as acima', () => {
    expect(classifyAgainstGoal(2_000_000, 2_000_000, 'receita')).toBe('acima');
    expect(classifyAgainstGoal(1_820_000, 2_000_000, 'receita')).toBe('atencao');
    expect(classifyAgainstGoal(1_500_000, 2_000_000, 'receita')).toBe('abaixo');
  });

  it('treats lead time as lower-is-better', () => {
    expect(classifyAgainstGoal(200, 240, 'leadTime')).toBe('acima');
    expect(classifyAgainstGoal(250, 240, 'leadTime')).toBe('atencao');
    expect(classifyAgainstGoal(300, 240, 'leadTime')).toBe('abaixo');
  });

  it('falls back to SLA thresholds without goal', () => {
    expect(classifyAgainstGoal(92, null, 'sla')).toBe('acima');
    expect(classifyAgainstGoal(80, null, 'sla')).toBe('atencao');
    expect(classifyAgainstGoal(60, null, 'sla')).toBe('abaixo');
  });
});

describe('progressAgainstGoal', () => {
  it('computes 91% for receita example', () => {
    expect(progressAgainstGoal(1_820_000, 2_000_000, 'receita')).toBe(91);
  });

  it('inverts progress for lead time', () => {
    expect(progressAgainstGoal(120, 240, 'leadTime')).toBe(200);
  });
});

describe('statusLabelFor', () => {
  it('uses special labels for sla and lead time', () => {
    expect(statusLabelFor('acima', 'sla')).toBe('Excelente');
    expect(statusLabelFor('atencao', 'leadTime')).toBe('Tendência de alta');
  });
});
