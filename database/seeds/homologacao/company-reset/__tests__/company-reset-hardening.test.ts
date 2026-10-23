import {readFileSync} from 'node:fs';

import {describe, expect, it} from 'vitest';

import {HML_DESTRUCTIVE_ADVISORY_LOCK_SQL} from '../../constants';
import {
  HML_HARD_DELETE_ADVISORY_LOCK_SQL,
  HML_HARD_DELETE_MIGRATION_PATH,
  HML_HARD_DELETE_REMOTE_EXECUTION_ENABLED,
} from '../../hard-delete';
import {
  HML_COMPANY_RESET_ADVISORY_LOCK_SQL,
  HML_COMPANY_RESET_AUDIT_TABLE,
  HML_COMPANY_RESET_AUTHORIZE_FLAG,
  HML_COMPANY_RESET_COMPANY_ID,
  HML_COMPANY_RESET_CONFIRM_ENV,
  HML_COMPANY_RESET_CONFIRM_VALUE,
  HML_COMPANY_RESET_CROSS_TENANT_PARENT_CHECKS,
  HML_COMPANY_RESET_FULL_DELETE_TABLES,
  HML_COMPANY_RESET_MIGRATION_PATH,
  HML_COMPANY_RESET_PORTAL_MASTER_AUTHORIZED,
  HML_COMPANY_RESET_PRESERVE,
  HML_COMPANY_RESET_PRESERVE_COMPANY_ID_TABLES,
  HML_COMPANY_RESET_PROJECT_REF,
  HML_COMPANY_RESET_PROJECT_REF_GUC,
  HML_COMPANY_RESET_REMOTE_EXECUTION_ENABLED,
  HML_COMPANY_RESET_RPC,
  HML_COMPANY_RESET_SEED_EMPTY_GUARDS,
  HML_COMPANY_RESET_SELECTIVE_DELETE,
  decideCompanyResetAuthorization,
  projectRefFromSupabaseUrl,
} from '../index';

