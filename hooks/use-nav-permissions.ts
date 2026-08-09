import {useNavPermissionsContext} from '@/contexts/auth/nav-permissions-context';
import type {Permission} from '@/types/global/navigation';

export {hasPermission, PERMISSION_ALIASES} from '@/lib/navigation/has-permission';

export function useNavPermissions(): Permission[] {
  const {permissions} = useNavPermissionsContext();
  return permissions;
}
