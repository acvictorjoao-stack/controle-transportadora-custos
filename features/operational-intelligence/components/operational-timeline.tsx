'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {cn} from '@/lib/utils';

import type {OperationalTimelineTrip} from '../types';

export interface OperationalTimelineProps {
  timeline: OperationalTimelineTrip | null;
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function OperationalTimeline({timeline}: OperationalTimelineProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Timeline Operacional</CardTitle>
        <CardDescription>
          {timeline
            ? `${timeline.tripNumber}${
                timeline.customerName ? ` · ${timeline.customerName}` : ''
              }`
            : 'Sem viagem em destaque'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!timeline ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma viagem encontrada para o período.
          </p>
        ) : (
          <ol className="space-y-0">
            {timeline.events.map((event, index) => (
              <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
                {index < timeline.events.length - 1 ? (
                  <span className="absolute left-[0.55rem] top-5 h-[calc(100%-0.75rem)] w-px bg-border" />
                ) : null}
                <span
                  className={cn(
                    'relative z-10 mt-1 size-2.5 shrink-0 rounded-full',
                    event.done ? 'bg-sky-500' : 'bg-muted-foreground/40',
                  )}
                />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(event.at)}
                  </p>
                  <p
                    className={cn(
                      'text-sm font-medium',
                      !event.done && 'text-muted-foreground',
                    )}
                  >
                    {event.label}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export {OperationalTimeline};
