import {createAdminClient} from '@/supabase/server/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

async function hasActiveCompanyMembership(
  admin: AdminClient,
  profileId: string,
): Promise<boolean> {
  const {count, error} = await admin
    .from('company_members')
    .select('id', {count: 'exact', head: true})
    .eq('profile_id', profileId)
    .is('deleted_at', null)
    .eq('status', 'active');

  if (error) {
    throw new Error(error.message);
  }

  return (count ?? 0) > 0;
}

async function isActivePortalUser(
  admin: AdminClient,
  profileId: string,
): Promise<boolean> {
  const {count, error} = await admin
    .from('portal_users')
    .select('id', {count: 'exact', head: true})
    .eq('profile_id', profileId)
    .eq('active', true);

  if (error) {
    throw new Error(error.message);
  }

  return (count ?? 0) > 0;
}

/** Profile sem vínculo ativo com empresas e que não é operador do Portal Master. */
export async function isOrphanedTenantProfile(profileId: string): Promise<boolean> {
  const admin = createAdminClient();

  if (await isActivePortalUser(admin, profileId)) {
    return false;
  }

  return !(await hasActiveCompanyMembership(admin, profileId));
}

/** Remove auth.users (e profile em cascade) de perfis órfãos após exclusão de empresa. */
export async function cleanupOrphanedTenantAuthUsers(
  profileIds: string[],
): Promise<void> {
  const uniqueIds = [...new Set(profileIds)];

  for (const profileId of uniqueIds) {
    if (!(await isOrphanedTenantProfile(profileId))) {
      continue;
    }

    await deleteAuthUser(profileId);
  }
}

/**
 * Libera e-mail de administrador deixado órfão por exclusão anterior da empresa.
 * Retorna true se o e-mail foi recuperado e pode ser reutilizado.
 */
export async function reclaimOrphanedAdminEmail(email: string): Promise<boolean> {
  const admin = createAdminClient();
  const normalizedEmail = email.trim();

  const {data: profile, error} = await admin
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!profile) {
    return false;
  }

  if (!(await isOrphanedTenantProfile(profile.id))) {
    return false;
  }

  await deleteAuthUser(profile.id);
  return true;
}

export async function createAdminAuthUser(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<{id: string; email: string}> {
  const admin = createAdminClient();
  const email = input.email.trim();

  const createUser = () =>
    admin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName.trim(),
      },
    });

  let {data, error} = await createUser();

  if (error?.message.toLowerCase().includes('already')) {
    const reclaimed = await reclaimOrphanedAdminEmail(email);
    if (reclaimed) {
      ({data, error} = await createUser());
    }
  }

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      throw new Error('Já existe um usuário com este e-mail de administrador.');
    }
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error('Falha ao criar usuário administrador.');
  }

  return {id: data.user.id, email: data.user.email ?? email};
}

export async function deleteAuthUser(userId: string): Promise<void> {
  const admin = createAdminClient();
  const {error} = await admin.auth.admin.deleteUser(userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function resetAdminPassword(userId: string, password: string): Promise<void> {
  const admin = createAdminClient();
  const {error} = await admin.auth.admin.updateUserById(userId, {password});

  if (error) {
    throw new Error(error.message);
  }
}

export async function waitForProfile(
  profileId: string,
  maxAttempts = 5,
): Promise<void> {
  const admin = createAdminClient();

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const {data, error} = await admin
      .from('profiles')
      .select('id')
      .eq('id', profileId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
  }

  throw new Error('Profile do administrador não foi criado a tempo.');
}
