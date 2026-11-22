import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {ReconciliationFindingRow} from '@/features/financial/consistency/reconciliation';

const {loadReport} = vi.hoisted(() => ({loadReport: vi.fn()}));
vi.mock('@/features/financial/loaders/reconciliation-report-loader', () => ({
  loadReconciliationReport: loadReport,
}));

const {
  getFinancialReconciliationData,
  getReconciliationAlertCounts,
  RECONCILIATION_FINDINGS_LIMIT,
} = await import('../loaders');

const COMPANY = 'company-1';
const ENTRY = '33333333-3333-4333-8333-333333333333';

function row(overrides: Partial<ReconciliationFindingRow> = {}): ReconciliationFindingRow {
  return {
    check_id: 'R09',
    severity: 'warning',
    entity_type: 'financial_entry',
    entity_id: ENTRY,
    reference: 'Receita antiga',
    expected: '74.00',
    actual: '74.00',
    details: {reason: 'paid_without_movement'},
    legacy: true,
    ...overrides,
  };
}

function rpcClient(result: {data: unknown; error: {message: string} | null}) {
  const rpc = vi.fn(() => Promise.resolve(result));
  return {client: {rpc} as never, rpc};
}

const report = {
  findings: [
    {
      checkId: 'R11',
      severity: 'warning',
      category: 'report',
      entityType: 'period',
      entityId: null,
      reference: 'Receita: DRE × indicadores (acumulado)',
      expected: 100,
      actual: 120,
      details: {},
      legacy: false,
    },
  ],
  scope: {dreVersusStats: 'all_time', tripsChecked: 22, cashFlowLinesChecked: 3},
};

beforeEach(() => {
  loadReport.mockReset();
});

describe('Fase 2.1.4 — dados da tela de conciliação', () => {
  it('junta banco e relatórios, ordena (atuais antes do legado) e passa o período', async () => {
    loadReport.mockResolvedValue(report);
    const {client, rpc} = rpcClient({
      data: [row(), row({check_id: 'R03', severity: 'critical', entity_type: 'fuel_record', legacy: false})],
      error: null,
    });

    const data = await getFinancialReconciliationData(client, COMPANY, {dateFrom: '2026-10-01'});

    expect(rpc).toHaveBeenCalledWith('financial_reconciliation_findings', {
      p_company_id: COMPANY,
      p_from: '2026-10-01',
      p_to: undefined,
      p_limit: RECONCILIATION_FINDINGS_LIMIT,
    });
    expect(loadReport).toHaveBeenCalledWith(client, COMPANY, {dateFrom: '2026-10-01'});
    expect(data.findings.map((finding) => finding.checkId)).toEqual(['R03', 'R11', 'R09']);
    expect(data.summary).toMatchObject({
      total: 3,
      legacy: 1,
      bySeverity: {critical: 1, high: 0, warning: 1},
      blocking: true,
    });
    expect(data.coverage).toEqual({tripsChecked: 22, cashFlowLinesChecked: 3});
    expect(data.errors).toEqual([]);
    expect(data.truncatedChecks).toEqual([]);
  });

  it('uma fonte que falha não esconde a outra', async () => {
    loadReport.mockRejectedValue(new Error('DRE fora do ar'));
    const {client} = rpcClient({data: [row()], error: null});

    const data = await getFinancialReconciliationData(client, COMPANY, {});

    expect(data.findings).toHaveLength(1);
    expect(data.coverage).toBeNull();
    expect(data.errors).toEqual(['Comparações de relatório indisponíveis: DRE fora do ar']);
  });

  it('erro do banco (ex.: sem permissão) vira mensagem, e os relatórios continuam', async () => {
    loadReport.mockResolvedValue(report);
    const {client} = rpcClient({data: null, error: {message: 'Sem permissão para a reconciliação financeira.'}});

    const data = await getFinancialReconciliationData(client, COMPANY, {});

    expect(data.findings.map((finding) => finding.checkId)).toEqual(['R11']);
    expect(data.errors[0]).toMatch(/^Verificações do banco indisponíveis: /);
  });

  it('tempo limite do banco (57014) vira mensagem clara e fica no log do servidor', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    loadReport.mockResolvedValue(report);
    const {client} = rpcClient({
      data: null,
      error: {code: '57014', message: 'canceling statement due to statement timeout'} as never,
    });

    const data = await getFinancialReconciliationData(client, COMPANY, {});

    expect(data.errors).toEqual([
      'Verificações do banco indisponíveis: a consulta passou do tempo limite do banco. Recarregue a página ou escolha um período menor.',
    ]);
    expect(data.findings.map((finding) => finding.checkId)).toEqual(['R11']);
    expect(consoleError).toHaveBeenCalledWith('[reconciliation] findings failed', {
      code: '57014',
      message: 'canceling statement due to statement timeout',
    });
    consoleError.mockRestore();
  });

  it('verificação que bateu no limite é marcada como incompleta', async () => {
    loadReport.mockResolvedValue({...report, findings: []});
    const rows = Array.from({length: RECONCILIATION_FINDINGS_LIMIT}, () => row());
    const {client} = rpcClient({data: rows, error: null});

    const data = await getFinancialReconciliationData(client, COMPANY, {});

    expect(data.truncatedChecks).toEqual(['R09']);
  });
});

describe('Fase 2.1.4 — selo do Dashboard financeiro', () => {
  it('conta só achados atuais críticos e altos', async () => {
    const {client, rpc} = rpcClient({
      data: [
        {check_id: 'R03', severity: 'critical', findings: 2, legacy_findings: 0},
        {check_id: 'R08', severity: 'high', findings: 7, legacy_findings: 0},
        {check_id: 'R09', severity: 'warning', findings: 90, legacy_findings: 90},
      ],
      error: null,
    });

    expect(await getReconciliationAlertCounts(client, COMPANY)).toEqual({critical: 2, high: 7});
    expect(rpc).toHaveBeenCalledWith('financial_reconciliation_summary', {p_company_id: COMPANY});
  });

  it('erro (ex.: migration ausente) some em silêncio: o selo é só um atalho', async () => {
    const {client} = rpcClient({data: null, error: {message: 'function does not exist'}});
    expect(await getReconciliationAlertCounts(client, COMPANY)).toBeNull();
  });
});
