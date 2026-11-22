/**
 * Fase 2.1 — Reconciliação financeira: contrato dos achados e catálogo das
 * verificações.
 *
 * Só lê e aponta: nenhuma verificação corrige dado. As verificações linha a
 * linha rodam no banco (função da migration 113, com a RLS de quem consulta);
 * as comparações de relatório rodam em TypeScript, com os loaders existentes
 * (a DRE vive em TypeScript e não é recriada em SQL). As duas fontes devolvem
 * achados neste mesmo formato.
 */

import {roundMoney, toNumber} from './fase1-consistency';

export const RECONCILIATION_SEVERITIES = ['critical', 'high', 'warning'] as const;
export type ReconciliationSeverity = (typeof RECONCILIATION_SEVERITIES)[number];

export const RECONCILIATION_CATEGORIES = [
  'integrity',
  'origin',
  'amount',
  'reversal',
  'settlement',
  'report',
] as const;
export type ReconciliationCategory = (typeof RECONCILIATION_CATEGORIES)[number];

export const RECONCILIATION_ENTITY_TYPES = [
  'financial_entry',
  'trip',
  'trip_expense',
  'fuel_record',
  'maintenance_record',
  'tire',
  'payroll_expense',
  'movement',
  'period',
] as const;
export type ReconciliationEntityType = (typeof RECONCILIATION_ENTITY_TYPES)[number];

export const RECONCILIATION_CHECK_IDS = [
  'R01',
  'R02',
  'R03',
  'R04',
  'R05',
  'R06',
  'R07',
  'R08',
  'R09',
  'R10',
  'R11',
  'R12',
  'R13',
  'R14',
] as const;
export type ReconciliationCheckId = (typeof RECONCILIATION_CHECK_IDS)[number];

export interface ReconciliationCheck {
  id: ReconciliationCheckId;
  title: string;
  description: string;
  category: ReconciliationCategory;
  /** Severidade padrão; um achado pode vir com severidade menor (ex.: possível duplicidade manual). */
  severity: ReconciliationSeverity;
  /** `database`: função da 113, linha a linha. `report`: comparação de relatórios em TypeScript. */
  source: 'database' | 'report';
  /** Roda também no portão automático (testes em banco e script de linha de comando). */
  automatic: boolean;
  /** Achados herdados de antes das regras atuais: aparecem agrupados e não bloqueiam. */
  legacy: boolean;
  /** Invariantes da Fase 1 que esta verificação reaproveita. */
  invariants: readonly string[];
  suggestedAction: string;
}

