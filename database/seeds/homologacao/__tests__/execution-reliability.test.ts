import {beforeEach, describe, expect, it, vi} from 'vitest';

import {PAYROLL_CATEGORY_SLUG} from '@/features/payroll/constants';

import {buildHmlFuelDefinitions, buildHmlTripDefinitions} from '../catalog';
import {HML_COUNTS} from '../constants';
import {
  buildHmlExpectedPlan,
  compareExecutedToExpected,
  countExpectedFinancialEntriesCreated,
  countExpectedFinancialIntegrationCalls,
  countExpectedFuelFinancialEntries,
  countExpectedPayrollFinancialEntries,
  expectedInstallmentsFromPayment,
  HML_MANIFEST_DISCLAIMER,
  HML_SUCCESS_CRITERIA,
} from '../expected-plan';
import {MappedDatabaseError} from '@/features/master/companies/utils/database-error';

import {
  formatPhaseAbortMessage,
  HmlExecutionTracker,
  HmlPhaseAbortError,
  throwUnexpectedPhaseAbort,
} from '../execution-report';
import {
  HML_REQUIRED_CATEGORY_SLUGS,
  HML_REQUIRED_COST_CENTER_CODES,
  assertCompanyEmptyForHomologacao,
} from '../guards';
import {countManifestByKind, createManifest, trackManifest} from '../manifest';
import {buildOfflinePlanSummary} from '../validators';

describe('homologacao seed — métricas separadas', () => {
  it('não soma parcelas como se fossem chamadas de hook', () => {
    const plan = buildHmlExpectedPlan();
    const calls = countExpectedFinancialIntegrationCalls();
    const entries = countExpectedFinancialEntriesCreated();

    expect(plan.totals.financialIntegrationCalls).toBe(calls);
    expect(plan.totals.financialEntriesCreated).toBe(entries);
    expect(entries).toBeGreaterThan(calls);
    expect(plan.totals.manifestTracked).toBe(
      plan.totals.primary +
        plan.totals.auxiliary +
        plan.totals.statusUpdates +
        plan.totals.financialIntegrationCalls,
    );
    expect(plan.totals.manifestTracked).not.toBe(
      plan.totals.primary +
        plan.totals.auxiliary +
        plan.totals.statusUpdates +
        plan.totals.financialEntriesCreated,
    );
    expect(plan.successCriteria).toEqual(HML_SUCCESS_CRITERIA);
  });

  it('derivar parcelas pela regra de negócio cash/credit', () => {
    expect(expectedInstallmentsFromPayment('cash', 2)).toBe(1);
    expect(expectedInstallmentsFromPayment('credit', 2)).toBe(2);
    expect(expectedInstallmentsFromPayment('credit', null)).toBe(1);

    const fuel = buildHmlFuelDefinitions();
    const credit = fuel.filter((f) => f.paymentType === 'credit').length;
    expect(countExpectedFuelFinancialEntries()).toBe(fuel.length + credit);
  });

  it('compareExecutedToExpected detecta divergência e sucesso', () => {
    const plan = buildHmlExpectedPlan();
    const ok = compareExecutedToExpected(
      plan.totals,
      {
        primary: plan.totals.primary,
        auxiliary: plan.totals.auxiliary,
        statusUpdates: plan.totals.statusUpdates,
        financialIntegrationCalls: plan.totals.financialIntegrationCalls,
        financialEntriesCreated: plan.totals.financialEntriesCreated,
        ignoredOptional: 0,
      },
      null,
    );
    expect(ok.ok).toBe(true);

    const bad = compareExecutedToExpected(
      plan.totals,
      {
        primary: plan.totals.primary - 1,
        auxiliary: plan.totals.auxiliary,
        statusUpdates: plan.totals.statusUpdates,
        financialIntegrationCalls: plan.totals.financialIntegrationCalls,
        financialEntriesCreated: plan.totals.financialEntriesCreated - 5,
        ignoredOptional: 1,
      },
      'fuel',
    );
    expect(bad.ok).toBe(false);
    expect(bad.divergences.map((d) => d.metric)).toEqual(
      expect.arrayContaining(['primary', 'financialEntriesCreated', 'ignoredOptional', 'abortedPhase']),
    );
  });

  it('resumo offline expõe totais separados', () => {
    const summary = buildOfflinePlanSummary('dry-run');
    expect(summary.expectedPlan?.totals.financialIntegrationCalls).toBe(
      countExpectedFinancialIntegrationCalls(),
    );
    expect(summary.expectedPlan?.totals.financialEntriesCreated).toBe(
      countExpectedFinancialEntriesCreated(),
    );
  });
});

