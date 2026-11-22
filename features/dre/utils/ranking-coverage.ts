/**
 * Fase 2.2.4 — O que fica fora de um ranking de rentabilidade.
 *
 * Os rankings por veículo, cliente e motorista não mostram as viagens sem esse
 * vínculo (o de rota mantém "Sem rota"). Os cards da tela vêm da DRE, que
 * inclui essas viagens. A diferença sai daqui, sem cálculo novo:
 * DRE − soma do ranking.
 *
 * Receita e viagens fecham sempre. O custo só fecha sem filtro de dimensão:
 * com filtro, a DRE e os rankings rateiam o custo do veículo sobre bases
 * diferentes (ver o it.fails da 2.2.1), e então o custo fora fica nulo.
 */

import {hasOperationalDreDimensionalFilters} from '../services/operational-dre-expense-scope';
import type {OperationalDreData, OperationalDreDimensionGroup, OperationalDreFilters} from '../types';

export interface RankingCoverage {
  tripsOutside: number;
  revenueOutside: number;
  /** Nulo com filtro de cliente, rota, veículo ou motorista. */
  costOutside: number | null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeRankingCoverage(input: {
  dre: OperationalDreData;
  groups: readonly OperationalDreDimensionGroup[];
  filters: OperationalDreFilters;
}): RankingCoverage | null {
  const groupTrips = input.groups.reduce((total, group) => total + group.tripCount, 0);
  const tripsOutside = input.dre.indicators.tripCount - groupTrips;
  if (tripsOutside <= 0) return null;

  const groupRevenue = input.groups.reduce((total, group) => total + group.totalRevenue, 0);
  const groupCost = input.groups.reduce((total, group) => total + group.totalCost, 0);
  return {
    tripsOutside,
    revenueOutside: round2(input.dre.revenues.totalRevenue - groupRevenue),
    costOutside: hasOperationalDreDimensionalFilters(input.filters)
      ? null
      : round2(input.dre.costs.allocatedOperatingCosts - groupCost),
  };
}

export interface AttributedCostsCard {
  value: number;
  subtitle: string;
}

/**
 * Card "Custos atribuídos" das telas de rentabilidade (decisão da Fase 2.2.4).
 *
 * Sem filtro de dimensão, a DRE e o ranking somam o mesmo (invariante da
 * 2.2.1) e o card segue a DRE. Com filtro de cliente, rota, veículo ou
 * motorista, a DRE não inclui custos do veículo sem viagem (o ledger não tem
 * esses vínculos), mas o ranking inclui a parte rateada por KM: o card passa a
 * mostrar a soma do ranking, para bater com a tabela. A tela da DRE não muda.
 */
export function resolveAttributedCostsCard(input: {
  dre: OperationalDreData;
  groups: readonly OperationalDreDimensionGroup[];
  filters: OperationalDreFilters;
}): AttributedCostsCard {
  if (!hasOperationalDreDimensionalFilters(input.filters)) {
    return {value: input.dre.costs.allocatedOperatingCosts, subtitle: 'Entram no ranking'};
  }
  return {
    value: round2(input.groups.reduce((total, group) => total + group.totalCost, 0)),
    subtitle: 'Soma do ranking (inclui o rateio do veículo)',
  };
}
