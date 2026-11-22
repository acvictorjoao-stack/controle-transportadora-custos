/**
 * Fase 2.2 — Glossário da rentabilidade operacional.
 *
 * Uma definição por termo, com a fonte do cálculo. As telas da Fase 2.2 usam
 * estes textos (rótulos e dicas) para que "resultado", "custo/KM" e afins
 * signifiquem a mesma coisa em todo lugar. Nenhum cálculo novo aqui: cada termo
 * aponta para a função que já calcula o valor.
 */

export const PROFITABILITY_TERMS = [
  'revenue',
  'directResult',
  'allocatedResult',
  'attributedCosts',
  'unattributableCosts',
  'operationalKm',
  'costPerKm',
  'revenuePerKm',
  'profitPerKm',
  'marginPercent',
] as const;
export type ProfitabilityTerm = (typeof PROFITABILITY_TERMS)[number];

export interface ProfitabilityDefinition {
  term: ProfitabilityTerm;
  label: string;
  /** Texto curto para dica de tela. */
  description: string;
  /** Onde o valor é calculado (fonte única). */
  source: string;
}

export const PROFITABILITY_GLOSSARY: Record<ProfitabilityTerm, ProfitabilityDefinition> = {
  revenue: {
    term: 'revenue',
    label: 'Receita',
    description: 'Frete da viagem concluída (realizado ou, sem ele, contratado), na data de conclusão.',
    source: 'sumFreightRevenue / getTripFreightValue (DRE operacional)',
  },
  directResult: {
    term: 'directResult',
    label: 'Resultado direto',
    description: 'Receita menos os custos lançados na própria viagem. É o resultado mostrado na tela da viagem.',
    source: 'trip_financial_summary (migrations 110/111) = sumTripCosts na DRE',
  },
  allocatedResult: {
    term: 'allocatedResult',
    label: 'Resultado com rateio',
    description:
      'Resultado direto menos a parte dos custos do veículo sem viagem (manutenção, pneus) rateada pelo KM das viagens do veículo no período.',
    source: 'buildTripCostByIdMap / allocateOperationalCostsByMileage',
  },
  attributedCosts: {
    term: 'attributedCosts',
    label: 'Custos atribuídos',
    description: 'Custos ligados a uma viagem ou rateados por KM. Só eles entram nos rankings.',
    source: 'applyCostAllocationCoverage (allocatedOperatingCosts)',
  },
  unattributableCosts: {
    term: 'unattributableCosts',
    label: 'Não atribuíveis',
    description:
      'Custos sem viagem e sem veículo com KM no período (ex.: folha, administrativo). Entram na DRE, mas em nenhum ranking.',
    source: 'applyCostAllocationCoverage (unattributableOperatingCosts)',
  },
  operationalKm: {
    term: 'operationalKm',
    label: 'KM operacional',
    description: 'Odômetro final menos inicial; sem leitura, o KM planejado; sem os dois, 0 (fica fora do rateio).',
    source: 'resolveTripOperationalDistanceKm (Audit #17)',
  },
  costPerKm: {
    term: 'costPerKm',
    label: 'Custo/KM',
    description:
      'Custo operacional dividido pelo KM operacional. Não é o custo/KM de combustível do módulo de abastecimento.',
    source: 'guardedRatio(totalCost, totalKm) / buildIndicators',
  },
  revenuePerKm: {
    term: 'revenuePerKm',
    label: 'Receita/KM',
    description: 'Receita dividida pelo KM operacional.',
    source: 'guardedRatio(totalRevenue, totalKm) / buildIndicators',
  },
  profitPerKm: {
    term: 'profitPerKm',
    label: 'Lucro/KM',
    description: 'Resultado dividido pelo KM operacional.',
    source: 'buildIndicators (profitPerKm)',
  },
  marginPercent: {
    term: 'marginPercent',
    label: 'Margem',
    description: 'Resultado dividido pela receita. Sem receita, não há margem.',
    source: 'marginPercent (DRE operacional)',
  },
};
