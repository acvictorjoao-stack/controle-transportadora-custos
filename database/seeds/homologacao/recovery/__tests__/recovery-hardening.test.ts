import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {describe, expect, it, vi} from 'vitest';

import {
  assertHmlCompanySuperAdmin,
  assertHmlDestructiveMembershipSuperAdmin,
} from '../../guards';
import {
  analyzeCheckpointConsistency,
  appendCheckpoint,
  assertIdInPlan,
  BRANCH_REF_TABLES,
  buildCheckpointRecord,
  CheckpointError,
  checkBranchLinks,
  checkCostCenterLinks,
  checkPositionLinks,
  checkSupplierLinks,
  classifyLiveRow,
  computeRemainingAfterExclude,
  createSupabaseCountActive,
  decideRecoveryActions,
  loadCheckpoint,
  loadCheckpointForMode,
  loadRecoveryManifest,
  parseCheckpointLine,
  runLinkPrechecks,
  softPayloadFor,
  type CountActiveFn,
  type LiveRowSnapshot,
  type PlanRow,
} from '../index';
import {HML_RECOVERY_CHECKPOINT_VERSION, HML_RECOVERY_TABLE_ORDER} from '../constants';

const COMPANY = '451a7940-a56b-425f-ae5f-e493d536591f';
const OTHER = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const PROFILE = '11111111-2222-4333-8444-555555555555';

function planRow(
  table: PlanRow['table'],
  key: string,
  id: string = `${key.padEnd(8, '0')}-0000-4000-8000-000000000001`,
): PlanRow {
  return {table, key, id, idPrefix: id.slice(0, 8)};
}

function live(partial: Partial<LiveRowSnapshot> & Pick<LiveRowSnapshot, 'id'>): LiveRowSnapshot {
  return {
    company_id: COMPANY,
    deleted_at: null,
    ...partial,
  };
}

function countMap(spec: Record<string, number | Error>): CountActiveFn {
  return async ({table, filters, excludeIds}) => {
    const key = `${table}:${filters.map((f) => `${f.column}=${f.value}`).join(',')}`;
    const hit = spec[key] ?? spec[table] ?? 0;
    if (hit instanceof Error) {
      return {count: 0, error: hit.message};
    }
    let count = hit;
    if (excludeIds && excludeIds.size > 0 && typeof hit === 'number') {
      // Mock simples: se a spec tiver `${key}:excluded`, usa remaining explícito
      const excludedKey = `${key}:remaining`;
      if (excludedKey in spec && typeof spec[excludedKey] === 'number') {
        count = spec[excludedKey] as number;
      }
    }
    return {count, error: null};
  };
}

describe('manifest allowlist / fora do plano', () => {
  it('assertIdInPlan rejeita ID fora do manifesto', () => {
    const plan = [planRow('suppliers', 's01')];
    expect(() => assertIdInPlan(plan, 'suppliers', plan[0].id)).not.toThrow();
    expect(() =>
      assertIdInPlan(plan, 'suppliers', 'deadbeef-0000-4000-8000-000000000099'),
    ).toThrow(/fora do manifesto/);
  });

  it('loadRecoveryManifest rejeita tabela fora da allowlist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hml-manifest-'));
    const path = join(dir, 'manifest.json');
    writeFileSync(
      path,
      JSON.stringify({
        companyId: COMPANY,
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
      'utf8',
    );
    expect(() => loadRecoveryManifest(path)).toThrow(/allowlist/);
  });

  it('TABLE_ORDER cobre exatamente as tabelas permitidas', () => {
    expect(HML_RECOVERY_TABLE_ORDER).toContain('customer_contract_items');
    expect(HML_RECOVERY_TABLE_ORDER).not.toContain('drivers');
  });
});

