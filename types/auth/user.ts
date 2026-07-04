import type {User} from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export function mapSupabaseUser(user: User): AuthUser {
  const metadata = user.user_metadata ?? {};

  return {
    id: user.id,
    email: user.email ?? '',
    name:
      (typeof metadata.full_name === 'string' && metadata.full_name.trim()) ||
      user.email?.split('@')[0] ||
      'Usuário',
    avatarUrl:
      typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null,
  };
}
