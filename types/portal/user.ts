import type {PortalRole} from '@/lib/auth/permissions';

export interface PortalUser {
  id: string;
  profile_id: string;
  role: PortalRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}
