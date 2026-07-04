import {createAdminClient} from '@/supabase/server/admin';

export async function createAdminAuthUser(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<{id: string; email: string}> {
  const admin = createAdminClient();

  const {data, error} = await admin.auth.admin.createUser({
    email: input.email.trim(),
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName.trim(),
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      throw new Error('Já existe um usuário com este e-mail de administrador.');
    }
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error('Falha ao criar usuário administrador.');
  }

  return {id: data.user.id, email: data.user.email ?? input.email};
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
