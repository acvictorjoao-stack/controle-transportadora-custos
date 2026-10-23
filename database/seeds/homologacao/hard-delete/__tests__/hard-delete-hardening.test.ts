import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {HML_DESTRUCTIVE_ADVISORY_LOCK_SQL} from '../../constants';
import {
  HML_HARD_DELETE_ADVISORY_LOCK_SQL,
  HML_HARD_DELETE_AUDIT_TABLE,
  HML_HARD_DELETE_AUTHORIZE_FLAG,
  HML_HARD_DELETE_COMPANY_ID,
  HML_HARD_DELETE_CONFIRM_ENV,
  HML_HARD_DELETE_CONFIRM_VALUE,
  HML_HARD_DELETE_CUSTOMER_BRANCH_REF_TABLES,
  HML_HARD_DELETE_EXPECTED_ENTRIES,
  HML_HARD_DELETE_EXPECTED_ENTRY_COUNT,
  HML_HARD_DELETE_EXTERNAL_REF_CHECKS,
  HML_HARD_DELETE_EXTERNAL_REF_SCOPE,
  HML_HARD_DELETE_MANIFEST_PATH,
  HML_HARD_DELETE_MIGRATION_PATH,
  HML_HARD_DELETE_PORTAL_MASTER_AUTHORIZED,
  HML_HARD_DELETE_PROJECT_REF,
  HML_HARD_DELETE_PROJECT_REF_GUC,
  HML_HARD_DELETE_REMOTE_EXECUTION_ENABLED,
  HML_HARD_DELETE_TABLE_ORDER,
  assertManifestMatchesExpectedAllowlist,
  classifyTargetPresence,
  createEmptySimulatedStore,
  decideHardDeleteAuthorization,
  extractUuidsFromSql,
  filterDiscoverableCustomerHistory,
  loadHardDeleteManifest,
  planInDeleteOrder,
  projectRefFromSupabaseUrl,
  runHardDeleteTransaction,
  seedSimulatedStoreWithManifestResidues,
  validateCascadeChildren,
  validateHistoryBundle,
  validateLiveTargetRow,
} from '../index';
import {inspectHmlEnvUrlProjectRef} from '../../env';

const OTHER_COMPANY = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

describe('hard-delete — manifesto e allowlist', () => {
  it('carrega o manifesto real com exatamente 43 IDs únicos alinhados à allowlist', () => {
    const manifest = loadHardDeleteManifest(HML_HARD_DELETE_MANIFEST_PATH);
    expect(manifest.entries).toHaveLength(HML_HARD_DELETE_EXPECTED_ENTRY_COUNT);
    expect(manifest.companyId).toBe(HML_HARD_DELETE_COMPANY_ID);
    assertManifestMatchesExpectedAllowlist(manifest);
  });

  it('rejeita manifesto com tabela fora da allowlist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hml-hd-'));
    const path = join(dir, 'manifest.json');
    writeFileSync(
      path,
      JSON.stringify({
        companyId: HML_HARD_DELETE_COMPANY_ID,
        companySlug: 'primeira-empresa',
        entries: [
          {
            entity: 'driver',
            key: 'd01',
            id: '11111111-1111-4111-8111-111111111111',
            phase: 'drivers',
            table: 'drivers',
            kind: 'primary',
            operation: 'insert',
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
      }),
    );
    expect(() => loadHardDeleteManifest(path)).toThrow(/allowlist|entry count/);
  });

  it('rejeita companyId divergente', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hml-hd-'));
    const path = join(dir, 'manifest.json');
    const base = loadHardDeleteManifest(HML_HARD_DELETE_MANIFEST_PATH);
    writeFileSync(
      path,
      JSON.stringify({...base, companyId: OTHER_COMPANY}),
    );
    expect(() => loadHardDeleteManifest(path)).toThrow(/company id/);
  });

  it('rejeita ID duplicado', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hml-hd-'));
    const path = join(dir, 'manifest.json');
    const base = loadHardDeleteManifest(HML_HARD_DELETE_MANIFEST_PATH);
    const dup = {
      ...base,
      entries: [...base.entries, {...base.entries[0], key: 'dup'}],
    };
    writeFileSync(path, JSON.stringify(dup));
    expect(() => loadHardDeleteManifest(path)).toThrow(/duplicado|entry count/);
  });

  it('planInDeleteOrder começa por filhos e termina em branches', () => {
    const plan = planInDeleteOrder();
    expect(plan[0]?.table).toBe('customer_contract_items');
    expect(plan[plan.length - 1]?.table).toBe('branches');
    expect(HML_HARD_DELETE_TABLE_ORDER[0]).toBe('customer_contract_items');
    expect(HML_HARD_DELETE_TABLE_ORDER.at(-1)).toBe('branches');
  });
});

