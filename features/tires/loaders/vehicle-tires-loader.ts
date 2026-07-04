import type {SupabaseClient} from '@supabase/supabase-js';

import {registerVehicleDetailLoader} from '@/features/vehicles/loaders';
import type {VehicleTireRecord} from '@/features/vehicles/types';

import {listTiresByVehicle} from '../queries/tires';
import {TIRE_POSITION_LABELS} from '../utils/tire-format';

async function loadVehicleTires(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
): Promise<{tires: VehicleTireRecord[]}> {
  const tires = await listTiresByVehicle(supabase, companyId, vehicleId);

  return {
    tires: tires.map(
      (tire): VehicleTireRecord => ({
        id: tire.id,
        position: tire.currentPosition
          ? TIRE_POSITION_LABELS[tire.currentPosition]
          : '—',
        brand: tire.brand,
        installedAt: tire.createdAt,
        treadDepthMm: tire.lastTreadDepthMm,
        status: tire.tireStatus,
      }),
    ),
  };
}

registerVehicleDetailLoader(loadVehicleTires);
