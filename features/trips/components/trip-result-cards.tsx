import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

import type {TripFinancialSummary} from '../types/trip-financial-summary';
import {buildTripResultView} from '../utils/trip-result-view';

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
}

export interface TripResultCardsProps {
  summary: TripFinancialSummary | null;
  /** Frete do cadastro, usado só quando o resumo não está disponível. */
  fallbackFreight: number;
}

/**
 * Frete, custo direto e resultado da viagem, lidos de `trip_financial_summary`
 * — a mesma conta da DRE.
 */
export function TripResultCards({summary, fallbackFreight}: TripResultCardsProps) {
  const view = buildTripResultView(summary, fallbackFreight);

  const unavailableText =
    view.state === 'restricted'
      ? 'Sem acesso ao financeiro'
      : view.state === 'unavailable'
        ? 'Indisponível no momento'
        : null;

  return (
    <div className="space-y-2">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Frete</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatMoney(view.freight)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Custos da viagem</CardTitle>
          </CardHeader>
          <CardContent>
            {view.state === 'ready' ? (
              <>
                <p className="text-2xl font-semibold">{formatMoney(view.directCosts)}</p>
                {view.costLines.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {view.costLines
                      .map((line) => `${line.label} ${formatMoney(line.amount)}`)
                      .join(' · ')}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{unavailableText}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            {view.state === 'ready' ? (
              <>
                <p
                  className={`text-2xl font-semibold ${view.result < 0 ? 'text-destructive' : ''}`}
                >
                  {formatMoney(view.result)}
                </p>
                {view.marginPercent !== null && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Margem {view.marginPercent.toLocaleString('pt-BR', {maximumFractionDigits: 1})}%
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{unavailableText}</p>
            )}
          </CardContent>
        </Card>
      </div>
      {view.state === 'ready' && view.unpostedNotice && (
        <p className="text-sm text-amber-700 dark:text-amber-400">{view.unpostedNotice}</p>
      )}
      {view.state === 'ready' && view.advanceNotice && (
        <p className="text-sm text-muted-foreground">{view.advanceNotice}</p>
      )}
    </div>
  );
}
