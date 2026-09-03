import {beforeEach, describe, expect, it, vi} from 'vitest';

import {PORTAL_ROLES} from '@/lib/auth/permissions';

import type {PortalUserListItem} from '../../types';
import {
  assertPortalUserDeletion,
  PORTAL_USER_DELETE_ERRORS,
} from '../delete-portal-user';

const deleteAuthUser = vi.fn();

vi.mock('@/features/master/provisioning/repositories/auth.repository', () => ({
  deleteAuthUser: (...args: unknown[]) => deleteAuthUser(...args),
}));

const {removePortalUserAccess} = await import('../delete-portal-user');

function portalUser(
  overrides: Partial<PortalUserListItem> = {},
): PortalUserListItem {
  return {
    id: 'portal-user-1',
    profileId: 'profile-target',
    fullName: 'Ana Costa',
    email: 'ana@fleetcontrol.local',
    role: PORTAL_ROLES.SUPPORT,
    status: 'active',
    lastLoginAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createAdminMock(options: {
  deletePortalError?: string | null;
  membershipCount?: number;
  membershipError?: string | null;
  actingError?: string | null;
}) {
  return {
    from(table: string) {
      if (table === 'portal_users') {
        return {
          delete: () => ({
            eq: async () => ({
              error: options.deletePortalError
                ? {message: options.deletePortalError}
                : null,
            }),
          }),
        };
      }

      if (table === 'company_members') {
        return {
          select: () => ({
            eq: () => ({
              is: async () => ({
                count: options.membershipCount ?? 0,
                error: options.membershipError
                  ? {message: options.membershipError}
                  : null,
              }),
            }),
          }),
        };
      }

      if (table === 'portal_acting_companies') {
        return {
          delete: () => ({
            eq: async () => ({
              error: options.actingError ? {message: options.actingError} : null,
            }),
          }),
        };
      }

      throw new Error(`Tabela inesperada: ${table}`);
    },
  };
}

describe('assertPortalUserDeletion', () => {
  it('impede exclusão do próprio usuário', () => {
    expect(() =>
      assertPortalUserDeletion({
        actorProfileId: 'profile-target',
        target: portalUser(),
        activeOwnerCount: 2,
      }),
    ).toThrow(PORTAL_USER_DELETE_ERRORS.SELF);
  });

  it('impede exclusão do último proprietário ativo', () => {
    expect(() =>
      assertPortalUserDeletion({
        actorProfileId: 'profile-actor',
        target: portalUser({
          role: PORTAL_ROLES.OWNER,
          status: 'active',
        }),
        activeOwnerCount: 1,
      }),
    ).toThrow(PORTAL_USER_DELETE_ERRORS.LAST_OWNER);
  });

  it('permite excluir suporte quando há proprietário ativo', () => {
    expect(() =>
      assertPortalUserDeletion({
        actorProfileId: 'profile-actor',
        target: portalUser(),
        activeOwnerCount: 1,
      }),
    ).not.toThrow();
  });

  it('permite excluir proprietário quando existe outro ativo', () => {
    expect(() =>
      assertPortalUserDeletion({
        actorProfileId: 'profile-actor',
        target: portalUser({role: PORTAL_ROLES.OWNER, status: 'active'}),
        activeOwnerCount: 2,
      }),
    ).not.toThrow();
  });
});

describe('removePortalUserAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteAuthUser.mockResolvedValue(undefined);
  });

  it('remove auth.users quando não há membership de empresa', async () => {
    const admin = createAdminMock({membershipCount: 0});
    const result = await removePortalUserAccess(
      admin as never,
      portalUser(),
    );

    expect(result).toEqual({removedAuthUser: true});
    expect(deleteAuthUser).toHaveBeenCalledWith('profile-target');
  });

  it('preserva auth.users quando o perfil ainda é membro de empresa', async () => {
    const admin = createAdminMock({membershipCount: 1});
    const result = await removePortalUserAccess(
      admin as never,
      portalUser(),
    );

    expect(result).toEqual({removedAuthUser: false});
    expect(deleteAuthUser).not.toHaveBeenCalled();
  });

  it('propaga erro ao falhar a exclusão em portal_users', async () => {
    const admin = createAdminMock({
      deletePortalError: 'permission denied',
      membershipCount: 0,
    });

    await expect(
      removePortalUserAccess(admin as never, portalUser()),
    ).rejects.toThrow('permission denied');
    expect(deleteAuthUser).not.toHaveBeenCalled();
  });
});
