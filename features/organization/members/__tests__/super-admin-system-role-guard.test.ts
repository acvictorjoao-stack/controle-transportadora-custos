import {readdirSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

import {LAST_SUPER_ADMIN_MESSAGE} from '../business-roles';

const migrationsDir = resolve(process.cwd(), 'supabase/migrations');

function readMigration(file: string): string {
  return readFileSync(resolve(migrationsDir, file), 'utf8').replace(/\r\n/g, '\n');
}

const migration098 = readMigration('098_super_admin_membership_guard.sql');
const migration099 = readMigration('099_super_admin_delete_guard.sql');
const migration100 = readMigration('100_last_active_super_admin_guard.sql');

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

const ROLE_LOCKED_MESSAGE =
  'O papel de sistema Super Admin não pode ser renomeado, desativado, movido ou excluído.';

const guard = functionSource(migration100, 'protect_super_admin_system_role()');

const editableColumns = [...guard.matchAll(/to_jsonb\((new|old)\) - array\[([^\]]*)\]/g)].map(
  ([, row, list]) => ({
    row,
    columns: list.split(',').map((column) => column.trim().replace(/'/g, '')),
  }),
);

const allowedColumns = editableColumns[0]?.columns ?? [];

describe('migration 100 — papel de sistema Super Admin em public.roles', () => {
  it('trigger before update or delete, security definer e sem execute para a API', () => {
    expect(migration100).toContain('create trigger roles_protect_super_admin_system_role');
    expect(migration100).toContain('before update or delete on public.roles');
    expect(migration100).toContain(
      'execute function public.protect_super_admin_system_role()',
    );
    expect(guard).toContain('security definer');
    expect(guard).toContain('set search_path = public');
    expect(migration100).toContain(
      'revoke all on function public.protect_super_admin_system_role()\n  from public, anon, authenticated;',
    );
    expect(migration100.toLowerCase()).not.toContain('grant execute');
  });

  it('identifica a linha pelo mesmo critério de is_company_super_admin e count_active_super_admins', () => {
    expect(guard).toContain("v_old_protected boolean := old.is_system = true and old.name = 'Super Admin'");
    expect(guard).toContain("v_new_protected := new.is_system = true and new.name = 'Super Admin'");
    for (const helper of ['is_company_super_admin(', 'count_active_super_admins(']) {
      const source = functionSource(allMigrations, helper);
      expect(source).toContain('r.is_system = true');
      expect(source).toContain("r.name = 'Super Admin'");
    }
  });

  it('compara a linha inteira e libera só colunas editáveis, igual em old e new', () => {
    expect(editableColumns).toHaveLength(2);
    expect(editableColumns.map(({row}) => row).sort()).toEqual(['new', 'old']);
    expect(editableColumns[0].columns).toEqual(editableColumns[1].columns);
    expect([...allowedColumns].sort()).toEqual(
      ['description', 'notes', 'updated_at', 'updated_by'].sort(),
    );
    expect(guard).toContain('is not distinct from');
  });

  it.each([
    ['A', 'name'],
    ['B', 'is_system'],
    ['C', 'status'],
    ['D', 'deleted_at'],
    ['company_id', 'company_id'],
  ])('%s. roles:write não altera %s do Super Admin: cai no raise', (_, column) => {
    expect(allowedColumns).not.toContain(column);
    const allowReturn = guard.indexOf('then\n    return new;\n  end if;\n\n  raise exception');
    const raise = guard.lastIndexOf('raise exception');
    expect(allowReturn).toBeGreaterThan(-1);
    expect(raise).toBeGreaterThan(allowReturn);
    expect(guard).toContain(ROLE_LOCKED_MESSAGE);
    expect(guard).toContain("errcode = '42501'");
  });

  it('A/B. promover outro papel a Super Admin também é bloqueado', () => {
    const protectedCheck = guard.indexOf('if not (v_old_protected or v_new_protected) then');
    expect(protectedCheck).toBeGreaterThan(guard.indexOf('v_new_protected :='));
    expect(allowedColumns).not.toContain('name');
    expect(allowedColumns).not.toContain('is_system');
  });

  it('E. roles:write não exclui o Super Admin: delete só passa pelo service role', () => {
    const editableBranch = guard.indexOf("if tg_op = 'UPDATE'\n    and (to_jsonb(new)");
    const serviceRole = guard.indexOf('if auth.uid() is null then');
    const raise = guard.lastIndexOf('raise exception');
    expect(editableBranch).toBeGreaterThan(serviceRole);
    expect(raise).toBeGreaterThan(editableBranch);
    const afterServiceRole = guard.slice(
      guard.indexOf('end if;', serviceRole + 1),
      raise,
    );
    expect(afterServiceRole).not.toContain('return old');
    expect(finalPolicy('roles_delete_authorized')).toContain('is_system = false');
  });

  it('F. description e notes do Super Admin continuam editáveis', () => {
    expect(allowedColumns).toContain('description');
    expect(allowedColumns).toContain('notes');
    expect(finalPolicy('roles_update_authorized')).toContain(
      "public.has_company_permission(company_id, 'roles:write')",
    );
  });

  it('G. papel customizado sai antes de qualquer checagem e as policies seguem as mesmas', () => {
    const notProtected = guard.indexOf('if not (v_old_protected or v_new_protected) then');
    const serviceRole = guard.indexOf('if auth.uid() is null then');
    const raise = guard.indexOf('raise exception');
    const earlyExit = guard.slice(notProtected, serviceRole);
    expect(notProtected).toBeGreaterThan(-1);
    expect(serviceRole).toBeGreaterThan(notProtected);
    expect(raise).toBeGreaterThan(serviceRole);
    expect(earlyExit).toContain('return old;');
    expect(earlyExit).toContain('return new;');
    expect(migration100.toLowerCase()).not.toContain('create policy');
    expect(migration100.toLowerCase()).not.toContain('drop policy');
    for (const policy of ['roles_insert_authorized', 'roles_update_authorized', 'roles_delete_authorized']) {
      expect(finalPolicy(policy)).toContain(
        "public.has_company_permission(company_id, 'roles:write')",
      );
    }
  });

  it('H. service role altera e exclui a linha protegida', () => {
    const serviceRole = guard.indexOf('if auth.uid() is null then');
    const editableBranch = guard.indexOf("if tg_op = 'UPDATE'\n    and (to_jsonb(new)");
    const serviceBranch = guard.slice(serviceRole, editableBranch);
    expect(serviceRole).toBeGreaterThan(guard.indexOf('if not (v_old_protected or v_new_protected) then'));
    expect(serviceBranch).toContain('return old;');
    expect(serviceBranch).toContain('return new;');
    expect(serviceBranch).not.toContain('raise exception');
  });

  it('I. 098, 099 e a trava do último ativo da 100 continuam intactas', () => {
    expect(migration098).not.toContain('protect_super_admin_system_role');
    expect(migration099).not.toContain('protect_super_admin_system_role');
    expect(migration098).toContain('create trigger company_members_protect_super_admin\n');
    expect(migration099).toContain('create trigger company_members_protect_super_admin_delete');
    expect(migration100).not.toContain('function public.protect_super_admin_membership');
    expect(migration100).not.toContain('function public.actor_can_manage_super_admin');
    expect(migration100).not.toContain('function public.count_active_super_admins');
    expect(migration100.toLowerCase()).not.toContain('drop trigger');

    const enforce = functionSource(migration100, 'enforce_last_active_super_admin()');
    const lock = functionSource(migration100, 'lock_company_super_admin_guard(');
    expect(enforce).toContain('perform public.lock_company_super_admin_guard(old.company_id)');
    expect(enforce).toContain('count_active_super_admins(old.company_id) < 1');
    expect(enforce).toContain(LAST_SUPER_ADMIN_MESSAGE);
    expect(lock).toContain('pg_advisory_xact_lock');
    expect(migration100).toContain('after update or delete on public.company_members');
    expect(migration100).toContain('deferrable initially deferred');
    expect(guard).not.toContain('company_members');
  });
});
