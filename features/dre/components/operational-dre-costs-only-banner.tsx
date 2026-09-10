import {Alert, AlertDescription} from '@/components/ui/alert';

import {OPERATIONAL_DRE_COSTS_ONLY_BANNER} from '../services/operational-dre-costs-only';

export interface OperationalDreCostsOnlyBannerProps {
  active: boolean;
}

/** Banner Audit #6 — centro de custo = lente de custos, sem P&L de frete. */
function OperationalDreCostsOnlyBanner({
  active,
}: OperationalDreCostsOnlyBannerProps) {
  if (!active) return null;

  return (
    <Alert>
      <AlertDescription>{OPERATIONAL_DRE_COSTS_ONLY_BANNER}</AlertDescription>
    </Alert>
  );
}

export {OperationalDreCostsOnlyBanner};
