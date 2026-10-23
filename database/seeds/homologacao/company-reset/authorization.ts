import {
  HML_COMPANY_RESET_AUTHORIZE_FLAG,
  HML_COMPANY_RESET_CONFIRM_ENV,
  HML_COMPANY_RESET_CONFIRM_VALUE,
  HML_COMPANY_RESET_PORTAL_MASTER_AUTHORIZED,
  HML_COMPANY_RESET_PROJECT_REF,
  HML_COMPANY_RESET_REMOTE_EXECUTION_ENABLED,
} from './constants';

export type CompanyResetEnv = Record<string, string | undefined>;

export type CompanyResetAuthzInput = {
  executeRequested: boolean;
  argv: string[];
  env: CompanyResetEnv;
  projectRef: string | null;
  isMembershipSuperAdmin: boolean | null;
  isPortalMasterActing?: boolean | null;
  portalMasterAuthorized?: boolean;
  remoteExecutionEnabled?: boolean;
};

export type CompanyResetAuthzDecision =
  | {mode: 'LOCAL_PLAN'; writeAuthorized: false}
  | {mode: 'EXECUTE_BLOCKED'; writeAuthorized: false; reason: string}
  | {mode: 'EXECUTE'; writeAuthorized: true};

/**
 * Gates fail-closed. GUC/confirm NÃO autenticam.
 * Sem --execute → LOCAL_PLAN.
 */
export function decideCompanyResetAuthorization(
  input: CompanyResetAuthzInput,
): CompanyResetAuthzDecision {
  const authorizeFlag = input.argv.includes(HML_COMPANY_RESET_AUTHORIZE_FLAG);
  const confirmEnv = input.env[HML_COMPANY_RESET_CONFIRM_ENV]?.trim();
  const remoteEnabled =
    input.remoteExecutionEnabled ?? HML_COMPANY_RESET_REMOTE_EXECUTION_ENABLED;
  const portalMasterAuthorized =
    input.portalMasterAuthorized ?? HML_COMPANY_RESET_PORTAL_MASTER_AUTHORIZED;

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

  if (!authorizeFlag || confirmEnv !== HML_COMPANY_RESET_CONFIRM_VALUE) {
    return {
      mode: 'EXECUTE_BLOCKED',
      writeAuthorized: false,
      reason: 'incomplete_authorization_gates',
    };
  }

  if (input.projectRef !== HML_COMPANY_RESET_PROJECT_REF) {
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
