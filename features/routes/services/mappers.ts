import type {
  Route,
  RouteDocument,
  RouteDocumentRow,
  RouteHistory,
  RouteHistoryRow,
  RouteRow,
} from '../types';

export function mapRouteRow(row: RouteRow): Route {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    code: row.code,
    origin: row.origin,
    destination: row.destination,
    routeType: row.route_type,
    plannedDistanceKm:
      row.planned_distance_km === null || row.planned_distance_km === undefined
        ? null
        : Number(row.planned_distance_km),
    leadTimeMinutes: row.lead_time_minutes,
    unloadTimeMinutes: row.unload_time_minutes,
    notes: row.notes,
    operationalStatus: row.operational_status,
    externalId: row.external_id ?? null,
    integrationSource: row.integration_source ?? null,
    metadata: row.metadata ?? {},
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRouteHistoryRow(row: RouteHistoryRow): RouteHistory {
  return {
    id: row.id,
    routeId: row.route_id,
    action: row.action,
    changes: row.changes ?? {},
    previousOperationalStatus: row.previous_operational_status,
    newOperationalStatus: row.new_operational_status,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

export function mapRouteDocumentRow(row: RouteDocumentRow): RouteDocument {
  return {
    id: row.id,
    routeId: row.route_id,
    name: row.name,
    fileUrl: row.file_url,
    storagePath: row.storage_path ?? null,
    documentType: row.document_type,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
  };
}
