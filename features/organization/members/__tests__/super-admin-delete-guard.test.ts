import {readdirSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

import {
  LAST_SUPER_ADMIN_MESSAGE,
  SUPER_ADMIN_MANAGEMENT_DENIED,
} from '../business-roles';

const migrationsDir = resolve(process.cwd(), 'supabase/migrations');

function readMigration(file: string): string {
  return readFileSync(resolve(migrationsDir, file), 'utf8').replace(/\r\n/g, '\n');
}

const migration098 = readMigration('098_super_admin_membership_guard.sql');
const migration099 = readMigration('099_super_admin_delete_guard.sql');

const allMigrations = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map(readMigration)
  .join('\n');

function functionSource(sql: string, name: string): string {
  const marker = `create or replace function public.${name}`;
  const start = sql.lastIndexOf(marker);
  if (start < 0) return 'funcao-ausente';
  const end = sql.indexOf('$$;', start);
  return sql.slice(start, end + 3);
}

function finalPolicy(name: string): string {
  const start = allMigrations.lastIndexOf(`create policy ${name}\n`);
  if (start < 0) return 'policy-ausente';
  return allMigrations.slice(start, allMigrations.indexOf(';', start));
}

const deleteGuard = functionSource(
  migration099,
  'protect_super_admin_membership_delete()',
);
const updateGuard = functionSource(
  allMigrations,
  'protect_super_admin_membership()',
);
const deletePolicy = finalPolicy('company_members_delete_authorized');

describe('migration 099 — exclusão de Super Admin', () => {
  it('não reedita a 098 e não troca a policy de delete', () => {
    expect(migration098).not.toContain('before delete');
    expect(migration099.toLowerCase()).not.toContain('drop policy');
    expect(migration099.toLowerCase()).not.toContain('create policy');
    expect(migration099).not.toContain('function public.actor_can_manage_super_admin');
    expect(migration099).not.toContain('function public.has_company_permission');
    expect(migration099).not.toContain('function public.is_company_super_admin');
  });

  it('A. members:write não exclui Super Admin: o trigger nega antes de apagar', () => {
    const notSuper = deleteGuard.indexOf('if not v_is_super then');
    const deny = deleteGuard.indexOf('not public.actor_can_manage_super_admin(old.company_id)');
    expect(notSuper).toBeGreaterThan(-1);
    expect(deny).toBeGreaterThan(notSuper);
    expect(deleteGuard).toContain(SUPER_ADMIN_MANAGEMENT_DENIED);
    expect(deleteGuard).toContain("errcode = '42501'");
    expect(migration099).toContain(
      'create trigger company_members_protect_super_admin_delete',
    );
    expect(migration099).toContain('before delete on public.company_members');
    expect(migration099).toContain(
      'revoke all on function public.protect_super_admin_membership_delete()',
    );
  });

  it('B. members:invite continua sem permissão de delete', () => {
    expect(deletePolicy).not.toContain('members:invite');
    expect(deletePolicy).toContain('for delete');
    expect(deletePolicy).toContain('to authenticated');
    expect(deleteGuard).toContain(SUPER_ADMIN_MANAGEMENT_DENIED);
  });

  it('C. Super Admin ainda exclui membro comum: a linha sai antes de qualquer bloqueio', () => {
    const earlyReturn = deleteGuard.indexOf('if not v_is_super then');
    const returnOld = deleteGuard.indexOf('return old;');
    const firstRaise = deleteGuard.indexOf('raise exception');
    expect(earlyReturn).toBeGreaterThan(-1);
    expect(returnOld).toBeGreaterThan(earlyReturn);
    expect(returnOld).toBeLessThan(firstRaise);
    expect(deletePolicy).toContain('public.is_company_super_admin(company_id)');
    expect(deletePolicy).toContain(
      "public.has_company_permission(company_id, 'members:write')",
    );
  });

  it('D. Super Admin administra outro Super Admin quando não é o último', () => {
    const denyUnauthorized = deleteGuard.indexOf(
      'not public.actor_can_manage_super_admin(old.company_id)',
    );
    const lastAdmin = deleteGuard.indexOf('count_active_super_admins(old.company_id) = 1');
    const allowOther = deleteGuard.lastIndexOf('return old;');
    expect(denyUnauthorized).toBeGreaterThan(-1);
    expect(lastAdmin).toBeGreaterThan(denyUnauthorized);
    expect(allowOther).toBeGreaterThan(lastAdmin);
    expect(updateGuard).toContain('if public.actor_can_manage_super_admin(new.company_id) then');
    expect(updateGuard).toContain('return new;');
    expect(updateGuard).toContain('new.role_id is distinct from old.role_id');
    expect(updateGuard).toContain('new.status is distinct from old.status');
  });

  it('E. Portal Master atuando continua coberto por is_company_super_admin', () => {
    const superAdminHelper = functionSource(allMigrations, 'is_company_super_admin(');
    const actor = functionSource(allMigrations, 'actor_can_manage_super_admin(');
    expect(superAdminHelper).toContain('public.is_portal_owner_acting_for(p_company_id)');
    expect(actor).toContain('auth.uid() is null');
    expect(actor).toContain('public.is_company_super_admin(p_company_id)');
    expect(deleteGuard).toContain('public.actor_can_manage_super_admin(old.company_id)');
    expect(updateGuard).toContain('public.is_portal_owner()');
    expect(updateGuard).toContain('public.company_has_active_members(new.company_id)');
  });

  it('F. exclusão em outra empresa continua negada pela policy da linha', () => {
    expect(deletePolicy).toContain('company_id');
    expect(deletePolicy).not.toContain('using (true)');
    expect(deleteGuard).toContain('actor_can_manage_super_admin(old.company_id)');
    expect(migration099.toLowerCase()).not.toContain('create policy');
  });

  it('G. membro inativo continua sem has_company_permission nem super admin', () => {
    const permission = functionSource(allMigrations, 'has_company_permission(');
    const superAdminHelper = functionSource(allMigrations, 'is_company_super_admin(');
    expect(permission).toContain("and cm.status = 'active'");
    expect(superAdminHelper).toContain("and cm.status = 'active'");
    expect(migration099).not.toContain('function public.has_company_permission');
    expect(migration099).not.toContain('function public.is_company_super_admin');
  });

  it('H. o último Super Admin ativo não sai, salvo service role', () => {
    const serviceRole = deleteGuard.indexOf('if auth.uid() is null then');
    const lastAdmin = deleteGuard.indexOf('count_active_super_admins(old.company_id) = 1');
    expect(serviceRole).toBeGreaterThan(-1);
    expect(lastAdmin).toBeGreaterThan(serviceRole);
    expect(deleteGuard).toContain(LAST_SUPER_ADMIN_MESSAGE);
    expect(deleteGuard).toContain("and old.status = 'active'");
    expect(deleteGuard).toContain('and r.status = \'active\'');

    const softDelete = updateGuard.indexOf('new.deleted_at is not null');
    const softLast = updateGuard.indexOf('count_active_super_admins(old.company_id) = 1');
    expect(updateGuard).toContain('new.deleted_at is distinct from old.deleted_at');
    expect(updateGuard).toContain('auth.uid() is not null');
    expect(softDelete).toBeGreaterThan(-1);
    expect(softLast).toBeGreaterThan(softDelete);
    expect(updateGuard).toContain(LAST_SUPER_ADMIN_MESSAGE);
  });
});
