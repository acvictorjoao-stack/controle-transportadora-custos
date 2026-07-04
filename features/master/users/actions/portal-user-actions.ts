'use server';

import {revalidatePath} from 'next/cache';

import {ROUTES} from '@/constants/routes/paths';
import {logPortalAudit, PORTAL_AUDIT_ACTIONS} from '@/features/master/audit';
import {PORTAL_ACCESS_DENIED, guardPortalOwner} from '@/lib/auth/guards';
import type {PortalRole} from '@/lib/auth/permissions';
import {zodFieldErrors} from '@/lib/validators/zod-field-errors';
import {
  createAdminAuthUser,
  resetAdminPassword,
  waitForProfile,
} from '@/features/master/provisioning/repositories/auth.repository';
import {generateTemporaryPassword} from '@/features/master/provisioning/services/password';
import {createClient} from '@/supabase/server';
import {createAdminClient} from '@/supabase/server/admin';

import {getPortalUserById} from '../queries';
import {
  createPortalUserSchema,
  updatePortalUserSchema,
  updatePortalUserRoleSchema,
} from '../validation';

export interface ActionError {
  success: false;
  error: string;
  fieldErrors?: Record<string, string>;
}

export interface ActionSuccess<T> {
  success: true;
  data: T;
}

export type ActionResult<T> = ActionSuccess<T> | ActionError;

export interface PortalUserCredentials {
  email: string;
  temporaryPassword: string;
}

async function assertOwner(): Promise<ActionError | null> {
  if (!(await guardPortalOwner())) {
    return {success: false, error: PORTAL_ACCESS_DENIED};
  }
  return null;
}

function revalidateUsersPath() {
  revalidatePath(ROUTES.masterUsuarios);
}

async function getActorContext() {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();
  return {
    profileId: user?.id ?? null,
    email: user?.email ?? null,
  };
}

export async function createPortalUserAction(
  input: unknown,
): Promise<ActionResult<PortalUserCredentials>> {
  const denied = await assertOwner();
  if (denied) return denied;

  const parsed = createPortalUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  const {fullName, email, role} = parsed.data;
  const temporaryPassword = generateTemporaryPassword();

  try {
    const authUser = await createAdminAuthUser({
      email,
      password: temporaryPassword,
      fullName,
    });

    await waitForProfile(authUser.id);

    const supabase = await createClient();
    const {data: portalUser, error} = await supabase
      .from('portal_users')
      .insert({
        profile_id: authUser.id,
        role,
        active: true,
      })
      .select('id')
      .single();

    if (error) {
      const admin = createAdminClient();
      await admin.auth.admin.deleteUser(authUser.id);
      throw new Error(error.message);
    }

    const actor = await getActorContext();
    await logPortalAudit({
      action: PORTAL_AUDIT_ACTIONS.USER_CREATE,
      actorProfileId: actor.profileId,
      actorEmail: actor.email,
      targetType: 'user',
      targetId: portalUser.id,
      targetLabel: email,
      metadata: {role, fullName},
    });

    revalidateUsersPath();
    return {
      success: true,
      data: {email, temporaryPassword},
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Erro ao criar usuário.',
    };
  }
}

export async function updatePortalUserAction(
  id: string,
  input: unknown,
): Promise<ActionResult<void>> {
  const denied = await assertOwner();
  if (denied) return denied;

  const parsed = updatePortalUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await createClient();
    const existing = await getPortalUserById(supabase, id);

    if (!existing) {
      return {success: false, error: 'Usuário não encontrado.'};
    }

    const admin = createAdminClient();

    const {error: profileError} = await admin
      .from('profiles')
      .update({
        full_name: parsed.data.fullName,
        email: parsed.data.email,
      })
      .eq('id', existing.profileId);

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (parsed.data.email !== existing.email) {
      const {error: authError} = await admin.auth.admin.updateUserById(
        existing.profileId,
        {email: parsed.data.email},
      );
      if (authError) {
        throw new Error(authError.message);
      }
    }

    if (parsed.data.role !== existing.role) {
      const {error: roleError} = await supabase
        .from('portal_users')
        .update({role: parsed.data.role})
        .eq('id', id);

      if (roleError) {
        throw new Error(roleError.message);
      }

      const actor = await getActorContext();
      await logPortalAudit({
        action: PORTAL_AUDIT_ACTIONS.USER_ROLE_CHANGE,
        actorProfileId: actor.profileId,
        actorEmail: actor.email,
        targetType: 'user',
        targetId: id,
        targetLabel: parsed.data.email,
        metadata: {from: existing.role, to: parsed.data.role},
      });
    }

    const actor = await getActorContext();
    await logPortalAudit({
      action: PORTAL_AUDIT_ACTIONS.USER_UPDATE,
      actorProfileId: actor.profileId,
      actorEmail: actor.email,
      targetType: 'user',
      targetId: id,
      targetLabel: parsed.data.email,
    });

    revalidateUsersPath();
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Erro ao atualizar usuário.',
    };
  }
}

