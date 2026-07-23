import type {
  Supplier,
  SupplierCategory,
  SupplierRow,
  SupplierSelectOption,
  SupplierStats,
} from '../types/supplier';

export function mapSupplierRow(row: SupplierRow): Supplier {
  const categories = Array.isArray(row.categories) ? row.categories : [];
  return {
    id: row.id,
    companyId: row.company_id,
    corporateName: row.corporate_name,
    tradeName: row.trade_name,
    displayName: row.trade_name?.trim() || row.corporate_name,
    document: row.document,
    documentType: row.document_type,
    categories: categories as SupplierCategory[],
    phone: row.phone,
    email: row.email,
    contactName: row.contact_name,
    zipCode: row.zip_code,
    address: row.address,
    number: row.number,
    district: row.district,
    city: row.city,
    state: row.state,
    active: row.active,
    notes: row.notes,
    metadata: row.metadata ?? {},
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSupplierToSelectOption(supplier: Supplier): SupplierSelectOption {
  return {
    id: supplier.id,
    displayName: supplier.displayName,
    corporateName: supplier.corporateName,
    tradeName: supplier.tradeName,
    document: supplier.document,
    categories: supplier.categories,
    city: supplier.city,
    state: supplier.state,
    active: supplier.active,
  };
}

export function mapSupplierStats(raw: Record<string, unknown> | null | undefined): SupplierStats {
  const stats = raw ?? {};
  return {
    totalSpent: Number(stats.total_spent ?? 0),
    totalRevenue: Number(stats.total_revenue ?? 0),
    serviceCount: Number(stats.service_count ?? 0),
    orderCount: Number(stats.order_count ?? 0),
    averageOrderAmount: Number(stats.average_order_amount ?? 0),
    openPayables: Number(stats.open_payables ?? 0),
    paidPayables: Number(stats.paid_payables ?? 0),
    openInstallments: Number(stats.open_installments ?? 0),
    paidInstallments: Number(stats.paid_installments ?? 0),
    lastPurchaseAt: stats.last_purchase_at ? String(stats.last_purchase_at) : null,
    lastFuelAt: stats.last_fuel_at ? String(stats.last_fuel_at) : null,
    lastMaintenanceAt: stats.last_maintenance_at ? String(stats.last_maintenance_at) : null,
    maintenanceCount: Number(stats.maintenance_count ?? 0),
    fuelCount: Number(stats.fuel_count ?? 0),
    tireCount: Number(stats.tire_count ?? 0),
  };
}

export function emptySupplierStats(): SupplierStats {
  return {
    totalSpent: 0,
    totalRevenue: 0,
    serviceCount: 0,
    orderCount: 0,
    averageOrderAmount: 0,
    openPayables: 0,
    paidPayables: 0,
    openInstallments: 0,
    paidInstallments: 0,
    lastPurchaseAt: null,
    lastFuelAt: null,
    lastMaintenanceAt: null,
    maintenanceCount: 0,
    fuelCount: 0,
    tireCount: 0,
  };
}
