import type {SupabaseClient} from '@supabase/supabase-js';

import {registerCustomerDetailLoader} from './customer-detail-loader';

async function loadCustomerTrips(
  supabase: SupabaseClient,
  companyId: string,
  customerId: string,
) {
  const {data} = await supabase
    .from('trips')
    .select('id, trip_number, trip_status, origin, destination, departed_at, contracted_freight_value, actual_freight_value, freight_margin')
    .eq('company_id', companyId)
    .eq('customer_id', customerId)
    .is('deleted_at', null)
    .order('departed_at', {ascending: false})
    .limit(50);

  return {
    trips: (data ?? []).map((row) => ({
      id: row.id,
      tripNumber: row.trip_number,
      tripStatus: row.trip_status,
      origin: row.origin,
      destination: row.destination,
      departedAt: row.departed_at,
      contractedFreightValue: row.contracted_freight_value !== null ? Number(row.contracted_freight_value) : null,
      actualFreightValue: row.actual_freight_value !== null ? Number(row.actual_freight_value) : null,
      freightMargin: row.freight_margin !== null ? Number(row.freight_margin) : null,
    })),
  };
}

async function loadCustomerFinancial(
  supabase: SupabaseClient,
  companyId: string,
  customerId: string,
) {
  const {data} = await supabase
    .from('financial_entries')
    .select('id, entry_type, entry_status, description, amount, entry_date, trips:trip_id (trip_number)')
    .eq('company_id', companyId)
    .eq('customer_id', customerId)
    .is('deleted_at', null)
    .order('entry_date', {ascending: false})
    .limit(50);

  return {
    financial: (data ?? []).map((row) => {
      const trip = Array.isArray(row.trips) ? row.trips[0] : row.trips;
      return {
        id: row.id,
        entryType: row.entry_type,
        entryStatus: row.entry_status,
        description: row.description,
        amount: Number(row.amount ?? 0),
        entryDate: row.entry_date,
        tripNumber: trip?.trip_number ?? null,
      };
    }),
  };
}

registerCustomerDetailLoader(loadCustomerTrips);
registerCustomerDetailLoader(loadCustomerFinancial);
