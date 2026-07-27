'use client';

import * as React from 'react';
import Link from 'next/link';

import {Section} from '@/components/layout/section';
import {buttonVariants} from '@/components/ui/button';
import {ROUTES} from '@/constants/routes/paths';
import {TRIP_STATUS_LABELS} from '@/features/trips/types';
import {cn} from '@/lib/utils';

import type {DrillDownBranchNode} from '../types';

export interface OperationalDrillDownProps {
  nodes: DrillDownBranchNode[];
}

function OperationalDrillDown({nodes}: OperationalDrillDownProps) {
  const [branchId, setBranchId] = React.useState<string | null>(null);
  const [customerId, setCustomerId] = React.useState<string | null>(null);
  const [routeId, setRouteId] = React.useState<string | null>(null);
  const [tripId, setTripId] = React.useState<string | null>(null);

  const branch = nodes.find((item) => item.id === branchId) ?? null;
  const customer = branch?.customers.find((item) => item.id === customerId) ?? null;
  const route = customer?.routes.find((item) => item.id === routeId) ?? null;
  const trip = route?.trips.find((item) => item.id === tripId) ?? null;

  return (
    <Section
      title="Drill-down operacional"
      description="Filial → Cliente → Rota → Viagem → Timeline → Ocorrências."
    >
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel
          title="Filiais"
          empty="Sem filiais."
          items={nodes.map((item) => ({
            id: item.id,
            label: item.label,
            meta: `${item.customers.length} cliente(s)`,
          }))}
          selectedId={branchId}
          onSelect={(id) => {
            setBranchId(id);
            setCustomerId(null);
            setRouteId(null);
            setTripId(null);
          }}
        />
        <Panel
          title="Clientes"
          empty="Selecione uma filial."
          items={(branch?.customers ?? []).map((item) => ({
            id: item.id,
            label: item.label,
            meta: `${item.routes.length} rota(s)`,
          }))}
          selectedId={customerId}
          onSelect={(id) => {
            setCustomerId(id);
            setRouteId(null);
            setTripId(null);
          }}
        />
        <Panel
          title="Rotas"
          empty="Selecione um cliente."
          items={(customer?.routes ?? []).map((item) => ({
            id: item.id,
            label: item.label,
            meta: `${item.trips.length} viagem(ns)`,
          }))}
          selectedId={routeId}
          onSelect={(id) => {
            setRouteId(id);
            setTripId(null);
          }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Viagens"
          empty="Selecione uma rota."
          items={(route?.trips ?? []).map((item) => ({
            id: item.id,
            label: item.tripNumber,
            meta: `${TRIP_STATUS_LABELS[item.status]}${
              item.delayed ? ' · Atraso' : ''
            }`,
          }))}
          selectedId={tripId}
          onSelect={setTripId}
        />

        <div className="rounded-xl border border-border bg-card p-4">
          {!trip ? (
            <p className="text-sm text-muted-foreground">
              Selecione uma viagem para ver timeline e ocorrências.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{trip.tripNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {TRIP_STATUS_LABELS[trip.status]}
                    {trip.delayed ? ' · Em atraso' : ''}
                  </p>
                </div>
                <Link
                  href={ROUTES.viagemDetail(trip.id)}
                  className={cn(buttonVariants({variant: 'outline', size: 'sm'}))}
                >
                  Abrir viagem
                </Link>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Timeline
                </p>
                <ul className="space-y-2">
                  {trip.timeline.map((event) => (
                    <li key={event.id} className="text-sm">
                      <span className="text-muted-foreground">
                        {event.at
                          ? new Date(event.at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </span>{' '}
                      {event.label}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Ocorrências
                </p>
                {trip.occurrences.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sem ocorrências nesta viagem.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {trip.occurrences.map((item) => (
                      <li key={item.id} className="text-sm">
                        <span className="font-medium">{item.type}</span>
                        {item.description ? ` — ${item.description}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

function Panel({
  title,
  empty,
  items,
  selectedId,
  onSelect,
}: {
  title: string;
  empty: string;
  items: Array<{id: string; label: string; meta: string}>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  'flex w-full flex-col rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                  selectedId === item.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted/60',
                )}
              >
                <span className="font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.meta}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export {OperationalDrillDown};