describe('homologacao seed — manifesto financial sem duplicar', () => {
  it('persiste integração uma vez com relatedIds das parcelas', () => {
    let manifest = createManifest('company-1', 'primeira-empresa');
    manifest = trackManifest(manifest, {
      entity: 'financial_integration_fuel',
      key: 'f001',
      id: 'fe-1',
      phase: 'fuel',
      table: 'financial_entries',
      kind: 'financial_integration',
      operation: 'sync',
      relatedIds: ['fe-1', 'fe-2'],
      expectedFinancialEntries: 2,
    });
    // segunda tentativa com a mesma chave não duplica
    manifest = trackManifest(manifest, {
      entity: 'financial_integration_fuel',
      key: 'f001',
      id: 'fe-1',
      phase: 'fuel',
      table: 'financial_entries',
      kind: 'financial_integration',
      relatedIds: ['fe-1', 'fe-2'],
      expectedFinancialEntries: 2,
    });

    expect(manifest.entries).toHaveLength(1);
    expect(manifest.isTransactional).toBe(false);
    expect(manifest.disclaimer).toBe(HML_MANIFEST_DISCLAIMER);

    const counts = countManifestByKind(manifest);
    expect(counts.financialIntegrationCalls).toBe(1);
    expect(counts.financialEntriesCreated).toBe(2);
  });
});

describe('homologacao seed — financial assert quantidade', () => {
  function fakeSupabase(rows: Array<Record<string, unknown>>) {
    return {
      from() {
        const chain: Record<string, unknown> = {};
        const self = () => chain;
        chain.select = self;
        chain.eq = self;
        chain.is = self;
        chain.neq = self;
        chain.then = (
          resolve: (value: {data: Array<Record<string, unknown>>; error: null}) => unknown,
        ) => Promise.resolve(resolve({data: rows, error: null}));
        return chain;
      },
    };
  }

  it('aborta crédito com 2 parcelas esperadas e apenas 1 lançamento', async () => {
    const {assertFuelFinancialSync} = await import('../require-financial-sync');
    const tracker = new HmlExecutionTracker();
    tracker.setExpectedPlan(buildHmlExpectedPlan());

    await expect(
      assertFuelFinancialSync(
        fakeSupabase([
          {id: 'fe-1', source_id: 'fuel-1', source_module: 'fuel'},
        ]) as never,
        'company-1',
        {
          id: 'fuel-1',
          totalAmount: 500,
          paymentType: 'credit',
          installmentCount: 2,
        } as never,
        tracker,
        'f001',
      ),
    ).rejects.toBeInstanceOf(HmlPhaseAbortError);

    const report = tracker.toReport();
    expect(report.abortedPhase).toBe('fuel');
    expect(report.financial.integrationCallsFailed).toBe(1);
    expect(report.abortReason).toMatch(/esperado 2.*encontrado\(s\) 1/i);
  });

  it('aborta integração sem lançamento persistido', async () => {
    const {assertFuelFinancialSync} = await import('../require-financial-sync');
    const tracker = new HmlExecutionTracker();

    await expect(
      assertFuelFinancialSync(
        fakeSupabase([]) as never,
        'company-1',
        {
          id: 'fuel-2',
          totalAmount: 250,
          paymentType: 'cash',
          installmentCount: 1,
        } as never,
        tracker,
        'f002',
      ),
    ).rejects.toBeInstanceOf(HmlPhaseAbortError);

    expect(tracker.toReport().abortReason).toMatch(/esperado 1.*encontrado\(s\) 0/i);
  });

  it('aceita cash com exatamente 1 lançamento e persiste no manifesto callback', async () => {
    const {assertFuelFinancialSync} = await import('../require-financial-sync');
    const tracker = new HmlExecutionTracker();
    const persisted: string[] = [];

    const ids = await assertFuelFinancialSync(
      fakeSupabase([{id: 'fe-ok', source_id: 'fuel-3', source_module: 'fuel'}]) as never,
      'company-1',
      {
        id: 'fuel-3',
        totalAmount: 100,
        paymentType: 'cash',
        installmentCount: 1,
      } as never,
      tracker,
      'f003',
      (input) => {
        persisted.push(...input.relatedIds);
      },
    );

    expect(ids).toEqual(['fe-ok']);
    expect(persisted).toEqual(['fe-ok']);
    expect(tracker.toReport().financial.entriesCreated).toBe(1);
    expect(tracker.toReport().financial.integrationCallsSuccess).toBe(1);
  });

  it('aborta folha quando sync não gera lançamento', async () => {
    const {runAndAssertPayrollFinancialSync} = await import('../require-financial-sync');
    const tracker = new HmlExecutionTracker();

    await expect(
      runAndAssertPayrollFinancialSync(
        fakeSupabase([]) as never,
        'company-1',
        'pay-1',
        async () => undefined,
        tracker,
        'p-0-d01-salario',
      ),
    ).rejects.toBeInstanceOf(HmlPhaseAbortError);
  });
});

