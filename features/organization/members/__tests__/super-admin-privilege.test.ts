import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {COMPANY_ACCESS_DENIED} from '@/lib/auth/company';
import {
  createInMemorySupabase,
  type InMemoryDatabase,
} from '@/features/organization/__tests__/in-memory-supabase';

import {SUPER_ADMIN_MANAGEMENT_DENIED} from '../business-roles';

const updateUserById = vi.fn(async () => ({data: {user: {id: 'auth'}}, error: null}));

let client: ReturnType<typeof createInMemorySupabase>;
let admin: ReturnType<typeof createInMemorySupabase>;

vi.mock('@/supabase/server', () => ({
  createClient: async () => client,
}));

vi.mock('@/supabase/server/admin', () => ({
  createAdminClient: () => admin,
}));

vi.mock('next/cache', () => ({revalidatePath: vi.fn()}));

const {
  createCompanyMemberAction,
  resetCompanyMemberPasswordAction,
  toggleCompanyMemberStatusAction,
  updateCompanyMemberAction,
} = await import('../actions/member-actions');

const COMPANY_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const COMPANY_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ROLE_SA = '11111111-1111-4111-8111-111111111111';
const ROLE_ADMIN = '22222222-2222-4222-8222-222222222222';
const ROLE_CONSULTA = '33333333-3333-4333-8333-333333333333';
const ROLE_OPERACIONAL = '44444444-4444-4444-8444-444444444444';
const ROLE_INVITE = '55555555-5555-4555-8555-555555555555';
const ROLE_SA_B = '66666666-6666-4666-8666-666666666666';
const MEMBER_COMMON = '77777777-7777-4777-8777-777777777777';
const MEMBER_SA = '88888888-8888-4888-8888-888888888888';
const MEMBER_B = '99999999-9999-4999-8999-999999999999';

const ADMIN_A = 'admin-a';
const INVITE_A = 'invite-a';
const READER_A = 'reader-a';
const INACTIVE_A = 'inactive-a';
const SUPER_A = 'super-a';
const MASTER = 'master-owner';
const COMMON = 'profile-common';
const SA_TARGET = 'profile-super';
const PROFILE_B = 'profile-b';

let db: InMemoryDatabase;

function role(id: string, companyId: string, name: string) {
  return {
    id,
    company_id: companyId,
    name,
    description: null,
    is_system: true,
    status: 'active',
    deleted_at: null,
  };
}

function member(input: {
  id: string;
  companyId: string;
  profileId: string;
  roleId: string;
  roleName: string;
  fullName: string;
  email: string;
  status?: 'active' | 'inactive';
}) {
  return {
    id: input.id,
    company_id: input.companyId,
    profile_id: input.profileId,
    role_id: input.roleId,
    status: input.status ?? 'active',
    deleted_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    roles: {
      id: input.roleId,
      name: input.roleName,
      is_system: true,
      status: 'active',
      deleted_at: null,
    },
    profiles: {
      full_name: input.fullName,
      email: input.email,
      phone: null,
      last_login_at: null,
    },
  };
}

function profile(id: string, email: string, fullName: string) {
  return {id, email, full_name: fullName, phone: null, deleted_at: null};
}

function form(
  roleId: string,
  email = 'comum@empresa.test',
  status: 'active' | 'inactive' = 'active',
) {
  return {
    fullName: 'Usuario Comum',
    email,
    phone: '',
    roleId,
    status,
  };
}

function membership(id: string) {
  return db.tables.company_members.find((row) => row.id === id)!;
}

function signInAs(userId: string | null) {
  const session = createInMemorySupabase(db, userId);
  client = session;
  admin = {
    ...createInMemorySupabase(db, null),
    auth: {
      ...createInMemorySupabase(db, null).auth,
      admin: {updateUserById},
    },
  } as typeof session;
}

