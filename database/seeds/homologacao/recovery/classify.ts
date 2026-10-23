import type {HmlRecoveryTable} from './constants';
import type {ClassifiedRow, LiveRowSnapshot, PlanRow, SoftPayload} from './types';

export function softPayloadFor(
  table: HmlRecoveryTable,
  profileId: string,
  deletedAt: string,
): SoftPayload {
  switch (table) {
    case 'customer_contract_items':
    case 'customer_addresses':
    case 'customer_contacts':
    case 'customers':
      return {deleted_at: deletedAt, updated_by: profileId};
    case 'customer_contracts':
      return {
        deleted_at: deletedAt,
        contract_status: 'cancelled',
        updated_by: profileId,
      };
    case 'suppliers':
      return {deleted_at: deletedAt, updated_by: profileId, active: false};
    case 'vehicles':
    case 'branches':
      return {deleted_at: deletedAt, status: 'archived', updated_by: profileId};
    case 'cost_centers':
    case 'positions':
      return {deleted_at: deletedAt, status: 'inactive', updated_by: profileId};
    default: {
      const _exhaustive: never = table;
      return _exhaustive;
    }
  }
}

/**
 * Confirma que um SOFT_DELETED live é coerente com o soft-delete da app.
 * Não exige igualdade de timestamp — só flags de status/active/contract_status.
 */
export function softDeleteFieldsCoherent(
  table: HmlRecoveryTable,
  live: LiveRowSnapshot,
): {ok: true} | {ok: false; reason: string} {
  if (live.deleted_at == null) {
    return {ok: false, reason: 'deleted_at_null'};
  }
  if (table === 'branches' && live.is_headquarters === true) {
    return {ok: false, reason: 'soft_deleted_headquarters'};
  }
  if ((table === 'cost_centers' || table === 'positions') && live.is_system === true) {
    return {ok: false, reason: 'soft_deleted_system_row'};
  }
  if (table === 'customer_contracts' && live.contract_status != null) {
    if (live.contract_status !== 'cancelled') {
      return {ok: false, reason: 'contract_status_not_cancelled'};
    }
  }
  if (table === 'suppliers' && live.active != null && live.active !== false) {
    return {ok: false, reason: 'supplier_still_active'};
  }
  if (
    (table === 'vehicles' || table === 'branches') &&
    live.status != null &&
    live.status !== 'archived'
  ) {
    return {ok: false, reason: 'status_not_archived'};
  }
  if (
    (table === 'cost_centers' || table === 'positions') &&
    live.status != null &&
    live.status !== 'inactive'
  ) {
    return {ok: false, reason: 'status_not_inactive'};
  }
  return {ok: true};
}

export function classifyLiveRow(
  plan: PlanRow,
  companyId: string,
  live: LiveRowSnapshot | null,
  queryError?: string | null,
): ClassifiedRow {
  if (queryError) {
    return {
      plan,
      state: 'INVALID',
      reason: `query_error:${queryError}`,
      live: null,
    };
  }
  if (!live) {
    return {plan, state: 'INVALID', reason: 'row_not_found', live: null};
  }
  if (live.company_id !== companyId) {
    return {plan, state: 'INVALID', reason: 'company_id_mismatch', live};
  }
  if (plan.table === 'branches' && live.is_headquarters === true && live.deleted_at == null) {
    return {plan, state: 'INVALID', reason: 'refuses_headquarters', live};
  }
  if (
    (plan.table === 'cost_centers' || plan.table === 'positions') &&
    live.is_system === true &&
    live.deleted_at == null
  ) {
    return {plan, state: 'INVALID', reason: 'refuses_system_row', live};
  }

  if (live.deleted_at != null) {
    const coherent = softDeleteFieldsCoherent(plan.table, live);
    if (!coherent.ok) {
      return {plan, state: 'INVALID', reason: `soft_deleted_incoherent:${coherent.reason}`, live};
    }
    return {plan, state: 'SOFT_DELETED', reason: 'already_soft_deleted', live};
  }

  return {plan, state: 'ACTIVE', reason: 'eligible', live};
}