export const RECONCILIATION_CHECKS: readonly ReconciliationCheck[] = [
  {
    id: 'R01',
    title: 'Lançamento duplicado',
    description:
      'Mais de um lançamento ativo para a mesma origem e parcela, ou lançamentos manuais com mesmo valor, data e fornecedor.',
    category: 'integrity',
    severity: 'critical',
    source: 'database',
    automatic: true,
    legacy: false,
    invariants: ['I5'],
    suggestedAction: 'Confira os lançamentos e cancele ou estorne o que estiver repetido.',
  },
  {
    id: 'R02',
    title: 'Vínculo inexistente ou inacessível',
    description:
      'O lançamento aponta para viagem, veículo, motorista, categoria ou centro de custo que não existe, foi excluído ou não pertence à empresa.',
    category: 'integrity',
    severity: 'critical',
    source: 'database',
    automatic: true,
    legacy: false,
    invariants: [],
    suggestedAction: 'Corrija o vínculo no lançamento ou remova a referência.',
  },
  {
    id: 'R03',
    title: 'Origem sem lançamento',
    description:
      'Abastecimento, manutenção, pneu, folha, despesa de viagem ou cobrança de frete que deveria estar no financeiro e não está.',
    category: 'origin',
    severity: 'critical',
    source: 'database',
    automatic: true,
    legacy: false,
    invariants: ['I3/I4'],
    suggestedAction: 'Abra a origem e salve-a de novo para refazer a integração, ou lance manualmente.',
  },
  {
    id: 'R04',
    title: 'Lançamento sem origem',
    description: 'Lançamento ativo cuja origem foi excluída ou não existe mais.',
    category: 'origin',
    severity: 'critical',
    source: 'database',
    automatic: true,
    legacy: false,
    invariants: ['I3/I4'],
    suggestedAction: 'Cancele ou estorne o lançamento, ou restaure a origem.',
  },
  {
    id: 'R05',
    title: 'Origem e lançamento divergentes',
    description:
      'Valor da origem diferente da soma das parcelas, lançamento em outra viagem, ou título de frete diferente de frete mais ajustes.',
    category: 'amount',
    severity: 'high',
    source: 'database',
    automatic: true,
    legacy: false,
    invariants: ['I3/I4'],
    suggestedAction: 'Salve a origem de novo para sincronizar, ou ajuste o lançamento.',
  },
  {
    id: 'R06',
    title: 'Estorno incoerente',
    description:
      'Estorno com valor diferente do original, original ainda ativo com estorno gravado, ou original estornado sem lançamento de estorno.',
    category: 'reversal',
    severity: 'high',
    source: 'database',
    automatic: true,
    legacy: false,
    invariants: [],
    suggestedAction: 'Confira o par original e estorno no histórico do lançamento.',
  },
  {
    id: 'R07',
    title: 'Recebimento diferente dos movimentos',
    description:
      'Em conta a receber, o valor recebido não é a soma de recebimentos menos estornos, ou o status não corresponde ao saldo.',
    category: 'settlement',
    severity: 'high',
    source: 'database',
    automatic: true,
    legacy: false,
    invariants: ['I8'],
    suggestedAction: 'Confira os recebimentos e estornos do título em Contas a Receber.',
  },
  {
    id: 'R08',
    title: 'Baixa incompleta',
    description:
      'Título pago sem data de pagamento, valor pago maior que o valor do título, ou título em aberto sem vencimento (fora de Contas a Pagar).',
    category: 'settlement',
    severity: 'high',
    source: 'database',
    automatic: false,
    legacy: false,
    invariants: [],
    suggestedAction: 'Complete a data de pagamento, o valor pago ou o vencimento do título.',
  },
  {
    id: 'R09',
    title: 'Pago sem movimento (legado)',
    description: 'Conta a receber marcada como paga antes do registro de movimentos de caixa.',
    category: 'settlement',
    severity: 'warning',
    source: 'database',
    automatic: false,
    legacy: true,
    invariants: ['I6'],
    suggestedAction: 'Sem ação imediata: regularização em lote, com decisão própria.',
  },
  {
    id: 'R10',
    title: 'Receita duplicada da viagem',
    description:
      'A mesma viagem tem mais de uma receita ativa (cobrança de frete, receita gerada na conclusão ou conta a receber manual).',
    category: 'amount',
    severity: 'high',
    source: 'database',
    automatic: true,
    legacy: false,
    invariants: [],
    suggestedAction: 'Mantenha só a cobrança de frete e cancele a receita repetida.',
  },
  {
    id: 'R11',
    title: 'DRE diferente dos indicadores',
    description:
      'No mesmo período, custos ou receita da DRE diferentes dos indicadores financeiros (get_financial_stats).',
    category: 'report',
    severity: 'high',
    source: 'report',
    automatic: true,
    legacy: false,
    invariants: [],
    suggestedAction: 'Abra a DRE e o Dashboard no mesmo período e compare os grupos de custo.',
  },
  {
    id: 'R12',
    title: 'Viagem diferente da DRE',
    description:
      'Resultado, custos por grupo ou despesas da aba da viagem diferentes da DRE, ou adiantamento contado como custo.',
    category: 'report',
    severity: 'high',
    source: 'report',
    automatic: true,
    legacy: false,
    invariants: ['I1', 'I3b', 'I9'],
    suggestedAction: 'Abra a viagem e confira os lançamentos vinculados a ela.',
  },
  {
    id: 'R13',
    title: 'Fluxo de Caixa diferente do razão',
    description:
      'No período, o total do Fluxo de Caixa diferente dos pagamentos e movimentos do razão, ou movimento lançado com o sinal errado.',
    category: 'report',
    severity: 'high',
    source: 'report',
    automatic: false,
    legacy: false,
    invariants: [],
    suggestedAction: 'Compare as linhas do Fluxo de Caixa do período com os títulos pagos.',
  },
  {
    id: 'R14',
    title: 'Data do lançamento diferente da origem',
    description: 'Data do lançamento diferente da data da origem no dia de Brasília.',
    category: 'origin',
    severity: 'warning',
    source: 'database',
    automatic: false,
    legacy: false,
    invariants: [],
    suggestedAction: 'Salve a origem de novo para corrigir a data do lançamento.',
  },
];

