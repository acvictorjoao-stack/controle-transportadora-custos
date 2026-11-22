import {
  findingDifference,
  getReconciliationCheck,
  reconciliationFindingHref,
  type ReconciliationEntityType,
  type ReconciliationFinding,
  type ReconciliationSeverity,
} from '@/features/financial/consistency/reconciliation';

import type {ReconciliationPeriod} from '../types';

export const SEVERITY_LABELS: Record<ReconciliationSeverity, string> = {
  critical: 'Crítico',
  high: 'Alto',
  warning: 'Aviso',
};

export const SEVERITY_BADGE_VARIANT: Record<
  ReconciliationSeverity,
  'destructive' | 'warning' | 'secondary'
> = {
  critical: 'destructive',
  high: 'warning',
  warning: 'secondary',
};

export const ENTITY_LABELS: Record<ReconciliationEntityType, string> = {
  financial_entry: 'Lançamento',
  trip: 'Viagem',
  trip_expense: 'Despesa de viagem',
  fuel_record: 'Abastecimento',
  maintenance_record: 'Manutenção',
  tire: 'Pneu',
  payroll_expense: 'Despesa de pessoal',
  movement: 'Movimento',
  period: 'Período',
};

const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Período vindo da URL: datas inválidas são ignoradas; início depois do fim é erro. */
export function parseReconciliationPeriod(params: {
  dateFrom?: string;
  dateTo?: string;
}): {period: ReconciliationPeriod; error: string | null} {
  const dateFrom = params.dateFrom && CIVIL_DATE.test(params.dateFrom) ? params.dateFrom : undefined;
  const dateTo = params.dateTo && CIVIL_DATE.test(params.dateTo) ? params.dateTo : undefined;
  if (dateFrom && dateTo && dateFrom > dateTo) {
    return {period: {}, error: 'Período inválido: a data inicial é depois da final.'};
  }
  return {period: {dateFrom, dateTo}, error: null};
}

function moneyCell(value: number | null): string {
  return value === null ? '' : value.toFixed(2).replace('.', ',');
}

/**
 * Texto em CSV: aspas duplicadas e, para não virar fórmula no Excel, prefixo
 * em células que começam com = + - @ (a referência vem de dados digitados).
 */
function textCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** CSV com ";" e vírgula decimal (Excel em português), com BOM para acentos. */
export function findingsToCsv(findings: readonly ReconciliationFinding[], origin = ''): string {
  const header = [
    'Verificação',
    'Título',
    'Severidade',
    'Legado',
    'Registro',
    'Referência',
    'Esperado',
    'Atual',
    'Diferença',
    'Ação sugerida',
    'Link',
  ];
  const rows = findings.map((finding) => {
    const check = getReconciliationCheck(finding.checkId);
    const href = reconciliationFindingHref(finding);
    return [
      finding.checkId,
      textCell(check.title),
      SEVERITY_LABELS[finding.severity],
      finding.legacy ? 'Sim' : 'Não',
      textCell(ENTITY_LABELS[finding.entityType]),
      textCell(finding.reference),
      moneyCell(finding.expected),
      moneyCell(finding.actual),
      moneyCell(findingDifference(finding)),
      textCell(check.suggestedAction),
      href ? textCell(`${origin}${href}`) : '',
    ].join(';');
  });
  return `﻿${[header.join(';'), ...rows].join('\r\n')}\r\n`;
}
