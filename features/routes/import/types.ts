import type {ImportPreviewResult} from '@/features/import';

export const ROUTE_IMPORT_HEADERS = [
  'Nome da Rota',
  'Origem',
  'Destino',
  'Cliente',
  'Filial',
  'Distância (KM)',
  'Lead Time (dias)',
  'Ativa',
] as const;

export type RouteImportHeader = (typeof ROUTE_IMPORT_HEADERS)[number];

export interface RouteImportRawRow {
  rowNumber: number;
  routeName: string;
  origin: string;
  destination: string;
  customerName: string;
  branchName: string;
  distanceKm: string;
  leadTimeDays: string;
  active: string;
}

export interface RouteImportPayload {
  name: string;
  origin: string;
  destination: string;
  customerId: string;
  customerName: string;
  branchId: string;
  branchName: string;
  plannedDistanceKm: number | null;
  leadTimeDays: number;
  operationalStatus: 'active' | 'inactive';
  existingRouteId: string | null;
}

export interface RouteImportLookupMaps {
  customersByName: Map<string, {id: string; name: string}>;
  branchesByName: Map<string, {id: string; name: string}>;
  existingRoutes: Array<{
    id: string;
    origin: string;
    destination: string;
    customerId: string | null;
  }>;
}

export type RouteImportPreviewResult = ImportPreviewResult<RouteImportPayload>;

export interface RouteImportCommitInput {
  rows: RouteImportPayload[];
  updateExisting: boolean;
}
