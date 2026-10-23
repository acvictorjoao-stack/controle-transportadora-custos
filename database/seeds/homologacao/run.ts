import {createHmlAuthenticatedClient, signOutHmlClient} from './client';
import {hasHmlAuthEnv} from './env';
import {
  formatPhaseAbortMessage,
  HmlPhaseAbortError,
} from './execution-report';
import {runLiveGuards} from './guards';
import {runHomologacaoPhases} from './phases';
import type {HmlSeedOptions, HmlSeedResult} from './types';
import {
  assertHmlCatalogInvariants,
  assertHmlZodPayloads,
  assertVolumeFitsProfessionalPlan,
  buildOfflinePlanSummary,
} from './validators';

function printSafeSummary(result: HmlSeedResult): void {
  console.log(
    JSON.stringify(
      {
        mode: result.mode,
        aborted: result.aborted,
        reason: result.reason,
        liveChecksPerformed: result.liveChecksPerformed,
        companyId: result.context?.companyId,
        companySlug: result.context?.companySlug ?? result.plan.companySlug,
        planSlug: result.context?.planSlug,
        requiredPlan: result.plan.requiredPlan,
        counts: result.plan.counts,
        expectedPlanTotals: result.plan.expectedPlan?.totals,
        expectedPlanDisclaimer: result.plan.expectedPlan?.disclaimer,
        modules: result.plan.modules.length,
        created: result.created,
        executionReport: result.executionReport
          ? {
              isTransactional: result.executionReport.isTransactional,
              disclaimer: result.executionReport.disclaimer,
              abortedPhase: result.executionReport.abortedPhase,
              abortReason: result.executionReport.abortReason,
              expectedTotals: result.executionReport.expectedTotals,
              executedTotals: result.executionReport.executedTotals,
              comparison: result.executionReport.comparison,
              financial: result.executionReport.financial,
              phaseSummaries: result.executionReport.phaseSummaries,
              operationsSuccess: result.executionReport.operations.filter(
                (op) => op.status === 'success',
              ).length,
              operationsFailed: result.executionReport.operations.filter(
                (op) => op.status === 'failed',
              ).length,
            }
          : undefined,
      },
      null,
      2,
    ),
  );
}

/**
 * Orquestra a seed de homologação.
 * Padrão: dry-run (sem escrita). Escrita só com mode === 'execute'.
 *
 * Limitações conhecidas (não “consertadas” com limpeza automática):
 * - Sem transação global: cada `create*` nas phases comita isoladamente via PostgREST.
 * - Sem rollback real: falha no meio deixa registros já gravados em `primeira-empresa`.
 * - Sem retomada segura: `loadManifest` existe, mas as phases iniciam manifesto vazio.
 * - Após falha parcial a carga NÃO deve ser repetida automaticamente: novo `--execute`
 *   tende a abortar nos empty-guards; qualquer limpeza é manual e fora deste script.
 * - Manifesto/relatório local NÃO é log transacional do banco (ver PARTIAL_FAILURE.md).
 * - Integrações financeiras operacionais são obrigatórias na carga HML (hooks de domínio).
 *
 * Estratégia futura (separada): limpeza manual controlada ou job transacional no DB,
 * nunca delete indiscriminado a partir deste script. Aguarda nova autorização.
 */
export async function runHomologacaoSeed(
  options: HmlSeedOptions,
): Promise<HmlSeedResult> {
  assertHmlCatalogInvariants();
  assertHmlZodPayloads();
  assertVolumeFitsProfessionalPlan();

  const plan = buildOfflinePlanSummary(options.mode);

  if (options.mode === 'dry-run') {
    if (options.liveChecks !== true) {
      const result: HmlSeedResult = {
        mode: 'dry-run',
        aborted: false,
        liveChecksPerformed: false,
        plan,
        reason: hasHmlAuthEnv()
          ? 'Dry-run offline concluído. Passe --live-checks para validar slug/plano/vazios/pré-requisitos financeiros no banco (somente leitura).'
          : 'Dry-run offline concluído. Configure HML_ADMIN_* e use --live-checks para guards de leitura.',
      };
      printSafeSummary(result);
      return result;
    }

    const {supabase, profileId} = await createHmlAuthenticatedClient();
    try {
      const {context, moduleCounts} = await runLiveGuards(supabase, profileId);
      const result: HmlSeedResult = {
        mode: 'dry-run',
        aborted: false,
        liveChecksPerformed: true,
        plan,
        context: {
          companyId: context.companyId,
          companySlug: context.companySlug,
          planSlug: context.planSlug,
        },
        reason: `Dry-run com guards OK. Módulos vazios confirmados (${moduleCounts.length} checagens) + pré-requisitos financeiros. Use --execute para gravar.`,
      };
      printSafeSummary(result);
      return result;
    } finally {
      await signOutHmlClient(supabase);
    }
  }

  // mode === 'execute'
  const {supabase, profileId} = await createHmlAuthenticatedClient();
  try {
    const {context} = await runLiveGuards(supabase, profileId);
    try {
      const {created, executionReport} = await runHomologacaoPhases(supabase, context);
      const result: HmlSeedResult = {
        mode: 'execute',
        aborted: false,
        liveChecksPerformed: true,
        plan,
        context: {
          companyId: context.companyId,
          companySlug: context.companySlug,
          planSlug: context.planSlug,
        },
        created,
        executionReport,
      };
      printSafeSummary(result);
      return result;
    } catch (error) {
      if (error instanceof HmlPhaseAbortError) {
        const result: HmlSeedResult = {
          mode: 'execute',
          aborted: true,
          liveChecksPerformed: true,
          plan,
          context: {
            companyId: context.companyId,
            companySlug: context.companySlug,
            planSlug: context.planSlug,
          },
          reason: formatPhaseAbortMessage(error.report),
          executionReport: error.report,
        };
        printSafeSummary(result);
        return result;
      }
      throw error;
    }
  } finally {
    await signOutHmlClient(supabase);
  }
}
