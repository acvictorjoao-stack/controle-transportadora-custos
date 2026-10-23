/**
 * Recuperação controlada dos 43 IDs do manifesto parcial HML (soft-delete).
 *
 * PADRÃO: dry-run (somente SELECT + classificações). Nenhuma escrita sem
 * autorização explícita tripla:
 *   --execute
 *   --i-authorize-soft-delete-of-manifest-43
 *   HML_RECOVERY_CONFIRM=SOFT_DELETE_MANIFEST_43
 *
 * `--execute` sozinho NÃO autoriza.
 *
 * Também exige membership Super Admin da empresa-alvo (paridade 102/103) via
 * `assertHmlDestructiveMembershipSuperAdmin` em dry-run e EXECUTE.
 * Portal Master acting é RECUSADO; não usa `is_company_super_admin`.
 *
 * Estados: ACTIVE | SOFT_DELETED (skip) | INVALID (abort).
 * Checkpoint local (não é fonte de verdade): .hml-seed/recovery-partial-log.jsonl
 *   - DRY_RUN: checkpoint inválido → aviso + continua (diagnóstico)
 *   - EXECUTE: checkpoint inválido → abort (fail-closed)
 *   - IDs fora do manifesto no checkpoint → aviso; nunca autorizam escrita
 *
 * Efeitos colaterais esperados em UPDATE (não revertidos):
 * - customers / customer_contracts / vehicles → INSERT em *_history (action delete)
 * - customer_contract_items → sync_customer_contract_revenue (recalcula contracted_revenue)
 *
 * Não usa service_role. Não executa seed. Não faz hard-delete.
 */
import {sanitizeDatabaseErrorText} from '../features/master/companies/utils/database-error';
import {
  createHmlAuthenticatedClient,
  signOutHmlClient,
} from '../database/seeds/homologacao/client';
import {HML_COMPANY_SLUG} from '../database/seeds/homologacao/constants';
import {hasHmlAuthEnv, loadLocalEnv} from '../database/seeds/homologacao/env';
import {assertHmlDestructiveMembershipSuperAdmin} from '../database/seeds/homologacao/guards';
import {
  activePlanRows,
  analyzeCheckpointConsistency,
  appendCheckpoint,
  buildCheckpointRecord,
  buildRecoveryPlan,
  createSupabaseCountActive,
  classifyPlanAgainstLive,
  decideRecoveryActions,
  HML_RECOVERY_AUTHORIZE_FLAG,
  HML_RECOVERY_CHECKPOINT_PATH,
  HML_RECOVERY_CONFIRM_ENV,
  HML_RECOVERY_CONFIRM_VALUE,
  HML_RECOVERY_LINK_COVERAGE_NOTES,
  HML_RECOVERY_MANIFEST_PATH,
  HML_RECOVERY_TABLE_ORDER,
  loadCheckpointForMode,
  loadRecoveryManifest,
  runLinkPrechecks,
  softDeleteActiveRow,
  summarizeDecisions,
} from '../database/seeds/homologacao/recovery';

function abort(message: string): never {
  console.log(`ABORT ${sanitizeDatabaseErrorText(message)}`);
  process.exit(1);
}

function parseArgs(argv: string[]): {executeRequested: boolean; authorizeFlag: boolean} {
  return {
    executeRequested: argv.includes('--execute'),
    authorizeFlag: argv.includes(HML_RECOVERY_AUTHORIZE_FLAG),
  };
}

