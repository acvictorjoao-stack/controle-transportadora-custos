import {readFileSync} from 'node:fs';
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

function functionSource(sql: string, name: string): string {
  const marker = `create or replace function public.${name}`;
  const start = sql.lastIndexOf(marker);
  if (start < 0) return 'funcao-ausente';
  const end = sql.indexOf('$$;', start);
  return sql.slice(start, end + 3);
}

const enforce = functionSource(migration100, 'enforce_last_active_super_admin()');
const predicate = functionSource(migration100, 'membership_is_active_super_admin(');
const lock = functionSource(migration100, 'lock_company_super_admin_guard(');

describe('migration 100 — último Super Admin ativo', () => {
  it('não reedita 098/099, não mexe em policy e não reabre execute', () => {
    expect(migration098).not.toContain('enforce_last_active_super_admin');
    expect(migration099).not.toContain('enforce_last_active_super_admin');
    expect(migration100.toLowerCase()).not.toContain('drop policy');
    expect(migration100.toLowerCase()).not.toContain('create policy');
    expect(migration100.toLowerCase()).not.toContain('drop trigger');
    expect(migration100).not.toContain('function public.count_active_super_admins');
    expect(migration100).not.toContain('function public.actor_can_manage_super_admin');
    expect(migration100).not.toContain('function public.has_company_permission');
    expect(migration100).toContain(
      'revoke all on function public.enforce_last_active_super_admin()',
    );
    expect(migration100).toContain(
      'revoke all on function public.membership_is_active_super_admin(uuid, public.entity_status, timestamptz)',
    );
    expect(migration100).toContain(
      'revoke all on function public.lock_company_super_admin_guard(uuid)',
    );
  });

  it('rebaixar ou inativar o último ativo cai na mesma regra de count_active_super_admins', () => {
    expect(predicate).toContain('p_deleted_at is null');
    expect(predicate).toContain("p_status = 'active'");
    expect(predicate).toContain('r.deleted_at is null');
    expect(predicate).toContain("r.status = 'active'");
    expect(predicate).toContain('r.is_system = true');
    expect(predicate).toContain("r.name = 'Super Admin'");
    expect(enforce).toContain(
      'membership_is_active_super_admin(old.role_id, old.status, old.deleted_at)',
    );
    expect(enforce).toContain(
      'membership_is_active_super_admin(new.role_id, new.status, new.deleted_at)',
    );
    expect(enforce).toContain(LAST_SUPER_ADMIN_MESSAGE);
    expect(enforce).toContain("errcode = '42501'");
    expect(enforce).toContain('count_active_super_admins(old.company_id) < 1');
  });

  it('outro Super Admin ativo continua administrável e a empresa da linha isola a contagem', () => {
    const stillActive = enforce.indexOf(
      'membership_is_active_super_admin(new.role_id, new.status, new.deleted_at)',
    );
    const lockCall = enforce.indexOf('lock_company_super_admin_guard(old.company_id)');
    const blocked = enforce.indexOf('count_active_super_admins(old.company_id) < 1');
    expect(enforce).toContain('new.company_id is not distinct from old.company_id');
    expect(stillActive).toBeGreaterThan(-1);
    expect(stillActive).toBeLessThan(lockCall);
    expect(enforce.slice(stillActive, lockCall)).toContain('return null');
    expect(blocked).toBeGreaterThan(lockCall);
  });

  it('service role passa antes do lock e usuário comum não ganha execute', () => {
    const serviceRole = enforce.indexOf('if auth.uid() is null then');
    const lockCall = enforce.indexOf('lock_company_super_admin_guard(old.company_id)');
    expect(serviceRole).toBeGreaterThan(-1);
    expect(serviceRole).toBeLessThan(lockCall);
    expect(migration100.toLowerCase()).not.toContain('grant execute');
    expect(migration100).toContain('from public, anon, authenticated');
  });

  it('serializa a checagem no fim da transação, em update e delete, sem insert', () => {
    const lockCall = enforce.indexOf('perform public.lock_company_super_admin_guard(old.company_id)');
    const count = enforce.indexOf('count_active_super_admins(old.company_id) < 1');
    expect(lockCall).toBeGreaterThan(-1);
    expect(count).toBeGreaterThan(lockCall);
    expect(lock).toContain('pg_advisory_xact_lock');
    expect(lock).toContain("hashtext('fleetcontrol.company_members.last_super_admin')");
    expect(lock).toContain('hashtext(p_company_id::text)');
    expect(migration100).toContain(
      'create constraint trigger company_members_keep_last_active_super_admin',
    );
    expect(migration100).toContain('after update or delete on public.company_members');
    expect(migration100).toContain('deferrable initially deferred');
    expect(migration100).toContain(
      'execute function public.enforce_last_active_super_admin()',
    );
    expect(migration100.toLowerCase()).not.toContain('after insert');
    expect(migration100.toLowerCase()).not.toContain('before insert');
  });
});
