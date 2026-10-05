import type {NextRequest} from 'next/server';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {COMPANY_ACCESS_DENIED} from '@/lib/auth/company';
import {
  buildStorageFileUrl,
  PRIVATE_STORAGE_BUCKETS,
  SIGNED_URL_TTL_SECONDS,
  STORAGE_FILE_ROUTE,
  STORAGE_PATH_OUTSIDE_COMPANY,
} from '@/lib/storage/private-files';

import {createInMemorySupabase, type InMemoryDatabase} from './in-memory-supabase';
import {InMemoryStorage} from './in-memory-storage';

/**
 * Cadeia real da aplicação (Route Handler /api/storage, Server Actions, queries
 * e mappers) contra um Storage emulado cujas policies e visibilidade de bucket
 * vêm das migrations. Prova o contrato da aplicação; o comportamento do
 * Supabase Storage em si precisa ser validado no projeto real após aplicar 097.
 */

let client: ReturnType<typeof createInMemorySupabase<ReturnType<InMemoryStorage['clientFor']>>>;

vi.mock('@/supabase/server', () => ({
  createClient: async () => client,
}));
vi.mock('next/cache', () => ({revalidatePath: vi.fn()}));
vi.mock('@/lib/cache/reference-data', () => ({
  revalidateCompanyProfile: vi.fn(),
  revalidateCustomersSelect: vi.fn(),
}));

const {GET} = await import('@/app/api/storage/[bucket]/[...path]/route');
const {registerVehicleFileAction, deleteVehicleDocumentAction} = await import(
  '@/features/vehicles/actions/vehicle-actions'
);
const {replaceCustomerDocumentAction} = await import('@/features/customers/actions/customer-actions');
const {updateCompanyLogoAction} = await import(
  '@/features/organization/companies/actions/company-actions'
);
const {mapCompanyProfileRow} = await import('@/features/organization/companies/services/mappers');

const COMPANY_A = '0a000000-0000-4000-8000-00000000000a';
const COMPANY_B = '0b000000-0000-4000-8000-00000000000b';
const VEHICLE_A = '1a000000-0000-4000-8000-00000000000a';
const VEHICLE_B = '1b000000-0000-4000-8000-00000000000b';
const CUSTOMER_A = '2a000000-0000-4000-8000-00000000000a';
const VEHICLE_DOC_A = '3a000000-0000-4000-8000-00000000000a';
const CUSTOMER_DOC_A = '4a000000-0000-4000-8000-00000000000a';

const ADMIN_A = 'admin-a';
const VIEWER_A = 'viewer-a';
const FUEL_ONLY_A = 'fuel-only-a';
const ADMIN_B = 'admin-b';

const DOC_A = `${COMPANY_A}/${VEHICLE_A}/document-1.pdf`;
const DOC_B = `${COMPANY_B}/${VEHICLE_B}/document-1.pdf`;
const LOGO_A = `${COMPANY_A}/logo.png`;
const CONTRACT_A = `${COMPANY_A}/${CUSTOMER_A}/contract-1.pdf`;
const LEGACY_LOGO_URL = `https://projeto.supabase.co/storage/v1/object/public/company-logos/${LOGO_A}?t=1700000000000`;

let db: InMemoryDatabase;
let storage: InMemoryStorage;

function signInAs(userId: string | null) {
  client = createInMemorySupabase(db, userId, storage.clientFor(userId));
}

function bucketOf(userId: string | null, bucket: string) {
  return storage.clientFor(userId).from(bucket);
}

/** Abre a URL de exibição como o navegador: rota da aplicação → redirect → Storage. */
async function open(userId: string | null, appUrl: string) {
  signInAs(userId);
  const [bucket, ...path] = appUrl
    .slice(STORAGE_FILE_ROUTE.length + 1)
    .split('?')[0]
    .split('/')
    .map(decodeURIComponent);
  const response = await GET({} as NextRequest, {params: Promise.resolve({bucket, path})});
  const location = response.headers.get('location');
  return {
    status: response.status,
    cacheControl: response.headers.get('cache-control'),
    location,
    body: location ? storage.downloadSigned(location) : null,
  };
}

