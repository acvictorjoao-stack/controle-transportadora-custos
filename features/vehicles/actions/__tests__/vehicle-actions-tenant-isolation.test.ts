import {beforeEach, describe, expect, it, vi} from 'vitest';

import {COMPANY_ACCESS_DENIED} from '@/lib/auth/company';

import {
  createInMemorySupabase,
  type InMemoryDatabase,
} from '@/features/organization/__tests__/in-memory-supabase';

/**
 * Executa a cadeia real: Server Action → lib/auth/company (empresa derivada da
 * sessão + has_company_permission) → queries de veículos. O banco em memória
 * não tem RLS, então o isolamento verificado aqui é o da camada de servidor.
 */

let client: ReturnType<typeof createInMemorySupabase>;

vi.mock('@/supabase/server', () => ({
  createClient: async () => client,
}));

vi.mock('next/cache', () => ({revalidatePath: vi.fn()}));

const {
  deleteVehicleAction,
  getVehicleForEditAction,
  updateVehicleStatusAction,
} = await import('../vehicle-actions');

const COMPANY_A = '0a000000-0000-4000-8000-00000000000a';
const COMPANY_B = '0b000000-0000-4000-8000-00000000000b';
const VEHICLE_A = '1a000000-0000-4000-8000-00000000000a';
const VEHICLE_B = '1b000000-0000-4000-8000-00000000000b';

const ADMIN_A = 'admin-a';
const OPERATOR_A = 'operator-a';
const INACTIVE_A = 'inactive-a';

let db: InMemoryDatabase;

function vehicle(id: string) {
  return db.tables.vehicles.find((row) => row.id === id)!;
}

function signInAs(userId: string | null) {
  client = createInMemorySupabase(db, userId);
}

beforeEach(() => {
  db = {
    tables: {
      company_members: [
        {company_id: COMPANY_A, profile_id: ADMIN_A, role_id: 'role-a-admin', default_branch_id: null, status: 'active', deleted_at: null},
        {company_id: COMPANY_A, profile_id: OPERATOR_A, role_id: 'role-a-operator', default_branch_id: null, status: 'active', deleted_at: null},
        {company_id: COMPANY_A, profile_id: INACTIVE_A, role_id: 'role-a-admin', default_branch_id: null, status: 'inactive', deleted_at: null},
      ],
      vehicles: [
        {id: VEHICLE_A, company_id: COMPANY_A, plate: 'AAA1A11', asset_status: 'active', status: 'active', deleted_at: null},
        {id: VEHICLE_B, company_id: COMPANY_B, plate: 'BBB2B22', asset_status: 'active', status: 'active', deleted_at: null},
      ],
    },
    rolePermissions: {
      'role-a-admin': ['vehicles:read', 'vehicles:create', 'vehicles:update', 'vehicles:delete'],
      'role-a-operator': ['vehicles:read', 'vehicles:update'],
    },
  };
});

describe('isolamento entre empresas — veículos', () => {
  it('Empresa A não lê veículo da Empresa B pelo ID', async () => {
    signInAs(ADMIN_A);

    const own = await getVehicleForEditAction(VEHICLE_A);
    expect(own.success && own.data.id).toBe(VEHICLE_A);

    const other = await getVehicleForEditAction(VEHICLE_B);
    expect(other).toEqual({success: false, error: 'Veículo não encontrado.'});
  });

  it('Empresa A não altera veículo da Empresa B, nem enviando companyId da B', async () => {
    signInAs(ADMIN_A);

    const result = await updateVehicleStatusAction(VEHICLE_B, {
      assetStatus: 'sold',
      companyId: COMPANY_B,
    });

    expect(result.success).toBe(false);
    expect(vehicle(VEHICLE_B).asset_status).toBe('active');

    const own = await updateVehicleStatusAction(VEHICLE_A, {assetStatus: 'maintenance'});
    expect(own.success).toBe(true);
    expect(vehicle(VEHICLE_A).asset_status).toBe('maintenance');
  });

  it('Empresa A não exclui veículo da Empresa B', async () => {
    signInAs(ADMIN_A);

    await deleteVehicleAction(VEHICLE_B);
    expect(vehicle(VEHICLE_B).deleted_at).toBeNull();

    await deleteVehicleAction(VEHICLE_A);
    expect(vehicle(VEHICLE_A).deleted_at).not.toBeNull();
  });
});

describe('permissão verificada no servidor', () => {
  it('sem vehicles:delete a exclusão é negada antes de tocar o banco', async () => {
    signInAs(OPERATOR_A);

    const result = await deleteVehicleAction(VEHICLE_A);

    expect(result).toEqual({success: false, error: COMPANY_ACCESS_DENIED});
    expect(vehicle(VEHICLE_A).deleted_at).toBeNull();
  });

  it('membro inativo não executa ação protegida', async () => {
    signInAs(INACTIVE_A);

    const result = await updateVehicleStatusAction(VEHICLE_A, {assetStatus: 'sold'});

    expect(result.success).toBe(false);
    expect(vehicle(VEHICLE_A).asset_status).toBe('active');
  });
});

describe('sem sessão', () => {
  it('não lê, não altera e não exclui', async () => {
    signInAs(null);

    const results = await Promise.all([
      getVehicleForEditAction(VEHICLE_A),
      updateVehicleStatusAction(VEHICLE_A, {assetStatus: 'sold'}),
      deleteVehicleAction(VEHICLE_A),
    ]);

    for (const result of results) {
      expect(result).toEqual({success: false, error: 'Empresa não encontrada.'});
    }
    expect(vehicle(VEHICLE_A)).toMatchObject({asset_status: 'active', deleted_at: null});
  });
});