describe('hard-delete — migration SQL estrutural (H1/H2/auth/ACL)', () => {
  const sql = readFileSync(HML_HARD_DELETE_MIGRATION_PATH, 'utf8');

  it('contém os 43 UUIDs e mantém execução remota desabilitada no TS', () => {
    expect(HML_HARD_DELETE_REMOTE_EXECUTION_ENABLED).toBe(false);
    expect(HML_HARD_DELETE_PORTAL_MASTER_AUTHORIZED).toBe(false);
    expect(HML_HARD_DELETE_EXTERNAL_REF_SCOPE).toBe('global');
    const uuids = new Set(extractUuidsFromSql(sql));
    for (const entry of HML_HARD_DELETE_EXPECTED_ENTRIES) {
      expect(uuids.has(entry.id)).toBe(true);
    }
  });

  it('H1: pré-checa customer_*.branch_id sem filtro company_id', () => {
    for (const table of HML_HARD_DELETE_CUSTOMER_BRANCH_REF_TABLES) {
      expect(sql).toMatch(
        new RegExp(
          `from public\\.${table}\\s+where branch_id = any \\(v_branch_ids\\)`,
          'i',
        ),
      );
      expect(sql).not.toMatch(
        new RegExp(
          `from public\\.${table}\\s+where company_id = c_expected_company\\s+and branch_id = any`,
          'i',
        ),
      );
    }
    for (const check of HML_HARD_DELETE_EXTERNAL_REF_CHECKS) {
      if (
        check.parent === 'branches' &&
        (HML_HARD_DELETE_CUSTOMER_BRANCH_REF_TABLES as readonly string[]).includes(
          check.table,
        )
      ) {
        expect(check.column).toBe('branch_id');
      }
    }
  });

  it('H2: refs de supplier/vehicle usam contagem global (sem company_id no where)', () => {
    expect(sql).toMatch(
      /from public\.financial_entries\s+where supplier_id = any \(v_supplier_ids\)/i,
    );
    expect(sql).not.toMatch(
      /from public\.financial_entries\s+where company_id = c_expected_company and supplier_id = any/i,
    );
    expect(sql).toMatch(
      /from public\.fuel_records\s+where vehicle_id = any \(v_vehicle_ids\)/i,
    );
    expect(sql).not.toMatch(
      /from public\.fuel_records\s+where company_id = c_expected_company and vehicle_id = any/i,
    );
  });

  it('M1/M2: auditoria append-only e revokes incl. service_role', () => {
    expect(sql).toContain(HML_HARD_DELETE_AUDIT_TABLE);
    expect(sql).toContain('hml_hard_delete_audit_events_immutable');
    expect(sql).toMatch(/on delete restrict/i);
    expect(sql).toMatch(
      /revoke all on table public\.hml_hard_delete_audit_events from service_role/i,
    );
    expect(sql).toMatch(
      /revoke all on function public\.hml_hard_delete_manifest_43\(uuid, text\) from service_role/i,
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.hml_hard_delete_manifest_43\(uuid, text\) to (authenticated|service_role)/i,
    );
  });

  it('M3/M4: FOR UPDATE nos alvos e r.company_id = cm.company_id', () => {
    expect(sql).toContain(HML_HARD_DELETE_ADVISORY_LOCK_SQL);
    expect(sql).toContain(HML_DESTRUCTIVE_ADVISORY_LOCK_SQL);
    expect(sql).toMatch(/where id = any \(v_customer_ids\) for update/i);
    expect(sql).toMatch(/where id = any \(v_branch_ids\) for update/i);
    expect(sql).toContain('r.company_id = cm.company_id');
    expect(sql).toContain('is_portal_owner_acting_for');
    expect(sql).toContain("r.name = 'Super Admin'");
  });

  it('exige GUC app.hml_expected_project_ref (paridade 103; não é prova criptográfica)', () => {
    expect(sql).toContain(HML_HARD_DELETE_PROJECT_REF_GUC);
    expect(sql).toContain(HML_HARD_DELETE_PROJECT_REF);
    expect(sql).toMatch(
      /hml_hard_delete: GUC app\.hml_expected_project_ref ausente ou divergente/,
    );
    expect(sql).toMatch(
      /NÃO prova criptográfica|não prova que a sessão está no projeto/i,
    );
  });

  it('não introduz GRANT EXECUTE e mantém REVOKE de service_role', () => {
    expect(sql).not.toMatch(
      /grant execute on function public\.hml_hard_delete_manifest_43\(uuid, text\) to (authenticated|service_role|anon|public)/i,
    );
    expect(sql).toMatch(
      /revoke all on function public\.hml_hard_delete_manifest_43\(uuid, text\) from public/i,
    );
    expect(sql).toMatch(
      /revoke all on function public\.hml_hard_delete_manifest_43\(uuid, text\) from anon/i,
    );
    expect(sql).toMatch(
      /revoke all on function public\.hml_hard_delete_manifest_43\(uuid, text\) from authenticated/i,
    );
    expect(sql).toMatch(
      /revoke all on function public\.hml_hard_delete_manifest_43\(uuid, text\) from service_role/i,
    );
  });
});

