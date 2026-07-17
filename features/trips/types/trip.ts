import type {EntityStatus} from '@/features/organization/companies/types';

import type {
  SIMPLE_TRIP_STATUSES,
  TRIP_DOCUMENT_TYPES,
  TRIP_EXPENSE_TYPES,
  TRIP_OCCURRENCE_TYPES,
  TRIP_STATUSES,
} from '../constants/enums';
import type {TripIntegrationSections} from './integrations';

export type TripStatus = (typeof TRIP_STATUSES)[number];
export type SimpleTripStatus = (typeof SIMPLE_TRIP_STATUSES)[number];
export type TripDocumentType = (typeof TRIP_DOCUMENT_TYPES)[number];
export type TripOccurrenceType = (typeof TRIP_OCCURRENCE_TYPES)[number];
export type TripExpenseType = (typeof TRIP_EXPENSE_TYPES)[number];

export interface TripRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  trip_number: string;
  trip_status: TripStatus;
  driver_id: string | null;
  vehicle_id: string | null;
  client_name: string | null;
  contract_reference: string | null;
  customer_id: string | null;
  customer_contract_id: string | null;
  freight_table: string | null;
  contracted_freight_value: number | null;
  actual_freight_value: number | null;
  freight_margin: number | null;
  origin: string | null;
  destination: string | null;
  route: string | null;
  route_id: string | null;
  planned_distance_km: number | null;
  planned_departure_at: string | null;
  initial_odometer_km: number | null;
  final_odometer_km: number | null;
  initial_hour_meter: number | null;
  final_hour_meter: number | null;
  departed_at: string | null;
  arrived_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_notes: string | null;
  weight_kg: number | null;
  volume_m3: number | null;
  cargo_type: string | null;
  notes: string | null;
  responsible: string | null;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  external_id: string | null;
  integration_source: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  branches?: {id: string; name: string; code: string} | {id: string; name: string; code: string}[] | null;
  drivers?: {id: string; name: string; cpf?: string} | {id: string; name: string; cpf?: string}[] | null;
  vehicles?: {id: string; plate: string; fleet_number: string | null; brand?: string | null; model?: string | null}
    | {id: string; plate: string; fleet_number: string | null; brand?: string | null; model?: string | null}[]
    | null;
  customers?: {id: string; legal_name: string; trade_name: string | null} | {id: string; legal_name: string; trade_name: string | null}[] | null;
  routes?:
    | {
        id: string;
        name: string;
        code: string | null;
        origin: string;
        destination: string;
        planned_distance_km: number | null;
      }
    | {
        id: string;
        name: string;
        code: string | null;
        origin: string;
        destination: string;
        planned_distance_km: number | null;
      }[]
    | null;
}

export interface Trip {
  id: string;
  companyId: string;
  branchId: string | null;
  branchName: string | null;
  tripNumber: string;
  tripStatus: TripStatus;
  driverId: string | null;
  driverName: string | null;
  vehicleId: string | null;
  vehiclePlate: string | null;
  vehicleFleetNumber: string | null;
  clientName: string | null;
  contractReference: string | null;
  customerId: string | null;
  customerContractId: string | null;
  customerName: string | null;
  freightTable: string | null;
  contractedFreightValue: number | null;
  actualFreightValue: number | null;
  freightMargin: number | null;
  origin: string | null;
  destination: string | null;
  route: string | null;
  routeId: string | null;
  routeName: string | null;
  routeCode: string | null;
  plannedDistanceKm: number | null;
  plannedDepartureAt: string | null;
  initialOdometerKm: number | null;
  finalOdometerKm: number | null;
  initialHourMeter: number | null;
  finalHourMeter: number | null;
  departedAt: string | null;
  arrivedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationNotes: string | null;
  weightKg: number | null;
  volumeM3: number | null;
  cargoType: string | null;
  notes: string | null;
  responsible: string | null;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  externalId: string | null;
  integrationSource: string | null;
  createdAt: string;
  updatedAt: string;
  distanceKm: number | null;
}

export type TripSelectOption = Pick<Trip, 'id' | 'tripNumber'>;

export interface TripResourceAvailability {
  busyVehicleIds: string[];
  busyDriverIds: string[];
}

export interface TripHistoryRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  trip_id: string;
  action: string;
  changes: Record<string, unknown>;
  previous_trip_status: TripStatus | null;
  new_trip_status: TripStatus | null;
  created_at: string;
  created_by: string | null;
}

export interface TripHistory {
  id: string;
  tripId: string;
  action: string;
  changes: Record<string, unknown>;
  previousTripStatus: TripStatus | null;
  newTripStatus: TripStatus | null;
  createdAt: string;
  createdBy: string | null;
}

export interface TripDocumentRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  trip_id: string;
  name: string;
  file_url: string;
  storage_path: string | null;
  document_type: TripDocumentType;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  deleted_at: string | null;
  created_by: string | null;
}

export interface TripDocument {
  id: string;
  tripId: string;
  name: string;
  fileUrl: string;
  storagePath: string | null;
  documentType: TripDocumentType;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
}

export interface TripOccurrenceRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  trip_id: string;
  occurrence_type: TripOccurrenceType;
  description: string | null;
  occurred_at: string;
  created_at: string;
  deleted_at: string | null;
}

