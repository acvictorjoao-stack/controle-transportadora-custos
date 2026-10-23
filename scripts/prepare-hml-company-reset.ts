/**
 * Preparação / plano do reset de negócio HML (company-scoped).
 *
 * PADRÃO: validação LOCAL da migration SQL + gates.
 * NÃO conecta ao Supabase. NÃO aplica migration. NÃO chama a RPC.
 *
 * `--execute` é SEMPRE bloqueado enquanto
 * `HML_COMPANY_RESET_REMOTE_EXECUTION_ENABLED === false`.
 *
 * Este arquivo NÃO é importado pela aplicação Next.js.
 */
import {readFileSync} from 'node:fs';

import {
  HML_COMPANY_RESET_ADVISORY_LOCK_SQL,
  HML_COMPANY_RESET_AUDIT_TABLE,
  HML_COMPANY_RESET_AUTHORIZE_FLAG,
  HML_COMPANY_RESET_COMPANY_ID,
  HML_COMPANY_RESET_CONFIRM_ENV,
  HML_COMPANY_RESET_CONFIRM_VALUE,
  HML_COMPANY_RESET_FULL_DELETE_TABLES,
  HML_COMPANY_RESET_MIGRATION_PATH,
  HML_COMPANY_RESET_PORTAL_MASTER_AUTHORIZED,
  HML_COMPANY_RESET_PRESERVE,
  HML_COMPANY_RESET_PROJECT_REF,
  HML_COMPANY_RESET_PROJECT_REF_GUC,
  HML_COMPANY_RESET_REMOTE_EXECUTION_ENABLED,
  HML_COMPANY_RESET_RPC,
  HML_COMPANY_RESET_SEED_EMPTY_GUARDS,
  HML_COMPANY_RESET_SELECTIVE_DELETE,
  HML_COMPANY_RESET_SESSION_GUC,
  decideCompanyResetAuthorization,
} from '../database/seeds/homologacao/company-reset';
import {HML_HARD_DELETE_REMOTE_EXECUTION_ENABLED} from '../database/seeds/homologacao/hard-delete';
import {
  inspectHmlEnvUrlProjectRef,
  loadLocalEnv,
} from '../database/seeds/homologacao/env';