async function main(): Promise<void> {
  loadLocalEnv();
  const {executeRequested, authorizeFlag} = parseArgs(process.argv.slice(2));
  const confirmEnv = process.env[HML_RECOVERY_CONFIRM_ENV]?.trim();
  const writeAuthorized =
    executeRequested && authorizeFlag && confirmEnv === HML_RECOVERY_CONFIRM_VALUE;

  if (executeRequested && !writeAuthorized) {
    console.log('EXECUTE_BLOCKED: --execute sem autorização completa.');
    console.log(
      `Requer: ${HML_RECOVERY_AUTHORIZE_FLAG} e ${HML_RECOVERY_CONFIRM_ENV}=${HML_RECOVERY_CONFIRM_VALUE}`,
    );
    process.exitCode = 1;
    return;
  }

  const mode = writeAuthorized ? 'EXECUTE' : 'DRY_RUN';
  console.log(`mode=${mode}`);
  console.log(`manifestPath=${HML_RECOVERY_MANIFEST_PATH}`);
  console.log(`checkpointPath=${HML_RECOVERY_CHECKPOINT_PATH}`);
  console.log(`linkCoverageVerified=${HML_RECOVERY_LINK_COVERAGE_NOTES.verified.join(' | ')}`);
  console.log(
    `linkCoverageArchivedPolicy=${HML_RECOVERY_LINK_COVERAGE_NOTES.archivedRefsPolicy}`,
  );
  console.log(`linkCoverageNotQueried=${HML_RECOVERY_LINK_COVERAGE_NOTES.notQueried.join(' | ')}`);
  console.log(
    'sideEffects=customer/contract/vehicle history inserts; contract_items sync_customer_contract_revenue',
  );

  if (!hasHmlAuthEnv()) {
    console.log('AUTH_UNAVAILABLE: configure HML auth env (anon + admin), nunca service_role.');
    process.exitCode = 1;
    return;
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    console.log('NOTE: SUPABASE_SERVICE_ROLE_KEY está no ambiente; este script não a usa.');
  }

  const checkpointLoad = loadCheckpointForMode(HML_RECOVERY_CHECKPOINT_PATH);
  if (checkpointLoad.status === 'invalid') {
    if (mode === 'EXECUTE') {
      abort(`checkpoint_invalido: ${checkpointLoad.error}`);
    }
    console.log(
      `WARN checkpoint_invalido_dry_run: ${sanitizeDatabaseErrorText(checkpointLoad.error)} — ignorando checkpoint; live permanece fonte de verdade.`,
    );
  }
  const checkpoint = checkpointLoad.records;
  console.log(`checkpointRecords=${checkpoint.length}`);

  const manifest = loadRecoveryManifest(HML_RECOVERY_MANIFEST_PATH);
  const plan = buildRecoveryPlan(manifest);

  const counts = Object.fromEntries(
    HML_RECOVERY_TABLE_ORDER.map((table) => [
      table,
      plan.filter((row) => row.table === table).length,
    ]),
  );
  console.log(`companySlug=${manifest.companySlug}`);
  console.log('companyId=from_manifest (not printed)');
  console.log(`plannedTotal=${plan.length}`);
  console.log(`plannedByTable=${JSON.stringify(counts)}`);

  const {supabase, profileId} = await createHmlAuthenticatedClient();

  try {
    const {data: company, error: companyError} = await supabase
      .from('companies')
      .select('id')
      .eq('slug', HML_COMPANY_SLUG)
      .is('deleted_at', null)
      .maybeSingle();

    if (companyError || !company?.id) {
      abort(companyError?.message ?? 'company_slug_not_found');
    }
    if (company.id !== manifest.companyId) {
      abort('company_id_mismatch_manifest_vs_live');
    }

    const companyId = company.id as string;

    try {
      await assertHmlDestructiveMembershipSuperAdmin(supabase, companyId, profileId);
    } catch (error) {
      abort(error instanceof Error ? error.message : String(error));
    }
    console.log('membershipSuperAdmin=confirmed portalMasterActing=rejected');

    // Checkpoint não é fonte de verdade — sempre reconciliar com live.
    const classified = await classifyPlanAgainstLive(supabase, companyId, plan);
    for (const row of classified) {
      console.log(
        `classify table=${row.plan.table} key=${row.plan.key} idPrefix=${row.plan.idPrefix} state=${row.state} reason=${row.reason}`,
      );
    }

    const consistency = analyzeCheckpointConsistency(checkpoint, plan, classified);
    for (const row of consistency.outsidePlan) {
      console.log(
        `WARN checkpoint_id_outside_manifest table=${row.table} key=${row.key} idPrefix=${row.id.slice(0, 8)} — ignorado para decisões`,
      );
    }
    for (const row of consistency.liveDivergence) {
      console.log(
        `WARN checkpoint_live_divergence table=${row.table} key=${row.key} idPrefix=${row.id.slice(0, 8)} checkpoint=SOFT_DELETED live=${row.liveState} — live manda`,
      );
    }

    const invalid = classified.filter((row) => row.state === 'INVALID');
    if (invalid.length > 0) {
      abort(
        `precheck_invalid count=${invalid.length} first=${invalid[0].plan.table}/${invalid[0].plan.key}:${invalid[0].reason}`,
      );
    }

    const actives = activePlanRows(classified);
    const countActive = createSupabaseCountActive(supabase);
    const linkResults = await runLinkPrechecks(countActive, companyId, actives, plan);
    for (const link of linkResults) {
      console.log(
        `linkCheck table=${link.table} key=${link.key} blocked=${link.blocked} reason=${link.reason} details=${link.details.join(',') || 'none'}`,
      );
    }

    const {decisions, abortReason} = decideRecoveryActions(classified, linkResults);
    if (abortReason) {
      abort(abortReason);
    }

    const summary = summarizeDecisions(decisions);
    console.log(
      `decisionSummary wouldUpdate=${summary.wouldUpdate} skippedSoftDeleted=${summary.skipped}`,
    );

    if (mode === 'DRY_RUN') {
      console.log('DRY_RUN_COMPLETE: nenhuma linha alterada; checkpoint não gravado.');
      console.log(
        'Para EXECUTE (autorização adicional explícita do operador, não automática):',
      );
      console.log(
        `  $env:${HML_RECOVERY_CONFIRM_ENV}='${HML_RECOVERY_CONFIRM_VALUE}'; npx tsx scripts/recover-hml-partial-soft-delete.ts --execute ${HML_RECOVERY_AUTHORIZE_FLAG}`,
      );
      return;
    }

    // EXECUTE — todos os pré-checks já passaram; ainda revalida por linha.
    const deletedAt = new Date().toISOString();
    let seq = 0;
    let updated = 0;
    let skipped = 0;

    for (const decision of decisions) {
      seq += 1;
      if (decision.action === 'skipped') {
        skipped += 1;
        const record = buildCheckpointRecord({
          at: new Date().toISOString(),
          table: decision.plan.table,
          key: decision.plan.key,
          id: decision.plan.id,
          seq,
          action: 'skipped',
        });
        try {
          appendCheckpoint(HML_RECOVERY_CHECKPOINT_PATH, record);
        } catch (error) {
          // Já soft-deletado no banco; falha de checkpoint não exige re-UPDATE.
          console.log(
            `checkpoint_append_failed_after_skip table=${decision.plan.table} key=${decision.plan.key} err=${error instanceof Error ? error.message : String(error)}`,
          );
        }
        console.log(
          `skipped table=${decision.plan.table} key=${decision.plan.key} idPrefix=${decision.plan.idPrefix} seq=${seq}/${decisions.length}`,
        );
        continue;
      }

      const result = await softDeleteActiveRow(
        supabase,
        companyId,
        profileId,
        decision.plan,
        deletedAt,
      );
      if (!result.ok) {
        abort(
          `update_abort table=${decision.plan.table} key=${decision.plan.key} reason=${result.reason} updatedSoFar=${updated} skippedSoFar=${skipped}`,
        );
      }

      updated += 1;
      const record = buildCheckpointRecord({
        at: new Date().toISOString(),
        table: decision.plan.table,
        key: decision.plan.key,
        id: decision.plan.id,
        seq,
        action: 'updated',
      });
      try {
        appendCheckpoint(HML_RECOVERY_CHECKPOINT_PATH, record);
      } catch (error) {
        // UPDATE já commitado; próximo run verá SOFT_DELETED e fará SKIP.
        console.log(
          `checkpoint_append_failed_after_update table=${decision.plan.table} key=${decision.plan.key} idPrefix=${decision.plan.idPrefix} err=${error instanceof Error ? error.message : String(error)}`,
        );
        console.log(
          'RESUME_HINT: reexecute com a mesma autorização; linhas SOFT_DELETED serão skipped após reconciliação live.',
        );
      }

      console.log(
        `soft_deleted table=${decision.plan.table} key=${decision.plan.key} idPrefix=${decision.plan.idPrefix} seq=${seq}/${decisions.length}`,
      );
    }

    console.log(`EXECUTE_COMPLETE updated=${updated} skipped=${skipped} total=${decisions.length}`);
    console.log(
      'NEXT: reconciliação somente leitura (diag-hml-manifest-readonly / contagens) antes de qualquer seed:hml --execute. Este log NÃO declara limpeza concluída.',
    );
  } finally {
    await signOutHmlClient(supabase);
  }
}

main().catch((error) => {
  const raw = error instanceof Error ? error.message : String(error);
  console.log(`UNEXPECTED ${sanitizeDatabaseErrorText(raw)}`);
  process.exitCode = 1;
});
