/**
 * Storage bucket names — central registry for Supabase Storage.
 * Module-specific constants re-export from here for consistency.
 */
export const COMPANY_LOGOS_STORAGE_BUCKET = 'company-logos';
export const VEHICLE_STORAGE_BUCKET = 'vehicle-files';
export const DRIVER_STORAGE_BUCKET = 'driver-files';
export const TRIP_STORAGE_BUCKET = 'trip-files';
export const FUEL_STORAGE_BUCKET = 'fuel-files';
export const MAINTENANCE_STORAGE_BUCKET = 'maintenance-files';
export const TIRE_STORAGE_BUCKET = 'tire-files';
export const FINANCIAL_STORAGE_BUCKET = 'financial-files';
export const CUSTOMER_STORAGE_BUCKET = 'customer-files';

export const STORAGE_BUCKETS = {
  companyLogos: COMPANY_LOGOS_STORAGE_BUCKET,
  vehicles: VEHICLE_STORAGE_BUCKET,
  drivers: DRIVER_STORAGE_BUCKET,
  trips: TRIP_STORAGE_BUCKET,
  fuel: FUEL_STORAGE_BUCKET,
  maintenance: MAINTENANCE_STORAGE_BUCKET,
  tires: TIRE_STORAGE_BUCKET,
  financial: FINANCIAL_STORAGE_BUCKET,
  customers: CUSTOMER_STORAGE_BUCKET,
} as const;

export type StorageBucketName =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];