function main(): void {
  const argv = process.argv.slice(2);
  const executeRequested = argv.includes('--execute');

  loadLocalEnv();
  const urlInspection = inspectHmlEnvUrlProjectRef(HML_COMPANY_RESET_PROJECT_REF);

  // Fail-closed local: se a URL estiver configurada e o host não for o ref HML, aborta.
  // Não conecta ao remoto; não imprime a URL completa nem keys.
  if (urlInspection.status === 'mismatch') {
    console.log('mode=LOCAL_PLAN');
    console.log('ABORT project_ref_mismatch_from_env_url');
    console.log(`projectRefExpected=${HML_COMPANY_RESET_PROJECT_REF}`);
    console.log(
      `projectRefFromUrl=${urlInspection.projectRefFromUrl ?? 'unparseable'}`,
    );
    console.log('writes=none remoteCalls=none migrationApplied=false');
    process.exitCode = 1;
    return;
  }

  const authz = decideCompanyResetAuthorization({
    executeRequested,
    argv,
    env: process.env,
    projectRef: urlInspection.projectRefFromUrl ?? HML_COMPANY_RESET_PROJECT_REF,
    isMembershipSuperAdmin: null,
    isPortalMasterActing: null,
    portalMasterAuthorized: HML_COMPANY_RESET_PORTAL_MASTER_AUTHORIZED,
    remoteExecutionEnabled: HML_COMPANY_RESET_REMOTE_EXECUTION_ENABLED,
  });

  console.log(`mode=${authz.mode}`);
  console.log(`remoteExecutionEnabled=${HML_COMPANY_RESET_REMOTE_EXECUTION_ENABLED}`);
  console.log(`hardDeleteRemoteStillFalse=${HML_HARD_DELETE_REMOTE_EXECUTION_ENABLED === false}`);
  console.log(`portalMasterAuthorized=${HML_COMPANY_RESET_PORTAL_MASTER_AUTHORIZED}`);
  console.log(`migrationPath=${HML_COMPANY_RESET_MIGRATION_PATH}`);
  console.log(`rpc=${HML_COMPANY_RESET_RPC}`);
  console.log(`auditTable=${HML_COMPANY_RESET_AUDIT_TABLE}`);
  console.log(`companyIdPrefix=${HML_COMPANY_RESET_COMPANY_ID.slice(0, 8)}`);
  console.log(`projectRefExpected=${HML_COMPANY_RESET_PROJECT_REF}`);
  console.log(
    `projectRefFromUrl=${urlInspection.projectRefFromUrl ?? 'absent'}`,
  );
  console.log(`projectRefGuc=${HML_COMPANY_RESET_PROJECT_REF_GUC}`);
  console.log(`sessionGuc=${HML_COMPANY_RESET_SESSION_GUC}`);
  console.log(`confirmValue=${HML_COMPANY_RESET_CONFIRM_VALUE}`);
  console.log(`authorizeFlag=${HML_COMPANY_RESET_AUTHORIZE_FLAG}`);
  console.log(`confirmEnv=${HML_COMPANY_RESET_CONFIRM_ENV}`);
  console.log(`fullDeleteTables=${HML_COMPANY_RESET_FULL_DELETE_TABLES.length}`);
  console.log(`selectiveDeletes=${HML_COMPANY_RESET_SELECTIVE_DELETE.length}`);
  console.log(`preserveItems=${HML_COMPANY_RESET_PRESERVE.length}`);
  console.log(`seedEmptyGuards=${HML_COMPANY_RESET_SEED_EMPTY_GUARDS.join(',')}`);

  if (authz.mode === 'EXECUTE_BLOCKED') {
    console.log(`EXECUTE_BLOCKED reason=${authz.reason}`);
    console.log(
      'Nenhuma chamada remota foi feita. Reabilitação exige revisão humana da flag + migration aplicada + GRANT EXECUTE.',
    );
    process.exitCode = executeRequested ? 1 : 0;
  }

  if (authz.mode === 'EXECUTE') {
    console.log('ABORT: EXECUTE alcançado sem implementação remota nesta etapa.');
    process.exitCode = 1;
    return;
  }

  const sql = readFileSync(HML_COMPANY_RESET_MIGRATION_PATH, 'utf8');
  console.log(`sqlDefinesFunction=${sql.includes(HML_COMPANY_RESET_RPC)}`);
  console.log(`sqlSecurityDefiner=${/security definer/i.test(sql)}`);
  console.log(`sqlSearchPathFixed=${sql.includes('set search_path = public')}`);
  console.log(`sqlHardcodedCompany=${sql.includes(HML_COMPANY_RESET_COMPANY_ID)}`);
  console.log(`sqlSlugGate=${sql.includes("primeira-empresa")}`);
  console.log(`sqlRevokesPublic=${sql.includes(`revoke all on function public.${HML_COMPANY_RESET_RPC}`)}`);
  console.log(
    `sqlRevokesAuthenticated=${new RegExp(
      `revoke all on function public\\.${HML_COMPANY_RESET_RPC}\\(uuid, text\\) from authenticated`,
      'i',
    ).test(sql)}`,
  );
  console.log(
    `sqlRevokesServiceRole=${new RegExp(
      `revoke all on function public\\.${HML_COMPANY_RESET_RPC}\\(uuid, text\\) from service_role`,
      'i',
    ).test(sql)}`,
  );
  console.log(
    `sqlNoGrantExecute=${!new RegExp(
      `grant execute on function public\\.${HML_COMPANY_RESET_RPC}\\(uuid, text\\) to (authenticated|service_role)`,
      'i',
    ).test(sql)}`,
  );
  console.log(`sqlAuditTable=${sql.includes(HML_COMPANY_RESET_AUDIT_TABLE)}`);
  console.log(`sqlAuditImmutable=${sql.includes('hml_company_reset_audit_events_immutable')}`);
  console.log(`sqlAdvisoryLock=${sql.includes(HML_COMPANY_RESET_ADVISORY_LOCK_SQL)}`);
  console.log(`sqlLockThenRevalidate=${sql.includes('for update') && sql.indexOf('pg_advisory_xact_lock') < sql.indexOf('for update')}`);
  console.log(`sqlPayrollGuc=${sql.includes("set_config('app.allow_payroll_hard_delete'")}`);
  console.log(`sqlCrossTenantChecks=${sql.includes('cross-tenant')}`);
  console.log(`sqlPreservesHq=${sql.includes('is_headquarters = false')}`);
  console.log(`sqlPreservesSystemCc=${sql.includes('is_system = false')}`);
  console.log(`sqlRejectsPortalMaster=${sql.includes('is_portal_owner_acting_for')}`);
  console.log(`sqlMembershipSuperAdmin=${sql.includes("r.name = 'Super Admin'")}`);
  console.log(`sqlRoleCompanyMatch=${sql.includes('r.company_id = cm.company_id')}`);
  console.log(`sqlDefaultBranchReassign=${sql.includes('members_default_branch_reassigned')}`);
  console.log(`sqlVisionProviders=${sql.includes('vision_providers')}`);
  console.log(`sqlParentRowLocks=${/perform 1 from public\.vehicles where id = any \(v_vehicle_ids\) for update/i.test(sql)}`);
  console.log(`sqlTripParentLocks=${/perform 1 from public\.trips where id = any \(v_trip_ids\) for update/i.test(sql)}`);
  console.log(`sqlTireRecapsSupplierXt=${sql.includes('tire_recaps.supplier_id')}`);
  console.log(`sqlDriverFuelXt=${sql.includes('fuel_records.driver_id')}`);
  console.log(`sqlMaintScheduleDriverXt=${sql.includes('maintenance_schedules.driver_id')}`);
  console.log(`sqlTripIdXt=${sql.includes('fuel_records.trip_id')}`);
  console.log(`sqlProjectRefGuc=${sql.includes(HML_COMPANY_RESET_PROJECT_REF_GUC)}`);
  console.log(`sqlEmbeddedProjectRef=${sql.includes(HML_COMPANY_RESET_PROJECT_REF)}`);

  console.log('writes=none remoteCalls=none migrationApplied=false');
  console.log('status=local_plan_ok');
}

const isDirectRun =
  typeof process.argv[1] === 'string' &&
  process.argv[1].replace(/\\/g, '/').endsWith('prepare-hml-company-reset.ts');

if (isDirectRun) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    console.log(`ABORT ${message}`);
    process.exitCode = 1;
  }
}

export {};
