import {ROUTES} from '@/constants/routes/paths';
import {getAccountsPayableOriginHref} from '@/features/accounts-payable/utils/origin';
import {OPERATION_SOURCE_LABELS} from '@/features/financial/constants/operation-financial';

/**
 * Resolve o destino do botão "Abrir origem" a partir de source_module + source_id
 * (e FKs denormalizadas). Sempre que houver vínculo operacional, leva ao cadastro.
 */
export function resolveTripFinancialOriginHref(entry: {
  id: string;
  sourceModule: string | null;
  sourceId: string | null;
  fuelRecordId: string | null;
  maintenanceRecordId: string | null;
  tireId: string | null;
}): string | null {
  const operational = getAccountsPayableOriginHref(entry);
  if (operational) return operational;

  if (entry.sourceModule === 'trips' && entry.sourceId) {
    return ROUTES.viagemDetail(entry.sourceId);
  }

  if (
    entry.sourceModule === 'accounts_payable' &&
    entry.sourceId &&
    entry.sourceId !== entry.id
  ) {
    return ROUTES.contasAPagarDetail(entry.sourceId);
  }

  // Conta manual / financeiro / pedágio / multa sem módulo dedicado → lançamento.
  if (
    entry.sourceModule === 'manual' ||
    entry.sourceModule === 'financeiro' ||
    entry.sourceModule === 'accounts_payable' ||
    entry.sourceModule === 'fines' ||
    entry.sourceModule === 'tolls' ||
    !entry.sourceModule
  ) {
    return ROUTES.financeiroDetail(entry.id);
  }

  if (entry.sourceId) {
    return ROUTES.financeiroDetail(entry.id);
  }

  return ROUTES.financeiroDetail(entry.id);
}

export function resolveTripFinancialOriginLabel(sourceModule: string | null): string {
  switch (sourceModule) {
    case 'fuel':
      return 'Abrir abastecimento';
    case 'maintenance':
      return 'Abrir manutenção';
    case 'tires':
      return 'Abrir compra';
    case 'trips':
      return 'Abrir viagem';
    case 'manual':
    case 'financeiro':
    case 'accounts_payable':
      return 'Abrir conta manual';
    case 'fines':
      return 'Abrir multa';
    case 'tolls':
      return 'Abrir pedágio';
    default:
      return sourceModule && OPERATION_SOURCE_LABELS[sourceModule]
        ? `Abrir ${OPERATION_SOURCE_LABELS[sourceModule].toLowerCase()}`
        : 'Abrir origem';
  }
}
