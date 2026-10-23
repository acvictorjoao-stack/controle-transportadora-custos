import {readFileSync} from 'node:fs';

import {
  HML_HARD_DELETE_ALLOWED_TABLES,
  HML_HARD_DELETE_COMPANY_ID,
  HML_HARD_DELETE_COMPANY_SLUG,
  HML_HARD_DELETE_EXPECTED_ENTRY_COUNT,
  HML_HARD_DELETE_TABLE_ORDER,
  type HmlHardDeleteTable,
} from './constants';
import {
  HML_HARD_DELETE_EXPECTED_ENTRIES,
  type ExpectedManifestEntry,
} from './expected-ids';
import type {ManifestFile} from './types';

export function loadHardDeleteManifest(path: string): ManifestFile {
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as ManifestFile;

  if (manifest.companySlug !== HML_HARD_DELETE_COMPANY_SLUG) {
    throw new Error(`manifest slug != ${HML_HARD_DELETE_COMPANY_SLUG}`);
  }
  if (manifest.companyId !== HML_HARD_DELETE_COMPANY_ID) {
    throw new Error('manifest companyId diverge do company id autorizado');
  }
  if (!Array.isArray(manifest.entries)) {
    throw new Error('manifest entries ausente');
  }
  if (manifest.entries.length !== HML_HARD_DELETE_EXPECTED_ENTRY_COUNT) {
    throw new Error(
      `manifest entry count ${manifest.entries.length} != ${HML_HARD_DELETE_EXPECTED_ENTRY_COUNT}`,
    );
  }

  const seenIds = new Set<string>();
  for (const entry of manifest.entries) {
    if (!HML_HARD_DELETE_ALLOWED_TABLES.has(entry.table)) {
      throw new Error(`table fora da allowlist: ${entry.table}`);
    }
    if (!entry.id || entry.id.length < 32) {
      throw new Error(`id inválido em ${entry.table}/${entry.key}`);
    }
    if (seenIds.has(entry.id)) {
      throw new Error(`id duplicado no manifesto: ${entry.table}/${entry.key}`);
    }
    seenIds.add(entry.id);
  }

  assertManifestMatchesExpectedAllowlist(manifest);
  return manifest;
}

/**
 * O manifesto em disco deve coincidir exatamente com a allowlist embutida
 * (mesmos 43 pares table+id). Qualquer extra, falta ou troca aborta.
 */
export function assertManifestMatchesExpectedAllowlist(
  manifest: ManifestFile,
): void {
  const expected = new Map(
    HML_HARD_DELETE_EXPECTED_ENTRIES.map((entry) => [
      `${entry.table}:${entry.id}`,
      entry,
    ]),
  );
  const seen = new Set<string>();

  for (const entry of manifest.entries) {
    const key = `${entry.table}:${entry.id}`;
    const match = expected.get(key);
    if (!match) {
      throw new Error(`entrada fora da allowlist embutida: ${entry.table}`);
    }
    if (match.key !== entry.key) {
      throw new Error(
        `key divergente para ${entry.table}: manifesto=${entry.key} allowlist=${match.key}`,
      );
    }
    seen.add(key);
  }

  if (seen.size !== expected.size) {
    throw new Error(
      `allowlist incompleta no manifesto: ${seen.size} != ${expected.size}`,
    );
  }
}

export function planInDeleteOrder(
  entries: ExpectedManifestEntry[] = [...HML_HARD_DELETE_EXPECTED_ENTRIES],
): ExpectedManifestEntry[] {
  const byTable = new Map<HmlHardDeleteTable, ExpectedManifestEntry[]>();
  for (const table of HML_HARD_DELETE_TABLE_ORDER) byTable.set(table, []);
  for (const entry of entries) {
    byTable.get(entry.table)!.push(entry);
  }
  const plan: ExpectedManifestEntry[] = [];
  for (const table of HML_HARD_DELETE_TABLE_ORDER) {
    plan.push(...(byTable.get(table) ?? []));
  }
  if (plan.length !== HML_HARD_DELETE_EXPECTED_ENTRY_COUNT) {
    throw new Error(`plan length ${plan.length} != ${HML_HARD_DELETE_EXPECTED_ENTRY_COUNT}`);
  }
  return plan;
}

/** Extrai UUIDs no formato 8-4-4-4-12 de um texto SQL para comparação com a allowlist. */
export function extractUuidsFromSql(sql: string): string[] {
  const matches = sql.match(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  );
  return matches ?? [];
}
