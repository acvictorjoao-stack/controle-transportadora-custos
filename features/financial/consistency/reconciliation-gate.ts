/**
 * Fase 2.1.5 — Portão automático da reconciliação (lógica pura, sem I/O).
 *
 * O script `scripts/fase2-reconciliation-readonly.ts` busca o resumo da
 * migration 113/114 por empresa e usa estas funções para decidir o código de
 * saída: 0 = passou, 1 = há achado atual na severidade do portão ou acima,
 * 2 = erro (tratado pelo script).
 */

import {
  getReconciliationCheck,
  isReconciliationCheckId,
  RECONCILIATION_SEVERITIES,
  type ReconciliationSeverity,
} from './reconciliation';

export interface GateOptions {
  envPath: string;
  /** Vazio = todas as empresas. */
  companies: string[];
  dateFrom?: string;
  dateTo?: string;
  failOn: ReconciliationSeverity;
  json: boolean;
}

/** Linha de `financial_reconciliation_summary`. */
export interface GateSummaryRow {
  check_id: string;
  severity: string;
  findings: number | string;
  legacy_findings: number | string;
}

export interface CompanyGateInput {
  companyId: string;
  slug: string;
  rows: GateSummaryRow[];
}

export interface CompanyGateResult {
  companyId: string;
  slug: string;
  bySeverity: Record<ReconciliationSeverity, number>;
  legacy: number;
  /** Verificações que reprovam o portão (achados atuais na severidade dele ou acima). */
  offenders: Array<{checkId: string; title: string; severity: ReconciliationSeverity; count: number}>;
}

export interface GateResult {
  failOn: ReconciliationSeverity;
  companies: CompanyGateResult[];
  failed: boolean;
}

const SEVERITY_RANK: Record<ReconciliationSeverity, number> = {critical: 0, high: 1, warning: 2};
const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class GateUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GateUsageError';
  }
}

export const GATE_USAGE = [
  'Uso: npx tsx scripts/fase2-reconciliation-readonly.ts --env <caminho do .env.local>',
  '       [--company <uuid>]... [--from AAAA-MM-DD] [--to AAAA-MM-DD]',
  '       [--fail-on critical|high|warning] [--json]',
].join('\n');

export function parseGateArgs(argv: readonly string[]): GateOptions {
  const options: GateOptions = {envPath: '', companies: [], failOn: 'critical', json: false};
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const value = () => {
      const next = argv[index + 1];
      if (next === undefined || next.startsWith('--')) throw new GateUsageError(`Falta o valor de ${arg}.`);
      index++;
      return next;
    };
    switch (arg) {
      case '--env':
        options.envPath = value();
        break;
      case '--company': {
        const id = value();
        if (!UUID.test(id)) throw new GateUsageError(`--company precisa de um UUID: ${id}`);
        options.companies.push(id);
        break;
      }
      case '--from':
      case '--to': {
        const date = value();
        if (!CIVIL_DATE.test(date)) throw new GateUsageError(`${arg} precisa de AAAA-MM-DD: ${date}`);
        if (arg === '--from') options.dateFrom = date;
        else options.dateTo = date;
        break;
      }
      case '--fail-on': {
        const severity = value();
        if (!(RECONCILIATION_SEVERITIES as readonly string[]).includes(severity)) {
          throw new GateUsageError(`--fail-on aceita critical, high ou warning: ${severity}`);
        }
        options.failOn = severity as ReconciliationSeverity;
        break;
      }
      case '--json':
        options.json = true;
        break;
      default:
        throw new GateUsageError(`Argumento desconhecido: ${arg}`);
    }
  }
  if (!options.envPath) throw new GateUsageError('Informe --env com o caminho do .env.local.');
  if (options.dateFrom && options.dateTo && options.dateFrom > options.dateTo) {
    throw new GateUsageError('Período inválido: --from depois de --to.');
  }
  return options;
}

function isSeverity(value: string): value is ReconciliationSeverity {
  return (RECONCILIATION_SEVERITIES as readonly string[]).includes(value);
}

export function evaluateGate(
  inputs: readonly CompanyGateInput[],
  failOn: ReconciliationSeverity,
): GateResult {
  const companies = inputs.map((input): CompanyGateResult => {
    const bySeverity: Record<ReconciliationSeverity, number> = {critical: 0, high: 0, warning: 0};
    const offenders: CompanyGateResult['offenders'] = [];
    let legacy = 0;
    for (const row of input.rows) {
      // Linha fora do contrato reprova: banco e script fora de sincronia não podem passar calados.
      if (!isReconciliationCheckId(row.check_id) || !isSeverity(row.severity)) {
        throw new Error(`Resumo fora do contrato: ${row.check_id}/${row.severity}`);
      }
      const total = Number(row.findings);
      const legacyCount = Number(row.legacy_findings);
      const current = total - legacyCount;
      legacy += legacyCount;
      bySeverity[row.severity] += current;
      if (current > 0 && SEVERITY_RANK[row.severity] <= SEVERITY_RANK[failOn]) {
        offenders.push({
          checkId: row.check_id,
          title: getReconciliationCheck(row.check_id).title,
          severity: row.severity,
          count: current,
        });
      }
    }
    return {companyId: input.companyId, slug: input.slug, bySeverity, legacy, offenders};
  });
  return {failOn, companies, failed: companies.some((company) => company.offenders.length > 0)};
}

export function formatGateReport(result: GateResult, period: {dateFrom?: string; dateTo?: string}): string {
  const lines = [
    `Reconciliação financeira — portão em "${result.failOn}"` +
      (period.dateFrom || period.dateTo ? ` (período ${period.dateFrom ?? '…'} a ${period.dateTo ?? '…'})` : ' (todo o período)'),
    '',
    'empresa | crítico | alto | aviso | legado | resultado',
  ];
  for (const company of result.companies) {
    lines.push(
      [
        company.slug,
        company.bySeverity.critical,
        company.bySeverity.high,
        company.bySeverity.warning,
        company.legacy,
        company.offenders.length > 0 ? 'REPROVA' : 'ok',
      ].join(' | '),
    );
    for (const offender of company.offenders) {
      lines.push(`  - ${offender.checkId} ${offender.title} (${offender.severity}): ${offender.count}`);
    }
  }
  lines.push('', result.failed ? 'Resultado: REPROVADO' : 'Resultado: aprovado');
  return lines.join('\n');
}