describe('homologacao seed — abortedPhase usa fase corrente', () => {
  it('falha em drivers após sucesso em vehicles não marca manual_financial', () => {
    const tracker = new HmlExecutionTracker();
    tracker.setExpectedPlan(buildHmlExpectedPlan());

    tracker.recordSuccess({
      phase: 'vehicles',
      entity: 'vehicle',
      key: 'v10',
      table: 'vehicles',
      kind: 'primary',
      operation: 'insert',
      id: 'vehicle-v10',
    });

    const currentPhase = 'drivers';
    const mapped = new MappedDatabaseError({
      code: '23503',
      message:
        'insert or update on table "drivers" violates foreign key constraint — cpf 52998224725',
    });

    try {
      throwUnexpectedPhaseAbort(currentPhase, mapped, tracker);
      expect.unreachable('deveria abortar');
    } catch (error) {
      expect(error).toBeInstanceOf(HmlPhaseAbortError);
      const abort = error as HmlPhaseAbortError;
      expect(abort.phase).toBe('drivers');
      expect(abort.report.abortedPhase).toBe('drivers');
      expect(abort.report.abortedPhase).not.toBe('manual_financial');
      expect(abort.report.phaseSummaries.at(-1)?.phase).toBe('manual_financial');
      expect(formatPhaseAbortMessage(abort.report)).toContain('fase "drivers"');
      expect(formatPhaseAbortMessage(abort.report)).toContain('code=23503');
      expect(formatPhaseAbortMessage(abort.report)).toContain('foreign_key_violation');
      expect(formatPhaseAbortMessage(abort.report)).not.toMatch(/52998224725/);
      expect(formatPhaseAbortMessage(abort.report)).not.toMatch(/password|senha|token|service_role/i);
    }
  });

  it('não deduz fase pelo último resumo do plano quando currentPhase é drivers', () => {
    const tracker = new HmlExecutionTracker();
    tracker.setExpectedPlan(buildHmlExpectedPlan());
    const reportBefore = tracker.toReport();
    expect(reportBefore.phaseSummaries.at(-1)?.phase).toBe('manual_financial');

    expect(() =>
      throwUnexpectedPhaseAbort(
        'drivers',
        new Error('Não foi possível concluir a operação.'),
        tracker,
      ),
    ).toThrow(HmlPhaseAbortError);

    try {
      throwUnexpectedPhaseAbort(
        'drivers',
        new Error('Não foi possível concluir a operação.'),
        tracker,
      );
    } catch (error) {
      const abort = error as HmlPhaseAbortError;
      expect(abort.phase).toBe('drivers');
      expect(abort.report.abortedPhase).toBe('drivers');
    }
  });
});

describe('homologacao seed — ID obrigatório ausente', () => {
  it('tracker.abort identifica fase e relacionamento', () => {
    const tracker = new HmlExecutionTracker();
    expect(() =>
      tracker.abort('trip_children', 'Relacionamento obrigatório ausente: tripId→trip_expense (chave te01).'),
    ).toThrow(HmlPhaseAbortError);

    try {
      tracker.abort(
        'maintenance',
        'Relacionamento obrigatório ausente: maintenanceRecordId→maintenance_part (chave mp01).',
      );
    } catch (error) {
      const abort = error as HmlPhaseAbortError;
      expect(abort.phase).toBe('maintenance');
      expect(formatPhaseAbortMessage(abort.report)).toContain('maintenance');
      expect(abort.report.disclaimer).toContain('NÃO é um log transacional');
    }
  });

  it.each([
    ['trip_children', 'tripId→trip_stop'],
    ['tires', 'tireId→tire_movement'],
    ['tires', 'vehicleId→tire_movement'],
    ['tires', 'tireId→tire_inspection'],
    ['tires', 'tireId→tire_recap'],
  ] as const)('mensagem sanitizada para %s / %s', (phase, relationship) => {
    const tracker = new HmlExecutionTracker();
    try {
      tracker.abort(phase, `Relacionamento obrigatório ausente: ${relationship} (chave x).`);
    } catch (error) {
      const abort = error as HmlPhaseAbortError;
      expect(abort.phase).toBe(phase);
      const message = formatPhaseAbortMessage(abort.report);
      expect(message).toContain(phase);
      expect(message).toContain(relationship);
      expect(message).not.toMatch(/password|senha|token|service_role/i);
    }
  });
});