/** Extrai tabelas public com company_id a partir dos types gerados. */
function companyIdTablesFromDatabaseTypes(): string[] {
  const t = readFileSync('supabase/types/database.ts', 'utf8');
  const publicStart = t.indexOf('public: {');
  const tablesStart = t.indexOf('Tables: {', publicStart);
  const viewsStart = t.indexOf('Views: {', tablesStart);
  const body = t.slice(tablesStart, viewsStart);
  const tableNames = [...body.matchAll(/\n {6}([a-z_][a-z0-9_]*): \{/g)].map(
    (x) => x[1],
  );
  const withCompany: string[] = [];
  for (let i = 0; i < tableNames.length; i++) {
    const name = tableNames[i];
    const start = body.indexOf(`\n      ${name}: {`);
    const end =
      i + 1 < tableNames.length
        ? body.indexOf(`\n      ${tableNames[i + 1]}: {`)
        : body.length;
    const chunk = body.slice(start, end);
    if (/company_id:\s*string/.test(chunk)) withCompany.push(name);
  }
  return withCompany;
}

/** Extrai `delete from public.<table>` do corpo da função de reset. */
function deleteTargetsFromSql(sql: string): {
  full: Set<string>;
  selective: Map<string, string>;
} {
  const full = new Set<string>();
  const selective = new Map<string, string>();
  const fullRe =
    /delete from public\.([a-z_]+)\s+where company_id = c_expected_company\s*;/gi;
  let m: RegExpExecArray | null;
  while ((m = fullRe.exec(sql)) !== null) {
    full.add(m[1]);
  }
  const selRe =
    /delete from public\.([a-z_]+)\s+where company_id = c_expected_company\s+and (is_system = false|is_headquarters = false)/gi;
  while ((m = selRe.exec(sql)) !== null) {
    selective.set(m[1], m[2].toLowerCase());
  }
  return {full, selective};
}

describe('company-reset — flags e autorização', () => {
  it('mantém execução remota desabilitada (company-reset e hard-delete 43)', () => {
    expect(HML_COMPANY_RESET_REMOTE_EXECUTION_ENABLED).toBe(false);
    expect(HML_HARD_DELETE_REMOTE_EXECUTION_ENABLED).toBe(false);
    expect(HML_COMPANY_RESET_PORTAL_MASTER_AUTHORIZED).toBe(false);
  });

  it('bloqueia --execute enquanto a flag é false', () => {
    const decision = decideCompanyResetAuthorization({
      executeRequested: true,
      argv: [
        '--execute',
        HML_COMPANY_RESET_AUTHORIZE_FLAG,
      ],
      env: {
        [HML_COMPANY_RESET_CONFIRM_ENV]: HML_COMPANY_RESET_CONFIRM_VALUE,
      },
      projectRef: HML_COMPANY_RESET_PROJECT_REF,
      isMembershipSuperAdmin: true,
      isPortalMasterActing: false,
    });
    expect(decision).toEqual({
      mode: 'EXECUTE_BLOCKED',
      writeAuthorized: false,
      reason: 'remote_execution_disabled_in_code',
    });
  });

  it('rejeita project ref divergente mesmo com flag true (simulado)', () => {
    const decision = decideCompanyResetAuthorization({
      executeRequested: true,
      argv: ['--execute', HML_COMPANY_RESET_AUTHORIZE_FLAG],
      env: {[HML_COMPANY_RESET_CONFIRM_ENV]: HML_COMPANY_RESET_CONFIRM_VALUE},
      projectRef: 'other-project-ref',
      isMembershipSuperAdmin: true,
      remoteExecutionEnabled: true,
    });
    expect(decision.mode).toBe('EXECUTE_BLOCKED');
    if (decision.mode === 'EXECUTE_BLOCKED') {
      expect(decision.reason).toBe('project_ref_mismatch');
    }
  });

  it('rejeita Portal Master acting', () => {
    const decision = decideCompanyResetAuthorization({
      executeRequested: true,
      argv: ['--execute', HML_COMPANY_RESET_AUTHORIZE_FLAG],
      env: {[HML_COMPANY_RESET_CONFIRM_ENV]: HML_COMPANY_RESET_CONFIRM_VALUE},
      projectRef: HML_COMPANY_RESET_PROJECT_REF,
      isMembershipSuperAdmin: true,
      isPortalMasterActing: true,
      remoteExecutionEnabled: true,
    });
    expect(decision.mode).toBe('EXECUTE_BLOCKED');
    if (decision.mode === 'EXECUTE_BLOCKED') {
      expect(decision.reason).toBe('portal_master_not_authorized');
    }
  });
});

describe('company-reset — superfície e preservação', () => {
  it('lista full-delete cobre empty-guards do seed', () => {
    const full = new Set<string>(HML_COMPANY_RESET_FULL_DELETE_TABLES);
    for (const table of HML_COMPANY_RESET_SEED_EMPTY_GUARDS) {
      if (table === 'customer_contracts') {
        expect(full.has('customer_contracts')).toBe(true);
        continue;
      }
      expect(full.has(table)).toBe(true);
    }
  });

  it('selective delete preserva sistema/HQ via predicados', () => {
    expect(HML_COMPANY_RESET_SELECTIVE_DELETE).toEqual(
      expect.arrayContaining([
        {table: 'positions', predicate: 'is_system = false'},
        {table: 'cost_centers', predicate: 'is_system = false'},
        {table: 'branches', predicate: 'is_headquarters = false'},
      ]),
    );
    expect(HML_COMPANY_RESET_PRESERVE.length).toBeGreaterThan(5);
    expect(HML_COMPANY_RESET_COMPANY_ID).toBe(
      '451a7940-a56b-425f-ae5f-e493d536591f',
    );
  });
});

describe('company-reset — migration SQL estrutural', () => {
  const sql = readFileSync(HML_COMPANY_RESET_MIGRATION_PATH, 'utf8');

  it('define SECURITY DEFINER, search_path, company fixa e slug', () => {
    expect(sql).toContain(HML_COMPANY_RESET_RPC);
    expect(sql).toMatch(/security definer/i);
    expect(sql).toContain('set search_path = public');
    expect(sql).toContain(HML_COMPANY_RESET_COMPANY_ID);
    expect(sql).toContain('primeira-empresa');
  });

  it('revoga EXECUTE e não concede a authenticated/service_role', () => {
    expect(sql).toMatch(
      new RegExp(
        `revoke all on function public\\.${HML_COMPANY_RESET_RPC}\\(uuid, text\\) from public`,
        'i',
      ),
    );
    expect(sql).toMatch(
      new RegExp(
        `revoke all on function public\\.${HML_COMPANY_RESET_RPC}\\(uuid, text\\) from authenticated`,
        'i',
      ),
    );
    expect(sql).toMatch(
      new RegExp(
        `revoke all on function public\\.${HML_COMPANY_RESET_RPC}\\(uuid, text\\) from service_role`,
        'i',
      ),
    );
    expect(sql).not.toMatch(
      new RegExp(
        `grant execute on function public\\.${HML_COMPANY_RESET_RPC}\\(uuid, text\\) to (authenticated|service_role)`,
        'i',
      ),
    );
  });

  it('trava → revalida; payroll GUC; cross-tenant; auditoria append-only', () => {
    const advisoryAt = sql.indexOf(HML_COMPANY_RESET_ADVISORY_LOCK_SQL);
    const forUpdateAt = sql.indexOf('for update');
    expect(advisoryAt).toBeGreaterThan(-1);
    expect(forUpdateAt).toBeGreaterThan(advisoryAt);
    expect(sql).toContain(HML_DESTRUCTIVE_ADVISORY_LOCK_SQL);
    expect(sql).not.toContain(
      'pg_advisory_xact_lock(hashtextextended(c_expected_company::text, 1))',
    );
    expect(sql).toContain("set_config('app.allow_payroll_hard_delete'");
    expect(sql).toContain('cross-tenant');
    expect(sql).toContain('tire_recaps.supplier_id');
    expect(sql).toContain('financial_categories.vehicle_id');
    expect(sql).toContain('fuel_records.driver_id');
    expect(sql).toContain('maintenance_schedules.driver_id');
    expect(sql).toContain('fuel_records.trip_id');
    expect(sql).toContain('trips.route_id');
    expect(sql).toContain('vision_providers');
    expect(sql).toContain(HML_COMPANY_RESET_PROJECT_REF_GUC);
    expect(sql).toContain(HML_COMPANY_RESET_PROJECT_REF);
    expect(sql).toMatch(
      /perform 1 from public\.vehicles where id = any \(v_vehicle_ids\) for update/i,
    );
    expect(sql).toMatch(
      /perform 1 from public\.trips where id = any \(v_trip_ids\) for update/i,
    );
    expect(sql).toMatch(
      /perform 1 from public\.fuel_records where id = any \(v_fuel_ids\) for update/i,
    );
    expect(sql).toContain(HML_COMPANY_RESET_AUDIT_TABLE);
    expect(sql).toContain('hml_company_reset_audit_events_immutable');
    expect(sql).toContain('is_portal_owner_acting_for');
    expect(sql).toContain('r.company_id = cm.company_id');
    expect(sql).toContain('members_default_branch_reassigned');
  });

  it('compartilha a mesma chave de advisory lock com a migration 102', () => {
    const hardDeleteSql = readFileSync(HML_HARD_DELETE_MIGRATION_PATH, 'utf8');
    expect(sql).toContain(HML_COMPANY_RESET_ADVISORY_LOCK_SQL);
    expect(hardDeleteSql).toContain(HML_HARD_DELETE_ADVISORY_LOCK_SQL);
    expect(HML_COMPANY_RESET_ADVISORY_LOCK_SQL).toBe(
      HML_HARD_DELETE_ADVISORY_LOCK_SQL,
    );
    expect(HML_COMPANY_RESET_ADVISORY_LOCK_SQL).toBe(
      HML_DESTRUCTIVE_ADVISORY_LOCK_SQL,
    );
  });

  it('cobre estruturalmente todas as tabelas com company_id (types ↔ SQL)', () => {
    const {full, selective} = deleteTargetsFromSql(sql);
    const covered = new Set<string>([
      ...full,
      ...selective.keys(),
      ...HML_COMPANY_RESET_PRESERVE_COMPANY_ID_TABLES,
    ]);
    // Auditoria criada pela própria migration — fora do escopo de negócio.
    covered.add(HML_COMPANY_RESET_AUDIT_TABLE);
    covered.add('hml_hard_delete_audit_events');

    for (const table of companyIdTablesFromDatabaseTypes()) {
      expect(covered.has(table)).toBe(true);
    }

    for (const table of HML_COMPANY_RESET_FULL_DELETE_TABLES) {
      expect(full.has(table)).toBe(true);
    }
    expect(selective.get('positions')).toBe('is_system = false');
    expect(selective.get('cost_centers')).toBe('is_system = false');
    expect(selective.get('branches')).toBe('is_headquarters = false');

    expect(
      HML_COMPANY_RESET_CROSS_TENANT_PARENT_CHECKS.map((c) => c.parent),
    ).toEqual(
      expect.arrayContaining([
        'trips',
        'routes',
        'fuel_records',
        'maintenance_records',
        'tires',
        'drivers',
      ]),
    );
  });

  it('projectRefFromSupabaseUrl extrai ref do host e rejeita URL inválida', () => {
    expect(
      projectRefFromSupabaseUrl(
        `https://${HML_COMPANY_RESET_PROJECT_REF}.supabase.co`,
      ),
    ).toBe(HML_COMPANY_RESET_PROJECT_REF);
    expect(projectRefFromSupabaseUrl('https://example.com')).toBeNull();
  });

  it('cobre vision_providers na allowlist full-delete e no SQL', () => {
    expect(HML_COMPANY_RESET_FULL_DELETE_TABLES).toContain('vision_providers');
    expect(sql).toMatch(
      /delete from public\.vision_providers where company_id = c_expected_company/i,
    );
  });

  it('não apaga companies/roles/members e preserva is_system/HQ', () => {
    expect(sql).not.toMatch(
      /delete from public\.companies\s+where company_id/i,
    );
    expect(sql).not.toMatch(/delete from public\.roles\b/i);
    expect(sql).not.toMatch(/delete from public\.company_members\b/i);
    expect(sql).toMatch(
      /delete from public\.branches\s+where company_id = c_expected_company\s+and is_headquarters = false/i,
    );
    expect(sql).toMatch(
      /delete from public\.cost_centers\s+where company_id = c_expected_company and is_system = false/i,
    );
  });
});
