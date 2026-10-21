import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {HML_MANIFEST_DIR, HML_MANIFEST_FILE} from './constants';
import {HML_MANIFEST_DISCLAIMER} from './expected-plan';
import type {HmlManifest, HmlManifestEntry, HmlOperationType, HmlRecordKind} from './types';

function manifestPath(): string {
  return resolve(process.cwd(), HML_MANIFEST_DIR, HML_MANIFEST_FILE);
}

export function loadManifest(): HmlManifest | null {
  const path = manifestPath();
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw) as HmlManifest;
}

export function createManifest(companyId: string, companySlug: string): HmlManifest {
  const now = new Date().toISOString();
  return {
    companyId,
    companySlug,
    startedAt: now,
    updatedAt: now,
    disclaimer: HML_MANIFEST_DISCLAIMER,
    isTransactional: false,
    entries: [],
  };
}

export function appendManifestEntry(
  manifest: HmlManifest,
  entry: Omit<HmlManifestEntry, 'createdAt'>,
): HmlManifest {
  const next: HmlManifest = {
    ...manifest,
    disclaimer: HML_MANIFEST_DISCLAIMER,
    isTransactional: false,
    updatedAt: new Date().toISOString(),
    entries: [
      ...manifest.entries,
      {...entry, createdAt: new Date().toISOString()},
    ],
  };
  saveManifest(next);
  return next;
}

export function trackManifest(
  manifest: HmlManifest,
  input: {
    entity: string;
    key: string;
    id: string;
    phase: string;
    table: string;
    kind: HmlRecordKind;
    operation?: HmlOperationType;
    relatedIds?: string[];
    expectedFinancialEntries?: number;
  },
): HmlManifest {
  if (hasManifestEntry(manifest, input.entity, input.key)) return manifest;
  return appendManifestEntry(manifest, {
    entity: input.entity,
    key: input.key,
    id: input.id,
    phase: input.phase,
    table: input.table,
    kind: input.kind,
    operation: input.operation ?? 'insert',
    relatedIds: input.relatedIds,
    expectedFinancialEntries: input.expectedFinancialEntries,
  });
}

export function saveManifest(manifest: HmlManifest): void {
  // Evita sobrescrever evidência real de falha parcial durante vitest.
  if (process.env.VITEST === 'true') return;

  const dir = resolve(process.cwd(), HML_MANIFEST_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, {recursive: true});
  }
  writeFileSync(manifestPath(), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

export function hasManifestEntry(
  manifest: HmlManifest,
  entity: string,
  key: string,
): boolean {
  return manifest.entries.some((entry) => entry.entity === entity && entry.key === key);
}

export function getManifestId(
  manifest: HmlManifest,
  entity: string,
  key: string,
): string | null {
  return manifest.entries.find((entry) => entry.entity === entity && entry.key === key)?.id ?? null;
}

/** Contagens do manifesto por kind (1 entrada = 1 operação; FE parcelas em relatedIds). */
export function countManifestByKind(manifest: HmlManifest): {
  primary: number;
  auxiliary: number;
  statusUpdates: number;
  financialIntegrationCalls: number;
  financialEntriesCreated: number;
} {
  let primary = 0;
  let auxiliary = 0;
  let statusUpdates = 0;
  let financialIntegrationCalls = 0;
  let financialEntriesCreated = 0;

  for (const entry of manifest.entries) {
    if (entry.kind === 'primary') primary += 1;
    else if (entry.kind === 'auxiliary') auxiliary += 1;
    else if (entry.kind === 'status_update') statusUpdates += 1;
    else if (entry.kind === 'financial_integration') {
      financialIntegrationCalls += 1;
      financialEntriesCreated += entry.relatedIds?.length ?? 0;
    }
  }

  return {
    primary,
    auxiliary,
    statusUpdates,
    financialIntegrationCalls,
    financialEntriesCreated,
  };
}
