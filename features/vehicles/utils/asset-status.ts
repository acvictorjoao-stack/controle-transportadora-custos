import type {VehicleAssetStatus} from '../types';

export function getVehicleAssetStatusVariant(status: VehicleAssetStatus) {
  switch (status) {
    case 'active':
      return 'success' as const;
    case 'maintenance':
      return 'warning' as const;
    case 'inactive':
      return 'secondary' as const;
    case 'sold':
      return 'info' as const;
    default:
      return 'secondary' as const;
  }
}
