import {logError} from '@/lib/logging/error-logger';

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'NETWORK_ERROR'
  | 'SUPABASE_ERROR'
  | 'WEAK_PASSWORD'
  | 'RECOVERY_LINK_INVALID'
  | 'RATE_LIMITED'
  | 'UNKNOWN';

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(message: string, code: AuthErrorCode, cause?: unknown) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}

const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  INVALID_CREDENTIALS: 'E-mail ou senha inválidos.',
  USER_NOT_FOUND: 'Usuário não encontrado.',
  SESSION_EXPIRED: 'Sua sessão expirou. Faça login novamente.',
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet e tente novamente.',
  SUPABASE_ERROR: 'Não foi possível completar a autenticação. Tente novamente.',
  WEAK_PASSWORD:
    'A senha não atende aos requisitos mínimos. Use pelo menos 8 caracteres.',
  RECOVERY_LINK_INVALID:
    'Link de recuperação inválido ou expirado. Solicite um novo envio.',
  RATE_LIMITED: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  UNKNOWN: 'Ocorreu um erro inesperado. Tente novamente.',
};

export function getAuthErrorMessage(code: AuthErrorCode): string {
  return AUTH_ERROR_MESSAGES[code];
}

/**
 * Normaliza erros do Supabase Auth para AuthError com mensagens em português.
 */
export function normalizeAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) {
    return error;
  }

  if (error && typeof error === 'object') {
    const authError = error as {message?: string; code?: string; status?: number};

    const message = authError.message?.toLowerCase() ?? '';
    const code = authError.code?.toLowerCase() ?? '';

    if (
      code === 'invalid_credentials' ||
      message.includes('invalid login credentials')
    ) {
      return new AuthError(
        AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
        'INVALID_CREDENTIALS',
        error,
      );
    }

    if (message.includes('user not found') || code === 'user_not_found') {
      return new AuthError(
        AUTH_ERROR_MESSAGES.USER_NOT_FOUND,
        'USER_NOT_FOUND',
        error,
      );
    }

    if (
      code === 'weak_password' ||
      (message.includes('password') &&
        (message.includes('weak') ||
          message.includes('at least') ||
          message.includes('too short') ||
          message.includes('least 6')))
    ) {
      return new AuthError(
        AUTH_ERROR_MESSAGES.WEAK_PASSWORD,
        'WEAK_PASSWORD',
        error,
      );
    }

    if (
      code === 'otp_expired' ||
      code === 'flow_state_expired' ||
      message.includes('otp_expired') ||
      message.includes('token has expired') ||
      message.includes('email link is invalid') ||
      message.includes('invalid recovery')
    ) {
      return new AuthError(
        AUTH_ERROR_MESSAGES.RECOVERY_LINK_INVALID,
        'RECOVERY_LINK_INVALID',
        error,
      );
    }

    if (
      code === 'over_email_send_rate_limit' ||
      code === 'over_request_rate_limit' ||
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('for security purposes')
    ) {
      return new AuthError(
        AUTH_ERROR_MESSAGES.RATE_LIMITED,
        'RATE_LIMITED',
        error,
      );
    }

    if (
      message.includes('session') &&
      (message.includes('expired') || message.includes('missing'))
    ) {
      return new AuthError(
        AUTH_ERROR_MESSAGES.SESSION_EXPIRED,
        'SESSION_EXPIRED',
        error,
      );
    }

    if (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('failed to fetch')
    ) {
      return new AuthError(
        AUTH_ERROR_MESSAGES.NETWORK_ERROR,
        'NETWORK_ERROR',
        error,
      );
    }

    if (authError.message) {
      return new AuthError(
        AUTH_ERROR_MESSAGES.SUPABASE_ERROR,
        'SUPABASE_ERROR',
        error,
      );
    }
  }

  return new AuthError(AUTH_ERROR_MESSAGES.UNKNOWN, 'UNKNOWN', error);
}

export function logAuthError(error: unknown, context?: string): AuthError {
  const normalized = normalizeAuthError(error);

  logError(
    normalized,
    context ? `Auth: ${context}` : 'Auth',
  );
  return normalized;
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}