beforeEach(() => {
  updateUserById.mockClear();
  db = {
    tables: {
      roles: [
        role(ROLE_SA, COMPANY_A, 'Super Admin'),
        role(ROLE_ADMIN, COMPANY_A, 'Administrador'),
        role(ROLE_CONSULTA, COMPANY_A, 'Consulta'),
        role(ROLE_OPERACIONAL, COMPANY_A, 'Operacional'),
        role(ROLE_INVITE, COMPANY_A, 'Cadastro'),
        role(ROLE_SA_B, COMPANY_B, 'Super Admin'),
      ],
      company_members: [
        member({
          id: 'member-admin',
          companyId: COMPANY_A,
          profileId: ADMIN_A,
          roleId: ROLE_ADMIN,
          roleName: 'Administrador',
          fullName: 'Admin',
          email: 'admin@empresa.test',
        }),
        member({
          id: 'member-invite',
          companyId: COMPANY_A,
          profileId: INVITE_A,
          roleId: ROLE_INVITE,
          roleName: 'Cadastro',
          fullName: 'Convite',
          email: 'convite@empresa.test',
        }),
        member({
          id: 'member-reader',
          companyId: COMPANY_A,
          profileId: READER_A,
          roleId: ROLE_CONSULTA,
          roleName: 'Consulta',
          fullName: 'Leitor',
          email: 'leitor@empresa.test',
        }),
        member({
          id: 'member-inactive',
          companyId: COMPANY_A,
          profileId: INACTIVE_A,
          roleId: ROLE_ADMIN,
          roleName: 'Administrador',
          fullName: 'Inativo',
          email: 'inativo@empresa.test',
          status: 'inactive',
        }),
        member({
          id: 'member-super-actor',
          companyId: COMPANY_A,
          profileId: SUPER_A,
          roleId: ROLE_SA,
          roleName: 'Super Admin',
          fullName: 'Super Ator',
          email: 'super.ator@empresa.test',
        }),
        member({
          id: MEMBER_COMMON,
          companyId: COMPANY_A,
          profileId: COMMON,
          roleId: ROLE_CONSULTA,
          roleName: 'Consulta',
          fullName: 'Usuario Comum',
          email: 'comum@empresa.test',
        }),
        member({
          id: MEMBER_SA,
          companyId: COMPANY_A,
          profileId: SA_TARGET,
          roleId: ROLE_SA,
          roleName: 'Super Admin',
          fullName: 'Super Alvo',
          email: 'super@empresa.test',
        }),
        member({
          id: MEMBER_B,
          companyId: COMPANY_B,
          profileId: PROFILE_B,
          roleId: ROLE_SA_B,
          roleName: 'Super Admin',
          fullName: 'Super B',
          email: 'super.b@empresa.test',
        }),
      ],
      profiles: [
        profile(COMMON, 'comum@empresa.test', 'Usuario Comum'),
        profile(SA_TARGET, 'super@empresa.test', 'Super Alvo'),
        profile(PROFILE_B, 'super.b@empresa.test', 'Super B'),
      ],
      portal_users: [],
    },
    rolePermissions: {
      [ROLE_ADMIN]: ['members:read', 'members:write', 'members:invite', 'profiles:write'],
      [ROLE_INVITE]: ['members:invite'],
      [ROLE_CONSULTA]: ['members:read'],
      [ROLE_SA]: ['members:read', 'members:write', 'members:invite'],
      [ROLE_OPERACIONAL]: ['members:read'],
      [ROLE_SA_B]: ['members:write'],
    },
  };
});

