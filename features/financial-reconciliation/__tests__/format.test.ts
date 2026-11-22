import {describe, expect, it} from 'vitest';

import type {ReconciliationFinding} from '@/features/financial/consistency/reconciliation';

import {findingsToCsv, parseReconciliationPeriod} from '../utils/format';

const ENTRY = '33333333-3333-4333-8333-333333333333';

function finding(overrides: Partial<ReconciliationFinding> = {}): ReconciliationFinding {
  return {
    checkId: 'R05',
    severity: 'high',
    category: 'amount',
    entityType: 'financial_entry',
    entityId: ENTRY,
    reference: 'Abastecimento "Posto X"',
    expected: 500,
    actual: 450.5,
    details: {},
    legacy: false,
    ...overrides,
  };
}

describe('Fase 2.1.4 — período da URL', () => {
  it('aceita datas válidas e ignora o resto', () => {
    expect(parseReconciliationPeriod({dateFrom: '2026-10-01', dateTo: '2026-10-31'})).toEqual({
      period: {dateFrom: '2026-10-01', dateTo: '2026-10-31'},
      error: null,
    });
    expect(parseReconciliationPeriod({dateFrom: "2026-10-01'; drop", dateTo: ''})).toEqual({
      period: {dateFrom: undefined, dateTo: undefined},
      error: null,
    });
  });

  it('início depois do fim é recusado sem consultar com período', () => {
    expect(parseReconciliationPeriod({dateFrom: '2026-11-01', dateTo: '2026-10-01'})).toEqual({
      period: {},
      error: 'Período inválido: a data inicial é depois da final.',
    });
  });
});

describe('Fase 2.1.4 — exportação CSV', () => {
  it('Excel em português: BOM, ";", vírgula decimal, aspas escapadas e link absoluto', () => {
    const csv = findingsToCsv([finding()], 'https://app.test');
    const [header, row] = csv.replace('﻿', '').trimEnd().split('\r\n');
    expect(csv.startsWith('﻿')).toBe(true);
    expect(header).toBe(
      'Verificação;Título;Severidade;Legado;Registro;Referência;Esperado;Atual;Diferença;Ação sugerida;Link',
    );
    expect(row).toContain('R05;"Origem e lançamento divergentes";Alto;Não;"Lançamento";');
    expect(row).toContain('"Abastecimento ""Posto X""";500,00;450,50;-49,50;');
    expect(row.endsWith(`"https://app.test/financeiro/${ENTRY}"`)).toBe(true);
  });

  it('texto que começa com = + - @ não vira fórmula', () => {
    const csv = findingsToCsv([finding({reference: '=HYPERLINK("http://x")'})]);
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
  });

  it('sem valores e sem link: células vazias', () => {
    const csv = findingsToCsv([
      finding({entityType: 'period', entityId: null, expected: null, actual: null, checkId: 'R11'}),
    ]);
    expect(csv.trimEnd().split('\r\n')[1].endsWith(';;;;"Abra a DRE e o Dashboard no mesmo período e compare os grupos de custo.";')).toBe(true);
  });
});
