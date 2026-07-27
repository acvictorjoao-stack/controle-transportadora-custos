import {
  EXECUTIVE_GOAL_LOWER_IS_BETTER,
  type ExecutiveGoalMetric,
} from '../types';
import type {SemaphoreStatus} from '../types';

export const SEMAPHORE_EMOJI: Record<SemaphoreStatus, string> = {
  acima: '🟢',
  atencao: '🟡',
  abaixo: '🔴',
};

export const SEMAPHORE_LABELS: Record<SemaphoreStatus, string> = {
  acima: 'Acima da meta',
  atencao: 'Atenção',
  abaixo: 'Abaixo da meta',
};

/** Limiares padrão quando não há meta configurada. */
const FALLBACK_THRESHOLDS: Partial<
  Record<ExecutiveGoalMetric, {good: number; warn: number; lowerIsBetter?: boolean}>
> = {
  margem: {good: 20, warn: 5},
  sla: {good: 90, warn: 75},
  leadTime: {good: 240, warn: 360, lowerIsBetter: true},
};

/**
 * Classifica semáforo vs meta.
 * - Higher-is-better: ≥100% verde, ≥90% amarelo, senão vermelho
 * - Lower-is-better: ≤100% verde, ≤110% amarelo, senão vermelho
 */
export function classifyAgainstGoal(
  actual: number | null | undefined,
  goal: number | null | undefined,
  metric: ExecutiveGoalMetric,
): SemaphoreStatus {
  if (actual == null || !Number.isFinite(actual)) return 'abaixo';

  const lowerIsBetter = EXECUTIVE_GOAL_LOWER_IS_BETTER.has(metric);

  if (goal != null && Number.isFinite(goal) && goal !== 0) {
    if (lowerIsBetter) {
      const ratio = actual / goal;
      if (ratio <= 1) return 'acima';
      if (ratio <= 1.1) return 'atencao';
      return 'abaixo';
    }

    const ratio = actual / goal;
    if (ratio >= 1) return 'acima';
    if (ratio >= 0.9) return 'atencao';
    return 'abaixo';
  }

  const fallback = FALLBACK_THRESHOLDS[metric];
  if (!fallback) return 'atencao';

  if (fallback.lowerIsBetter) {
    if (actual <= fallback.good) return 'acima';
    if (actual <= fallback.warn) return 'atencao';
    return 'abaixo';
  }

  if (actual >= fallback.good) return 'acima';
  if (actual >= fallback.warn) return 'atencao';
  return 'abaixo';
}

export function statusLabelFor(
  status: SemaphoreStatus,
  metric: ExecutiveGoalMetric,
): string {
  if (metric === 'sla' && status === 'acima') return 'Excelente';
  if (metric === 'leadTime' && status === 'atencao') return 'Tendência de alta';
  if (metric === 'lucro' && status === 'atencao') return 'Atenção';
  return SEMAPHORE_LABELS[status];
}

/**
 * Progresso 0–100+ em relação à meta.
 * Lower-is-better: 100% quando actual ≤ goal.
 */
export function progressAgainstGoal(
  actual: number | null | undefined,
  goal: number | null | undefined,
  metric: ExecutiveGoalMetric,
): number | null {
  if (
    actual == null ||
    goal == null ||
    !Number.isFinite(actual) ||
    !Number.isFinite(goal) ||
    goal === 0
  ) {
    return null;
  }

  if (EXECUTIVE_GOAL_LOWER_IS_BETTER.has(metric)) {
    if (actual <= 0) return 100;
    return Math.max(0, Math.round((goal / actual) * 100));
  }

  return Math.max(0, Math.round((actual / goal) * 100));
}
