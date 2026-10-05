import {readdirSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

const migrationsDir = resolve(process.cwd(), 'supabase/migrations');

function readMigration(file: string): string {
  return readFileSync(resolve(migrationsDir, file), 'utf8').replace(/\r\n/g, '\n');
}

/** Todas as migrations em ordem de aplicação, concatenadas. */
const allMigrations = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map(readMigration)
  .join('\n');

const hardening = readMigration('096_security_hardening_tenant_isolation.sql');

/**
 * Checagens estáticas do estado final das migrations. O comportamento em banco
 * (RLS, storage, grants) só é confirmado depois de aplicar 096 no Supabase.
 */

/** Última definição de uma policy, do CREATE POLICY até o fim do comando. */
function finalPolicy(name: string): string {
  const start = allMigrations.lastIndexOf(`create policy ${name}\n`);
  if (start < 0) return 'policy-ausente';
  return allMigrations.slice(start, allMigrations.indexOf(';', start));
}

function isDroppedForGood(name: string): boolean {
  const created = allMigrations.lastIndexOf(`create policy ${name}\n`);
  const dropped = allMigrations.lastIndexOf(`drop policy if exists ${name} `);
  return dropped > created;
}

describe('bootstrap de onboarding removido', () => {
  it('nenhuma policy expõe empresas, papéis ou filiais sem membros', () => {
    for (const policy of [
      'companies_select_bootstrap',
      'roles_select_bootstrap',
      'branches_select_bootstrap',
    ]) {
      expect([policy, isDroppedForGood(policy)]).toEqual([policy, true]);
    }
  });

  it('auto-inserção como Super Admin não existe mais em company_members', () => {
    const policy = finalPolicy('company_members_insert_authorized');
    expect(policy).toContain("public.has_company_permission(company_id, 'members:invite')");
    expect(policy).not.toContain('company_has_active_members');
    expect(policy).not.toContain('auth.uid()');
  });
});

describe('storage', () => {
  const SELECT_POLICIES: Array<[policy: string, bucket: string, check: string]> = [
    ['company_logos_select', 'company-logos', 'public.is_company_member(public.storage_object_company_id(name))'],
    ['vehicle_files_select', 'vehicle-files', "public.storage_object_company_id(name), 'vehicles:read'"],
    ['driver_files_select', 'driver-files', "public.storage_object_company_id(name), 'drivers:read'"],
    ['trip_files_select', 'trip-files', "public.storage_object_company_id(name), 'trips:read'"],
    ['fuel_files_select', 'fuel-files', "public.storage_object_company_id(name), 'fuel:read'"],
    ['maintenance_files_select', 'maintenance-files', "public.storage_object_company_id(name), 'maintenance:read'"],
    ['tire_files_select', 'tire-files', "public.storage_object_company_id(name), 'tires:read'"],
    ['financial_files_select', 'financial-files', "public.storage_object_company_id(name), 'financeiro:read'"],
    ['customer_files_select', 'customer-files', "public.storage_object_company_id(name), 'customers:read'"],
  ];

  it('leitura via API exige vínculo com a empresa da pasta', () => {
    for (const [name, bucket, check] of SELECT_POLICIES) {
      const policy = finalPolicy(name);
      expect([name, policy]).toEqual([name, expect.stringContaining('to authenticated')]);
      expect(policy).toContain(`bucket_id = '${bucket}'`);
      expect(policy).toContain(check);
    }
  });

  it('nenhuma policy final de storage.objects é aberta a public/anon', () => {
    const policyNames = [...allMigrations.matchAll(/create policy (\w+)\n\s+on storage\.objects/g)]
      .map((match) => match[1]);

    expect(policyNames.length).toBeGreaterThan(0);
    for (const name of new Set(policyNames)) {
      expect([name, finalPolicy(name)]).not.toEqual([name, expect.stringMatching(/to (public|anon)\b/)]);
    }
  });

  it('cast do company_id só acontece após validar o formato UUID', () => {
    expect(hardening).toMatch(
      /case\s+when \(storage\.foldername\(p_name\)\)\[1\]\s+~ '\^\[0-9a-f\]\{8\}/,
    );
  });
});

describe('RPCs SECURITY DEFINER', () => {
  it('seed de papéis não é executável por anon nem por usuários', () => {
    expect(hardening).toContain(
      'revoke all on function public.seed_default_roles_for_company(uuid, uuid)\n  from public, anon, authenticated;',
    );
    expect(hardening).toContain(
      'grant execute on function public.seed_default_roles_for_company(uuid, uuid)\n  to service_role;',
    );
  });

  it('seeds chamados pela aplicação ficam só com authenticated (guard de empresa) e service_role', () => {
    for (const fn of [
      'seed_financial_defaults_for_company',
      'seed_cost_centers_for_company',
      'seed_positions_for_company',
    ]) {
      expect(hardening).toContain(`revoke all on function public.${fn}(uuid, uuid)\n  from public, anon;`);
    }
  });

  it('funções internas sem guard deixam de ser RPC pública', () => {
    expect(hardening).toContain(
      'revoke all on function public.migrate_free_text_suppliers()\n  from public, anon, authenticated;',
    );
    expect(hardening).toContain(
      'revoke all on function public.refresh_tire_metrics(uuid)\n  from public, anon, authenticated;',
    );
  });

  it('nenhuma migration posterior devolve EXECUTE do seed de papéis a anon/authenticated', () => {
    const revokeAt = allMigrations.lastIndexOf(
      'revoke all on function public.seed_default_roles_for_company',
    );
    const after = allMigrations.slice(revokeAt);
    expect(after).not.toMatch(
      /grant execute on function public\.seed_default_roles_for_company\(uuid, uuid\)\s+to [^;]*(anon|authenticated)/,
    );
  });
});

describe('colunas de plataforma em companies', () => {
  it('trigger bloqueia status, exclusão, provisão e plano fora do Portal Master', () => {
    expect(hardening).toContain('create trigger companies_protect_platform_columns');
    expect(hardening).toContain('before update on public.companies');
    expect(hardening).toContain('if auth.uid() is null or public.is_portal_owner() then');
    for (const guarded of [
      'new.status is distinct from old.status',
      'new.deleted_at is distinct from old.deleted_at',
      'new.provision_status is distinct from old.provision_status',
      "(new.settings -> 'plan_slug') is distinct from (old.settings -> 'plan_slug')",
    ]) {
      expect(hardening).toContain(guarded);
    }
    expect(hardening).toContain("using errcode = '42501'");
  });
});
