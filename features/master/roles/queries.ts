import type {SupabaseClient} from '@supabase/supabase-js';

import {
  BUSINESS_ROLE_NAMES,
  type BusinessRoleName,
} from '@/features/organization/members/business-roles';
import {createAdminClient} from '@/supabase/server/admin';

export interface MasterRoleCatalogItem {
  name: BusinessRoleName;
  description: string;
  permissionCount: number;
  companyCount: number;
}

export interface MasterPermissionOption {
  id: string;
  code: string;
  resource: string;
  action: string;
  description: string | null;
}

export interface MasterRolePermissionMatrix {
  roleName: BusinessRoleName;
  description: string;
  permissions: MasterPermissionOption[];
  selectedCodes: string[];
}

const ROLE_DESCRIPTIONS: Record<BusinessRoleName, string> = {
  'Super Admin': 'Acesso total à empresa (maior nível dentro do tenant)',
  Administrador: 'Acesso administrativo amplo da empresa',
  Financeiro: 'Financeiro, DRE, rentabilidade e relatórios financeiros',
  Operacional: 'Operações: viagens, abastecimentos, manutenção e pneus',
  Cadastro: 'Cadastros de veículos, motoristas, clientes e fornecedores',
  Consulta: 'Somente leitura nos módulos disponíveis',
};

export async function listMasterBusinessRoles(): Promise<MasterRoleCatalogItem[]> {
  const admin = createAdminClient();

  const {data: roles, error} = await admin
    .from('roles')
    .select('id, name, company_id')
    .in('name', [...BUSINESS_ROLE_NAMES])
    .is('deleted_at', null)
    .eq('status', 'active');

  if (error) {
    throw new Error(error.message);
  }

  const roleIds = (roles ?? []).map((role) => role.id);
  const permissionCountByRoleId = new Map<string, number>();

  if (roleIds.length > 0) {
    const {data: rolePermissions, error: rpError} = await admin
      .from('role_permissions')
      .select('role_id')
      .in('role_id', roleIds);

    if (rpError) {
      throw new Error(rpError.message);
    }

    for (const row of rolePermissions ?? []) {
      permissionCountByRoleId.set(
        row.role_id,
        (permissionCountByRoleId.get(row.role_id) ?? 0) + 1,
      );
    }
  }

  return BUSINESS_ROLE_NAMES.map((name) => {
    const matching = (roles ?? []).filter((role) => role.name === name);
    const companyCount = new Set(matching.map((role) => role.company_id)).size;
    const permissionTotals = matching.map(
      (role) => permissionCountByRoleId.get(role.id) ?? 0,
    );
    const permissionCount =
      permissionTotals.length > 0
        ? Math.round(
            permissionTotals.reduce((sum, value) => sum + value, 0) /
              permissionTotals.length,
          )
        : 0;

    return {
      name,
      description: ROLE_DESCRIPTIONS[name],
      permissionCount,
      companyCount,
    };
  });
}

export async function getMasterRolePermissionMatrix(
  roleName: string,
): Promise<MasterRolePermissionMatrix | null> {
  if (!BUSINESS_ROLE_NAMES.includes(roleName as BusinessRoleName)) {
    return null;
  }

  const name = roleName as BusinessRoleName;
  const admin = createAdminClient();

  const [{data: permissions, error: permissionsError}, {data: roles, error: rolesError}] =
    await Promise.all([
      admin
        .from('permissions')
        .select('id, code, resource, action, description')
        .order('resource', {ascending: true})
        .order('action', {ascending: true}),
      admin
        .from('roles')
        .select('id')
        .eq('name', name)
        .is('deleted_at', null)
        .eq('status', 'active')
        .limit(1),
    ]);

  if (permissionsError) throw new Error(permissionsError.message);
  if (rolesError) throw new Error(rolesError.message);

  const sampleRoleId = roles?.[0]?.id;
  let selectedCodes: string[] = [];

  if (sampleRoleId) {
    const {data: rolePermissions, error: rpError} = await admin
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', sampleRoleId);

    if (rpError) throw new Error(rpError.message);

    const permissionIds = (rolePermissions ?? []).map((row) => row.permission_id);
    if (permissionIds.length > 0) {
      const {data: selectedPermissions, error: selectedError} = await admin
        .from('permissions')
        .select('code')
        .in('id', permissionIds);

      if (selectedError) throw new Error(selectedError.message);

      selectedCodes = [
        ...new Set(
          (selectedPermissions ?? [])
            .map((row) => row.code)
            .filter((code): code is string => Boolean(code)),
        ),
      ];
    }
  }

  return {
    roleName: name,
    description: ROLE_DESCRIPTIONS[name],
    permissions: (permissions ?? []).map((permission) => ({
      id: permission.id,
      code: permission.code,
      resource: permission.resource,
      action: permission.action,
      description: permission.description,
    })),
    selectedCodes,
  };
}

/**
 * Applies the permission matrix to ALL companies' roles with the given business name.
 * Platform Master only — uses service_role after OWNER gate in the action layer.
 */
export async function applyBusinessRolePermissions(input: {
  roleName: BusinessRoleName;
  permissionCodes: string[];
  actorProfileId: string | null;
}): Promise<{updatedRoles: number}> {
  const admin = createAdminClient();

  const {data: permissions, error: permissionsError} = await admin
    .from('permissions')
    .select('id, code')
    .in('code', input.permissionCodes);

  if (permissionsError) {
    throw new Error(permissionsError.message);
  }

  const permissionIds = (permissions ?? []).map((permission) => permission.id);
  if (permissionIds.length !== input.permissionCodes.length) {
    throw new Error('Uma ou mais permissões são inválidas.');
  }

  const {data: roles, error: rolesError} = await admin
    .from('roles')
    .select('id, company_id')
    .eq('name', input.roleName)
    .is('deleted_at', null)
    .eq('status', 'active');

  if (rolesError) {
    throw new Error(rolesError.message);
  }

  const targetRoles = roles ?? [];
  if (targetRoles.length === 0) {
    return {updatedRoles: 0};
  }

  const roleIds = targetRoles.map((role) => role.id);

  const {error: deleteError} = await admin
    .from('role_permissions')
    .delete()
    .in('role_id', roleIds);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (permissionIds.length > 0) {
    const rows = targetRoles.flatMap((role) =>
      permissionIds.map((permissionId) => ({
        role_id: role.id,
        permission_id: permissionId,
        company_id: role.company_id,
        created_by: input.actorProfileId,
      })),
    );

    // Chunk inserts to avoid payload limits.
    const chunkSize = 500;
    for (let index = 0; index < rows.length; index += chunkSize) {
      const chunk = rows.slice(index, index + chunkSize);
      const {error: insertError} = await admin
        .from('role_permissions')
        .insert(chunk);

      if (insertError) {
        throw new Error(insertError.message);
      }
    }
  }

  return {updatedRoles: targetRoles.length};
}

/** Kept for typing convenience when callers already have a supabase client. */
export type MasterRolesSupabase = SupabaseClient;