function vehicleFileUrl(path: string) {
  return buildStorageFileUrl('vehicle-files', path)!;
}

beforeEach(() => {
  db = {
    tables: {
      company_members: [
        {company_id: COMPANY_A, profile_id: ADMIN_A, role_id: 'role-a-admin', default_branch_id: null, status: 'active', deleted_at: null},
        {company_id: COMPANY_A, profile_id: VIEWER_A, role_id: 'role-a-viewer', default_branch_id: null, status: 'active', deleted_at: null},
        {company_id: COMPANY_A, profile_id: FUEL_ONLY_A, role_id: 'role-a-fuel', default_branch_id: null, status: 'active', deleted_at: null},
        {company_id: COMPANY_B, profile_id: ADMIN_B, role_id: 'role-b-admin', default_branch_id: null, status: 'active', deleted_at: null},
      ],
      companies: [
        {id: COMPANY_A, legal_name: 'Empresa A', logo_url: LEGACY_LOGO_URL, settings: {}, status: 'active', updated_at: '2026-10-01T00:00:00Z', deleted_at: null},
        {id: COMPANY_B, legal_name: 'Empresa B', logo_url: null, settings: {}, status: 'active', updated_at: '2026-10-01T00:00:00Z', deleted_at: null},
      ],
      vehicles: [
        {id: VEHICLE_A, company_id: COMPANY_A, plate: 'AAA1A11', status: 'active', updated_at: '2026-10-01T00:00:00Z', deleted_at: null},
        {id: VEHICLE_B, company_id: COMPANY_B, plate: 'BBB2B22', status: 'active', updated_at: '2026-10-01T00:00:00Z', deleted_at: null},
      ],
      vehicle_documents: [
        {id: VEHICLE_DOC_A, company_id: COMPANY_A, vehicle_id: VEHICLE_A, name: 'doc.pdf', file_url: DOC_A, storage_path: DOC_A, document_type: 'document', deleted_at: null},
      ],
      customer_documents: [
        {id: CUSTOMER_DOC_A, company_id: COMPANY_A, customer_id: CUSTOMER_A, name: 'contrato.pdf', file_url: CONTRACT_A, storage_path: CONTRACT_A, document_type: 'contract', deleted_at: null},
      ],
    },
    rolePermissions: {
      'role-a-admin': ['vehicles:read', 'vehicles:update', 'customers:read', 'customers:update', 'companies:write'],
      'role-a-viewer': ['vehicles:read'],
      'role-a-fuel': ['fuel:read'],
      'role-b-admin': ['vehicles:read', 'vehicles:update'],
    },
  };

  storage = new InMemoryStorage(db);
  storage.seed('vehicle-files', DOC_A, 'pdf-a');
  storage.seed('vehicle-files', DOC_B, 'pdf-b');
  storage.seed('company-logos', LOGO_A, 'logo-a');
  storage.seed('customer-files', CONTRACT_A, 'contrato-a');
});

describe('1. buckets não são públicos', () => {
  it('nenhum bucket empresarial aceita download pela URL pública', () => {
    for (const bucket of PRIVATE_STORAGE_BUCKETS) {
      expect([bucket, storage.buckets[bucket]]).toEqual([bucket, false]);
    }
    expect(storage.downloadPublic('vehicle-files', DOC_A)).toBeNull();
    expect(storage.downloadPublic('company-logos', LOGO_A)).toBeNull();
  });
});

describe('2. usuário da Empresa A acessa arquivo autorizado da Empresa A', () => {
  it('rota redireciona para URL assinada que entrega o arquivo, sem cache', async () => {
    const result = await open(ADMIN_A, vehicleFileUrl(DOC_A));

    expect(result.status).toBe(302);
    expect(result.location).toContain('/storage/v1/object/sign/vehicle-files/');
    expect(result.location).not.toContain('/object/public/');
    expect(result.body).toBe('pdf-a');
    expect(result.cacheControl).toContain('no-store');
  });

  it('quem só tem vehicles:read também visualiza', async () => {
    expect((await open(VIEWER_A, vehicleFileUrl(DOC_A))).body).toBe('pdf-a');
  });
});

