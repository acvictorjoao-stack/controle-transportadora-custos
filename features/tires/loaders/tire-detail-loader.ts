import type {SupabaseClient} from '@supabase/supabase-js';

import {getMaintenanceRecordById} from '@/features/maintenance/queries/maintenance-records';

import {
  getTireById,
  listTireDocuments,
  listTireHistory,
  listTireInspections,
  listTireMovements,
  listTireRecaps,
} from '../queries/tires';
import type {TireDetailData} from '../types';
import {
  emptyTireIntegrationSections,
  type TireIntegrationSections,
} from '../types/integrations';

export type TireDetailSectionLoader = (
  supabase: SupabaseClient,
  companyId: string,
  tireId: string,
) => Promise<Partial<TireIntegrationSections>>;

/** Registry for future module loaders (financeiro, BI, IA, telemetria, app motorista). */
const integrationLoaders: TireDetailSectionLoader[] = [];

export function registerTireDetailLoader(loader: TireDetailSectionLoader): void {
  integrationLoaders.push(loader);
}

async function loadIntegrationSections(
  supabase: SupabaseClient,
  companyId: string,
  tireId: string,
): Promise<TireIntegrationSections> {
  const base = emptyTireIntegrationSections();

  if (integrationLoaders.length === 0) {
    return base;
  }

  const results = await Promise.all(
    integrationLoaders.map((loader) => loader(supabase, companyId, tireId)),
  );

  return results.reduce<TireIntegrationSections>(
    (acc, section) => ({
      financial: section.financial ?? acc.financial,
      bi: section.bi ?? acc.bi,
      maintenance: section.maintenance ?? acc.maintenance,
      telemetry: section.telemetry ?? acc.telemetry,
      driverApp: section.driverApp ?? acc.driverApp,
      ai: section.ai ?? acc.ai,
    }),
    base,
  );
}

async function loadLinkedMaintenance(
  supabase: SupabaseClient,
  companyId: string,
  maintenanceRecordId: string,
): Promise<TireIntegrationSections['maintenance']> {
  const record = await getMaintenanceRecordById(supabase, companyId, maintenanceRecordId);
  if (!record) return [];

  return [
    {
      id: record.id,
      maintenanceType: record.maintenanceType,
      openedAt: record.openedAt,
      status: record.maintenanceStatus,
    },
  ];
}

export async function composeTireDetail(
  supabase: SupabaseClient,
  companyId: string,
  tireId: string,
): Promise<TireDetailData | null> {
  const tire = await getTireById(supabase, companyId, tireId);
  if (!tire) return null;

  const [history, movements, inspections, recaps, documents, integrations, linkedMaintenance] =
    await Promise.all([
    listTireHistory(supabase, companyId, tireId),
    listTireMovements(supabase, companyId, tireId),
    listTireInspections(supabase, companyId, tireId),
    listTireRecaps(supabase, companyId, tireId),
    listTireDocuments(supabase, companyId, tireId),
    loadIntegrationSections(supabase, companyId, tireId),
    tire.maintenanceRecordId
      ? loadLinkedMaintenance(supabase, companyId, tire.maintenanceRecordId)
      : Promise.resolve([]),
  ]);

  return {
    tire,
    history,
    movements,
    inspections,
    recaps,
    documents,
    ...integrations,
    maintenance: linkedMaintenance.length > 0 ? linkedMaintenance : integrations.maintenance,
  };
}

export const getTireDetail = composeTireDetail;
