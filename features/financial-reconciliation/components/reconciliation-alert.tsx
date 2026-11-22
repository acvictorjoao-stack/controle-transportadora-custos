import Link from 'next/link';

import {Alert, AlertDescription} from '@/components/ui/alert';
import {ROUTES} from '@/constants/routes/paths';

import type {ReconciliationAlertCounts} from '../types';

/** Selo do Dashboard financeiro: aparece só com achado crítico ou alto atual. */
function ReconciliationAlert({counts}: {counts: ReconciliationAlertCounts | null}) {
  if (!counts || (counts.critical === 0 && counts.high === 0)) return null;

  const parts = [
    counts.critical > 0 ? `${counts.critical} crítico(s)` : null,
    counts.high > 0 ? `${counts.high} alto(s)` : null,
  ].filter(Boolean);

  return (
    <Alert variant={counts.critical > 0 ? 'destructive' : 'default'} className="mb-4">
      <AlertDescription className="flex flex-wrap items-center gap-x-2">
        <span>A conciliação financeira encontrou {parts.join(' e ')}.</span>
        <Link href={ROUTES.conciliacaoFinanceira} className="font-medium underline underline-offset-2">
          Ver conciliação
        </Link>
      </AlertDescription>
    </Alert>
  );
}

export {ReconciliationAlert};
