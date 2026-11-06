import Link from 'next/link';

import {Badge} from '@/components/ui/badge';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {ROUTES} from '@/constants/routes/paths';
import type {FinancialEntry} from '@/features/financial/types';
import {formatCurrencyBr, formatDateBr} from '@/features/financial/utils/financial-format';
import {
  getReceivableBalance,
  getReceivableEffectiveAmount,
  isPartiallyReceived,
} from '@/features/financial/utils/receivable-balance';

import type {Trip} from '../types';
import {TRIP_PAYMENT_CONDITION_LABELS} from '../types';
import {isLegacyFreightTrip} from '../utils/trip-payment';

function statusOf(entry: FinancialEntry): {
  label: string;
  variant: 'success' | 'warning' | 'secondary' | 'outline';
} {
  if (entry.entryStatus === 'paid') return {label: 'Recebido', variant: 'success'};
  if (entry.entryStatus === 'cancelled') return {label: 'Cancelado', variant: 'outline'};
  if (isPartiallyReceived(entry)) return {label: 'Parcial', variant: 'warning'};
  return {label: 'Pendente', variant: 'secondary'};
}

function TripReceivableCard({
  trip,
  receivables,
}: {
  trip: Trip;
  receivables: FinancialEntry[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Condição de Pagamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {trip.paymentCondition ? (
          <p className="text-muted-foreground">
            {TRIP_PAYMENT_CONDITION_LABELS[trip.paymentCondition]}
            {trip.paymentDueDate ? ` · Vencimento ${formatDateBr(trip.paymentDueDate)}` : ''}
          </p>
        ) : (
          <p className="text-muted-foreground">
            {isLegacyFreightTrip(trip)
              ? 'Viagem anterior à cobrança automática.'
              : 'Sem cobrança para esta viagem.'}
          </p>
        )}

        {receivables.map((entry) => {
          const status = statusOf(entry);
          return (
            <Link
              key={entry.id}
              href={ROUTES.contasAReceberDetail(entry.id)}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/40"
            >
              <span className="font-medium">{entry.description ?? 'Título do frete'}</span>
              <Badge variant={status.variant}>{status.label}</Badge>
              <span className="w-full text-muted-foreground">
                Valor {formatCurrencyBr(getReceivableEffectiveAmount(entry), entry.currency)}
                {' · '}
                Saldo{' '}
                <span className="font-financial font-medium text-foreground">
                  {formatCurrencyBr(getReceivableBalance(entry), entry.currency)}
                </span>
              </span>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

export {TripReceivableCard};
