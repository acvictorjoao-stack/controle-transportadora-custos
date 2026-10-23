/**
 * Preparação / plano da limpeza física transacional HML (manifesto 43).
 *
 * PADRÃO: apenas validação LOCAL do manifesto + checagem da migration SQL.
 * NÃO conecta ao Supabase. NÃO aplica migration. NÃO chama a RPC.
 *
 * `--execute` é SEMPRE bloqueado enquanto
 * `HML_HARD_DELETE_REMOTE_EXECUTION_ENABLED === false` (estado atual).
 *
 * Futura execução (fora desta etapa), se alguém reabilitar a flag de código:
 *   --execute
 *   --i-authorize-hard-delete-of-manifest-43
 *   HML_HARD_DELETE_CONFIRM=HARD_DELETE_MANIFEST_43
 *   + migration 102 aplicada
 *   + set_config('app.allow_hml_hard_delete', 'HARD_DELETE_MANIFEST_43', true)
 *   + set_config('app.hml_expected_project_ref', '<ref>', true) após validar URL
 *   + membership Super Admin da empresa (Portal Master recusado)
 *   + GRANT EXECUTE reabilitado (hoje revogado na migration)
 *
 * Este arquivo NÃO é importado pela aplicação Next.js.
 */
import {readFileSync} from 'node:fs';

import {
  HML_HARD_DELETE_ADVISORY_LOCK_SQL,
  HML_HARD_DELETE_AUDIT_TABLE,
  HML_HARD_DELETE_AUTHORIZE_FLAG,
  HML_HARD_DELETE_COMPANY_ID,
  HML_HARD_DELETE_CONFIRM_ENV,
  HML_HARD_DELETE_CONFIRM_VALUE,
  HML_HARD_DELETE_EXPECTED_ENTRIES,
  HML_HARD_DELETE_MANIFEST_PATH,
  HML_HARD_DELETE_MIGRATION_PATH,
  HML_HARD_DELETE_PORTAL_MASTER_AUTHORIZED,
  HML_HARD_DELETE_PROJECT_REF,
  HML_HARD_DELETE_PROJECT_REF_GUC,
  HML_HARD_DELETE_REMOTE_EXECUTION_ENABLED,
  HML_HARD_DELETE_RPC,
  HML_HARD_DELETE_SESSION_GUC,
  HML_HARD_DELETE_TABLE_ORDER,
  decideHardDeleteAuthorization,
  extractUuidsFromSql,
  loadHardDeleteManifest,
  planInDeleteOrder,
} from '../database/seeds/homologacao/hard-delete';
import {
  inspectHmlEnvUrlProjectRef,
  loadLocalEnv,
} from '../database/seeds/homologacao/env';

