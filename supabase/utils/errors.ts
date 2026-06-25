import {SupabaseEnvError} from './env';

export type SupabaseErrorCode =
  | 'CONFIG'
  | 'CONNECTION'
  | 'UNKNOWN';

export class SupabaseConnectionError extends Error {
  readonly code: SupabaseErrorCode = 'CONNECTION';

  constructor(message = 'Não foi possível conectar ao Supabase.') {
    super(message);
    this.name = 'SupabaseConnectionError';
  }
}

export function isSupabaseEnvError(error: unknown): error is SupabaseEnvError {
  return error instanceof SupabaseEnvError;
}

export function isSupabaseConnectionError(
  error: unknown,
): error is SupabaseConnectionError {
  return error instanceof SupabaseConnectionError;
}

/**
 * Normaliza erros do Supabase para mensagens consistentes em logs e UI.
 */
export function formatSupabaseError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Erro desconhecido ao comunicar com o Supabase.';
}

/**
 * Extrai código de erro padronizado para tratamento em camadas superiores.
 */
export function getSupabaseErrorCode(error: unknown): SupabaseErrorCode {
  if (isSupabaseEnvError(error)) return 'CONFIG';
  if (isSupabaseConnectionError(error)) return 'CONNECTION';
  return 'UNKNOWN';
}
