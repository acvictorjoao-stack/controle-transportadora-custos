import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

import {mapCustomerDocumentRow} from '@/features/customers/services/mappers';
import {mapDriverDocumentRow, mapDriverRow} from '@/features/drivers/services/mappers';
import {mapFinancialDocumentRow} from '@/features/financial/services/mappers';
import {mapFuelDocumentRow} from '@/features/fuel/services/mappers';
import {mapMaintenanceDocumentRow} from '@/features/maintenance/services/mappers';
import {mapTireDocumentRow} from '@/features/tires/services/mappers';
import {mapTripDocumentRow, mapTripExpenseRow} from '@/features/trips/services/mappers';
import {createTripExpenseSchema} from '@/features/trips/validation/schemas';
import {mapVehicleDocumentRow, mapVehicleRow} from '@/features/vehicles/services/mappers';
import {uploadVehicleFileSchema} from '@/features/vehicles/validation/schemas';
import {
  buildStorageFileUrl,
  extractStorageObjectPath,
  isCompanyStoragePath,
  STORAGE_FILE_ROUTE,
} from '@/lib/storage/private-files';

const COMPANY = '0a000000-0000-4000-8000-00000000000a';
const ENTITY = '1a000000-0000-4000-8000-00000000000a';
const PATH = `${COMPANY}/${ENTITY}/document-1.pdf`;

function legacyPublicUrl(bucket: string, path = PATH) {
  return `https://projeto.supabase.co/storage/v1/object/public/${bucket}/${path}?t=1700000000000`;
}

describe('referência de arquivo privado', () => {
  it('extrai o path de path puro, rota da aplicação e URL pública/assinada legada', () => {
    expect(extractStorageObjectPath('vehicle-files', PATH)).toBe(PATH);
    expect(extractStorageObjectPath('vehicle-files', `${STORAGE_FILE_ROUTE}/vehicle-files/${PATH}?v=1`)).toBe(PATH);
    expect(extractStorageObjectPath('vehicle-files', legacyPublicUrl('vehicle-files'))).toBe(PATH);
    expect(
      extractStorageObjectPath(
        'vehicle-files',
        `https://projeto.supabase.co/storage/v1/object/sign/vehicle-files/${PATH}?token=abc`,
      ),
    ).toBe(PATH);
  });

  it('recusa bucket trocado, URL externa, path sem empresa e traversal', () => {
    expect(extractStorageObjectPath('driver-files', legacyPublicUrl('vehicle-files'))).toBeNull();
    expect(extractStorageObjectPath('vehicle-files', 'https://evil.example/arquivo.pdf')).toBeNull();
    expect(extractStorageObjectPath('vehicle-files', 'sem-empresa/arquivo.pdf')).toBeNull();
    expect(extractStorageObjectPath('vehicle-files', `${COMPANY}/../outra/arquivo.pdf`)).toBeNull();
    expect(
      extractStorageObjectPath('vehicle-files', `${STORAGE_FILE_ROUTE}/vehicle-files/${COMPANY}/%2e%2e/x.pdf`),
    ).toBeNull();
    expect(extractStorageObjectPath('vehicle-files', null)).toBeNull();
  });

  it('monta a rota privada com segmentos codificados e versão opcional', () => {
    expect(buildStorageFileUrl('vehicle-files', PATH)).toBe(`${STORAGE_FILE_ROUTE}/vehicle-files/${PATH}`);
    expect(buildStorageFileUrl('vehicle-files', `${COMPANY}/${ENTITY}/meu arquivo.pdf`, 'v1')).toBe(
      `${STORAGE_FILE_ROUTE}/vehicle-files/${COMPANY}/${ENTITY}/meu%20arquivo.pdf?v=v1`,
    );
    expect(buildStorageFileUrl('vehicle-files', 'https://evil.example/x.pdf')).toBeNull();
  });

  it('path pertence à empresa só pelo primeiro segmento', () => {
    expect(isCompanyStoragePath(COMPANY, PATH)).toBe(true);
    expect(isCompanyStoragePath('0b000000-0000-4000-8000-00000000000b', PATH)).toBe(false);
  });

  it('schemas aceitam só path válido e normalizam comprovante legado para path', () => {
    expect(
      uploadVehicleFileSchema.safeParse({
        vehicleId: ENTITY,
        storagePath: 'https://evil.example/x.pdf',
        name: 'x',
        documentType: 'document',
      }).success,
    ).toBe(false);

    const expense = createTripExpenseSchema.parse({
      tripId: ENTITY,
      expenseType: 'toll',
      amount: 10,
      receiptUrl: legacyPublicUrl('trip-files'),
    });
    expect(expense.receiptUrl).toBe(PATH);
    expect(
      createTripExpenseSchema.parse({tripId: ENTITY, expenseType: 'toll', amount: 10, receiptUrl: ''})
        .receiptUrl,
    ).toBeNull();
  });
});

