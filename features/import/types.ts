/**
 * Shared Excel import framework types (FleetControl).
 * Reusable by routes, customers, vehicles, drivers, suppliers, branches, etc.
 */

export type ImportRowStatus = 'valid' | 'warning' | 'invalid';

export interface ImportRowIssue {
  field?: string;
  message: string;
}

export interface ImportPreviewRow<TPayload = Record<string, unknown>> {
  rowNumber: number;
  status: ImportRowStatus;
  issues: ImportRowIssue[];
  /** Normalized payload ready for persistence when status is valid/warning. */
  payload: TPayload | null;
  /** Raw display values for the preview grid. */
  display: Record<string, string | number | boolean | null>;
}

export interface ImportPreviewResult<TPayload = Record<string, unknown>> {
  rows: ImportPreviewRow<TPayload>[];
  validCount: number;
  invalidCount: number;
  warningCount: number;
  totalCount: number;
}

export interface ImportCommitSummary {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{rowNumber: number; message: string}>;
}

export const IMPORT_MAX_FILE_BYTES = 20 * 1024 * 1024;

export const IMPORT_ACCEPTED_EXTENSIONS = ['.xlsx', '.xls'] as const;

export const IMPORT_ACCEPTED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
] as const;
