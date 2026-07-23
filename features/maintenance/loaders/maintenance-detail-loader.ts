import type {SupabaseClient} from '@supabase/supabase-js';

import {listTiresByMaintenanceRecordId} from '@/features/tires/queries/tires';

import {
  getMaintenanceRecordDetailRow,
  listMaintenanceDocuments,
  listMaintenanceHistory,
  listMaintenanceParts,
  listMaintenanceSchedulesByVehicle,
  listMaintenanceServices,
} from '../queries/maintenance-records';
import type {MaintenanceDetailData} from '../types';
import {
  emptyMaintenanceIntegrationSections,
  type MaintenanceIntegrationSections,
} from '../types/integrations';

export type MaintenanceDetailSectionLoader = (
  supabase: SupabaseClient,
  companyId: string,
  maintenanceRecordId: string,
) => Promise<Partial<MaintenanceIntegrationSections>>;

/** Registry for future module loaders (pneus, financeiro, BI, IA, telemetria, app motorista). */
const integrationLoaders: MaintenanceDetailSectionLoader[] = [];

export function registerMaintenanceDetailLoader(loader: MaintenanceDetailSectionLoader): void {
  integrationLoaders.push(loader);
}

async function loadIntegrationSections(
  supabase: SupabaseClient,
  companyId: string,
  maintenanceRecordId: string,
): Promise<MaintenanceIntegrationSections> {
  const base = emptyMaintenanceIntegrationSections();

  if (integrationLoaders.length === 0) {
    return base;
  }

  // Cada loader de integração é isolado: uma falha em um módulo (ex.: financeiro)
  // não deve impedir a exibição da manutenção nem as demais seções já carregadas.
  const results = await Promise.all(
    integrationLoaders.map(async (loader) => {
      try {
        return await loader(supabase, companyId, maintenanceRecordId);
      } catch (error) {
        console.error('Falha ao carregar integração do detalhe da manutenção:', error);
        return {};
      }
    }),
  );

  return results.reduce<MaintenanceIntegrationSections>(
    (acc, section) => ({
      financial: section.financial ?? acc.financial,
      bi: section.bi ?? acc.bi,
      tires: section.tires ?? acc.tires,
      telemetry: section.telemetry ?? acc.telemetry,
      driverApp: section.driverApp ?? acc.driverApp,
      ai: section.ai ?? acc.ai,
    }),
    base,
  );
}

async function loadLinkedTires(
  supabase: SupabaseClient,
  companyId: string,
  maintenanceRecordId: string,
): Promise<MaintenanceIntegrationSections['tires']> {
  const tires = await listTiresByMaintenanceRecordId(supabase, companyId, maintenanceRecordId);

  return tires.map((tire) => ({
    id: tire.id,
    position: tire.currentPosition ?? '—',
    brand: tire.brand,
    status: tire.tireStatus,
  }));
}

export async function composeMaintenanceDetail(
  supabase: SupabaseClient,
  companyId: string,
  maintenanceRecordId: string,
): Promise<MaintenanceDetailData | null> {
  const detail = await getMaintenanceRecordDetailRow(supabase, companyId, maintenanceRecordId);
  if (!detail) return null;

  const [history, documents, parts, services, schedules, integrations, linkedTires] =
    await Promise.all([
    listMaintenanceHistory(supabase, companyId, maintenanceRecordId),
    listMaintenanceDocuments(supabase, companyId, maintenanceRecordId),
    listMaintenanceParts(supabase, companyId, maintenanceRecordId),
    listMaintenanceServices(supabase, companyId, maintenanceRecordId),
    listMaintenanceSchedulesByVehicle(supabase, companyId, detail.record.vehicleId),
    loadIntegrationSections(supabase, companyId, maintenanceRecordId),
    loadLinkedTires(supabase, companyId, maintenanceRecordId),
  ]);

  return {
    record: detail.record,
    linkedTrip: detail.linkedTrip,
    history,
    documents,
    parts,
    services,
    schedules,
    ...integrations,
    tires: linkedTires.length > 0 ? linkedTires : integrations.tires,
  };
}
