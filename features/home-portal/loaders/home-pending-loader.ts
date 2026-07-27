import type {SupabaseClient} from '@supabase/supabase-js';

import {getCadastroQualityData} from '@/features/cadastro-quality/loaders';
import {getDriverStats} from '@/features/drivers/queries';
import {getMaintenanceStats} from '@/features/maintenance/queries';
import {ROUTES} from '@/constants/routes/paths';
import {buildDriversListUrl} from '@/features/drivers/utils/list-url';

import type {HomePendingItem, HomePendingSnapshot} from '../types';

export async function getHomePendingSnapshot(
  supabase: SupabaseClient,
  companyId: string,
): Promise<HomePendingSnapshot> {
  const [quality, drivers, maintenance] = await Promise.all([
    getCadastroQualityData(supabase, companyId).catch(() => null),
    getDriverStats(supabase, companyId).catch(() => null),
    getMaintenanceStats(supabase, companyId).catch(() => null),
  ]);

  return {
    routesWithoutLeadTime: quality?.summary.missingLeadTime ?? 0,
    cnhExpiring: drivers?.cnhExpiring ?? 0,
    maintenanceOverdue: maintenance?.overdueSchedules ?? 0,
  };
}

export function buildHomePendingItems(
  snapshot: HomePendingSnapshot,
): HomePendingItem[] {
  return [
    {
      id: 'rotas-sem-lead-time',
      title: 'Rotas sem Lead Time',
      count: snapshot.routesWithoutLeadTime,
      href: ROUTES.qualidadeCadastros,
      actionLabel: 'Abrir Qualidade',
    },
    {
      id: 'cnhs-vencendo',
      title: 'CNHs vencendo',
      count: snapshot.cnhExpiring,
      href: buildDriversListUrl({filters: {cnhExpiring: true}}),
      actionLabel: 'Motoristas',
    },
    {
      id: 'manutencoes-atrasadas',
      title: 'Manutenções atrasadas',
      count: snapshot.maintenanceOverdue,
      href: ROUTES.manutencoes,
      actionLabel: 'Frota',
    },
  ];
}
