export type {
  Customer,
  CustomerAddress,
  CustomerContact,
  CustomerContract,
  CustomerContractItem,
  CustomerContractStatus,
  CustomerContractType,
  CustomerDetailData,
  CustomerDocument,
  CustomerDocumentType,
  CustomerHistory,
  CustomerListFilters,
  CustomerSegment,
  CustomerSortOptions,
  CustomerStats,
  CustomerStatus,
  PaginatedCustomers,
} from './customer';
export {
  CUSTOMER_ADDRESS_TYPE_LABELS,
  CUSTOMER_CONTRACT_STATUS_LABELS,
  CUSTOMER_CONTRACT_TYPE_LABELS,
  CUSTOMER_DOCUMENT_TYPE_LABELS,
  CUSTOMER_HISTORY_ACTION_LABELS,
  CUSTOMER_READJUSTMENT_INDEX_LABELS,
  CUSTOMER_SEGMENT_LABELS,
  CUSTOMER_STATUS_LABELS,
} from './customer';
export type {CustomerIntegrationSections} from './integrations';
export {CUSTOMER_EXTENSION_REGISTRY, emptyCustomerIntegrationSections} from './integrations';
