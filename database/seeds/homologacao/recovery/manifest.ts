import {readFileSync} from 'node:fs';

import {HML_COMPANY_SLUG} from '../constants';
import {
  HML_RECOVERY_ALLOWED_TABLES,
  HML_RECOVERY_EXPECTED_ENTRY_COUNT,
  HML_RECOVERY_TABLE_ORDER,
  type HmlRecoveryTable,
} from './constants';
import type {ManifestFile, PlanRow} from './types';

export function idPrefix(id: string): string {
  return id.slice(0, 8);
}

export function loadRecoveryManifest(path: string): ManifestFile {
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as ManifestFile;

  if (manifest.companySlug !== HML_COMPANY_SLUG) {
    throw new Error(`manifest slug != ${HML_COMPANY_SLUG}`);
  }
  if (!Array.isArray(manifest.entries)) {
    throw new Error('manifest entries ausente');
  }

  const seenIds = new Set<string>();
  for (const entry of manifest.entries) {
    if (!HML_RECOVERY_ALLOWED_TABLES.has(entry.table)) {
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

  if (manifest.entries.length !== HML_RECOVERY_EXPECTED_ENTRY_COUNT) {
    throw new Error(
      `manifest entry count ${manifest.entries.length} != ${HML_RECOVERY_EXPECTED_ENTRY_COUNT}`,
    );
  }

  return manifest;
}

export function buildRecoveryPlan(manifest: ManifestFile): PlanRow[] {
  const byTable = new Map<HmlRecoveryTable, PlanRow[]>();
  for (const table of HML_RECOVERY_TABLE_ORDER) byTable.set(table, []);

  for (const entry of manifest.entries) {
    const table = entry.table as HmlRecoveryTable;
    byTable.get(table)!.push({
      table,
      key: entry.key,
      id: entry.id,
      idPrefix: idPrefix(entry.id),
    });
  }

  const plan: PlanRow[] = [];
  for (const table of HML_RECOVERY_TABLE_ORDER) {
    plan.push(...(byTable.get(table) ?? []));
  }
  if (plan.length !== HML_RECOVERY_EXPECTED_ENTRY_COUNT) {
    throw new Error(`plan length ${plan.length} != ${HML_RECOVERY_EXPECTED_ENTRY_COUNT}`);
  }
  return plan;
}

/** IDs do plano por tabela — usados para não bloquear vínculos internos ao recovery. */
export function planIdsByTable(plan: PlanRow[]): Map<HmlRecoveryTable, Set<string>> {
  const map = new Map<HmlRecoveryTable, Set<string>>();
  for (const table of HML_RECOVERY_TABLE_ORDER) map.set(table, new Set());
  for (const row of plan) {
    map.get(row.table)!.add(row.id);
  }
  return map;
}

export function assertIdInPlan(plan: PlanRow[], table: string, id: string): void {
  const found = plan.some((row) => row.table === table && row.id === id);
  if (!found) {
    throw new Error(`id fora do manifesto: ${table}`);
  }
}
