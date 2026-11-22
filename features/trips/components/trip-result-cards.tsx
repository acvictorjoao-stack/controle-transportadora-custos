import {AlertTriangle, Info} from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';

import {Alert, AlertDescription} from '@/components/ui/alert';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

import type {TripFinancialSummary} from '../types/trip-financial-summary';
import {buildTripResultView} from '../utils/trip-result-view';

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
}

function formatPercent(value: number) {
  return `${value.toLocaleString('pt-BR', {maximumFractionDigits: 1})}%`;
}

export interface TripResultCardsProps {
  summary: TripFinancialSummary | null;
  /** Frete do cadastro, usado só quando o resumo não está disponível. */
  fallbackFreight: number;
  /**
   * Fase 2.2.4 — link para a Rentabilidade por Viagem, onde a viagem aparece
   * também com o rateio dos custos do veículo por KM.
   */
  allocatedViewHref?: string | null;
}

function MetricCard({
  title,
  children,
  footnote,
}: {
  title: string;
  children: React.ReactNode;
  footnote?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {children}
        {footnote ? <div className="mt-1 text-xs text-muted-foreground">{footnote}</div> : null}
      </CardContent>
    </Card>
  );
}

/**
 * Frete, custos, despesas de viagem, resultado e margem, lidos de
 * `trip_financial_summary` — a mesma conta da DRE. Cada custo aparece num só
 * grupo: despesas da aba não entram de novo em combustível, manutenção ou pneus.
 */
export function TripResultCards({summary, fallbackFreight, allocatedViewHref = null}: TripResultCardsProps) {
  const view = buildTripResultView(summary, fallbackFreight);

  const unavailableText =
    view.state === 'restricted'
      ? 'Sem acesso ao financeiro'
      : view.state === 'unavailable'
        ? 'Indisponível no momento'
        : null;

  const unavailable = <p className="text-sm text-muted-foreground">{unavailableText}</p>;

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard title="Frete">
          <p className="text-2xl font-semibold">{formatMoney(view.freight)}</p>
        </MetricCard>

        <MetricCard
          title="Custos operacionais"
          footnote={
            view.state === 'ready' && view.operationalLines.length > 0
              ? view.operationalLines.map((line) => `${line.label} ${formatMoney(line.amount)}`).join(' · ')
              : undefined
          }
        >
          {view.state === 'ready' ? (
            <p className="text-2xl font-semibold">{formatMoney(view.operationalCosts)}</p>
          ) : (
            unavailable
          )}
        </MetricCard>

        <MetricCard
          title="Despesas de viagem"
          footnote={view.state === 'ready' ? 'Pedágio, alimentação e outras da aba Despesas' : undefined}
        >
          {view.state === 'ready' ? (
            <p className="text-2xl font-semibold">{formatMoney(view.tripExpenseCosts)}</p>
          ) : (
            unavailable
          )}
        </MetricCard>

        <MetricCard
          title="Resultado"
          footnote={
            view.state === 'ready' ? (
              <>
                Só custos lançados na viagem.
                {allocatedViewHref ? (
                  <>
                    {' '}
                    <Link href={allocatedViewHref} className="underline underline-offset-2">
                      Ver com rateio do veículo
                    </Link>
                  </>
                ) : null}
              </>
            ) : undefined
          }
        >
          {view.state === 'ready' ? (
            <p className={`text-2xl font-semibold ${view.result < 0 ? 'text-destructive' : ''}`}>
              {formatMoney(view.result)}
            </p>
          ) : (
            unavailable
          )}
        </MetricCard>

        <MetricCard title="Margem">
          {view.state === 'ready' ? (
            <p
              className={`text-2xl font-semibold ${
                view.marginPercent !== null && view.marginPercent < 0 ? 'text-destructive' : ''
              }`}
            >
              {view.marginPercent === null ? '—' : formatPercent(view.marginPercent)}
            </p>
          ) : (
            unavailable
          )}
        </MetricCard>
      </div>

      {view.state === 'ready' && view.unpostedNotice && (
        <Alert variant="warning">
          <AlertTriangle />
          <AlertDescription>
            {view.unpostedNotice} Abra a aba Despesas e informe quem pagou.
          </AlertDescription>
        </Alert>
      )}
      {view.state === 'ready' && view.advanceNotice && (
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          {view.advanceNotice}
        </p>
      )}
    </div>
  );
}
