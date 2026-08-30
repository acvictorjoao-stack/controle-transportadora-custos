const COMPETENCE_MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const COMPETENCE_DATE_PATTERN = /^(\d{4})-(\d{2})-\d{2}$/;

/**
 * Normaliza a competência para o primeiro dia do mês (formato aceito pelo banco).
 * Aceita `YYYY-MM` (input type=month) e `YYYY-MM-DD`.
 */
export function normalizeCompetence(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  const match =
    COMPETENCE_MONTH_PATTERN.exec(trimmed) ?? COMPETENCE_DATE_PATTERN.exec(trimmed);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`;
}

/** Converte a competência armazenada para o valor de um input type=month. */
export function competenceToMonthInput(value: string | null | undefined): string {
  const normalized = normalizeCompetence(value);
  return normalized ? normalized.slice(0, 7) : '';
}

/** Exibe a competência como MM/AAAA. */
export function formatCompetenceBr(value: string | null | undefined): string {
  const normalized = normalizeCompetence(value);
  if (!normalized) return '—';
  const [year, month] = normalized.split('-');
  return `${month}/${year}`;
}

/** Último dia da competência — usado como data do lançamento financeiro. */
export function competenceEndDate(value: string): string {
  const normalized = normalizeCompetence(value);
  if (!normalized) return value.slice(0, 10);

  const year = Number(normalized.slice(0, 4));
  const month = Number(normalized.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${normalized.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`;
}

/** Competência atual, pronta para o input type=month. */
export function currentCompetenceMonthInput(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}