describe('3. usuário da Empresa A não acessa arquivo da Empresa B', () => {
  it('path de outra empresa responde 404 e não gera URL assinada', async () => {
    const result = await open(ADMIN_A, vehicleFileUrl(DOC_B));
    expect(result).toMatchObject({status: 404, location: null});
  });

  it('não lista a pasta da outra empresa', async () => {
    const {data} = await bucketOf(ADMIN_A, 'vehicle-files').list(`${COMPANY_B}/${VEHICLE_B}`);
    expect(data).toEqual([]);
  });

  it('trocar o path de uma URL assinada válida não abre o arquivo da outra empresa', async () => {
    const {location} = await open(ADMIN_A, vehicleFileUrl(DOC_A));
    const tampered = location!.replace(DOC_A, DOC_B);
    expect(storage.downloadSigned(tampered)).toBeNull();
  });

  it('a Empresa B continua acessando o próprio arquivo', async () => {
    expect((await open(ADMIN_B, vehicleFileUrl(DOC_B))).body).toBe('pdf-b');
    expect((await open(ADMIN_B, vehicleFileUrl(DOC_A))).status).toBe(404);
  });
});

describe('4. usuário sem <módulo>:read', () => {
  it('não baixa nem lista arquivos do módulo, mesmo na própria empresa', async () => {
    expect((await open(FUEL_ONLY_A, vehicleFileUrl(DOC_A))).status).toBe(404);

    const {data} = await bucketOf(FUEL_ONLY_A, 'vehicle-files').list(`${COMPANY_A}/${VEHICLE_A}`);
    expect(data).toEqual([]);
  });
});

describe('5. usuário não autenticado', () => {
  it('rota responde 401 e o Storage não assina nem lista', async () => {
    const result = await open(null, vehicleFileUrl(DOC_A));
    expect(result).toMatchObject({status: 401, location: null});

    const signed = await bucketOf(null, 'vehicle-files').createSignedUrl(DOC_A, 60);
    expect(signed.data).toBeNull();
    const {data} = await bucketOf(null, 'vehicle-files').list(`${COMPANY_A}/${VEHICLE_A}`);
    expect(data).toEqual([]);
  });
});

describe('6. expiração da URL assinada', () => {
  it(`vale por ${SIGNED_URL_TTL_SECONDS}s e depois é recusada`, async () => {
    expect(SIGNED_URL_TTL_SECONDS).toBe(60);
    const {location} = await open(ADMIN_A, vehicleFileUrl(DOC_A));

    storage.now += (SIGNED_URL_TTL_SECONDS - 1) * 1000;
    expect(storage.downloadSigned(location!)).toBe('pdf-a');

    storage.now += 2000;
    expect(storage.downloadSigned(location!)).toBeNull();
  });

  it('cada acesso gera uma URL nova; bucket ou path inválido não chega ao Storage', async () => {
    const first = await open(ADMIN_A, vehicleFileUrl(DOC_A));
    storage.now += 1000;
    const second = await open(ADMIN_A, vehicleFileUrl(DOC_A));
    expect(second.location).not.toBe(first.location);

    signInAs(ADMIN_A);
    const params = (bucket: string, path: string[]) => ({params: Promise.resolve({bucket, path})});
    expect((await GET({} as NextRequest, params('avatars', DOC_A.split('/')))).status).toBe(404);
    expect((await GET({} as NextRequest, params('vehicle-files', [COMPANY_A, '..', COMPANY_B, 'x.pdf']))).status).toBe(404);
    expect((await GET({} as NextRequest, params('vehicle-files', ['nao-uuid', 'x.pdf']))).status).toBe(404);
  });
});

