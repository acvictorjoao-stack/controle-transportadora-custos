import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

/**
 * Dimensões analíticas compartilhadas (mesmas chaves de `OperationalDreFilters`).
 * Datas (`dateFrom`/`dateTo`) não fazem parte do escopo: o alerta é estado atual.
 */
export interface OverdueMaintenanceScheduleScope {
  branchId?: string;
  vehicleId?: string;
  driverId?: string;
  customerId?: string;
  routeId?: string;
  costCenterId?: string;
}

/**
 * `maintenance_schedules` não possui cliente, rota nem centro de custo; com essas
 * dimensões ativas o agendamento não é atribuível (mesma regra dos custos órfãos
 * da DRE) e o alerta fica fora do escopo.
 */
export function isOverdueMaintenanceScheduleScopeAttributable(
  scope: OverdueMaintenanceScheduleScope,
): boolean {
  return !(scope.customerId || scope.routeId || scope.costCenterId);
}

/**
 * Audit #22 — alerta operacional de estado atual: agendamentos ativos com
 * `next_due_at` anterior a `now` (mesma regra de `get_maintenance_stats`),
 * restritos ao contexto dimensional do Dashboard Executivo.
 * O período selecionado não se aplica: manutenção vencida hoje continua vencida
 * mesmo ao consultar um período histórico.
 */
export async function countOverdueMaintenanceSchedules(
  supabase: SupabaseClient,
  companyId: string,
  scope: OverdueMaintenanceScheduleScope = {},
  now: Date = new Date(),
): Promise<number> {
  if (!isOverdueMaintenanceScheduleScopeAttributable(scope)) {
    return 0;
  }

  let query = supabase
    .from('maintenance_schedules')
    .select('id, vehicles!inner(id)', {count: 'exact', head: true})
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .eq('is_active', true)
    .is('vehicles.deleted_at', null)
    .lt('next_due_at', now.toISOString());

  if (scope.branchId) query = query.eq('branch_id', scope.branchId);
  if (scope.vehicleId) query = query.eq('vehicle_id', scope.vehicleId);
  if (scope.driverId) query = query.eq('driver_id', scope.driverId);

  const {count, error} = await query;

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return count ?? 0;
}