describe('assertHmlCompanySuperAdmin (seed — não destrutivo)', () => {
  it('autoriza quando RPC retorna true (inclui acting na RPC 090)', async () => {
    const rpc = vi.fn().mockResolvedValue({data: true, error: null});
    await expect(
      assertHmlCompanySuperAdmin({rpc} as never, COMPANY),
    ).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith('is_company_super_admin', {p_company_id: COMPANY});
  });

  it('rejeita usuário não autorizado', async () => {
    const rpc = vi.fn().mockResolvedValue({data: false, error: null});
    await expect(assertHmlCompanySuperAdmin({rpc} as never, COMPANY)).rejects.toThrow(
      /não é Super Admin/,
    );
  });

  it('falha fechado em erro de consulta', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {message: 'rpc_unavailable'},
    });
    await expect(assertHmlCompanySuperAdmin({rpc} as never, COMPANY)).rejects.toThrow(
      /Falha ao validar permissão Super Admin/,
    );
  });
});

function mockDestructiveAuthClient(opts: {
  acting?: {data: unknown; error: {message: string} | null};
  membership?: {
    data: unknown;
    error: {message: string} | null;
  };
}) {
  const rpc = vi.fn().mockImplementation(async (name: string) => {
    if (name === 'is_portal_owner_acting_for') {
      return opts.acting ?? {data: false, error: null};
    }
    throw new Error(`unexpected rpc ${name}`);
  });

  // Thenable query builder — await supabase.from(...).select(...) resolves membership.
  const terminal = {
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    then(
      resolve: (value: {data: unknown; error: {message: string} | null}) => void,
    ) {
      resolve(opts.membership ?? {data: [], error: null});
    },
  };
  // Every filter returns the same thenable so the chain awaits correctly.
  terminal.eq.mockReturnValue(terminal);
  terminal.is.mockReturnValue(terminal);

  const from = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue(terminal),
  });

  return {rpc, from};
}

describe('assertHmlDestructiveMembershipSuperAdmin (recovery — paridade 102/103)', () => {
  it('autoriza Super Admin legítimo da empresa', async () => {
    const client = mockDestructiveAuthClient({
      acting: {data: false, error: null},
      membership: {
        data: [
          {
            company_id: COMPANY,
            profile_id: PROFILE,
            status: 'active',
            deleted_at: null,
            roles: {
              company_id: COMPANY,
              name: 'Super Admin',
              is_system: true,
              status: 'active',
              deleted_at: null,
            },
          },
        ],
        error: null,
      },
    });

    await expect(
      assertHmlDestructiveMembershipSuperAdmin(client as never, COMPANY, PROFILE),
    ).resolves.toBeUndefined();
    expect(client.rpc).toHaveBeenCalledWith('is_portal_owner_acting_for', {
      p_company_id: COMPANY,
    });
    expect(client.rpc).not.toHaveBeenCalledWith(
      'is_company_super_admin',
      expect.anything(),
    );
  });

  it('recusa Portal Master acting mesmo sem consulta de membership', async () => {
    const client = mockDestructiveAuthClient({
      acting: {data: true, error: null},
      membership: {
        data: [
          {
            company_id: COMPANY,
            profile_id: PROFILE,
            roles: {
              company_id: COMPANY,
              name: 'Super Admin',
              is_system: true,
              status: 'active',
              deleted_at: null,
            },
          },
        ],
        error: null,
      },
    });

    await expect(
      assertHmlDestructiveMembershipSuperAdmin(client as never, COMPANY, PROFILE),
    ).rejects.toThrow(/Portal Master acting não autorizado/);
    expect(client.from).not.toHaveBeenCalled();
  });

  it('recusa ausência de membership Super Admin válida', async () => {
    const client = mockDestructiveAuthClient({
      acting: {data: false, error: null},
      membership: {data: [], error: null},
    });

    await expect(
      assertHmlDestructiveMembershipSuperAdmin(client as never, COMPANY, PROFILE),
    ).rejects.toThrow(/não possui membership Super Admin/);
  });

  it('recusa role Super Admin de outra empresa (r.company_id diverge)', async () => {
    const client = mockDestructiveAuthClient({
      acting: {data: false, error: null},
      membership: {
        data: [
          {
            company_id: COMPANY,
            profile_id: PROFILE,
            roles: {
              company_id: OTHER,
              name: 'Super Admin',
              is_system: true,
              status: 'active',
              deleted_at: null,
            },
          },
        ],
        error: null,
      },
    });

    await expect(
      assertHmlDestructiveMembershipSuperAdmin(client as never, COMPANY, PROFILE),
    ).rejects.toThrow(/não possui membership Super Admin/);
  });

  it('falha fechada quando contexto Portal Master é indeterminado', async () => {
    const client = mockDestructiveAuthClient({
      acting: {data: null, error: null},
    });

    await expect(
      assertHmlDestructiveMembershipSuperAdmin(client as never, COMPANY, PROFILE),
    ).rejects.toThrow(/contexto Portal Master indeterminado/);
  });

  it('falha fechada quando RPC de acting falha', async () => {
    const client = mockDestructiveAuthClient({
      acting: {data: null, error: {message: 'rpc_unavailable'}},
    });

    await expect(
      assertHmlDestructiveMembershipSuperAdmin(client as never, COMPANY, PROFILE),
    ).rejects.toThrow(/Falha ao validar contexto Portal Master/);
  });

  it('falha fechada quando companyId/profileId estão ausentes', async () => {
    const client = mockDestructiveAuthClient({});
    await expect(
      assertHmlDestructiveMembershipSuperAdmin(client as never, '', PROFILE),
    ).rejects.toThrow(/contexto de autorização HML incompleto/);
    await expect(
      assertHmlDestructiveMembershipSuperAdmin(client as never, COMPANY, '  '),
    ).rejects.toThrow(/contexto de autorização HML incompleto/);
  });
});