describe('7. upload autorizado', () => {
  it('upload + registro grava só o path e o arquivo abre pela rota privada', async () => {
    const path = `${COMPANY_A}/${VEHICLE_A}/document-2.pdf`;
    expect((await bucketOf(ADMIN_A, 'vehicle-files').upload(path, 'pdf-novo')).error).toBeNull();

    signInAs(ADMIN_A);
    const result = await registerVehicleFileAction({
      vehicleId: VEHICLE_A,
      fileUrl: 'https://qualquer.coisa/arquivo.pdf',
      storagePath: path,
      name: 'novo.pdf',
      documentType: 'document',
      mimeType: 'application/pdf',
      fileSize: 10,
    });

    expect(result.success).toBe(true);
    const row = db.tables.vehicle_documents.find((doc) => doc.storage_path === path)!;
    expect(row.file_url).toBe(path);
    expect(result.success && 'fileUrl' in result.data && result.data.fileUrl).toBe(vehicleFileUrl(path));
    expect((await open(VIEWER_A, vehicleFileUrl(path))).body).toBe('pdf-novo');
  });

  it('foto substituída no mesmo path ganha versão nova na URL de exibição', async () => {
    const path = `${COMPANY_A}/${VEHICLE_A}/photo.jpg`;
    await bucketOf(ADMIN_A, 'vehicle-files').upload(path, 'foto');

    signInAs(ADMIN_A);
    const result = await registerVehicleFileAction({
      vehicleId: VEHICLE_A,
      storagePath: path,
      name: 'foto.jpg',
      documentType: 'photo',
    });

    expect(db.tables.vehicles[0]).toMatchObject({photo_url: path, photo_storage_path: path});
    const photoUrl = result.success && 'photoUrl' in result.data ? result.data.photoUrl : null;
    expect(photoUrl).toMatch(new RegExp(`^${STORAGE_FILE_ROUTE}/vehicle-files/${path}\\?v=`));
  });

  it('sem vehicles:update ou fora da pasta da empresa o upload é recusado', async () => {
    const own = `${COMPANY_A}/${VEHICLE_A}/document-3.pdf`;
    expect((await bucketOf(VIEWER_A, 'vehicle-files').upload(own, 'x')).error).not.toBeNull();
    expect((await bucketOf(ADMIN_A, 'vehicle-files').upload(`${COMPANY_B}/${VEHICLE_B}/x.pdf`, 'x')).error).not.toBeNull();
    expect((await bucketOf(null, 'vehicle-files').upload(own, 'x')).error).not.toBeNull();
  });

  it('registro com path de outra empresa é recusado no servidor', async () => {
    signInAs(ADMIN_A);
    const result = await registerVehicleFileAction({
      vehicleId: VEHICLE_A,
      storagePath: DOC_B,
      name: 'b.pdf',
      documentType: 'document',
    });

    expect(result).toEqual({success: false, error: STORAGE_PATH_OUTSIDE_COMPANY});
    expect(db.tables.vehicle_documents).toHaveLength(1);
  });
});