function main(): void {
  const argv = process.argv.slice(2);
  const executeRequested = argv.includes('--execute');

  loadLocalEnv();
  const urlInspection = inspectHmlEnvUrlProjectRef(HML_HARD_DELETE_PROJECT_REF);

  // Fail-closed local: se a URL estiver configurada e o host não for o ref HML, aborta.
  // Não conecta ao remoto; não imprime a URL completa nem keys.
  if (urlInspection.status === 'mismatch') {
    console.log('mode=LOCAL_PLAN');
    console.log('ABORT project_ref_mismatch_from_env_url');
    console.log(`projectRefExpected=${HML_HARD_DELETE_PROJECT_REF}`);
    console.log(
      `projectRefFromUrl=${urlInspection.projectRefFromUrl ?? 'unparseable'}`,
    );
    console.log('writes=none remoteCalls=none migrationApplied=false');
    process.exitCode = 1;
    return;
  }

  const authz = decideHardDeleteAuthorization({
    executeRequested,
    argv,
    env: process.env,
    projectRef: urlInspection.projectRefFromUrl ?? HML_HARD_DELETE_PROJECT_REF,
    isMembershipSuperAdmin: null,
    isPortalMasterActing: null,
    portalMasterAuthorized: HML_HARD_DELETE_PORTAL_MASTER_AUTHORIZED,
    remoteExecutionEnabled: HML_HARD_DELETE_REMOTE_EXECUTION_ENABLED,
  });

  console.log(`mode=${authz.mode}`);
  console.log(`remoteExecutionEnabled=${HML_HARD_DELETE_REMOTE_EXECUTION_ENABLED}`);
  console.log(`portalMasterAuthorized=${HML_HARD_DELETE_PORTAL_MASTER_AUTHORIZED}`);
  console.log(`manifestPath=${HML_HARD_DELETE_MANIFEST_PATH}`);
  console.log(`migrationPath=${HML_HARD_DELETE_MIGRATION_PATH}`);
  console.log(`rpc=${HML_HARD_DELETE_RPC}`);
  console.log(`auditTable=${HML_HARD_DELETE_AUDIT_TABLE}`);
  console.log(`companyIdPrefix=${HML_HARD_DELETE_COMPANY_ID.slice(0, 8)}`);
  console.log(`projectRefExpected=${HML_HARD_DELETE_PROJECT_REF}`);
  console.log(
    `projectRefFromUrl=${urlInspection.projectRefFromUrl ?? 'absent'}`,
  );
  console.log(`projectRefGuc=${HML_HARD_DELETE_PROJECT_REF_GUC}`);
  console.log(`sessionGuc=${HML_HARD_DELETE_SESSION_GUC}`);
  console.log(`confirmValue=${HML_HARD_DELETE_CONFIRM_VALUE}`);
  console.log(`authorizeFlag=${HML_HARD_DELETE_AUTHORIZE_FLAG}`);
  console.log(`confirmEnv=${HML_HARD_DELETE_CONFIRM_ENV}`);

  if (authz.mode === 'EXECUTE_BLOCKED') {
    console.log(`EXECUTE_BLOCKED reason=${authz.reason}`);
    console.log(
      'Nenhuma chamada remota foi feita. Reabilitação exige revisão humana da flag de código + migration aplicada + GRANT EXECUTE.',
    );
    process.exitCode = executeRequested ? 1 : 0;
  }

  if (authz.mode === 'EXECUTE') {
    // Caminho morto enquanto HML_HARD_DELETE_REMOTE_EXECUTION_ENABLED=false.
    console.log('ABORT: EXECUTE alcançado sem implementação remota nesta etapa.');
    process.exitCode = 1;
    return;
  }

  const manifest = loadHardDeleteManifest(HML_HARD_DELETE_MANIFEST_PATH);
  console.log(`manifestEntries=${manifest.entries.length}`);
  console.log(`manifestCompanyMatch=${manifest.companyId === HML_HARD_DELETE_COMPANY_ID}`);

  const plan = planInDeleteOrder();
  console.log(`deleteOrder=${HML_HARD_DELETE_TABLE_ORDER.join(' -> ')}`);
  console.log(
    `planFirstLast=${plan[0]?.table}:${plan[0]?.key} .. ${plan.at(-1)?.table}:${plan.at(-1)?.key}`,
  );

  const sql = readFileSync(HML_HARD_DELETE_MIGRATION_PATH, 'utf8');
  const uuids = new Set(extractUuidsFromSql(sql));
  let missingInSql = 0;
  for (const entry of HML_HARD_DELETE_EXPECTED_ENTRIES) {
    if (!uuids.has(entry.id)) missingInSql += 1;
  }
  console.log(`sqlAllowlistMissing=${missingInSql}`);
  console.log(`sqlDefinesFunction=${sql.includes('hml_hard_delete_manifest_43')}`);
  console.log(`sqlSecurityDefiner=${/security definer/i.test(sql)}`);
  console.log(`sqlSearchPathFixed=${sql.includes('set search_path = public')}`);
  console.log(`sqlRevokesPublic=${sql.includes('revoke all on function public.hml_hard_delete_manifest_43')}`);
  console.log(`sqlRevokesAuthenticated=${/revoke all on function public\.hml_hard_delete_manifest_43\(uuid, text\) from authenticated/i.test(sql)}`);
  console.log(`sqlRevokesServiceRole=${/revoke all on function public\.hml_hard_delete_manifest_43\(uuid, text\) from service_role/i.test(sql)}`);
  console.log(
    `sqlNoGrantExecute=${!/grant execute on function public\.hml_hard_delete_manifest_43\(uuid, text\) to (authenticated|service_role)/i.test(sql)}`,
  );
  console.log(`sqlAuditTable=${sql.includes(HML_HARD_DELETE_AUDIT_TABLE)}`);
  console.log(`sqlAuditImmutable=${sql.includes('hml_hard_delete_audit_events_immutable')}`);
  console.log(`sqlMembershipSuperAdmin=${sql.includes("r.name = 'Super Admin'")}`);
  console.log(`sqlRoleCompanyMatch=${sql.includes('r.company_id = cm.company_id')}`);
  console.log(`sqlRejectsPortalMaster=${sql.includes('is_portal_owner_acting_for')}`);
  console.log(`sqlCascadeDocuments=${sql.includes('customer_documents') && sql.includes('vehicle_documents')}`);
  console.log(`sqlH1CustomerBranch=${sql.includes('customer_addresses.branch_id fora do escopo')}`);
  console.log(`sqlGlobalSupplierRef=${/where supplier_id = any \(v_supplier_ids\)/.test(sql) && !/company_id = c_expected_company and supplier_id = any/.test(sql)}`);
  console.log(`sqlForUpdate=${/for update/i.test(sql)}`);
  console.log(`sqlAdvisoryLock=${sql.includes(HML_HARD_DELETE_ADVISORY_LOCK_SQL)}`);
  console.log(`sqlProjectRefGuc=${sql.includes(HML_HARD_DELETE_PROJECT_REF_GUC)}`);
  console.log(`sqlEmbeddedProjectRef=${sql.includes(HML_HARD_DELETE_PROJECT_REF)}`);

  console.log('writes=none remoteCalls=none migrationApplied=false');
  console.log('status=local_plan_ok');
}

// Evita execução acidental por import.
const isDirectRun =
  typeof process.argv[1] === 'string' &&
  process.argv[1].replace(/\\/g, '/').endsWith('prepare-hml-hard-delete.ts');

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
