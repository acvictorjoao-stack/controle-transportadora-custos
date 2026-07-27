import {
  EXECUTIVE_GOAL_LOWER_IS_BETTER,
  type ExecutiveGoalMetric,
} from '../types';
import type {SemaphoreStatus} from '../types';

export const SEMAPHORE_EMOJI: Record<SemaphoreStatus, string> = {
  acima: '🟢',
  atencao: '🟡',
  abaixo: '🔴',
  indefinido: '⚪',
};

export const SEMAPHORE_LABELS: Record<SemaphoreStatus, string> = {
  acima: 'Acima da meta',
  atencao: 'Atenção',
  abaixo: 'Abaixo da meta',
  indefinido: 'Sem meta',
};

/**
 * Classifica semáforo vs meta configurada.
 * Sem meta explícita → `indefinido` (não inventa limiares).
 */
export function classifyAgainstGoal(
  actual: number | null | undefined,
  goal: number | null | undefined,
  metric: ExecutiveGoalMetric,
): SemaphoreStatus {
  if (actual == null || !Number.isFinite(actual)) return 'indefinido';

  if (goal == null || !Number.isFinite(goal) || goal === 0) {
    return 'indefinido';
  }

  const lowerIsBetter = EXECUTIVE_GOAL_LOWER_IS_BETTER.has(metric);

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

export function statusLabelFor(
  status: SemaphoreStatus,
  metric: ExecutiveGoalMetric,
): string {
  if (status === 'indefinido') return SEMAPHORE_LABELS.indefinido;
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
