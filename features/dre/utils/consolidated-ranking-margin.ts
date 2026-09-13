/**
 * Margem consolidada dos grupos do ranking (Audit #13).
 *
 * Usa a base atribuída que compõe o ranking (receita/lucro por grupo),
 * ponderada pelos valores financeiros — não a média aritmética das margens %.
 *
 * Grupos com receita zero (ou lucro nulo / modo só custos) são excluídos
 * para não distorcer o consolidado.
 */

export type RankingMarginGroup = {
  totalRevenue: number;
  totalProfit: number | null;
};

/**
 * margem consolidada = (Σ lucro dos grupos / Σ receita dos grupos) × 100
 *
 * Retorna `0` quando não há receita consolidável (evita Infinity/NaN).
 */
export function consolidatedRankingMarginPercent(
  groups: readonly RankingMarginGroup[],
): number {
  let totalRevenue = 0;
  let totalProfit = 0;

  for (const group of groups) {
    if (group.totalProfit == null || group.totalRevenue <= 0) continue;
    totalRevenue += group.totalRevenue;
    totalProfit += group.totalProfit;
  }

  if (totalRevenue <= 0) return 0;
  return (totalProfit / totalRevenue) * 100;
}
