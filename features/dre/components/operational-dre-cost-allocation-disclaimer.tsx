import {Alert, AlertDescription} from '@/components/ui/alert';

import {OPERATIONAL_DRE_COST_ALLOCATION_DISCLAIMER} from '../services/operational-dre-cost-allocation';

/** Banner Audit #12 — assimetria DRE total vs ranking atribuído. */
function OperationalDreCostAllocationDisclaimer() {
  return (
    <Alert>
      <AlertDescription>{OPERATIONAL_DRE_COST_ALLOCATION_DISCLAIMER}</AlertDescription>
    </Alert>
  );
}

export {OperationalDreCostAllocationDisclaimer};
