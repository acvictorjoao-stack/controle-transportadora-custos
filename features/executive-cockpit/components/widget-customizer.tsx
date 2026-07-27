'use client';

import {Eye, EyeOff, ChevronDown, ChevronUp} from 'lucide-react';
import {useState, useTransition} from 'react';

import {Button} from '@/components/ui/button';

import {updateCockpitPreferencesAction} from '../actions';
import type {
  CockpitChartId,
  CockpitWidgetId,
  ExecutiveCockpitPreferences,
} from '../types';
import {
  ALL_COCKPIT_CHARTS,
  COCKPIT_CHART_LABELS,
  COCKPIT_WIDGET_LABELS,
} from '../types';

export interface WidgetCustomizerProps {
  preferences: ExecutiveCockpitPreferences;
}

function WidgetCustomizer({preferences}: WidgetCustomizerProps) {
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState(preferences.widgetOrder);
  const [hidden, setHidden] = useState(preferences.hiddenWidgets);
  const [charts, setCharts] = useState(preferences.favoriteCharts);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function move(id: CockpitWidgetId, direction: -1 | 1) {
    setOrder((prev) => {
      const index = prev.indexOf(id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  }

  function toggleHidden(id: CockpitWidgetId) {
    setHidden((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function toggleChart(id: CockpitChartId) {
    setCharts((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateCockpitPreferencesAction({
        widgetOrder: order,
        hiddenWidgets: hidden,
        favoriteCharts: charts,
      });
      if (!result.success) {
        setMessage(result.error);
        return;
      }
      setMessage('Preferências salvas.');
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Personalizar widgets
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <h3 className="text-sm font-semibold">Personalizar cockpit</h3>
      <p className="text-xs text-muted-foreground">
        Mova, oculte cards e escolha gráficos favoritos. Preferências por usuário.
      </p>

      <ul className="mt-3 space-y-2">
        {order.map((id) => {
          const isHidden = hidden.includes(id);
          return (
            <li
              key={id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
            >
              <span className={isHidden ? 'text-muted-foreground line-through' : ''}>
                {COCKPIT_WIDGET_LABELS[id]}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => move(id, -1)}
                  aria-label="Mover para cima"
                >
                  <ChevronUp />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => move(id, 1)}
                  aria-label="Mover para baixo"
                >
                  <ChevronDown />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => toggleHidden(id)}
                  aria-label={isHidden ? 'Mostrar' : 'Ocultar'}
                >
                  {isHidden ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium">Gráficos favoritos</p>
        <div className="flex flex-wrap gap-2">
          {ALL_COCKPIT_CHARTS.map((id) => {
            const active = charts.includes(id);
            return (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                onClick={() => toggleChart(id)}
              >
                {COCKPIT_CHART_LABELS[id]}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={handleSave} disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar preferências'}
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

export {WidgetCustomizer};
