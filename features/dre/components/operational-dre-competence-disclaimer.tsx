import {Alert, AlertDescription} from '@/components/ui/alert';

import {OPERATIONAL_DRE_COMPETENCE_DISCLAIMER} from '../services/operational-dre-competence';

/** Banner Audit #7 — eixos de competência receita × custo. */
function OperationalDreCompetenceDisclaimer() {
  return (
    <Alert>
      <AlertDescription>{OPERATIONAL_DRE_COMPETENCE_DISCLAIMER}</AlertDescription>
    </Alert>
  );
}

export {OperationalDreCompetenceDisclaimer};