describe('homologacao seed — pré-requisito salarios', () => {
  it('inclui PAYROLL_CATEGORY_SLUG nos guards', () => {
    expect(PAYROLL_CATEGORY_SLUG).toBe('salarios');
    expect(HML_REQUIRED_CATEGORY_SLUGS).toContain(PAYROLL_CATEGORY_SLUG);
    expect(HML_REQUIRED_CATEGORY_SLUGS).toEqual([
      'outros',
      'receitas',
      'impostos',
      'combustivel',
      'manutencao',
      'pneus',
      'salarios',
    ]);
    expect(HML_REQUIRED_COST_CENTER_CODES).toEqual(['OPERACIONAL', 'ADMINISTRATIVO']);
  });

  it('assertSystemFinancialPrerequisites aborta sem salarios', async () => {
    const {assertSystemFinancialPrerequisites} = await import('../guards');
    const supabase = {
      from(table: string) {
        const chain: Record<string, unknown> = {};
        const self = () => chain;
        chain.select = self;
        chain.eq = self;
        chain.is = self;
        chain.in = self;
        chain.then = (
          resolve: (value: {data: unknown; error: null}) => unknown,
        ) => {
          if (table === 'financial_categories') {
            return Promise.resolve(
              resolve({
                data: [
                  {slug: 'outros'},
                  {slug: 'receitas'},
                  {slug: 'impostos'},
                  {slug: 'combustivel'},
                  {slug: 'manutencao'},
                  {slug: 'pneus'},
                  // salarios ausente
                ],
                error: null,
              }),
            );
          }
          return Promise.resolve(resolve({data: [], error: null}));
        };
        return chain;
      },
    };

    await expect(
      assertSystemFinancialPrerequisites(supabase as never, 'company-1'),
    ).rejects.toThrow(/salarios/);
  });
});

describe('homologacao seed — falha parcial e bloqueio de reexecução', () => {
  it('execution report marca abort e divergência; empty-guard bloqueia dados pré-existentes', async () => {
    const tracker = new HmlExecutionTracker();
    tracker.setExpectedPlan(buildHmlExpectedPlan());
    tracker.recordSuccess({
      phase: 'fuel',
      entity: 'fuel',
      key: 'f001',
      table: 'fuel_records',
      kind: 'primary',
      operation: 'insert',
      id: 'fuel-1',
    });
    tracker.recordFailure({
      phase: 'fuel',
      entity: 'financial_integration_fuel',
      key: 'f001',
      table: 'financial_entries',
      kind: 'financial_integration',
      operation: 'sync',
      id: 'fuel-1',
      expectedFinancialEntries: 2,
      error: 'esperado 2, encontrado(s) 1',
    });

    expect(() => tracker.abort('fuel', 'parcela incompleta')).toThrow(HmlPhaseAbortError);
    const report = tracker.toReport();
    expect(report.abortedPhase).toBe('fuel');
    expect(report.comparison?.ok).toBe(false);
    expect(report.executedTotals.primary).toBe(1);
    expect(report.executedTotals.financialIntegrationCalls).toBe(0);

    const supabase = {
      from(table: string) {
        const chain: Record<string, unknown> = {};
        const self = () => chain;
        chain.select = self;
        chain.eq = self;
        chain.is = self;
        chain.in = self;
        // count query uses head:true — thenable with count
        chain.then = (
          resolve: (value: {
            count: number;
            error: null;
            data: unknown;
          }) => unknown,
        ) => {
          if (table === 'branches') {
            return Promise.resolve(resolve({count: 1, error: null, data: []}));
          }
          if (table === 'fuel_records') {
            return Promise.resolve(resolve({count: 3, error: null, data: null}));
          }
          if (table === 'company_members') {
            return Promise.resolve(resolve({count: 1, error: null, data: null}));
          }
          if (table === 'cost_centers' || table === 'positions') {
            return Promise.resolve(resolve({count: 0, error: null, data: []}));
          }
          return Promise.resolve(resolve({count: 0, error: null, data: null}));
        };
        return chain;
      },
    };

    await expect(
      assertCompanyEmptyForHomologacao(supabase as never, 'company-1'),
    ).rejects.toThrow(/fuel_records/);
  });

  it('plano de viagens completed alimenta sync calls de frete', () => {
    const completed = buildHmlTripDefinitions().filter((t) => t.status === 'completed').length;
    expect(completed).toBe(12);
    expect(countExpectedPayrollFinancialEntries()).toBe(
      (2 + HML_COUNTS.employees) * HML_COUNTS.payrollCompetences,
    );
  });
});