describe('classifyLiveRow — A2 estados', () => {
  const row = planRow('customers', 'c01');

  it('ACTIVE quando empresa ok e deleted_at null', () => {
    const result = classifyLiveRow(row, COMPANY, live({id: row.id}));
    expect(result.state).toBe('ACTIVE');
  });

  it('SOFT_DELETED quando já excluído logicamente com campos coerentes', () => {
    const result = classifyLiveRow(
      row,
      COMPANY,
      live({id: row.id, deleted_at: '2026-10-20T00:00:00Z'}),
    );
    expect(result.state).toBe('SOFT_DELETED');
  });

  it('INVALID quando empresa diverge', () => {
    const result = classifyLiveRow(row, COMPANY, live({id: row.id, company_id: OTHER}));
    expect(result.state).toBe('INVALID');
    expect(result.reason).toBe('company_id_mismatch');
  });

  it('INVALID quando ausente', () => {
    const result = classifyLiveRow(row, COMPANY, null);
    expect(result.state).toBe('INVALID');
    expect(result.reason).toBe('row_not_found');
  });

  it('INVALID em erro de consulta', () => {
    const result = classifyLiveRow(row, COMPANY, null, 'timeout');
    expect(result.state).toBe('INVALID');
    expect(result.reason).toMatch(/query_error/);
  });

  it('INVALID para HQ ativa', () => {
    const branch = planRow('branches', 'hq');
    const result = classifyLiveRow(
      branch,
      COMPANY,
      live({id: branch.id, is_headquarters: true}),
    );
    expect(result.state).toBe('INVALID');
    expect(result.reason).toBe('refuses_headquarters');
  });

  it('INVALID para centro de sistema ativo', () => {
    const cc = planRow('cost_centers', 'sys');
    const result = classifyLiveRow(cc, COMPANY, live({id: cc.id, is_system: true}));
    expect(result.state).toBe('INVALID');
    expect(result.reason).toBe('refuses_system_row');
  });

  it('INVALID se SOFT_DELETED incoerente (contrato sem cancelled)', () => {
    const contract = planRow('customer_contracts', 'c01');
    const result = classifyLiveRow(
      contract,
      COMPANY,
      live({
        id: contract.id,
        deleted_at: '2026-10-20T00:00:00Z',
        contract_status: 'active',
      }),
    );
    expect(result.state).toBe('INVALID');
    expect(result.reason).toMatch(/soft_deleted_incoherent/);
  });
});

