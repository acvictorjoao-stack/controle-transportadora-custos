import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

import {
  evaluateGate,
  formatGateReport,
  GateUsageError,
  parseGateArgs,
  type CompanyGateInput,
} from '../reconciliation-gate';

const COMPANY = '451a7940-a56b-425f-ae5f-e493d536591f';

describe('Fase 2.1.5 — argumentos do portão', () => {
  it('padrão: todas as empresas, portão em critical, texto', () => {
    expect(parseGateArgs(['--env', '../x/.env.local'])).toEqual({
      envPath: '../x/.env.local',
      companies: [],
      failOn: 'critical',
      json: false,
    });
  });

  it('aceita empresas, período, severidade e JSON', () => {
    expect(
      parseGateArgs([
        '--env', 'e', '--company', COMPANY, '--from', '2026-10-01', '--to', '2026-10-31',
        '--fail-on', 'high', '--json',
      ]),
    ).toEqual({
      envPath: 'e',
      companies: [COMPANY],
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
      failOn: 'high',
      json: true,
    });
  });

  it.each([
    [[], 'Informe --env'],
    [['--env'], 'Falta o valor de --env'],
    [['--env', 'e', '--company', 'primeira-empresa'], 'UUID'],
    [['--env', 'e', '--from', '01/10/2026'], 'AAAA-MM-DD'],
    [['--env', 'e', '--fail-on', 'low'], 'critical, high ou warning'],
    [['--env', 'e', '--from', '2026-11-01', '--to', '2026-10-01'], 'Período inválido'],
    [['--env', 'e', '--apply'], 'Argumento desconhecido'],
  ])('recusa uso inválido %o', (argv, message) => {
    expect(() => parseGateArgs(argv)).toThrow(GateUsageError);
    expect(() => parseGateArgs(argv)).toThrow(message);
  });
});

// Linha de base real da homologação (2026-11-22).
const baseline: CompanyGateInput[] = [
  {companyId: 'demo', slug: 'demo-fleetcontrol-transportes', rows: [
    {check_id: 'R09', severity: 'warning', findings: 90, legacy_findings: 90},
  ]},
  {companyId: COMPANY, slug: 'primeira-empresa', rows: [
    {check_id: 'R08', severity: 'high', findings: '7', legacy_findings: '0'},
    {check_id: 'R09', severity: 'warning', findings: '19', legacy_findings: '19'},
  ]},
  {companyId: 'testando', slug: 'testando', rows: [
    {check_id: 'R03', severity: 'critical', findings: 1, legacy_findings: 0},
  ]},
  {companyId: 'novo', slug: 'novo-teste', rows: []},
];

describe('Fase 2.1.5 — decisão do portão', () => {
  it('em critical: só o abastecimento sem lançamento da testando reprova', () => {
    const result = evaluateGate(baseline, 'critical');
    expect(result.failed).toBe(true);
    expect(result.companies.filter((company) => company.offenders.length > 0).map((company) => company.slug)).toEqual([
      'testando',
    ]);
    expect(result.companies[2].offenders).toEqual([
      {checkId: 'R03', title: 'Origem sem lançamento', severity: 'critical', count: 1},
    ]);
  });

  it('em high: a primeira-empresa (7 R08) também reprova; legado nunca reprova', () => {
    const result = evaluateGate(baseline, 'high');
    const failing = result.companies.filter((company) => company.offenders.length > 0);
    expect(failing.map((company) => company.slug)).toEqual(['primeira-empresa', 'testando']);
    expect(result.companies[0]).toMatchObject({legacy: 90, bySeverity: {critical: 0, high: 0, warning: 0}});
    expect(evaluateGate(baseline, 'warning').companies[0].offenders).toEqual([]);
  });

  it('sem achados atuais, aprova', () => {
    expect(evaluateGate([baseline[0], baseline[3]], 'warning').failed).toBe(false);
  });

  it('linha fora do contrato reprova em erro, não passa calada', () => {
    expect(() =>
      evaluateGate([{companyId: 'x', slug: 'x', rows: [{check_id: 'R99', severity: 'high', findings: 1, legacy_findings: 0}]}], 'critical'),
    ).toThrow('Resumo fora do contrato');
  });

  it('relatório em texto: uma linha por empresa e o resultado', () => {
    const report = formatGateReport(evaluateGate(baseline, 'critical'), {});
    expect(report).toContain('portão em "critical" (todo o período)');
    expect(report).toContain('testando | 1 | 0 | 0 | 0 | REPROVA');
    expect(report).toContain('  - R03 Origem sem lançamento (critical): 1');
    expect(report).toContain('primeira-empresa | 0 | 7 | 0 | 19 | ok');
    expect(report.trimEnd().endsWith('Resultado: REPROVADO')).toBe(true);
  });
});

describe('Fase 2.1.5 — o script só lê', () => {
  const script = readFileSync(resolve(process.cwd(), 'scripts/fase2-reconciliation-readonly.ts'), 'utf8');

  it('usa o fetch somente leitura, só o projeto HML e RPC por GET', () => {
    expect(script).toContain('global: {fetch: createReadOnlyFetch()}');
    expect(script).toContain('assertHmlAuthorizedProjectRef(url);');
    expect(script).toContain('{get: true}');
    expect(script).not.toMatch(/\.(insert|update|upsert|delete)\(/);
    expect(script).not.toMatch(/writeFileSync|console\.log\([^)]*serviceKey/);
  });
});
