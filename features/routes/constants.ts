export const ROUTE_LIST_COLUMNS = `
  id, company_id, name, code, origin, destination, route_type,
  planned_distance_km, lead_time_minutes, lead_time_days, unload_time_minutes,
  customer_id, branch_id, notes,
  operational_status, external_id, integration_source, metadata, status,
  created_at, updated_at, deleted_at, created_by, updated_by,
  customers:customer_id ( legal_name, trade_name ),
  branches:branch_id ( name, code )
`;

export const ROUTE_DETAIL_COLUMNS = ROUTE_LIST_COLUMNS;

export const ROUTES_PAGE_SIZE = 10;
