export type DatabaseErrorCategory =
  | 'unique_violation'
  | 'foreign_key_violation'
  | 'check_violation'
  | 'not_null_violation'
  | 'insufficient_privilege'
  | 'rls_or_permission'
  | 'raise_exception'
  | 'postgrest_no_rows'
  | 'unknown';

export type DatabaseErrorLike = {
  code?: string | null;
  message?: string | null;
};

function isUniqueViolation(error: {code?: string | null}): boolean {
  return error.code === '23505';
}

/**
 * Classifica apenas quando o código/mensagem comprova a categoria.
 * Não inventa "trigger" ou "RLS" sem evidência explícita.
 */
export function classifyDatabaseError(error: DatabaseErrorLike): DatabaseErrorCategory {
  const code = (error.code ?? '').trim();
  const message = (error.message ?? '').toLowerCase();

  if (code === '23505') return 'unique_violation';
  if (code === '23503') return 'foreign_key_violation';
  if (code === '23514') return 'check_violation';
  if (code === '23502') return 'not_null_violation';
  if (code === 'P0001') return 'raise_exception';
  if (code === 'PGRST116') return 'postgrest_no_rows';
  if (
    message.includes('row-level security') ||
    message.includes('violates row-level security')
  ) {
    return 'rls_or_permission';
  }
  if (code === '42501') return 'insufficient_privilege';

  return 'unknown';
}

/** Remove PII/segredos de textos de erro antes de logar ou anexar a diagnósticos. */
export function sanitizeDatabaseErrorText(value: string): string {
  return value
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[email]')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, '[jwt]')
    .replace(/\bsb_[a-z]+_[A-Za-z0-9_]+/g, '[key]')
    .replace(/\b(password|senha|token)\s*[:=]\s*\S+/gi, '[redacted]')
    .replace(/\b(service_role|SUPABASE_SERVICE_ROLE_KEY)\b/gi, '[redacted]')
    // CPF com ou sem máscara (11 dígitos)
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf]')
    // Sequências longas de dígitos (CNH / documentos) — 9+ dígitos
    .replace(/\b\d{9,}\b/g, '[digits]')
    .slice(0, 240);
}

export function formatSafeDatabaseDiagnostic(error: DatabaseErrorLike): string {
  const code = (error.code ?? '').trim() || 'none';
  const category = classifyDatabaseError(error);
  const message = sanitizeDatabaseErrorText(error.message ?? '').trim();
  return message
    ? `db_error code=${code} category=${category} message=${message}`
    : `db_error code=${code} category=${category}`;
}

export function mapDatabaseError(error: {code?: string; message: string}): string {
  if (isUniqueViolation(error)) {
    if (error.message.includes('idx_companies_slug')) {
      return 'Este slug já está em uso.';
    }
    if (error.message.includes('idx_companies_tax_id_active')) {
      return 'Este CNPJ já está cadastrado.';
    }
    if (error.message.includes('idx_branches_company_code_active')) {
      return 'Este código de filial já está em uso.';
    }
    if (error.message.includes('idx_vehicles_company_plate_active')) {
      return 'Esta placa já está cadastrada nesta empresa.';
    }
    if (error.message.includes('idx_drivers_company_cpf_active')) {
      return 'Este CPF já está cadastrado nesta empresa.';
    }
    if (error.message.includes('idx_drivers_company_cnh_active')) {
      return 'Esta CNH já está cadastrada nesta empresa.';
    }
    return 'Já existe um registro com estes dados.';
  }

  return 'Não foi possível concluir a operação.';
}

/**
 * Erro de banco com mensagem de produto inalterada + diagnóstico técnico sanitizado.
 * `message` permanece igual a `mapDatabaseError` para não mudar o UX do app.
 */
export class MappedDatabaseError extends Error {
  readonly code: string | null;
  readonly category: DatabaseErrorCategory;
  readonly safeDiagnostic: string;
  readonly userMessage: string;

  constructor(error: DatabaseErrorLike) {
    const rawMessage = error.message ?? '';
    const userMessage = mapDatabaseError({
      code: error.code ?? undefined,
      message: rawMessage,
    });
    super(userMessage);
    this.name = 'MappedDatabaseError';
    this.userMessage = userMessage;
    this.code = (error.code ?? '').trim() || null;
    this.category = classifyDatabaseError(error);
    this.safeDiagnostic = formatSafeDatabaseDiagnostic(error);
  }
}

export function toMappedDatabaseError(error: DatabaseErrorLike): MappedDatabaseError {
  return new MappedDatabaseError(error);
}

/** Motivo de abort sanitizado para seed/logs (sem PII). */
export function formatAbortReasonFromUnknown(error: unknown): string {
  if (error instanceof MappedDatabaseError) {
    return `${error.userMessage} [${error.safeDiagnostic}]`;
  }
  if (error instanceof Error) {
    return sanitizeDatabaseErrorText(error.message);
  }
  return sanitizeDatabaseErrorText(String(error));
}
