export {
  getSupabaseEnv,
  validateSupabaseEnv,
  SupabaseEnvError,
  type SupabaseEnv,
} from './env';

export {supabaseConfig, getSupabaseHealthUrl} from './config';

export {
  SupabaseConnectionError,
  formatSupabaseError,
  getSupabaseErrorCode,
  isSupabaseAccessBlockedError,
  isSupabaseConnectionError,
  isSupabaseEnvError,
  type SupabaseErrorCode,
} from './errors';

export {
  assertSupabaseAccessAllowed,
  currentSupabaseAccessDecision,
  PRODUCTION_SUPABASE_PROJECT_REFS,
  SupabaseAccessBlockedError,
  type SupabaseAccessContext,
  type SupabaseAccessDecision,
} from './deployment-guard';

export {
  getBrowserSupabaseClient,
  getServerSupabaseClient,
} from './get-client';