describe('escalação para Super Admin', () => {
  it('A. members:write não promove membro comum a Super Admin', async () => {
    signInAs(ADMIN_A);

    const result = await updateCompanyMemberAction(MEMBER_COMMON, form(ROLE_SA));

    expect(result).toEqual({success: false, error: SUPER_ADMIN_MANAGEMENT_DENIED});
    expect(membership(MEMBER_COMMON).role_id).toBe(ROLE_CONSULTA);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('B. members:invite não cria nem promove Super Admin', async () => {
    signInAs(INVITE_A);
    const before = db.tables.company_members.length;

    const created = await createCompanyMemberAction({
      fullName: 'Novo Super',
      email: 'novo@empresa.test',
      phone: '',
      roleId: ROLE_SA,
      status: 'active',
    });
    const promoted = await updateCompanyMemberAction(MEMBER_COMMON, form(ROLE_SA));

    expect(created).toEqual({success: false, error: SUPER_ADMIN_MANAGEMENT_DENIED});
    expect(promoted).toEqual({success: false, error: SUPER_ADMIN_MANAGEMENT_DENIED});
    expect(db.tables.company_members).toHaveLength(before);
    expect(membership(MEMBER_COMMON).role_id).toBe(ROLE_CONSULTA);
  });

  it('C. Administrador não altera a role de um Super Admin', async () => {
    signInAs(ADMIN_A);

    const result = await updateCompanyMemberAction(
      MEMBER_SA,
      form(ROLE_ADMIN, 'super@empresa.test'),
    );

    expect(result).toEqual({success: false, error: SUPER_ADMIN_MANAGEMENT_DENIED});
    expect(membership(MEMBER_SA).role_id).toBe(ROLE_SA);
  });

  it('D. Administrador não redefine a senha de um Super Admin', async () => {
    signInAs(ADMIN_A);

    const result = await resetCompanyMemberPasswordAction(MEMBER_SA);

    expect(result).toEqual({success: false, error: SUPER_ADMIN_MANAGEMENT_DENIED});
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('E. Administrador não altera o e-mail de um Super Admin', async () => {
    signInAs(ADMIN_A);

    const result = await updateCompanyMemberAction(
      MEMBER_SA,
      form(ROLE_SA, 'roubado@empresa.test'),
    );

    expect(result).toEqual({success: false, error: SUPER_ADMIN_MANAGEMENT_DENIED});
    expect(updateUserById).not.toHaveBeenCalled();
    expect(db.tables.profiles.find((row) => row.id === SA_TARGET)?.email).toBe(
      'super@empresa.test',
    );
  });

  it('Administrador não desativa um Super Admin', async () => {
    signInAs(ADMIN_A);

    const result = await toggleCompanyMemberStatusAction(MEMBER_SA, 'inactive');

    expect(result).toEqual({success: false, error: SUPER_ADMIN_MANAGEMENT_DENIED});
    expect(membership(MEMBER_SA).status).toBe('active');
  });

  it('F. sem members:write a alteração de role é negada', async () => {
    signInAs(READER_A);

    const result = await updateCompanyMemberAction(MEMBER_COMMON, form(ROLE_OPERACIONAL));

    expect(result).toEqual({success: false, error: COMPANY_ACCESS_DENIED});
    expect(membership(MEMBER_COMMON).role_id).toBe(ROLE_CONSULTA);
  });

  it('G. usuário de outra empresa não manipula membro pelo ID', async () => {
    signInAs(ADMIN_A);

    const updated = await updateCompanyMemberAction(MEMBER_B, form(ROLE_ADMIN, 'super.b@empresa.test'));
    const reset = await resetCompanyMemberPasswordAction(MEMBER_B);

    expect(updated).toEqual({
      success: false,
      error: 'Usuário não encontrado nesta empresa.',
    });
    expect(reset).toEqual({
      success: false,
      error: 'Usuário não encontrado nesta empresa.',
    });
    expect(membership(MEMBER_B).role_id).toBe(ROLE_SA_B);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('H. usuário inativo não executa as operações', async () => {
    signInAs(INACTIVE_A);

    const updated = await updateCompanyMemberAction(MEMBER_COMMON, form(ROLE_SA));
    const reset = await resetCompanyMemberPasswordAction(MEMBER_SA);

    expect(updated).toEqual({success: false, error: 'Empresa não encontrada.'});
    expect(reset).toEqual({success: false, error: 'Empresa não encontrada.'});
    expect(membership(MEMBER_COMMON).role_id).toBe(ROLE_CONSULTA);
    expect(updateUserById).not.toHaveBeenCalled();
  });
});

describe('gestão ordinária e Super Admin legítimo', () => {
  it('Administrador ainda altera role, e-mail e senha de membro comum', async () => {
    signInAs(ADMIN_A);

    const updated = await updateCompanyMemberAction(
      MEMBER_COMMON,
      form(ROLE_OPERACIONAL, 'novo@empresa.test'),
    );
    const reset = await resetCompanyMemberPasswordAction(MEMBER_COMMON);

    expect(updated.success).toBe(true);
    expect(membership(MEMBER_COMMON).role_id).toBe(ROLE_OPERACIONAL);
    expect(db.tables.profiles.find((row) => row.id === COMMON)?.email).toBe(
      'novo@empresa.test',
    );
    expect(updateUserById).toHaveBeenCalledWith(COMMON, {email: 'novo@empresa.test'});
    expect(reset.success).toBe(true);
    expect(updateUserById).toHaveBeenCalledWith(
      COMMON,
      expect.objectContaining({password: expect.any(String)}),
    );
  });

  it('Administrador ainda desativa membro comum', async () => {
    signInAs(ADMIN_A);

    const result = await toggleCompanyMemberStatusAction(MEMBER_COMMON, 'inactive');

    expect(result.success).toBe(true);
    expect(membership(MEMBER_COMMON).status).toBe('inactive');
  });

  it('Super Admin promove membro comum e redefine senha de outro Super Admin', async () => {
    signInAs(SUPER_A);

    const promoted = await updateCompanyMemberAction(MEMBER_COMMON, form(ROLE_SA));
    const reset = await resetCompanyMemberPasswordAction(MEMBER_SA);

    expect(promoted.success).toBe(true);
    expect(membership(MEMBER_COMMON).role_id).toBe(ROLE_SA);
    expect(reset.success).toBe(true);
    expect(updateUserById).toHaveBeenCalledWith(
      SA_TARGET,
      expect.objectContaining({password: expect.any(String)}),
    );
  });

  it('Portal Master atuando ainda promove um membro a Super Admin', async () => {
    db.portalOwnerIds = [MASTER];
    db.tables.portal_acting_companies = [{profile_id: MASTER, company_id: COMPANY_A}];
    db.tables.companies = [
      {
        id: COMPANY_A,
        trade_name: 'Empresa A',
        legal_name: 'Empresa A',
        status: 'active',
        deleted_at: null,
      },
    ];
    signInAs(MASTER);

    const result = await updateCompanyMemberAction(MEMBER_COMMON, form(ROLE_SA));

    expect(result.success).toBe(true);
    expect(membership(MEMBER_COMMON).role_id).toBe(ROLE_SA);
  });
});

describe('migration 098', () => {
  const migration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/098_super_admin_membership_guard.sql'),
    'utf8',
  );

  it('protege role, status e e-mail de Super Admin sem fechar o Portal Master', () => {
    expect(migration).toContain('auth.uid() is null');
    expect(migration).toContain('public.is_company_super_admin(p_company_id)');
    expect(migration).toContain('public.is_portal_owner()');
    expect(migration).toContain('public.company_has_active_members(new.company_id)');
    expect(migration).toContain('create trigger company_members_protect_super_admin');
    expect(migration).toContain('create trigger profiles_protect_super_admin_email');
    expect(migration).toContain(
      'revoke all on function public.protect_super_admin_membership()',
    );
    expect(migration).not.toContain('drop policy');
  });
});
