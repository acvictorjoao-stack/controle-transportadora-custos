import type {RouteImportPreviewResult} from './types';

/** Filters importable rows (valid + warning). Invalid rows are excluded. */
export function getImportableRouteRows(preview: RouteImportPreviewResult) {
  return preview.rows
    .filter((row) => row.status !== 'invalid' && row.payload)
    .map((row) => row.payload!);
}

export function countExistingMatches(preview: RouteImportPreviewResult): number {
  return preview.rows.filter(
    (row) => row.payload?.existingRouteId != null && row.status !== 'invalid',
  ).length;
}