const CHECK_BY_ID = new Map(RECONCILIATION_CHECKS.map((check) => [check.id, check]));
const CHECK_ORDER = new Map(RECONCILIATION_CHECK_IDS.map((id, index) => [id, index]));
const SEVERITY_RANK: Record<ReconciliationSeverity, number> = {critical: 0, high: 1, warning: 2};

export function getReconciliationCheck(id: ReconciliationCheckId): ReconciliationCheck {
  const check = CHECK_BY_ID.get(id);
  if (!check) throw new ReconciliationContractError(`verificação desconhecida: ${id}`);
  return check;
}

export function isReconciliationCheckId(value: unknown): value is ReconciliationCheckId {
  return typeof value === 'string' && CHECK_BY_ID.has(value as ReconciliationCheckId);
}

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Achado
// ---------------------------------------------------------------------------

export interface ReconciliationFinding {
  checkId: ReconciliationCheckId;
  severity: ReconciliationSeverity;
  category: ReconciliationCategory;
  entityType: ReconciliationEntityType;
  /** Nulo quando o achado é de período ou a entidade não tem id (ex.: viagem identificada só pelo número). */
  entityId: string | null;
  /** Texto curto que identifica o registro para quem lê (número da viagem, descrição do lançamento). */
  reference: string;
  expected: number | null;
  actual: number | null;
  details: Record<string, unknown>;
  legacy: boolean;
}

/** Linha devolvida pela função da migration 113 (snake_case, numeric pode vir como texto). */
export interface ReconciliationFindingRow {
  check_id: string;
  severity: string;
  entity_type: string;
  entity_id: string | null;
  reference: string | null;
  expected: number | string | null;
  actual: number | string | null;
  details: unknown;
  legacy?: boolean | null;
}

export class ReconciliationContractError extends Error {
  constructor(message: string) {
    super(`Contrato da reconciliação: ${message}`);
    this.name = 'ReconciliationContractError';
  }
}

function money(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  return roundMoney(toNumber(value));
}

/**
 * Converte a linha do banco para o contrato. Recusa verificação, severidade
 * ou entidade desconhecida: banco e aplicação fora de sincronia devem falhar
 * alto (a tela mostra "Indisponível"), nunca esconder achado.
 */
export function mapReconciliationFindingRow(row: ReconciliationFindingRow): ReconciliationFinding {
  if (!isReconciliationCheckId(row.check_id)) {
    throw new ReconciliationContractError(`verificação desconhecida: ${String(row.check_id)}`);
  }
  if (!isOneOf(RECONCILIATION_SEVERITIES, row.severity)) {
    throw new ReconciliationContractError(`severidade desconhecida: ${String(row.severity)}`);
  }
  if (!isOneOf(RECONCILIATION_ENTITY_TYPES, row.entity_type)) {
    throw new ReconciliationContractError(`entidade desconhecida: ${String(row.entity_type)}`);
  }
  const check = getReconciliationCheck(row.check_id);
  const details =
    row.details && typeof row.details === 'object' && !Array.isArray(row.details)
      ? (row.details as Record<string, unknown>)
      : {};
  return {
    checkId: check.id,
    severity: row.severity,
    category: check.category,
    entityType: row.entity_type,
    entityId: row.entity_id ?? null,
    reference: row.reference?.trim() || row.entity_id || check.title,
    expected: money(row.expected),
    actual: money(row.actual),
    details,
    legacy: row.legacy ?? check.legacy,
  };
}

