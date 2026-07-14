import type {z} from 'zod';

export function zodFieldErrors(issues: z.core.$ZodIssue[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

/** Monta mensagem legível a partir dos erros de campo Zod. */
export function zodValidationSummary(
  issues: z.core.$ZodIssue[],
  fallback = 'Verifique os campos do formulário.',
): string {
  const fieldErrors = zodFieldErrors(issues);
  const entries = Object.entries(fieldErrors);
  if (entries.length === 0) return fallback;
  if (entries.length === 1) {
    const [field, message] = entries[0];
    return `${message} (${field})`;
  }
  return entries.map(([field, message]) => `${field}: ${message}`).join(' · ');
}
