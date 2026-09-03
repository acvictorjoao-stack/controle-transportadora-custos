import {deleteAuthUser} from '@/features/master/provisioning/repositories/auth.repository';
import {PORTAL_ROLES} from '@/lib/auth/permissions';
import {createAdminClient} from '@/supabase/server/admin';

import type {PortalUserListItem} from '../types';

type AdminClient = ReturnType<typeof createAdminClient>;

export const PORTAL_USER_DELETE_ERRORS = {
  NOT_FOUND: 'Usuário não encontrado.',
  SELF: 'Você não pode excluir o próprio usuário.',
  LAST_OWNER: 'Não é possível excluir o último proprietário da plataforma.',
} as const;

export function assertPortalUserDeletion(input: {
  actorProfileId: string | null;
  target: PortalUserListItem;
  activeOwnerCount: number;
}): void {
  if (!input.actorProfileId) {
    throw new Error('Sessão inválida.');
  }

  if (input.actorProfileId === input.target.profileId) {
    throw new Error(PORTAL_USER_DELETE_ERRORS.SELF);
  }

  const isActiveOwner =
    input.target.role === PORTAL_ROLES.OWNER && input.target.status === 'active';

  if (isActiveOwner && input.activeOwnerCount <= 1) {
    throw new Error(PORTAL_USER_DELETE_ERRORS.LAST_OWNER);
  }
}

async function hasCompanyMembership(
  admin: AdminClient,
  profileId: string,
): Promise<boolean> {
  const {count, error} = await admin
    .from('company_members')
    .select('id', {count: 'exact', head: true})
    .eq('profile_id', profileId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(error.message);
  }

  return (count ?? 0) > 0;
}

export async function removePortalUserAccess(
  admin: AdminClient,
  target: Pick<PortalUserListItem, 'id' | 'profileId'>,
): Promise<{removedAuthUser: boolean}> {
  const {error} = await admin.from('portal_users').delete().eq('id', target.id);

  if (error) {
    throw new Error(error.message);
  }

  if (await hasCompanyMembership(admin, target.profileId)) {
    const {error: actingError} = await admin
      .from('portal_acting_companies')
      .delete()
      .eq('profile_id', target.profileId);

    if (actingError) {
      throw new Error(actingError.message);
    }

    return {removedAuthUser: false};
  }

  await deleteAuthUser(target.profileId);
  return {removedAuthUser: true};
}
