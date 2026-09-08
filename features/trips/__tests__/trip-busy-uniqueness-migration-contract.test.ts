import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

const MIGRATION_PATH = 'supabase/migrations/095_trip_busy_resource_uniqueness.sql';

const migration = readFileSync(resolve(process.cwd(), MIGRATION_PATH), 'utf8');

const BUSY_STATUSES = [
  'planned',
  'scheduled',
  'loading',
  'in_progress',
  'delivering',
  'waiting',
] as const;

/** Corpo de um CREATE UNIQUE INDEX, incluindo o predicado parcial. */
function uniqueIndexBlock(name: string): string {
  const start = migration.indexOf(`create unique index ${name}`);
  if (start < 0) return 'indice-ausente';
  return migration.slice(start, migration.indexOf(';', start));
}

describe('migration 095 trip busy resource uniqueness contract', () => {
  it('cria os dois índices únicos parciais com nomes esperados', () => {
    expect(migration).toContain('create unique index trips_busy_vehicle_unique');
    expect(migration).toContain('create unique index trips_busy_driver_unique');
    expect(migration).not.toContain('alter table public.trips');
    expect(migration).not.toContain('add constraint');
  });

  it('usa predicado busy completo no índice de veículo', () => {
    const block = uniqueIndexBlock('trips_busy_vehicle_unique');
    expect(block).toContain('on public.trips (company_id, vehicle_id)');
    expect(block).toContain('deleted_at is null');
    expect(block).toContain('vehicle_id is not null');
    for (const status of BUSY_STATUSES) {
      expect(block).toContain(`'${status}'`);
    }
    expect(block).not.toContain("'completed'");
    expect(block).not.toContain("'cancelled'");
    expect(block).not.toContain("'returned'");
  });

  it('usa predicado busy completo no índice de motorista', () => {
    const block = uniqueIndexBlock('trips_busy_driver_unique');
    expect(block).toContain('on public.trips (company_id, driver_id)');
    expect(block).toContain('deleted_at is null');
    expect(block).toContain('driver_id is not null');
    for (const status of BUSY_STATUSES) {
      expect(block).toContain(`'${status}'`);
    }
    expect(block).not.toContain("'completed'");
    expect(block).not.toContain("'cancelled'");
    expect(block).not.toContain("'returned'");
  });

  it('faz preflight fail-fast sem saneamento destrutivo', () => {
    expect(migration).toContain('Migration 095 blocked');
    expect(migration).toContain('raise exception');
    expect(migration).toContain('having count(*) > 1');
    expect(migration.toLowerCase()).not.toContain('delete from public.trips');
    expect(migration.toLowerCase()).not.toContain('update public.trips');
  });

  it('não altera enum, rls, grants nem funções de estatística', () => {
    const lower = migration.toLowerCase();
    expect(lower).not.toContain('create type');
    expect(lower).not.toContain('alter type');
    expect(lower).not.toContain('create policy');
    expect(lower).not.toContain('grant ');
    expect(lower).not.toContain('create or replace function');
    expect(lower).not.toContain('drop function');
    expect(lower).not.toContain('drop index');
  });
});
