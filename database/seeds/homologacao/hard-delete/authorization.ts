import {
  HML_HARD_DELETE_AUTHORIZE_FLAG,
  HML_HARD_DELETE_CONFIRM_ENV,
  HML_HARD_DELETE_CONFIRM_VALUE,
  HML_HARD_DELETE_PORTAL_MASTER_AUTHORIZED,
  HML_HARD_DELETE_PROJECT_REF,
  HML_HARD_DELETE_REMOTE_EXECUTION_ENABLED,
} from './constants';

/** Evita NodeJS.ProcessEnv nos testes (tipagem frágil em alguns tsconfigs). */
export type HardDeleteEnv = Record<string, string | undefined>;

export type AuthzInput = {
  executeRequested: boolean;
  argv: string[];
  env: HardDeleteEnv;
  /** Project ref derivado da URL (nunca do manifesto). */
  projectRef: string | null;
  /**
   * Membership Super Admin comprovada (company_members + role sistema).
   * Não usar o resultado de is_company_super_admin se incluir Portal Master.
   */
  isMembershipSuperAdmin: boolean | null;
  /** Portal Master acting pela empresa-alvo (is_portal_owner_acting_for). */
  isPortalMasterActing?: boolean | null;
  /**
   * Só true se houver autorização humana formal para caminho Master.
   * Default: HML_HARD_DELETE_PORTAL_MASTER_AUTHORIZED (false).
   */
  portalMasterAuthorized?: boolean;
  remoteExecutionEnabled?: boolean;
};

export type AuthzDecision =
  | {mode: 'LOCAL_PLAN'; writeAuthorized: false}
  | {mode: 'EXECUTE_BLOCKED'; writeAuthorized: false; reason: string}
  | {mode: 'EXECUTE'; writeAuthorized: true};

/**
 * Gates de autorização. Ordem fail-closed:
 * 1) flag de código HML_HARD_DELETE_REMOTE_EXECUTION_ENABLED
 * 2) --execute + authorize flag + env confirm
 * 3) project ref
 * 4) Portal Master acting → bloqueado salvo autorização Master formal
 * 5) membership Super Admin comprovada
 *
 * GUC / confirm NÃO autenticam.
 * Sem --execute → LOCAL_PLAN (só validação local / plano).
 */
export function decideHardDeleteAuthorization(input: AuthzInput): AuthzDecision {
  const authorizeFlag = input.argv.includes(HML_HARD_DELETE_AUTHORIZE_FLAG);
  const confirmEnv = input.env[HML_HARD_DELETE_CONFIRM_ENV]?.trim();
  const remoteEnabled =
    input.remoteExecutionEnabled ?? HML_HARD_DELETE_REMOTE_EXECUTION_ENABLED;
  const portalMasterAuthorized =
    input.portalMasterAuthorized ?? HML_HARD_DELETE_PORTAL_MASTER_AUTHORIZED;

  if (!input.executeRequested) {
    return {mode: 'LOCAL_PLAN', writeAuthorized: false};
  }

  if (!remoteEnabled) {
    return {
      mode: 'EXECUTE_BLOCKED',
      writeAuthorized: false,
      reason: 'remote_execution_disabled_in_code',
    };
  }

  if (!authorizeFlag || confirmEnv !== HML_HARD_DELETE_CONFIRM_VALUE) {
    return {
      mode: 'EXECUTE_BLOCKED',
      writeAuthorized: false,
      reason: 'incomplete_authorization_gates',
    };
  }

  if (input.projectRef !== HML_HARD_DELETE_PROJECT_REF) {
    return {
      mode: 'EXECUTE_BLOCKED',
      writeAuthorized: false,
      reason: 'project_ref_mismatch',
    };
  }

  if (input.isPortalMasterActing === true && !portalMasterAuthorized) {
    return {
      mode: 'EXECUTE_BLOCKED',
      writeAuthorized: false,
      reason: 'portal_master_not_authorized',
    };
  }

  if (input.isMembershipSuperAdmin !== true) {
    return {
      mode: 'EXECUTE_BLOCKED',
      writeAuthorized: false,
      reason: 'membership_super_admin_unproven',
    };
  }

  return {mode: 'EXECUTE', writeAuthorized: true};
}

export function projectRefFromSupabaseUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    const match = /^([a-z0-9]+)\.supabase\.co$/i.exec(host);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
