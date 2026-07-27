'use client';

import {useState, useTransition} from 'react';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

import {updateExecutiveGoalsAction} from '../actions';
import type {ExecutiveGoalMetric, ExecutiveGoals} from '../types';
import {
  EXECUTIVE_GOAL_LABELS,
  EXECUTIVE_GOAL_METRICS,
  EXECUTIVE_GOAL_UNITS,
} from '../types';

export interface GoalsConfigFormProps {
  goals: ExecutiveGoals;
}

function unitHint(metric: ExecutiveGoalMetric): string {
  const unit = EXECUTIVE_GOAL_UNITS[metric];
  if (unit === 'percent') return '%';
  if (unit === 'minutes') return 'min';
  if (unit === 'perKm') return 'R$/km';
  return 'R$';
}

function GoalsConfigForm({goals}: GoalsConfigFormProps) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const metric of EXECUTIVE_GOAL_METRICS) {
      const value = goals[metric];
      initial[metric] = value == null ? '' : String(value);
    }
    return initial;
  });
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const payload: Record<string, number | null> = {};
      for (const metric of EXECUTIVE_GOAL_METRICS) {
        const raw = values[metric]?.trim() ?? '';
        payload[metric] = raw === '' ? null : Number(raw.replace(',', '.'));
      }
      const result = await updateExecutiveGoalsAction(payload);
      if (!result.success) {
        setMessage(result.error);
        return;
      }
      setMessage('Metas salvas.');
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Configurar metas
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {EXECUTIVE_GOAL_METRICS.map((metric) => (
          <label key={metric} className="block space-y-1 text-sm">
            <span className="text-muted-foreground">
              {EXECUTIVE_GOAL_LABELS[metric]} ({unitHint(metric)})
            </span>
            <Input
              type="number"
              step="any"
              value={values[metric] ?? ''}
              onChange={(event) =>
                setValues((prev) => ({...prev, [metric]: event.target.value}))
              }
              placeholder="Sem meta"
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={handleSave} disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar metas'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Cancelar
        </Button>
        {message && (
          <span className="text-sm text-muted-foreground">{message}</span>
        )}
      </div>
    </div>
  );
}

export {GoalsConfigForm};
