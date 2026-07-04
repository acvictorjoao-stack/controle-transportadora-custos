/**
 * Extension-point types for future integrations (CRM, ERP, billing, NFe, CT-e, MDF-e, BI, IA).
 */

export type CustomerExtensionProvider =
  | 'crm'
  | 'erp'
  | 'billing'
  | 'nfe'
  | 'cte'
  | 'mdfe'
  | 'bi'
  | 'ai';

export interface CustomerExtensionRegistryEntry {
  provider: CustomerExtensionProvider;
  label: string;
  description: string;
}

export const CUSTOMER_EXTENSION_REGISTRY: CustomerExtensionRegistryEntry[] = [
  {provider: 'crm', label: 'CRM', description: 'Integração com CRM comercial'},
  {provider: 'erp', label: 'ERP', description: 'Sincronização com ERP'},
  {provider: 'billing', label: 'Faturamento', description: 'Geração automática de faturas'},
  {provider: 'nfe', label: 'NF-e', description: 'Nota fiscal eletrônica'},
  {provider: 'cte', label: 'CT-e', description: 'Conhecimento de transporte eletrônico'},
  {provider: 'mdfe', label: 'MDF-e', description: 'Manifesto eletrônico de documentos fiscais'},
  {provider: 'bi', label: 'BI', description: 'Business Intelligence'},
  {provider: 'ai', label: 'IA', description: 'Análises preditivas e recomendações'},
];

export type CustomerExtensionLoader = (
  companyId: string,
  customerId: string,
) => Promise<Record<string, unknown>>;

const extensionLoaders = new Map<CustomerExtensionProvider, CustomerExtensionLoader>();

export function registerCustomerExtensionLoader(
  provider: CustomerExtensionProvider,
  loader: CustomerExtensionLoader,
): void {
  extensionLoaders.set(provider, loader);
}

export function getCustomerExtensionLoader(
  provider: CustomerExtensionProvider,
): CustomerExtensionLoader | undefined {
  return extensionLoaders.get(provider);
}

export interface CustomerTripRecord {
  id: string;
  tripNumber: string;
  tripStatus: string;
  origin: string | null;
  destination: string | null;
  departedAt: string | null;
  contractedFreightValue: number | null;
  actualFreightValue: number | null;
  freightMargin: number | null;
}

export interface CustomerFinancialRecord {
  id: string;
  entryType: string;
  entryStatus: string;
  description: string | null;
  amount: number;
  entryDate: string;
  tripNumber: string | null;
}

export interface CustomerIntegrationSections {
  trips: CustomerTripRecord[];
  financial: CustomerFinancialRecord[];
  extensions: Record<CustomerExtensionProvider, Record<string, unknown>>;
}

export function emptyCustomerIntegrationSections(): CustomerIntegrationSections {
  return {
    trips: [],
    financial: [],
    extensions: {
      crm: {},
      erp: {},
      billing: {},
      nfe: {},
      cte: {},
      mdfe: {},
      bi: {},
      ai: {},
    },
  };
}