describe('pré-check de vínculos — A1', () => {
  it('bloqueia fornecedor com vínculo financeiro', async () => {
    const row = planRow('suppliers', 's01');
    const blocked = await checkSupplierLinks(
      countMap({[`financial_entries:supplier_id=${row.id}`]: 2}),
      COMPANY,
      row,
    );
    expect(blocked.blocked).toBe(true);
    expect(blocked.reason).toBe('supplier_has_links');
  });

  it('erro em consulta de vínculo aborta (blocked + link_query_failed)', async () => {
    const row = planRow('suppliers', 's01');
    const result = await checkSupplierLinks(
      countMap({
        [`financial_entries:supplier_id=${row.id}`]: new Error('boom'),
      }),
      COMPANY,
      row,
    );
    expect(result.blocked).toBe(true);
    expect(result.reason).toMatch(/link_query_failed/);
  });

  it('bloqueia centro com lançamentos ou employees', async () => {
    const row = planRow('cost_centers', 'cc-frota');
    const withFinancial = await checkCostCenterLinks(
      countMap({[`financial_entries:cost_center_id=${row.id}`]: 1}),
      COMPANY,
      row,
    );
    expect(withFinancial.blocked).toBe(true);

    const withEmployees = await checkCostCenterLinks(
      countMap({
        [`financial_entries:cost_center_id=${row.id}`]: 0,
        [`employees:cost_center_id=${row.id}`]: 3,
      }),
      COMPANY,
      row,
    );
    expect(withEmployees.blocked).toBe(true);
  });

  it('bloqueia cargo com payroll ou employees', async () => {
    const row = planRow('positions', 'pos-analista');
    const result = await checkPositionLinks(
      countMap({[`payroll_expenses:position_id=${row.id}`]: 1}),
      COMPANY,
      row,
    );
    expect(result.blocked).toBe(true);
  });

  it('bloqueia filial com default_branch_id em members', async () => {
    const row = planRow('branches', 'imp');
    const result = await checkBranchLinks(
      countMap({[`company_members:default_branch_id=${row.id}`]: 1}),
      COMPANY,
      row,
      [row],
    );
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('branch_has_active_refs');
  });

  it('suppliers não está em BRANCH_REF_TABLES (sem coluna branch_id)', () => {
    expect(BRANCH_REF_TABLES).not.toContain('suppliers');
  });

  it('filial cobre ops/docs/financeiro com branch_id confirmado', () => {
    expect(BRANCH_REF_TABLES).toEqual(
      expect.arrayContaining([
        'customer_contracts',
        'customer_addresses',
        'customer_contacts',
        'customer_contract_items',
        'customer_documents',
        'financial_entries',
        'financial_categories',
        'financial_cost_centers',
        'financial_documents',
        'routes',
        'trip_expenses',
        'trip_stops',
        'trip_occurrences',
        'trip_checklists',
        'trip_documents',
        'trip_locations',
        'maintenance_parts',
        'maintenance_services',
        'maintenance_schedules',
        'maintenance_documents',
        'tire_movements',
        'tire_inspections',
        'tire_recaps',
        'tire_documents',
        'fuel_documents',
      ]),
    );
    expect(BRANCH_REF_TABLES).not.toContain('trip_history');
    expect(BRANCH_REF_TABLES).not.toContain('vehicle_documents');
  });

  it('checkBranchLinks consulta cada BRANCH_REF_TABLE com filtros company/branch corretos', async () => {
    const branch = planRow('branches', 'imp');
    const seen: Array<{
      table: string;
      companyId: string;
      filters: Array<{column: string; value: string}>;
      excludeIds?: Set<string>;
    }> = [];
    const countActive: CountActiveFn = async (args) => {
      seen.push({
        table: args.table,
        companyId: args.companyId,
        filters: args.filters,
        excludeIds: args.excludeIds,
      });
      return {count: 0, error: null};
    };
    await checkBranchLinks(countActive, COMPANY, branch, [branch]);

    const member = seen.find((c) => c.table === 'company_members');
    expect(member).toMatchObject({
      companyId: COMPANY,
      filters: [{column: 'default_branch_id', value: branch.id}],
    });

    for (const table of BRANCH_REF_TABLES) {
      const call = seen.find((c) => c.table === table);
      expect(call, table).toBeDefined();
      expect(call!.companyId).toBe(COMPANY);
      expect(call!.filters).toEqual([{column: 'branch_id', value: branch.id}]);
    }
  });

  it('bloqueia filial com referência externa em customer_contracts', async () => {
    const branch = planRow('branches', 'imp');
    const planContract = planRow('customer_contracts', 'c01');
    const countActive: CountActiveFn = async ({table, excludeIds}) => {
      if (table === 'customer_contracts') {
        const all = [planContract.id, 'ext-contract-0000-4000-8000-000000000099'];
        const remaining = all.filter((id) => !excludeIds?.has(id)).length;
        return {count: remaining, error: null};
      }
      return {count: 0, error: null};
    };
    const result = await checkBranchLinks(countActive, COMPANY, branch, [
      branch,
      planContract,
    ]);
    expect(result.blocked).toBe(true);
    expect(result.details.some((d) => d.startsWith('customer_contracts.branch_id=1'))).toBe(
      true,
    );
  });

  it('bloqueia filial com ref externa em trip_expenses / maintenance_parts (fora do plano)', async () => {
    const branch = planRow('branches', 'imp');
    const countActive: CountActiveFn = async ({table, excludeIds}) => {
      // Tabelas fora do manifesto não recebem excludeIds
      if (table === 'trip_expenses') {
        expect(excludeIds).toBeUndefined();
        return {count: 2, error: null};
      }
      return {count: 0, error: null};
    };
    const tripBlock = await checkBranchLinks(countActive, COMPANY, branch, [branch]);
    expect(tripBlock.blocked).toBe(true);
    expect(tripBlock.details.some((d) => d.startsWith('trip_expenses.branch_id=2'))).toBe(true);

    const partsCount: CountActiveFn = async ({table, excludeIds}) => {
      if (table === 'maintenance_parts') {
        expect(excludeIds).toBeUndefined();
        return {count: 1, error: null};
      }
      return {count: 0, error: null};
    };
    const partsBlock = await checkBranchLinks(partsCount, COMPANY, branch, [branch]);
    expect(partsBlock.blocked).toBe(true);
    expect(partsBlock.details.some((d) => d.startsWith('maintenance_parts.branch_id=1'))).toBe(
      true,
    );
  });

  it('filial ignora refs internas ao plano e bloqueia externas (vehicles)', async () => {
    const branch = planRow('branches', 'imp');
    const vehicle = planRow('vehicles', 'v01');
    const countActive: CountActiveFn = async ({table, excludeIds}) => {
      if (table === 'vehicles') {
        expect(excludeIds?.has(vehicle.id)).toBe(true);
        const all = [vehicle.id, 'outside-vehicle-id'];
        const remaining = all.filter((id) => !excludeIds?.has(id)).length;
        return {count: remaining, error: null};
      }
      return {count: 0, error: null};
    };
    const result = await checkBranchLinks(countActive, COMPANY, branch, [branch, vehicle]);
    expect(result.blocked).toBe(true);
    expect(result.details.some((d) => d.startsWith('vehicles.branch_id=1'))).toBe(true);

    const onlyPlanVehicle: CountActiveFn = async ({table, excludeIds}) => {
      if (table === 'vehicles') {
        const all = [vehicle.id];
        return {count: all.filter((id) => !excludeIds?.has(id)).length, error: null};
      }
      return {count: 0, error: null};
    };
    const ok = await checkBranchLinks(onlyPlanVehicle, COMPANY, branch, [branch, vehicle]);
    expect(ok.blocked).toBe(false);
  });

  it('erro de consulta / schema incompatível aborta filial sem permitir update', async () => {
    const branch = planRow('branches', 'imp');
    const result = await checkBranchLinks(
      countMap({[`financial_entries:branch_id=${branch.id}`]: new Error('fe_boom')}),
      COMPANY,
      branch,
      [branch],
    );
    expect(result.blocked).toBe(true);
    expect(result.reason).toMatch(/link_query_failed:financial_entries/);

    const schemaFail: CountActiveFn = async ({table}) => {
      if (table === 'trip_expenses') {
        return {count: 0, error: 'column trip_expenses.branch_id does not exist'};
      }
      return {count: 0, error: null};
    };
    const schema = await checkBranchLinks(schemaFail, COMPANY, branch, [branch]);
    expect(schema.blocked).toBe(true);
    expect(schema.reason).toMatch(/link_query_failed:trip_expenses/);

    const classified = [classifyLiveRow(branch, COMPANY, live({id: branch.id}))];
    const {abortReason, decisions} = decideRecoveryActions(classified, [schema]);
    expect(abortReason).toMatch(/link_blocked/);
    expect(decisions.every((d) => d.action !== 'would_update')).toBe(true);
  });

  it('computeRemainingAfterExclude é fail-closed e evita truncamento por lista', () => {
    expect(computeRemainingAfterExclude(5, 2)).toEqual({count: 3, error: null});
    expect(computeRemainingAfterExclude(null, 0).error).toMatch(/unproven/);
    expect(computeRemainingAfterExclude(2, 5).error).toMatch(/exceeds/);
    // Sem prova do total (ex.: página truncada sem count exact) → aborta
    expect(computeRemainingAfterExclude(null, null).error).toBe('count_null_unproven');
  });

  it('createSupabaseCountActive usa total−exclude sem listagem paginada; count null aborta', async () => {
    const calls: Array<{inIds?: string[]}> = [];
    const supabase = {
      from: () => {
        const state: {inIds?: string[]} = {};
        const builder = {
          select: () => builder,
          eq: () => builder,
          is: () => builder,
          in: (_col: string, ids: string[]) => {
            state.inIds = ids;
            return builder;
          },
          then: undefined as unknown,
        };
        // Thenable: await query
        Object.assign(builder, {
          then(
            resolve: (v: {count: number | null; error: null; data: null}) => void,
          ) {
            calls.push({inIds: state.inIds});
            if (calls.length === 1) {
              resolve({count: 1005, error: null, data: null});
            } else {
              resolve({count: 3, error: null, data: null});
            }
          },
        });
        return builder;
      },
    };
    const countActive = createSupabaseCountActive(supabase as never);
    const result = await countActive({
      table: 'vehicles',
      companyId: COMPANY,
      filters: [{column: 'branch_id', value: 'b1'}],
      excludeIds: new Set(['a', 'b', 'c']),
    });
    expect(result).toEqual({count: 1002, error: null});
    expect(calls).toHaveLength(2);
    expect(calls[0].inIds).toBeUndefined();
    expect(calls[1].inIds).toEqual(['a', 'b', 'c']);

    const supabaseNull = {
      from: () => {
        const builder = {
          select: () => builder,
          eq: () => builder,
          is: () => builder,
          then(resolve: (v: {count: null; error: null; data: null}) => void) {
            resolve({count: null, error: null, data: null});
          },
        };
        return builder;
      },
    };
    const fail = await createSupabaseCountActive(supabaseNull as never)({
      table: 'vehicles',
      companyId: COMPANY,
      filters: [{column: 'branch_id', value: 'b1'}],
    });
    expect(fail.error).toMatch(/unproven/);
  });

  it('runLinkPrechecks + decideRecoveryActions aborta sem permitir update', async () => {
    const supplier = planRow('suppliers', 's01');
    const classified = [
      classifyLiveRow(supplier, COMPANY, live({id: supplier.id})),
    ];
    const links = await runLinkPrechecks(
      countMap({[`fuel_records:supplier_id=${supplier.id}`]: 1}),
      COMPANY,
      [supplier],
      [supplier],
    );
    const {abortReason, decisions} = decideRecoveryActions(classified, links);
    expect(abortReason).toMatch(/link_blocked/);
    expect(decisions.every((d) => d.action !== 'would_update' || d.plan.id !== supplier.id)).toBe(
      true,
    );
  });
});

