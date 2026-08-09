'use server';

import {revalidatePath} from 'next/cache';

import {ROUTES} from '@/constants/routes/paths';
import {logPortalAudit, PORTAL_AUDIT_ACTIONS} from '@/features/master/audit';
import {
  isBusinessRoleName,
  type BusinessRoleName,
} from '@/features/organization/members/business-roles';
import {PORTAL_ACCESS_DENIED, guardPortalOwner} from '@/lib/auth/guards';
import {createClient} from '@/supabase/server';

import {
  applyBusinessRolePermissions,
  getMasterRolePermissionMatrix,
  listMasterBusinessRoles,
  type MasterRoleCatalogItem,
  type MasterRolePermissionMatrix,
} from './queries';

export type MasterRolesActionResult<T> =
  | {success: true; data: T}
  | {success: false; error: string};

export async function listMasterRolesAction(): Promise<
  MasterRolesActionResult<MasterRoleCatalogItem[]>
> {
  if (!(await guardPortalOwner())) {
    return {success: false, error: PORTAL_ACCESS_DENIED};
  }

  try {
    const roles = await listMasterBusinessRoles();
    return {success: true, data: roles};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao carregar roles.',
    };
  }
}

export async function getMasterRoleMatrixAction(
  roleName: string,
): Promise<MasterRolesActionResult<MasterRolePermissionMatrix>> {
  if (!(await guardPortalOwner())) {
    return {success: false, error: PORTAL_ACCESS_DENIED};
  }

  try {
    const matrix = await getMasterRolePermissionMatrix(roleName);
    if (!matrix) {
      return {success: false, error: 'Role inválido.'};
    }
    return {success: true, data: matrix};
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Erro ao carregar permissões.',
    };
  }
}

export async function updateMasterRolePermissionsAction(input: {
  roleName: string;
  permissionCodes: string[];
}): Promise<MasterRolesActionResult<{updatedRoles: number}>> {
  if (!(await guardPortalOwner())) {
    return {success: false, error: PORTAL_ACCESS_DENIED};
  }

  if (!isBusinessRoleName(input.roleName)) {
    return {success: false, error: 'Role inválido.'};
  }

  if (!Array.isArray(input.permissionCodes)) {
    return {success: false, error: 'Permissões inválidas.'};
  }

  const permissionCodes = [
    ...new Set(
      input.permissionCodes
        .filter((code): code is string => typeof code === 'string')
        .map((code) => code.trim())
        .filter(Boolean),
    ),
  ];

  try {
    const supabase = await createClient();
    const {
      data: {user},
    } = await supabase.auth.getUser();

    const result = await applyBusinessRolePermissions({
      roleName: input.roleName as BusinessRoleName,
      permissionCodes,
      actorProfileId: user?.id ?? null,
    });

    await logPortalAudit({
      action: PORTAL_AUDIT_ACTIONS.SETTINGS_UPDATE,
      actorProfileId: user?.id ?? null,
      actorEmail: user?.email ?? null,
      targetType: 'role',
      targetLabel: input.roleName,
      metadata: {
        permissionCount: permissionCodes.length,
        updatedRoles: result.updatedRoles,
      },
    });

    revalidatePath(ROUTES.masterRoles);
    revalidatePath(ROUTES.masterRoleDetail(input.roleName));

    return {success: true, data: result};
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Erro ao salvar permissões.',
    };
  }
}
