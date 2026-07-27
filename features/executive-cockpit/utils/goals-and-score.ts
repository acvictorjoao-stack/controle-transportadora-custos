import type {
  CockpitMetricSnapshot,
  ExecutiveGoals,
  GoalProgressItem,
  OperationalScore,
} from '../types';
import {
  EXECUTIVE_GOAL_LABELS,
  EXECUTIVE_GOAL_METRICS,
  EXECUTIVE_GOAL_UNITS,
} from '../types';
import {formatGoalValue} from './format';
import {
  classifyAgainstGoal,
  progressAgainstGoal,
} from './semaphore';

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function scoreFromProgress(progress: number | null): number {
  if (progress == null) return 50;
  return clamp(progress);
}

function scoreSla(sla: number | null): number | null {
  if (sla == null) return null;
  return clamp(sla);
}

function scoreLeadTime(leadTime: number | null, goal: number | null): number | null {
  if (leadTime == null || goal == null || goal <= 0) return null;
  return clamp((goal / leadTime) * 100);
}

function scoreMargin(margin: number | null): number | null {
  if (margin == null || !Number.isFinite(margin)) return null;
  return clamp(margin * 2.5);
}

function scoreOccurrences(count: number, tripCount: number): number | null {
  if (tripCount <= 0) return null;
  const rate = count / tripCount;
  if (rate <= 0.05) return 95;
  if (rate <= 0.15) return 75;
  if (rate <= 0.3) return 55;
  return clamp(40 - rate * 40);
}

function scoreGoalsFulfillment(goals: GoalProgressItem[]): number | null {
  const withProgress = goals.filter((goal) => goal.progressPercent != null);
  if (withProgress.length === 0) return null;
  const avg =
    withProgress.reduce((sum, goal) => sum + (goal.progressPercent ?? 0), 0) /
    withProgress.length;
  return clamp(avg);
}

export function buildGoalProgress(
  snapshot: CockpitMetricSnapshot,
  goals: ExecutiveGoals,
): GoalProgressItem[] {
  const actualByMetric: Record<string, number | null> = {
    receita: snapshot.receita,
    lucro: snapshot.lucro,
    margem: snapshot.margem,
    sla: snapshot.sla,
    leadTime: snapshot.leadTime,
    custoKm: snapshot.custoKm,
    receitaKm: snapshot.receitaKm,
    lucroKm: snapshot.lucroKm,
  };

  return EXECUTIVE_GOAL_METRICS.map((metric) => {
    const goal = goals[metric] ?? null;
    const actual = actualByMetric[metric] ?? null;
    return {
      metric,
      label: EXECUTIVE_GOAL_LABELS[metric],
      goal,
      actual,
      formattedGoal: formatGoalValue(metric, goal),
      formattedActual: formatGoalValue(metric, actual),
      progressPercent: progressAgainstGoal(actual, goal, metric),
      status: classifyAgainstGoal(actual, goal, metric),
      unit: EXECUTIVE_GOAL_UNITS[metric],
    };
  });
}

/**
 * Índice único 0–100.
 * Pesos: SLA 25, Lead Time 15, Margem 25, Ocorrências 15, Metas 20.
 * Componentes sem base real são excluídos (não inventa nota).
 */
export function buildOperationalScore(
  snapshot: CockpitMetricSnapshot,
  goalsProgress: GoalProgressItem[],
  goals: ExecutiveGoals,
): OperationalScore {
  const breakdown = [
    {
      id: 'sla',
      label: 'SLA',
      score: scoreSla(snapshot.sla),
      weight: 25,
    },
    {
      id: 'leadTime',
      label: 'Lead Time',
      score: scoreLeadTime(snapshot.leadTime, goals.leadTime ?? null),
      weight: 15,
    },
    {
      id: 'margem',
      label: 'Margem',
      score: scoreMargin(snapshot.margem),
      weight: 25,
    },
    {
      id: 'ocorrencias',
      label: 'Ocorrências',
      score: scoreOccurrences(snapshot.ocorrencias, snapshot.tripCount),
      weight: 15,
    },
    {
      id: 'metas',
      label: 'Cumprimento de metas',
      score: scoreGoalsFulfillment(goalsProgress),
      weight: 20,
    },
  ];

  const usable = breakdown.filter((item) => item.score != null);
  if (usable.length === 0) {
    return {
      value: null,
      label: 'Sem dados',
      breakdown,
    };
  }

  const totalWeight = usable.reduce((sum, item) => sum + item.weight, 0);
  const value = Math.round(
    usable.reduce((sum, item) => sum + (item.score as number) * item.weight, 0) /
      totalWeight,
  );

  let label = 'Atenção';
  if (value >= 85) label = 'Excelente';
  else if (value >= 70) label = 'Bom';
  else if (value < 50) label = 'Crítico';

  return {value, label, breakdown};
}

export function averageGoalProgress(goalsProgress: GoalProgressItem[]): number {
  return scoreFromProgress(
    (() => {
      const withProgress = goalsProgress.filter((g) => g.progressPercent != null);
      if (withProgress.length === 0) return null;
      return (
        withProgress.reduce((sum, g) => sum + (g.progressPercent ?? 0), 0) /
        withProgress.length
      );
    })(),
  );
}
