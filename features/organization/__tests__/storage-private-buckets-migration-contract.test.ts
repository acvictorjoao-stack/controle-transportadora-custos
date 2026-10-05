import {describe, expect, it} from 'vitest';

import {PRIVATE_STORAGE_BUCKETS} from '@/lib/storage/private-files';

import {
  migrationFiles,
  readFinalBucketVisibility,
  readFinalStoragePolicies,
  readMigration,
} from './in-memory-storage';

/**
 * Checagens estáticas do estado final das migrations de Storage. O efeito no
 * banco (bucket privado, RLS, URL assinada) só é confirmado aplicando 097 no
 * Supabase real.
 */

const MIGRATION = '097_storage_private_buckets.sql';
const migration = readMigration(MIGRATION);

const READ_PERMISSION: Record<string, string> = {
  'vehicle-files': 'vehicles:read',
  'driver-files': 'drivers:read',
  'trip-files': 'trips:read',
  'fuel-files': 'fuel:read',
  'maintenance-files': 'maintenance:read',
  'tire-files': 'tires:read',
  'financial-files': 'financeiro:read',
  'customer-files': 'customers:read',
};

const WRITE_PERMISSION: Record<string, string> = {
  'company-logos': 'companies:write',
  'vehicle-files': 'vehicles:update',
  'driver-files': 'drivers:update',
  'trip-files': 'trips:update',
  'fuel-files': 'fuel:update',
  'maintenance-files': 'maintenance:update',
  'tire-files': 'tires:update',
  'financial-files': 'financeiro:update',
  'customer-files': 'customers:update',
};

describe('097 — buckets privados', () => {
  it('é a migration posterior à 096 e a última que mexe em storage', () => {
    const index = migrationFiles.indexOf(MIGRATION);
    expect(index).toBeGreaterThan(migrationFiles.indexOf('096_security_hardening_tenant_isolation.sql'));
    for (const later of migrationFiles.slice(index + 1)) {
      expect([later, readMigration(later)]).not.toEqual([later, expect.stringMatching(/storage\.(buckets|objects)/)]);
    }
  });

  it('as migrations criam exatamente os 9 buckets registrados na aplicação', () => {
    expect(Object.keys(readFinalBucketVisibility()).sort()).toEqual([...PRIVATE_STORAGE_BUCKETS].sort());
  });

  it('nenhum bucket empresarial termina público', () => {
    const visibility = readFinalBucketVisibility();
    for (const bucket of PRIVATE_STORAGE_BUCKETS) {
      expect([bucket, visibility[bucket]]).toEqual([bucket, false]);
    }
  });

  it('só altera configuração: não apaga nem atualiza objetos', () => {
    expect(migration).not.toMatch(/delete\s+from\s+storage\.objects/i);
    expect(migration).not.toMatch(/update\s+storage\.objects/i);
    expect(migration).not.toMatch(/truncate/i);
    expect(migration).not.toMatch(/drop\s+table/i);
    expect(migration).toMatch(/update storage\.buckets\s+set public = false/);
  });
});

describe('097 — policies de storage.objects', () => {
  const policies = readFinalStoragePolicies();

  it('remove qualquer policy public/anon dos buckets empresariais, inclusive fora das migrations', () => {
    expect(migration).toContain("and roles && array['public', 'anon']::name[]");
    expect(migration).toContain("execute format('drop policy %I on storage.objects', v_policy.policyname)");
    for (const bucket of PRIVATE_STORAGE_BUCKETS) {
      expect(migration).toContain(bucket);
    }
  });

  it('nenhuma policy final é aberta a public/anon ou ignora a empresa da pasta', () => {
    expect(policies.length).toBeGreaterThan(0);
    for (const policy of policies) {
      expect([policy.name, policy.role]).toEqual([policy.name, 'authenticated']);
      expect([policy.name, policy.rule.kind]).not.toEqual([policy.name, 'open']);
    }
  });

  it('leitura exige empresa da pasta + <módulo>:read (logo: membro da empresa)', () => {
    for (const bucket of PRIVATE_STORAGE_BUCKETS) {
      const select = policies.filter((p) => p.bucket === bucket && p.operation === 'select');
      expect([bucket, select.length]).toEqual([bucket, 1]);
      expect(select[0].rule).toEqual(
        bucket === 'company-logos'
          ? {kind: 'member'}
          : {kind: 'permission', code: READ_PERMISSION[bucket]},
      );
    }
    expect(migration).toContain('public.is_company_member(public.storage_object_company_id(name))');
  });

  it('escrita e remoção continuam com as policies originais (<módulo>:update / companies:write)', () => {
    for (const bucket of PRIVATE_STORAGE_BUCKETS) {
      for (const operation of ['insert', 'update', 'delete'] as const) {
        const matching = policies.filter((p) => p.bucket === bucket && p.operation === operation);
        expect([bucket, operation, matching.map((p) => p.rule)]).toEqual([
          bucket,
          operation,
          [{kind: 'permission', code: WRITE_PERMISSION[bucket]}],
        ]);
      }
    }
    expect(migration).not.toMatch(/drop policy if exists \w+_(insert|update|delete) /);
  });
});