describe('hard-delete CLI — project-ref a partir da URL env', () => {
  const KEY = 'NEXT_PUBLIC_SUPABASE_URL';
  let previous: string | undefined;

  beforeEach(() => {
    previous = process.env[KEY];
  });

  afterEach(() => {
    if (previous === undefined) delete process.env[KEY];
    else process.env[KEY] = previous;
  });

  it('match quando a URL aponta para o ref autorizado', () => {
    process.env[KEY] = `https://${HML_HARD_DELETE_PROJECT_REF}.supabase.co`;
    expect(inspectHmlEnvUrlProjectRef(HML_HARD_DELETE_PROJECT_REF)).toEqual({
      status: 'match',
      projectRefFromUrl: HML_HARD_DELETE_PROJECT_REF,
    });
  });

  it('mismatch fail-closed para host inválido ou ref divergente', () => {
    process.env[KEY] = 'https://evil.example.com';
    expect(inspectHmlEnvUrlProjectRef(HML_HARD_DELETE_PROJECT_REF).status).toBe(
      'mismatch',
    );

    process.env[KEY] = 'https://otherproject.supabase.co';
    const result = inspectHmlEnvUrlProjectRef(HML_HARD_DELETE_PROJECT_REF);
    expect(result).toEqual({
      status: 'mismatch',
      projectRefFromUrl: 'otherproject',
    });
  });

  it('absent permite plano local offline sem URL', () => {
    delete process.env[KEY];
    expect(inspectHmlEnvUrlProjectRef(HML_HARD_DELETE_PROJECT_REF)).toEqual({
      status: 'absent',
      projectRefFromUrl: null,
    });
  });
});

describe('hard-delete — validação de linhas e HQ/sistema', () => {
  it('recusa HQ e is_system', () => {
    const branch = HML_HARD_DELETE_EXPECTED_ENTRIES.find((e) => e.table === 'branches')!;
    expect(
      validateLiveTargetRow(branch, {
        id: branch.id,
        company_id: HML_HARD_DELETE_COMPANY_ID,
        is_headquarters: true,
        code: 'HML-IMP',
      }),
    ).toEqual({ok: false, reason: 'refuses_headquarters'});

    const center = HML_HARD_DELETE_EXPECTED_ENTRIES.find(
      (e) => e.table === 'cost_centers',
    )!;
    expect(
      validateLiveTargetRow(center, {
        id: center.id,
        company_id: HML_HARD_DELETE_COMPANY_ID,
        is_system: true,
        code: center.expectedCode,
      }),
    ).toEqual({ok: false, reason: 'refuses_system_row'});
  });

  it('recusa company_id divergente', () => {
    const row = HML_HARD_DELETE_EXPECTED_ENTRIES[0]!;
    expect(
      validateLiveTargetRow(row, {
        id: row.id,
        company_id: OTHER_COMPANY,
        code: row.expectedCode,
      }),
    ).toEqual({ok: false, reason: 'company_id_mismatch'});
  });

  it('abort em estado parcial', () => {
    const results = HML_HARD_DELETE_EXPECTED_ENTRIES.map((expected, index) => ({
      expected,
      live:
        index === 0
          ? null
          : {
              id: expected.id,
              company_id: HML_HARD_DELETE_COMPANY_ID,
              code: expected.expectedCode ?? null,
              is_headquarters: false,
              is_system: false,
            },
    }));
    const classified = classifyTargetPresence(results);
    expect(classified.ok).toBe(false);
    if (!classified.ok) expect(classified.reason).toMatch(/partial_state/);
  });
});

