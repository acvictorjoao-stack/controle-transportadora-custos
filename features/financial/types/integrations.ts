/**
 * Extension-point types for future integrations (BI, IA, billing, ERP, banks).
 * Registries only — implementations deferred to future sprints.
 */

export type FinancialIntegrationProvider =
  | 'bi'
  | 'ia'
  | 'billing'
  | 'accounting'
  | 'erp'
  | 'bank'
  | 'pix'
  | 'stripe'
  | 'asaas';

export interface FinancialExtensionRegistryEntry {
  provider: FinancialIntegrationProvider;
  label: string;
  enabled: boolean;
}

export const FINANCIAL_EXTENSION_REGISTRY: FinancialExtensionRegistryEntry[] = [
  {provider: 'bi', label: 'Business Intelligence', enabled: false},
  {provider: 'ia', label: 'Inteligência Artificial', enabled: false},
  {provider: 'billing', label: 'Faturamento', enabled: false},
  {provider: 'accounting', label: 'Contabilidade', enabled: false},
  {provider: 'erp', label: 'ERP Externo', enabled: false},
  {provider: 'bank', label: 'Banco', enabled: false},
  {provider: 'pix', label: 'PIX', enabled: false},
  {provider: 'stripe', label: 'Stripe', enabled: false},
  {provider: 'asaas', label: 'Asaas', enabled: false},
];
