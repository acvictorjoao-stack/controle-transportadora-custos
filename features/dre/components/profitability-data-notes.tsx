import {Info} from 'lucide-react';

import {Alert, AlertDescription} from '@/components/ui/alert';
import {formatCurrencyBr} from '@/features/financial/utils/financial-format';

import type {OperationalDreData, OperationalDreDimensionGroup, OperationalDreFilters} from '../types';
import {computeRankingCoverage} from '../utils/ranking-coverage';

const UNASSIGNED_LABELS = {
  vehicle: 'sem veículo',
  customer: 'sem cliente',
  driver: 'sem motorista',
  route: 'sem rota',
} as const;

export interface ProfitabilityDataNotesProps {
  dre: OperationalDreData;
  /** Grupos exibidos no ranking da tela. */
  groups: readonly OperationalDreDimensionGroup[];
  filters: OperationalDreFilters;
  dimension: keyof typeof UNASSIGNED_LABELS;
}

/**
 * Fase 2.2.4 — Avisos de qualidade dos números de rentabilidade:
 * viagens que ficam fora do ranking e KM que não veio do odômetro.
 */
function ProfitabilityDataNotes({dre, groups, filters, dimension}: ProfitabilityDataNotesProps) {
  const coverage = computeRankingCoverage({dre, groups, filters});
  const quality = dre.indicators.kmQuality;
  const kmIssues = quality ? quality.planned + quality.none : 0;

  if (!coverage && kmIssues === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {coverage ? (
        <Alert>
          <Info />
          <AlertDescription>
            {coverage.tripsOutside} viagem(ns) {UNASSIGNED_LABELS[dimension]} ficam fora do ranking abaixo: receita de{' '}
            {formatCurrencyBr(coverage.revenueOutside)}
            {coverage.costOutside === null ? '' : ` e custos atribuídos de ${formatCurrencyBr(coverage.costOutside)}`}. Elas
            entram nos indicadores acima.
          </AlertDescription>
        </Alert>
      ) : null}
      {quality && kmIssues > 0 ? (
        <Alert variant="warning">
          <Info />
          <AlertDescription>
            KM das viagens: {quality.odometer} pelo odômetro, {quality.planned} pelo planejado e {quality.none} sem KM.
            Custo/KM e o rateio dos custos do veículo ficam menos confiáveis; viagens sem KM não recebem rateio.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

export {ProfitabilityDataNotes};
