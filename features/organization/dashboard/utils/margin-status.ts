export type MarginStatus = 'excelente' | 'atencao' | 'critica';

export const MARGIN_STATUS_LABELS: Record<MarginStatus, string> = {
  excelente: 'Excelente',
  atencao: 'Atenção',
  critica: 'Crítico',
};

export const MARGIN_STATUS_EMOJI: Record<MarginStatus, string> = {
  excelente: '🟢',
  atencao: '🟡',
  critica: '🔴',
};

/** Limiares de margem operacional (apresentação — não altera regras financeiras). */
export const MARGIN_STATUS_THRESHOLDS = {
  excelenteMinPercent: 20,
  atencaoMinPercent: 5,
} as const;

/**
 * Classifica a margem: ≥20% Excelente, ≥5% Atenção, demais Crítica.
 * Sem receita (null) → Crítica.
 */
export function classifyMarginStatus(
  marginPercent: number | null | undefined,
): MarginStatus {
  if (marginPercent == null || !Number.isFinite(marginPercent)) {
    return 'critica';
  }
  if (marginPercent >= MARGIN_STATUS_THRESHOLDS.excelenteMinPercent) {
    return 'excelente';
  }
  if (marginPercent >= MARGIN_STATUS_THRESHOLDS.atencaoMinPercent) {
    return 'atencao';
  }
  return 'critica';
}

export function formatMarginStatus(status: MarginStatus): string {
  return `${MARGIN_STATUS_EMOJI[status]} ${MARGIN_STATUS_LABELS[status]}`;
}
