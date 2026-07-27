import {
  DEFAULT_EXECUTIVE_GOALS,
  EXECUTIVE_GOAL_METRICS,
  type ExecutiveGoalMetric,
  type ExecutiveGoals,
} from '../types';

function readNullableNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Lê metas de `companies.settings.executive_goals`. */
export function mapExecutiveGoals(rawSettings: unknown): ExecutiveGoals {
  const settings =
    rawSettings && typeof rawSettings === 'object'
      ? (rawSettings as Record<string, unknown>)
      : {};
  const rawGoals = settings.executive_goals ?? settings.executiveGoals;
  const goalsObj =
    rawGoals && typeof rawGoals === 'object'
      ? (rawGoals as Record<string, unknown>)
      : {};

  const mapped: ExecutiveGoals = {...DEFAULT_EXECUTIVE_GOALS};
  for (const metric of EXECUTIVE_GOAL_METRICS) {
    if (metric in goalsObj) {
      mapped[metric] = readNullableNumber(goalsObj[metric]);
    }
  }
  return mapped;
}

export function executiveGoalsToDb(goals: ExecutiveGoals): Record<string, unknown> {
  const payload: Record<string, number | null> = {};
  for (const metric of EXECUTIVE_GOAL_METRICS) {
    const value = goals[metric];
    payload[metric] =
      value == null || !Number.isFinite(value) ? null : value;
  }
  return payload;
}

export function mergeExecutiveGoalsIntoSettings(
  existing: Record<string, unknown>,
  goals: ExecutiveGoals,
): Record<string, unknown> {
  return {
    ...existing,
    executive_goals: executiveGoalsToDb(goals),
  };
}

export function parseGoalsInput(
  input: Partial<Record<ExecutiveGoalMetric, unknown>>,
): ExecutiveGoals {
  const result: ExecutiveGoals = {};
  for (const metric of EXECUTIVE_GOAL_METRICS) {
    if (metric in input) {
      result[metric] = readNullableNumber(input[metric]);
    }
  }
  return result;
}
