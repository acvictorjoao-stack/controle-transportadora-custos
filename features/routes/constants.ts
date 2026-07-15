export const ROUTE_LIST_COLUMNS = `
  id, company_id, name, code, origin, destination, route_type,
  planned_distance_km, lead_time_minutes, unload_time_minutes, notes,
  operational_status, external_id, integration_source, metadata, status,
  created_at, updated_at, deleted_at, created_by, updated_by
`;

export const ROUTE_DETAIL_COLUMNS = ROUTE_LIST_COLUMNS;

export const ROUTES_PAGE_SIZE = 10;
