import type {EntityStatus} from '@/features/organization/companies/types';

import type {
  ROUTE_DOCUMENT_TYPES,
  ROUTE_OPERATIONAL_STATUSES,
  ROUTE_TYPES,
} from '../constants/enums';

export type RouteOperationalStatus = (typeof ROUTE_OPERATIONAL_STATUSES)[number];

export type RouteType = (typeof ROUTE_TYPES)[number];

export type RouteDocumentType = (typeof ROUTE_DOCUMENT_TYPES)[number];

export interface RouteRow {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  origin: string;
  destination: string;
  route_type: RouteType;
  planned_distance_km: number | null;
  lead_time_minutes: number | null;
  unload_time_minutes: number | null;
  notes: string | null;
  operational_status: RouteOperationalStatus;
  external_id: string | null;
  integration_source: string | null;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface Route {
  id: string;
  companyId: string;
  name: string;
  code: string | null;
  origin: string;
  destination: string;
  routeType: RouteType;
  plannedDistanceKm: number | null;
  leadTimeMinutes: number | null;
  unloadTimeMinutes: number | null;
  notes: string | null;
  operationalStatus: RouteOperationalStatus;
  externalId: string | null;
  integrationSource: string | null;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export type RouteSelectOption = Pick<Route, 'id' | 'name' | 'code' | 'origin' | 'destination'>;

export interface RouteHistoryRow {
  id: string;
  company_id: string;
  route_id: string;
  action: string;
  changes: Record<string, unknown>;
  previous_operational_status: RouteOperationalStatus | null;
  new_operational_status: RouteOperationalStatus | null;
  created_at: string;
  created_by: string | null;
}

export interface RouteHistory {
  id: string;
  routeId: string;
  action: string;
  changes: Record<string, unknown>;
  previousOperationalStatus: RouteOperationalStatus | null;
  newOperationalStatus: RouteOperationalStatus | null;
  createdAt: string;
  createdBy: string | null;
}

export interface RouteDocumentRow {
  id: string;
  company_id: string;
  route_id: string;
  name: string;
  file_url: string;
  storage_path: string | null;
  document_type: RouteDocumentType;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  deleted_at: string | null;
  created_by: string | null;
}

export interface RouteDocument {
  id: string;
  routeId: string;
  name: string;
  fileUrl: string;
  storagePath: string | null;
  documentType: RouteDocumentType;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
}

export interface PaginatedRoutes {
  items: Route[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RouteListFilters {
  operationalStatus?: RouteOperationalStatus;
  routeType?: RouteType;
  origin?: string;
  destination?: string;
}

export interface RouteSortOptions {
  sortBy?:
    | 'name'
    | 'origin'
    | 'destination'
    | 'route_type'
    | 'planned_distance_km'
    | 'lead_time_minutes'
    | 'operational_status'
    | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface RouteFilterOptions {
  origins: string[];
  destinations: string[];
}

export interface RouteDetailData {
  route: Route;
  history: RouteHistory[];
}

export const ROUTE_OPERATIONAL_STATUS_LABELS: Record<RouteOperationalStatus, string> = {
  active: 'Ativa',
  inactive: 'Inativa',
};

export const ROUTE_TYPE_LABELS: Record<RouteType, string> = {
  delivery: 'Entrega',
  pickup: 'Coleta',
  transfer: 'Transferência',
  distribution: 'Distribuição',
  other: 'Outro',
};

export const ROUTE_DOCUMENT_TYPE_LABELS: Record<RouteDocumentType, string> = {
  document: 'Documento',
  map: 'Mapa',
  other: 'Outro',
};

export const ROUTE_HISTORY_ACTION_LABELS: Record<string, string> = {
  create: 'Cadastro',
  update: 'Edição',
  status_change: 'Mudança de status',
  document_upload: 'Upload de documento',
  delete: 'Exclusão',
};