describe('8. exclusão e substituição/renomeação autorizadas', () => {
  it('excluir documento remove o registro e o objeto', async () => {
    signInAs(ADMIN_A);
    const result = await deleteVehicleDocumentAction(VEHICLE_DOC_A, VEHICLE_A);

    expect(result.success).toBe(true);
    expect(db.tables.vehicle_documents[0].deleted_at).not.toBeNull();
    expect(storage.has('vehicle-files', DOC_A)).toBe(false);
  });

  it('outra empresa não exclui o documento nem o objeto', async () => {
    signInAs(ADMIN_B);
    await deleteVehicleDocumentAction(VEHICLE_DOC_A, VEHICLE_A);

    expect(db.tables.vehicle_documents[0].deleted_at).toBeNull();
    expect(storage.has('vehicle-files', DOC_A)).toBe(true);

    const {data} = await bucketOf(ADMIN_B, 'vehicle-files').remove([DOC_A]);
    expect(data).toEqual([]);
    expect(storage.has('vehicle-files', DOC_A)).toBe(true);
  });

  it('substituir documento de cliente aponta para o novo path e remove o antigo', async () => {
    const newPath = `${COMPANY_A}/${CUSTOMER_A}/contract-2.pdf`;
    await bucketOf(ADMIN_A, 'customer-files').upload(newPath, 'contrato-novo');

    signInAs(ADMIN_A);
    const result = await replaceCustomerDocumentAction(CUSTOMER_A, CUSTOMER_DOC_A, {
      customerId: CUSTOMER_A,
      storagePath: newPath,
      name: 'contrato-v2.pdf',
      documentType: 'contract',
    });

    expect(result.success).toBe(true);
    expect(db.tables.customer_documents[0]).toMatchObject({file_url: newPath, storage_path: newPath});
    expect(storage.has('customer-files', CONTRACT_A)).toBe(false);
    expect(storage.has('customer-files', newPath)).toBe(true);
  });

  it('renomear (move) só dentro da pasta da própria empresa e com permissão de escrita', async () => {
    const renamed = `${COMPANY_A}/${VEHICLE_A}/document-renomeado.pdf`;
    expect((await bucketOf(VIEWER_A, 'vehicle-files').move(DOC_A, renamed)).error).not.toBeNull();
    expect((await bucketOf(ADMIN_A, 'vehicle-files').move(DOC_A, `${COMPANY_B}/${VEHICLE_B}/x.pdf`)).error).not.toBeNull();

    expect((await bucketOf(ADMIN_A, 'vehicle-files').move(DOC_A, renamed)).error).toBeNull();
    expect((await open(VIEWER_A, vehicleFileUrl(renamed))).body).toBe('pdf-a');
  });
});

describe('9. logo da empresa', () => {
  it('URL pública legada vira rota privada e abre para qualquer membro da empresa', async () => {
    const profile = mapCompanyProfileRow(db.tables.companies[0] as never);
    expect(profile.logoUrl).toBe(`${STORAGE_FILE_ROUTE}/company-logos/${LOGO_A}?v=2026-10-01T00%3A00%3A00Z`);

    expect((await open(VIEWER_A, profile.logoUrl!)).body).toBe('logo-a');
    expect((await open(FUEL_ONLY_A, profile.logoUrl!)).body).toBe('logo-a');
    expect((await open(ADMIN_B, profile.logoUrl!)).status).toBe(404);
    expect((await open(null, profile.logoUrl!)).status).toBe(401);
  });

  it('troca de logo grava o path e devolve a URL de exibição', async () => {
    signInAs(ADMIN_A);
    const result = await updateCompanyLogoAction({logoUrl: LOGO_A});

    expect(db.tables.companies[0].logo_url).toBe(LOGO_A);
    expect(result.success && result.data.logoUrl).toMatch(
      new RegExp(`^${STORAGE_FILE_ROUTE}/company-logos/${LOGO_A}\\?v=`),
    );
  });

  it('logo de outra empresa ou sem companies:write é recusada', async () => {
    signInAs(ADMIN_A);
    expect(await updateCompanyLogoAction({logoUrl: `${COMPANY_B}/logo.png`})).toEqual({
      success: false,
      error: STORAGE_PATH_OUTSIDE_COMPANY,
    });

    signInAs(VIEWER_A);
    expect(await updateCompanyLogoAction({logoUrl: LOGO_A})).toEqual({
      success: false,
      error: COMPANY_ACCESS_DENIED,
    });
    expect(db.tables.companies[0].logo_url).toBe(LEGACY_LOGO_URL);
  });

  it('upload da logo (list + remove + upload) funciona só na pasta da própria empresa', async () => {
    const admin = bucketOf(ADMIN_A, 'company-logos');
    expect((await admin.list(COMPANY_A)).data).toEqual([{name: 'logo.png'}]);
    expect((await admin.upload(`${COMPANY_A}/logo.webp`, 'logo-webp')).error).toBeNull();
    expect((await admin.remove([LOGO_A])).data).toEqual([{name: LOGO_A}]);

    expect((await bucketOf(ADMIN_B, 'company-logos').list(COMPANY_A)).data).toEqual([]);
    expect((await bucketOf(VIEWER_A, 'company-logos').upload(`${COMPANY_A}/logo.png`, 'x')).error).not.toBeNull();
  });
});