describe('retomada — SOFT_DELETED skip vs INVALID', () => {
  it('SOFT_DELETED vira skipped; ACTIVE vira would_update', () => {
    const a = planRow('customers', 'c01');
    const b = planRow('customers', 'c02');
    const classified = [
      classifyLiveRow(a, COMPANY, live({id: a.id, deleted_at: '2026-10-20T00:00:00Z'})),
      classifyLiveRow(b, COMPANY, live({id: b.id})),
    ];
    const {decisions, abortReason} = decideRecoveryActions(classified, []);
    expect(abortReason).toBeNull();
    expect(decisions[0]).toMatchObject({action: 'skipped', state: 'SOFT_DELETED'});
    expect(decisions[1]).toMatchObject({action: 'would_update', state: 'ACTIVE'});
  });

  it('INVALID aborta mesmo com outros SOFT_DELETED', () => {
    const a = planRow('customers', 'c01');
    const b = planRow('customers', 'c02');
    const classified = [
      classifyLiveRow(a, COMPANY, live({id: a.id, deleted_at: '2026-10-20T00:00:00Z'})),
      classifyLiveRow(b, COMPANY, live({id: b.id, company_id: OTHER})),
    ];
    const {abortReason} = decideRecoveryActions(classified, []);
    expect(abortReason).toMatch(/INVALID/);
  });
});