export interface TripOccurrence {
  id: string;
  tripId: string;
  occurrenceType: TripOccurrenceType;
  description: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface TripChecklistRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  trip_id: string;
  tires_ok: boolean | null;
  headlights_ok: boolean | null;
  brakes_ok: boolean | null;
  documentation_ok: boolean | null;
  fuel_ok: boolean | null;
  odometer_reading: number | null;
  hour_meter_reading: number | null;
  photo_urls: string[];
  signature_url: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripChecklist {
  id: string;
  tripId: string;
  tiresOk: boolean | null;
  headlightsOk: boolean | null;
  brakesOk: boolean | null;
  documentationOk: boolean | null;
  fuelOk: boolean | null;
  odometerReading: number | null;
  hourMeterReading: number | null;
  photoUrls: string[];
  signatureUrl: string | null;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripExpenseRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  trip_id: string;
  expense_type: TripExpenseType;
  amount: number;
  currency: string;
  description: string | null;
  notes: string | null;
  expense_date: string;
  receipt_url: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface TripExpense {
  id: string;
  tripId: string;
  expenseType: TripExpenseType;
  amount: number;
  currency: string;
  description: string | null;
  notes: string | null;
  expenseDate: string;
  receiptUrl: string | null;
  createdAt: string;
}

export interface TripStopRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  trip_id: string;
  client_name: string | null;
  stop_date: string | null;
  stop_time: string | null;
  latitude: number | null;
  longitude: number | null;
  stopped_minutes: number | null;
  notes: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface TripStop {
  id: string;
  tripId: string;
  clientName: string | null;
  stopDate: string | null;
  stopTime: string | null;
  latitude: number | null;
  longitude: number | null;
  stoppedMinutes: number | null;
  notes: string | null;
  createdAt: string;
}

export interface TripLocationRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  trip_id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
  speed_kmh: number | null;
  accuracy_m: number | null;
  created_at: string;
}

export interface TripLocation {
  id: string;
  tripId: string;
  latitude: number;
  longitude: number;
  recordedAt: string;
  speedKmh: number | null;
  accuracyM: number | null;
}

export interface PaginatedTrips {
  items: Trip[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TripListFilters {
  tripStatus?: TripStatus;
  driverId?: string;
  vehicleId?: string;
  clientName?: string;
  contractReference?: string;
  branchId?: string;
  routeId?: string;
  origin?: string;
  destination?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TripSortOptions {
  sortBy?: 'trip_number' | 'trip_status' | 'departed_at' | 'client_name' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface TripStats {
  total: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  averageDurationHours: number;
  totalKm: number;
  driversOnTrip: number;
  vehiclesOnTrip: number;
  occurrences: number;
  deliveriesCompleted: number;
}

export interface TripTimelineEntry {
  id: string;
  action: string;
  createdAt: string;
  changes: Record<string, unknown>;
}

export interface TripDetailData extends TripIntegrationSections {
  trip: Trip;
  history: TripHistory[];
  documents: TripDocument[];
  checklist: TripChecklist | null;
  stops: TripStop[];
  occurrences: TripOccurrence[];
  expenses: TripExpense[];
  locations: TripLocation[];
  timeline: TripTimelineEntry[];
}

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  planned: 'Programada',
  scheduled: 'Agendada',
  loading: 'Carregando',
  in_progress: 'Em andamento',
  delivering: 'Entregando',
  waiting: 'Aguardando',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  returned: 'Retornada',
};

export const TRIP_STATUS_INDICATORS: Record<TripStatus, string> = {
  planned: '🟡',
  scheduled: '🟡',
  loading: '🔵',
  in_progress: '🔵',
  delivering: '🔵',
  waiting: '🟡',
  completed: '🟢',
  cancelled: '🔴',
  returned: '🟢',
};

export const TRIP_DOCUMENT_TYPE_LABELS: Record<TripDocumentType, string> = {
  cte: 'CT-e',
  mdfe: 'MDF-e',
  nfe: 'NF-e',
  canhoto: 'Canhoto',
  photo: 'Foto',
  receipt: 'Comprovante',
  checklist: 'Checklist',
  other: 'Outro',
};

export const TRIP_OCCURRENCE_TYPE_LABELS: Record<TripOccurrenceType, string> = {
  delay: 'Atraso',
  breakdown: 'Pane',
  accident: 'Acidente',
  fine: 'Multa',
  redelivery: 'Reentrega',
  return: 'Devolução',
  missing_document: 'Falta de documento',
  other: 'Outros',
};

export const TRIP_EXPENSE_TYPE_LABELS: Record<TripExpenseType, string> = {
  toll: 'Pedágio',
  food: 'Alimentação',
  lodging: 'Hospedagem',
  parking: 'Estacionamento',
  ferry: 'Balsa',
  wash: 'Lavagem',
  advance: 'Adiantamento',
  fine: 'Multa',
  other: 'Outros',
};

export const TRIP_HISTORY_ACTION_LABELS: Record<string, string> = {
  create: 'Criação',
  update: 'Edição',
  delete: 'Exclusão',
  status_change: 'Mudança de status',
  driver_change: 'Troca de motorista',
  vehicle_change: 'Troca de veículo',
  document_upload: 'Upload de documento',
  occurrence: 'Ocorrência',
  checklist_create: 'Checklist criado',
  checklist_update: 'Checklist atualizado',
  expense_create: 'Despesa criada',
  expense_update: 'Despesa editada',
  expense_delete: 'Despesa excluída',
  started: 'Viagem iniciada',
  completed: 'Viagem concluída',
  cancelled: 'Viagem cancelada',
};