/** Diferença atual − esperado, quando os dois existem. */
export function findingDifference(finding: ReconciliationFinding): number | null {
  if (finding.expected === null || finding.actual === null) return null;
  return roundMoney(finding.actual - finding.expected);
}

/** Ordem de leitura: atuais antes dos legados, depois severidade, ordem do catálogo e referência. */
export function sortReconciliationFindings(
  findings: readonly ReconciliationFinding[],
): ReconciliationFinding[] {
  return [...findings].sort(
    (a, b) =>
      Number(a.legacy) - Number(b.legacy) ||
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      (CHECK_ORDER.get(a.checkId) ?? 0) - (CHECK_ORDER.get(b.checkId) ?? 0) ||
      a.reference.localeCompare(b.reference, 'pt-BR'),
  );
}

// ---------------------------------------------------------------------------
// Resumo
// ---------------------------------------------------------------------------

export interface ReconciliationCheckSummary {
  checkId: ReconciliationCheckId;
  title: string;
  category: ReconciliationCategory;
  severity: ReconciliationSeverity;
  count: number;
  legacyCount: number;
}

export interface ReconciliationSummary {
  total: number;
  /** Só achados atuais (não legados). */
  bySeverity: Record<ReconciliationSeverity, number>;
  legacy: number;
  /** Uma linha por verificação do catálogo, na ordem do catálogo, inclusive as zeradas. */
  byCheck: ReconciliationCheckSummary[];
  /** Há achado crítico atual: o portão automático falha e a tela mostra o selo. */
  blocking: boolean;
}

export function summarizeReconciliationFindings(
  findings: readonly ReconciliationFinding[],
): ReconciliationSummary {
  const bySeverity: Record<ReconciliationSeverity, number> = {critical: 0, high: 0, warning: 0};
  const counts = new Map<ReconciliationCheckId, {count: number; legacyCount: number}>();
  let legacy = 0;

  for (const finding of findings) {
    const current = counts.get(finding.checkId) ?? {count: 0, legacyCount: 0};
    current.count += 1;
    if (finding.legacy) {
      current.legacyCount += 1;
      legacy += 1;
    } else {
      bySeverity[finding.severity] += 1;
    }
    counts.set(finding.checkId, current);
  }

  return {
    total: findings.length,
    bySeverity,
    legacy,
    byCheck: RECONCILIATION_CHECKS.map((check) => ({
      checkId: check.id,
      title: check.title,
      category: check.category,
      severity: check.severity,
      count: counts.get(check.id)?.count ?? 0,
      legacyCount: counts.get(check.id)?.legacyCount ?? 0,
    })),
    blocking: bySeverity.critical > 0,
  };
}

// ---------------------------------------------------------------------------
// Link para o registro
// ---------------------------------------------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuidOrNull(value: unknown): string | null {
  return typeof value === 'string' && UUID.test(value) ? value : null;
}

/** Rota da tela onde o achado se resolve; nulo quando não há tela de detalhe. */
export function reconciliationFindingHref(finding: ReconciliationFinding): string | null {
  const id = uuidOrNull(finding.entityId);
  switch (finding.entityType) {
    case 'financial_entry':
      return id ? `/financeiro/${id}` : null;
    case 'trip':
      return id ? `/viagens/${id}` : null;
    case 'trip_expense': {
      const tripId = uuidOrNull(finding.details.trip_id);
      return tripId ? `/viagens/${tripId}` : null;
    }
    case 'fuel_record':
      return id ? `/abastecimentos/${id}` : null;
    case 'maintenance_record':
      return id ? `/manutencoes/${id}` : null;
    case 'tire':
      return id ? `/pneus/${id}` : null;
    case 'payroll_expense':
      return '/financeiro/despesas-de-pessoal';
    case 'movement': {
      const entryId = uuidOrNull(finding.details.financial_entry_id);
      return entryId ? `/financeiro/contas-a-receber/${entryId}` : null;
    }
    case 'period':
      return null;
  }
}