describe('checkpoint — A3', () => {
  it('parse rejeita versão incompatível', () => {
    expect(() =>
      parseCheckpointLine(
        JSON.stringify({
          v: 99,
          at: '2026-10-20T00:00:00Z',
          table: 'customers',
          key: 'c01',
          id: '11111111-1111-4111-8111-111111111111',
          seq: 1,
          state: 'SOFT_DELETED',
          action: 'updated',
        }),
        1,
      ),
    ).toThrow(CheckpointError);
  });

  it('parse rejeita JSON malformado', () => {
    expect(() => parseCheckpointLine('{not-json', 1)).toThrow(CheckpointError);
  });

  it('loadCheckpoint aborta arquivo incompatível', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hml-recovery-'));
    const path = join(dir, 'recovery-partial-log.jsonl');
    writeFileSync(path, '{"v":1,"broken":true}\n', 'utf8');
    expect(() => loadCheckpoint(path)).toThrow(CheckpointError);
  });

  it('loadCheckpointForMode: inválido retorna status sem throw (dry-run pode seguir)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hml-recovery-'));
    const path = join(dir, 'recovery-partial-log.jsonl');
    writeFileSync(path, '{"v":99,"broken":true}\n', 'utf8');
    const outcome = loadCheckpointForMode(path);
    expect(outcome.status).toBe('invalid');
    expect(outcome.records).toEqual([]);
    if (outcome.status === 'invalid') {
      expect(outcome.error).toMatch(/versão incompatível/);
    }
  });

  it('IDs fora do manifesto no checkpoint não entram em decisões e são reportados', () => {
    const plan = [planRow('customers', 'c01')];
    const outsideId = '99999999-9999-4999-8999-999999999999';
    const records = [
      buildCheckpointRecord({
        at: '2026-10-20T00:00:00Z',
        table: 'customers',
        key: 'ghost',
        id: outsideId,
        seq: 1,
        action: 'updated',
      }),
    ];
    const classified = [
      classifyLiveRow(plan[0], COMPANY, live({id: plan[0].id})),
    ];
    const report = analyzeCheckpointConsistency(records, plan, classified);
    expect(report.outsidePlan).toHaveLength(1);
    expect(report.outsidePlan[0].id).toBe(outsideId);

    // Live ACTIVE permanece would_update — checkpoint externo não autoriza skip/update
    const {decisions, abortReason} = decideRecoveryActions(classified, []);
    expect(abortReason).toBeNull();
    expect(decisions[0].action).toBe('would_update');
  });

  it('divergência checkpoint vs live: live manda (ACTIVE não vira skip)', () => {
    const row = planRow('vehicles', 'v01');
    const records = [
      buildCheckpointRecord({
        at: '2026-10-20T00:00:00Z',
        table: 'vehicles',
        key: 'v01',
        id: row.id,
        seq: 1,
        action: 'updated',
      }),
    ];
    const classified = [
      classifyLiveRow(row, COMPANY, live({id: row.id, status: 'active'})),
    ];
    const report = analyzeCheckpointConsistency(records, [row], classified);
    expect(report.liveDivergence).toHaveLength(1);
    expect(report.liveDivergence[0].liveState).toBe('ACTIVE');

    const {decisions} = decideRecoveryActions(classified, []);
    expect(decisions[0].action).toBe('would_update');
  });

  it('append + load roundtrip; falha pós-UPDATE (checkpoint atrasado) → skip pelo live', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hml-recovery-'));
    const path = join(dir, 'recovery-partial-log.jsonl');
    const id = '22222222-2222-4222-8222-222222222222';

    const row = planRow('vehicles', 'v01', id);
    const afterUpdate = classifyLiveRow(
      row,
      COMPANY,
      live({id, deleted_at: '2026-10-20T12:00:00Z', status: 'archived'}),
    );
    expect(afterUpdate.state).toBe('SOFT_DELETED');

    // Checkpoint falhou (não gravado). Retomada: live manda → skip, sem re-UPDATE.
    const {decisions, abortReason} = decideRecoveryActions([afterUpdate], []);
    expect(abortReason).toBeNull();
    expect(decisions[0].action).toBe('skipped');

    // Falha de append após UPDATE não altera a decisão baseada no live
    const badPath = join(dir, 'readonly-dir');
    // Grava caminho inválido via recusa de versão (appendCheckpoint fail-closed)
    expect(() =>
      appendCheckpoint(path, {
        ...buildCheckpointRecord({
          at: '2026-10-20T12:00:01Z',
          table: 'vehicles',
          key: 'v01',
          id,
          seq: 1,
          action: 'updated',
        }),
        v: 99 as never,
      }),
    ).toThrow(CheckpointError);
    void badPath;
    const stillSkip = decideRecoveryActions([afterUpdate], []);
    expect(stillSkip.decisions[0].action).toBe('skipped');

    // Após append bem-sucedido atrasado, ainda coerente
    appendCheckpoint(
      path,
      buildCheckpointRecord({
        at: '2026-10-20T12:00:01Z',
        table: 'vehicles',
        key: 'v01',
        id,
        seq: 1,
        action: 'updated',
      }),
    );
    const loaded = loadCheckpoint(path);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].v).toBe(HML_RECOVERY_CHECKPOINT_VERSION);
    expect(loaded[0].state).toBe('SOFT_DELETED');
    expect(JSON.parse(readFileSync(path, 'utf8').trim()).id).toBe(id);
  });

  it('retomada parcial: misturar skipped + would_update', () => {
    const done = planRow('suppliers', 's01');
    const pending = planRow('suppliers', 's02');
    const classified = [
      classifyLiveRow(done, COMPANY, live({id: done.id, deleted_at: '2026-10-20T00:00:00Z', active: false})),
      classifyLiveRow(pending, COMPANY, live({id: pending.id, active: true})),
    ];
    const {decisions, abortReason} = decideRecoveryActions(classified, []);
    expect(abortReason).toBeNull();
    expect(decisions.map((d) => d.action)).toEqual(['skipped', 'would_update']);
  });
});

describe('payloads alinhados à app', () => {
  it('softPayloadFor espelha soft-deletes conhecidos', () => {
    expect(softPayloadFor('customers', 'p', 't')).toEqual({
      deleted_at: 't',
      updated_by: 'p',
    });
    expect(softPayloadFor('customer_contracts', 'p', 't')).toMatchObject({
      contract_status: 'cancelled',
    });
    expect(softPayloadFor('suppliers', 'p', 't')).toMatchObject({active: false});
    expect(softPayloadFor('vehicles', 'p', 't')).toMatchObject({status: 'archived'});
    expect(softPayloadFor('cost_centers', 'p', 't')).toMatchObject({status: 'inactive'});
    expect(softPayloadFor('branches', 'p', 't')).toMatchObject({status: 'archived'});
  });
});
