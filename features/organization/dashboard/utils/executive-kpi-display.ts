import type {ExecutiveDashboardKpis} from '../loaders/executive-dashboard-loader';

/** Rótulos estáveis dos cards de posição financeira (AP/AR). */
export const EXECUTIVE_OPEN_BALANCE_LABELS = {
  sectionTitle: 'Posição financeira da empresa',
  sectionHint:
    'Saldo em aberto • empresa inteira • independente dos filtros',
  accountsPayableTitle: 'Saldo em aberto — Contas a Pagar',
  accountsReceivableTitle: 'Saldo em aberto — Contas a Receber',
  accountsPayableSubtitle: 'Empresa inteira • sem folha',
  accountsReceivableSubtitle: 'Empresa inteira • independente dos filtros',
  costsSubtitle:
    'Total DRE = atribuídos + não atribuíveis; rankings usam só atribuídos',
} as const;

export function formatExecutiveKm(value: number): string {
  return `${value.toLocaleString('pt-BR', {maximumFractionDigits: 1})} km`;
}

/** Sem viagens, receita nem custos no escopo, os KPIs operacionais exibem "—". */
export function hasExecutiveOperationalData(kpis: ExecutiveDashboardKpis): boolean {
  return (
    kpis.completedTrips > 0 ||
    kpis.totalRevenue !== 0 ||
    kpis.totalCosts !== 0 ||
    kpis.costsOnlyMode
  );
}