export async function togglePortalUserStatusAction(
  id: string,
  active: boolean,
): Promise<ActionResult<void>> {
  const denied = await assertOwner();
  if (denied) return denied;

  try {
    const supabase = await createClient();
    const existing = await getPortalUserById(supabase, id);

    if (!existing) {
      return {success: false, error: 'Usuário não encontrado.'};
    }

    const {error} = await supabase
      .from('portal_users')
      .update({active})
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    const actor = await getActorContext();
    await logPortalAudit({
      action: active
        ? PORTAL_AUDIT_ACTIONS.USER_ACTIVATE
        : PORTAL_AUDIT_ACTIONS.USER_DEACTIVATE,
      actorProfileId: actor.profileId,
      actorEmail: actor.email,
      targetType: 'user',
      targetId: id,
      targetLabel: existing.email,
    });

    revalidateUsersPath();
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erro ao alterar status do usuário.',
    };
  }
}

export async function updatePortalUserRoleAction(
  id: string,
  input: unknown,
): Promise<ActionResult<void>> {
  const denied = await assertOwner();
  if (denied) return denied;

  const parsed = updatePortalUserRoleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Papel inválido.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await createClient();
    const existing = await getPortalUserById(supabase, id);

    if (!existing) {
      return {success: false, error: 'Usuário não encontrado.'};
    }

    if (existing.role === parsed.data.role) {
      return {success: true, data: undefined};
    }

    const {error} = await supabase
      .from('portal_users')
      .update({role: parsed.data.role})
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    const actor = await getActorContext();
    await logPortalAudit({
      action: PORTAL_AUDIT_ACTIONS.USER_ROLE_CHANGE,
      actorProfileId: actor.profileId,
      actorEmail: actor.email,
      targetType: 'user',
      targetId: id,
      targetLabel: existing.email,
      metadata: {from: existing.role, to: parsed.data.role},
    });

    revalidateUsersPath();
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Erro ao alterar papel.',
    };
  }
}

export async function resetPortalUserPasswordAction(
  id: string,
): Promise<ActionResult<PortalUserCredentials>> {
  const denied = await assertOwner();
  if (denied) return denied;

  try {
    const supabase = await createClient();
    const existing = await getPortalUserById(supabase, id);

    if (!existing) {
      return {success: false, error: 'Usuário não encontrado.'};
    }

    const temporaryPassword = generateTemporaryPassword();
    await resetAdminPassword(existing.profileId, temporaryPassword);

    const actor = await getActorContext();
    await logPortalAudit({
      action: PORTAL_AUDIT_ACTIONS.PASSWORD_RESET,
      actorProfileId: actor.profileId,
      actorEmail: actor.email,
      targetType: 'user',
      targetId: id,
      targetLabel: existing.email,
    });

    return {
      success: true,
      data: {email: existing.email, temporaryPassword},
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Erro ao resetar senha.',
    };
  }
}

export async function resendPortalUserInviteAction(
  id: string,
): Promise<ActionResult<PortalUserCredentials>> {
  return resetPortalUserPasswordAction(id);
}

export async function fetchPortalUserById(id: string) {
  const denied = await assertOwner();
  if (denied) return null;

  const supabase = await createClient();
  return getPortalUserById(supabase, id);
}