describe('10. nenhuma URL pública é gerada pelo código', () => {
  const root = process.cwd();
  const SOURCE_DIRS = ['app', 'components', 'features', 'hooks', 'lib', 'contexts', 'supabase'];

  function sourceFiles(dir: string): string[] {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return [];
    }
    return entries.flatMap((entry) => {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        return entry === 'node_modules' || entry === '__tests__' || entry === 'migrations'
          ? []
          : sourceFiles(full);
      }
      return /\.(ts|tsx)$/.test(entry) ? [full] : [];
    });
  }

  it('não há getPublicUrl nem URLs /storage/v1/object/public no código da aplicação', () => {
    const offenders = SOURCE_DIRS.flatMap((dir) => sourceFiles(resolve(root, dir)))
      .filter((file) => /getPublicUrls?\(|storage\/v1\/object\/public/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(root, file));

    expect(offenders).toEqual([]);
  });

  it('next.config não libera mais o caminho público do Storage', () => {
    expect(readFileSync(resolve(root, 'next.config.ts'), 'utf8')).not.toContain('/object/public');
  });

  it('mappers convertem URLs públicas legadas em rota privada', () => {
    const legacyDoc = (bucket: string) => ({file_url: legacyPublicUrl(bucket), storage_path: null});
    const expected = (bucket: string) => `${STORAGE_FILE_ROUTE}/${bucket}/${PATH}`;
    const cases: Array<[string, string]> = [
      [mapVehicleDocumentRow(legacyDoc('vehicle-files') as never).fileUrl, expected('vehicle-files')],
      [mapDriverDocumentRow(legacyDoc('driver-files') as never).fileUrl, expected('driver-files')],
      [mapTripDocumentRow(legacyDoc('trip-files') as never).fileUrl, expected('trip-files')],
      [mapFuelDocumentRow(legacyDoc('fuel-files') as never).fileUrl, expected('fuel-files')],
      [mapMaintenanceDocumentRow(legacyDoc('maintenance-files') as never).fileUrl, expected('maintenance-files')],
      [mapTireDocumentRow(legacyDoc('tire-files') as never).fileUrl, expected('tire-files')],
      [mapFinancialDocumentRow(legacyDoc('financial-files') as never).fileUrl, expected('financial-files')],
      [mapCustomerDocumentRow(legacyDoc('customer-files') as never).fileUrl, expected('customer-files')],
      [
        mapTripExpenseRow({receipt_url: legacyPublicUrl('trip-files'), amount: 1} as never).receiptUrl!,
        expected('trip-files'),
      ],
    ];
    for (const [actual, url] of cases) {
      expect(actual).toBe(url);
    }

    const vehicle = mapVehicleRow({
      photo_url: legacyPublicUrl('vehicle-files', `${COMPANY}/${ENTITY}/photo.jpg`),
      crlv_url: null,
      photo_storage_path: null,
      updated_at: 'u1',
    } as never);
    expect(vehicle.photoUrl).toBe(`${STORAGE_FILE_ROUTE}/vehicle-files/${COMPANY}/${ENTITY}/photo.jpg?v=u1`);
    expect(vehicle.crlvUrl).toBeNull();

    const driver = mapDriverRow({
      photo_url: null,
      photo_storage_path: `${COMPANY}/${ENTITY}/photo.png`,
      updated_at: 'u2',
    } as never);
    expect(driver.photoUrl).toBe(`${STORAGE_FILE_ROUTE}/driver-files/${COMPANY}/${ENTITY}/photo.png?v=u2`);
  });
});
