/**
 * Audit #12 — copy estável da composição de custos DRE vs ranking.
 * Total empresarial = atribuídos (rateio/vínculo) + não atribuíveis.
 */
export const OPERATIONAL_DRE_COST_ALLOCATION_DISCLAIMER =
  'Custos totais da DRE = custos atribuídos (vínculo com viagem ou rateio por KM) + custos não atribuíveis. Os rankings de rentabilidade consideram somente a parcela atribuída.';

export const OPERATIONAL_DRE_COST_ALLOCATION_LABELS = {
  allocated: 'Custos atribuídos',
  unattributable: 'Não atribuíveis',
  total: 'Total de Custos',
  rankingHint: 'O ranking reflete apenas custos atribuídos às viagens.',
} as const;