describe('hard-delete — CASCADE children', () => {
  it('aceita filhos exatamente na allowlist', () => {
    const store = createEmptySimulatedStore();
    seedSimulatedStoreWithManifestResidues(store);
    expect(validateCascadeChildren(store.cascadeChildren).ok).toBe(true);
  });

  it('aborta com endereço extra sob cliente do escopo', () => {
    const customer = HML_HARD_DELETE_EXPECTED_ENTRIES.find(
      (e) => e.table === 'customers' && e.key === 'c01',
    )!;
    const result = validateCascadeChildren([
      {
        id: '99999999-9999-4999-8999-999999999901',
        parentId: customer.id,
        childTable: 'customer_addresses',
        parentColumn: 'customer_id',
      },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/cascade_child_not_in_allowlist/);
  });

  it('aborta com customer_documents sob cliente do escopo', () => {
    const customer = HML_HARD_DELETE_EXPECTED_ENTRIES.find(
      (e) => e.table === 'customers',
    )!;
    const result = validateCascadeChildren([
      {
        id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee01',
        parentId: customer.id,
        childTable: 'customer_documents',
        parentColumn: 'customer_id',
      },
    ]);
    expect(result).toEqual({
      ok: false,
      reason: 'cascade_extra_child:customer_documents.customer_id',
    });
  });

  it('simulador aborta com vehicle_documents extra antes de qualquer delete', () => {
    const store = createEmptySimulatedStore();
    seedSimulatedStoreWithManifestResidues(store);
    const vehicle = HML_HARD_DELETE_EXPECTED_ENTRIES.find(
      (e) => e.table === 'vehicles',
    )!;
    store.cascadeChildren.push({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01',
      parentId: vehicle.id,
      childTable: 'vehicle_documents',
      parentColumn: 'vehicle_id',
    });
    const snapshot = store.targets.size;
    const outcome = runHardDeleteTransaction({
      store,
      confirm: HML_HARD_DELETE_CONFIRM_VALUE,
      isSuperAdmin: true,
      actorId: 'actor-1',
    });
    expect(outcome.status).toBe('aborted');
    if (outcome.status === 'aborted') {
      expect(outcome.reason).toMatch(/cascade_extra_child:vehicle_documents/);
    }
    expect(store.targets.size).toBe(snapshot);
  });
});

describe('hard-delete — histórico vinculado', () => {
  it('aceita histórico só dos clientes/contratos/veículos da allowlist', () => {
    const customer = HML_HARD_DELETE_EXPECTED_ENTRIES.find(
      (e) => e.table === 'customers' && e.key === 'c01',
    )!;
    const contract = HML_HARD_DELETE_EXPECTED_ENTRIES.find(
      (e) => e.table === 'customer_contracts' && e.key === 'c01',
    )!;
    const vehicle = HML_HARD_DELETE_EXPECTED_ENTRIES.find(
      (e) => e.table === 'vehicles' && e.key === 'v01',
    )!;

    const ok = validateHistoryBundle(
      [
        {
          id: '11111111-1111-4111-8111-111111111101',
          company_id: HML_HARD_DELETE_COMPANY_ID,
          customer_id: customer.id,
          contract_id: contract.id,
        },
      ],
      [
        {
          id: '22222222-2222-4222-8222-222222222201',
          company_id: HML_HARD_DELETE_COMPANY_ID,
          vehicle_id: vehicle.id,
        },
      ],
    );
    expect(ok.ok).toBe(true);
  });

  it('rejeita histórico de outro cliente', () => {
    const result = validateHistoryBundle(
      [
        {
          id: '11111111-1111-4111-8111-111111111199',
          company_id: HML_HARD_DELETE_COMPANY_ID,
          customer_id: '99999999-9999-4999-8999-999999999999',
          contract_id: null,
        },
      ],
      [],
    );
    expect(result).toEqual({
      ok: false,
      reason: 'customer_history_customer_not_in_allowlist',
    });
  });

  it('rejeita histórico de outra empresa mesmo com customer_id da allowlist', () => {
    const customer = HML_HARD_DELETE_EXPECTED_ENTRIES.find(
      (e) => e.table === 'customers',
    )!;
    const result = validateHistoryBundle(
      [
        {
          id: '11111111-1111-4111-8111-111111111188',
          company_id: OTHER_COMPANY,
          customer_id: customer.id,
          contract_id: null,
        },
      ],
      [],
    );
    expect(result).toEqual({
      ok: false,
      reason: 'customer_history_company_mismatch',
    });
  });

  it('não promove rejeitados da descoberta', () => {
    const customer = HML_HARD_DELETE_EXPECTED_ENTRIES.find(
      (e) => e.table === 'customers',
    )!;
    const {candidates, rejected} = filterDiscoverableCustomerHistory([
      {
        id: 'a',
        company_id: HML_HARD_DELETE_COMPANY_ID,
        customer_id: customer.id,
        contract_id: null,
      },
      {
        id: 'b',
        company_id: HML_HARD_DELETE_COMPANY_ID,
        customer_id: '00000000-0000-4000-8000-000000000099',
        contract_id: null,
      },
    ]);
    expect(candidates).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });
});

describe('hard-delete — autorização', () => {
  it('sem --execute permanece LOCAL_PLAN', () => {
    const decision = decideHardDeleteAuthorization({
      executeRequested: false,
      argv: [],
      env: {},
      projectRef: HML_HARD_DELETE_PROJECT_REF,
      isMembershipSuperAdmin: true,
      remoteExecutionEnabled: true,
    });
    expect(decision).toEqual({mode: 'LOCAL_PLAN', writeAuthorized: false});
  });

  it('bloqueia quando a flag de código está desligada', () => {
    const decision = decideHardDeleteAuthorization({
      executeRequested: true,
      argv: [HML_HARD_DELETE_AUTHORIZE_FLAG],
      env: {[HML_HARD_DELETE_CONFIRM_ENV]: HML_HARD_DELETE_CONFIRM_VALUE},
      projectRef: HML_HARD_DELETE_PROJECT_REF,
      isMembershipSuperAdmin: true,
      remoteExecutionEnabled: false,
    });
    expect(decision.mode).toBe('EXECUTE_BLOCKED');
  });

  it('bloqueia project ref errado mesmo com gates', () => {
    const decision = decideHardDeleteAuthorization({
      executeRequested: true,
      argv: [HML_HARD_DELETE_AUTHORIZE_FLAG],
      env: {[HML_HARD_DELETE_CONFIRM_ENV]: HML_HARD_DELETE_CONFIRM_VALUE},
      projectRef: 'zzzzzzzzzzzzzzzzzzzz',
      isMembershipSuperAdmin: true,
      remoteExecutionEnabled: true,
    });
    expect(decision).toMatchObject({
      mode: 'EXECUTE_BLOCKED',
      reason: 'project_ref_mismatch',
    });
  });

  it('bloqueia membership Super Admin não comprovada', () => {
    const decision = decideHardDeleteAuthorization({
      executeRequested: true,
      argv: [HML_HARD_DELETE_AUTHORIZE_FLAG],
      env: {[HML_HARD_DELETE_CONFIRM_ENV]: HML_HARD_DELETE_CONFIRM_VALUE},
      projectRef: HML_HARD_DELETE_PROJECT_REF,
      isMembershipSuperAdmin: null,
      remoteExecutionEnabled: true,
    });
    expect(decision).toMatchObject({
      mode: 'EXECUTE_BLOCKED',
      reason: 'membership_super_admin_unproven',
    });
  });

  it('bloqueia Portal Master acting sem autorização Master formal', () => {
    const decision = decideHardDeleteAuthorization({
      executeRequested: true,
      argv: [HML_HARD_DELETE_AUTHORIZE_FLAG],
      env: {[HML_HARD_DELETE_CONFIRM_ENV]: HML_HARD_DELETE_CONFIRM_VALUE},
      projectRef: HML_HARD_DELETE_PROJECT_REF,
      isMembershipSuperAdmin: true,
      isPortalMasterActing: true,
      portalMasterAuthorized: false,
      remoteExecutionEnabled: true,
    });
    expect(decision).toMatchObject({
      mode: 'EXECUTE_BLOCKED',
      reason: 'portal_master_not_authorized',
    });
  });

  it('projectRefFromSupabaseUrl extrai o ref', () => {
    expect(
      projectRefFromSupabaseUrl(
        `https://${HML_HARD_DELETE_PROJECT_REF}.supabase.co`,
      ),
    ).toBe(HML_HARD_DELETE_PROJECT_REF);
  });
});

describe('hard-delete — simulador transacional', () => {
  it('apaga 43 alvos + histórico, audita e preserva HQ/sistema', () => {
    const store = createEmptySimulatedStore();
    seedSimulatedStoreWithManifestResidues(store);
    const beforeHistory =
      store.customerHistory.length + store.vehicleHistory.length;
    expect(beforeHistory).toBeGreaterThan(0);

    const outcome = runHardDeleteTransaction({
      store,
      confirm: HML_HARD_DELETE_CONFIRM_VALUE,
      isSuperAdmin: true,
      actorId: 'actor-1',
    });

    expect(outcome.status).toBe('deleted');
    if (outcome.status === 'deleted') expect(outcome.audited).toBe(true);
    for (const entry of HML_HARD_DELETE_EXPECTED_ENTRIES) {
      expect(store.targets.has(`${entry.table}:${entry.id}`)).toBe(false);
    }
    expect(store.targets.has(`branches:${store.hqBranchId}`)).toBe(true);
    expect(store.customerHistory).toHaveLength(0);
    expect(store.vehicleHistory).toHaveLength(0);
    expect(store.auditEvents).toHaveLength(1);
    expect(store.auditEvents[0]?.result).toBe('deleted');
  });

  it('already_clean quando alvos e histórico já sumiram (com auditoria)', () => {
    const store = createEmptySimulatedStore();
    seedSimulatedStoreWithManifestResidues(store);
    for (const entry of HML_HARD_DELETE_EXPECTED_ENTRIES) {
      store.targets.delete(`${entry.table}:${entry.id}`);
    }
    store.customerHistory = [];
    store.vehicleHistory = [];
    store.cascadeChildren = [];

    const outcome = runHardDeleteTransaction({
      store,
      confirm: HML_HARD_DELETE_CONFIRM_VALUE,
      isSuperAdmin: true,
      actorId: 'actor-1',
    });
    expect(outcome).toEqual({
      status: 'already_clean',
      deleted: {},
      audited: true,
    });
    expect(store.auditEvents).toHaveLength(1);
    expect(store.auditEvents[0]?.result).toBe('already_clean');
  });

  it('H1: aborta com customer_addresses.branch_id fora da allowlist', () => {
    const store = createEmptySimulatedStore();
    seedSimulatedStoreWithManifestResidues(store);
    const branch = HML_HARD_DELETE_EXPECTED_ENTRIES.find(
      (e) => e.table === 'branches',
    )!;
    store.externalRefRows.push({
      table: 'customer_addresses',
      column: 'branch_id',
      parentId: branch.id,
      childId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      companyId: HML_HARD_DELETE_COMPANY_ID,
    });
    const outcome = runHardDeleteTransaction({
      store,
      confirm: HML_HARD_DELETE_CONFIRM_VALUE,
      isSuperAdmin: true,
      actorId: 'actor-1',
    });
    expect(outcome.status).toBe('aborted');
    if (outcome.status === 'aborted') {
      expect(outcome.reason).toMatch(/customer_addresses\.branch_id/);
    }
  });

  it('H1: allowlist address com branch_id HML não bloqueia (excludeIds)', () => {
    const store = createEmptySimulatedStore();
    seedSimulatedStoreWithManifestResidues(store);
    const branch = HML_HARD_DELETE_EXPECTED_ENTRIES.find(
      (e) => e.table === 'branches',
    )!;
    const address = HML_HARD_DELETE_EXPECTED_ENTRIES.find(
      (e) => e.table === 'customer_addresses',
    )!;
    store.externalRefRows.push({
      table: 'customer_addresses',
      column: 'branch_id',
      parentId: branch.id,
      childId: address.id,
      companyId: HML_HARD_DELETE_COMPANY_ID,
    });
    const outcome = runHardDeleteTransaction({
      store,
      confirm: HML_HARD_DELETE_CONFIRM_VALUE,
      isSuperAdmin: true,
      actorId: 'actor-1',
    });
    expect(outcome.status).toBe('deleted');
  });

  it('H2: aborta com ref cross-tenant (outra company_id) a supplier HML', () => {
    const store = createEmptySimulatedStore();
    seedSimulatedStoreWithManifestResidues(store);
    const supplier = HML_HARD_DELETE_EXPECTED_ENTRIES.find(
      (e) => e.table === 'suppliers',
    )!;
    store.externalRefRows.push({
      table: 'financial_entries',
      column: 'supplier_id',
      parentId: supplier.id,
      childId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      companyId: OTHER_COMPANY,
    });
    const outcome = runHardDeleteTransaction({
      store,
      confirm: HML_HARD_DELETE_CONFIRM_VALUE,
      isSuperAdmin: true,
      actorId: 'actor-1',
    });
    expect(outcome.status).toBe('aborted');
    if (outcome.status === 'aborted') {
      expect(outcome.reason).toMatch(/financial_entries\.supplier_id/);
    }
  });

  it('M5: descobre history por contract_id e aborta se customer_id fora da allowlist', () => {
    const store = createEmptySimulatedStore();
    seedSimulatedStoreWithManifestResidues(store);
    const contract = HML_HARD_DELETE_EXPECTED_ENTRIES.find(
      (e) => e.table === 'customer_contracts',
    )!;
    store.customerHistory.push({
      id: 'orphan-contract-only',
      company_id: HML_HARD_DELETE_COMPANY_ID,
      customer_id: '99999999-9999-4999-8999-999999999999',
      contract_id: contract.id,
    });
    const outcome = runHardDeleteTransaction({
      store,
      confirm: HML_HARD_DELETE_CONFIRM_VALUE,
      isSuperAdmin: true,
      actorId: 'actor-1',
    });
    expect(outcome.status).toBe('aborted');
    if (outcome.status === 'aborted') {
      expect(outcome.reason).toMatch(/customer_not_in_allowlist|company_mismatch/);
    }
  });

  it('M3: após presença completa, rowLocksHeld fica true no sucesso', () => {
    const store = createEmptySimulatedStore();
    seedSimulatedStoreWithManifestResidues(store);
    const outcome = runHardDeleteTransaction({
      store,
      confirm: HML_HARD_DELETE_CONFIRM_VALUE,
      isSuperAdmin: true,
      actorId: 'actor-1',
    });
    expect(outcome.status).toBe('deleted');
    expect(store.rowLocksHeld).toBe(true);
  });

  it('rollback integral em falha no meio da transação', () => {
    const store = createEmptySimulatedStore();
    seedSimulatedStoreWithManifestResidues(store);
    const snapshotTargets = store.targets.size;
    const snapshotCh = store.customerHistory.length;
    const snapshotVh = store.vehicleHistory.length;
    const snapshotAudit = store.auditEvents.length;

    const outcome = runHardDeleteTransaction({
      store,
      confirm: HML_HARD_DELETE_CONFIRM_VALUE,
      isSuperAdmin: true,
      actorId: 'actor-1',
      failAfterTargetDeletes: 3,
    });

    expect(outcome.status).toBe('aborted');
    expect(store.targets.size).toBe(snapshotTargets);
    expect(store.customerHistory).toHaveLength(snapshotCh);
    expect(store.vehicleHistory).toHaveLength(snapshotVh);
    expect(store.auditEvents).toHaveLength(snapshotAudit);
  });

  it('abort com referência SET NULL/RESTRICT externa', () => {
    const store = createEmptySimulatedStore();
    seedSimulatedStoreWithManifestResidues(store);
    const supplier = HML_HARD_DELETE_EXPECTED_ENTRIES.find(
      (e) => e.table === 'suppliers',
    )!;
    store.externalRefs.set(
      `financial_entries:supplier_id:${supplier.id}`,
      1,
    );

    const outcome = runHardDeleteTransaction({
      store,
      confirm: HML_HARD_DELETE_CONFIRM_VALUE,
      isSuperAdmin: true,
      actorId: 'actor-1',
    });
    expect(outcome.status).toBe('aborted');
    if (outcome.status === 'aborted') {
      expect(outcome.reason).toMatch(/external_ref/);
    }
    expect(store.targets.has(`suppliers:${supplier.id}`)).toBe(true);
  });

  it('abort com referência arquivada (soft-deleted) em financial_categories', () => {
    const store = createEmptySimulatedStore();
    seedSimulatedStoreWithManifestResidues(store);
    const branch = HML_HARD_DELETE_EXPECTED_ENTRIES.find(
      (e) => e.table === 'branches',
    )!;
    // Contagem total inclui arquivados — o simulador não distingue deleted_at.
    store.externalRefs.set(
      `financial_categories:branch_id:${branch.id}`,
      1,
    );
    expect(
      HML_HARD_DELETE_EXTERNAL_REF_CHECKS.some(
        (c) =>
          c.parent === 'branches' &&
          c.table === 'financial_categories' &&
          c.column === 'branch_id',
      ),
    ).toBe(true);

    const outcome = runHardDeleteTransaction({
      store,
      confirm: HML_HARD_DELETE_CONFIRM_VALUE,
      isSuperAdmin: true,
      actorId: 'actor-1',
    });
    expect(outcome.status).toBe('aborted');
    if (outcome.status === 'aborted') {
      expect(outcome.reason).toMatch(/financial_categories\.branch_id/);
    }
  });

  it('abort com falha de auditoria (rollback integral)', () => {
    const store = createEmptySimulatedStore();
    seedSimulatedStoreWithManifestResidues(store);
    store.auditInsertFails = true;
    const snapshotTargets = store.targets.size;

    const outcome = runHardDeleteTransaction({
      store,
      confirm: HML_HARD_DELETE_CONFIRM_VALUE,
      isSuperAdmin: true,
      actorId: 'actor-1',
    });
    expect(outcome).toEqual({
      status: 'aborted',
      reason: 'audit_insert_failed',
    });
    expect(store.targets.size).toBe(snapshotTargets);
    expect(store.auditEvents).toHaveLength(0);
  });

  it('abort Portal Master acting no simulador', () => {
    const store = createEmptySimulatedStore();
    seedSimulatedStoreWithManifestResidues(store);
    const outcome = runHardDeleteTransaction({
      store,
      confirm: HML_HARD_DELETE_CONFIRM_VALUE,
      isSuperAdmin: true,
      isPortalMasterActing: true,
      actorId: 'actor-1',
    });
    expect(outcome).toEqual({
      status: 'aborted',
      reason: 'portal_master_not_authorized',
    });
  });

  it('abort com histórico não vinculado misturado na descoberta filtrada pelo simulador', () => {
    const store = createEmptySimulatedStore();
    seedSimulatedStoreWithManifestResidues(store);
    const victim = store.customerHistory[0]!;
    victim.company_id = OTHER_COMPANY;

    const outcome = runHardDeleteTransaction({
      store,
      confirm: HML_HARD_DELETE_CONFIRM_VALUE,
      isSuperAdmin: true,
      actorId: 'actor-1',
    });
    expect(outcome.status).toBe('aborted');
    if (outcome.status === 'aborted') {
      expect(outcome.reason).toMatch(/company_mismatch/);
    }
  });

  it('execução concorrente: segundo ator aborta com lock', () => {
    const store = createEmptySimulatedStore();
    seedSimulatedStoreWithManifestResidues(store);
    store.lockedBy = 'actor-other';

    const outcome = runHardDeleteTransaction({
      store,
      confirm: HML_HARD_DELETE_CONFIRM_VALUE,
      isSuperAdmin: true,
      actorId: 'actor-1',
    });
    expect(outcome).toEqual({
      status: 'aborted',
      reason: 'advisory_lock_held',
    });
  });

  it('recusa confirm ou Super Admin inválidos', () => {
    const store = createEmptySimulatedStore();
    seedSimulatedStoreWithManifestResidues(store);
    expect(
      runHardDeleteTransaction({
        store,
        confirm: 'WRONG',
        isSuperAdmin: true,
        actorId: 'a',
      }).status,
    ).toBe('aborted');
    expect(
      runHardDeleteTransaction({
        store,
        confirm: HML_HARD_DELETE_CONFIRM_VALUE,
        isSuperAdmin: false,
        actorId: 'a',
      }).status,
    ).toBe('aborted');
  });
});
