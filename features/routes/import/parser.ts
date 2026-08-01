import * as XLSX from 'xlsx';

import {IMPORT_MAX_FILE_BYTES, cellToString} from '@/features/import';

import {ROUTE_IMPORT_HEADERS, type RouteImportRawRow} from './types';

const HEADER_ALIASES: Record<string, (typeof ROUTE_IMPORT_HEADERS)[number]> = {
  'NOME DA ROTA': 'Nome da Rota',
  NOME: 'Nome da Rota',
  ORIGEM: 'Origem',
  DESTINO: 'Destino',
  CLIENTE: 'Cliente',
  FILIAL: 'Filial',
  'DISTANCIA (KM)': 'Distância (KM)',
  'DISTÂNCIA (KM)': 'Distância (KM)',
  DISTANCIA: 'Distância (KM)',
  'DISTÂNCIA': 'Distância (KM)',
  'LEAD TIME (DIAS)': 'Lead Time (dias)',
  'LEAD TIME': 'Lead Time (dias)',
  LEADTIME: 'Lead Time (dias)',
  ATIVA: 'Ativa',
  ATIVO: 'Ativa',
  SITUACAO: 'Ativa',
  SITUAÇÃO: 'Ativa',
};

function normalizeHeader(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function resolveHeader(value: unknown): (typeof ROUTE_IMPORT_HEADERS)[number] | null {
  const raw = cellToString(value);
  if (!raw) return null;
  const exact = ROUTE_IMPORT_HEADERS.find(
    (header) => header.toLocaleLowerCase('pt-BR') === raw.toLocaleLowerCase('pt-BR'),
  );
  if (exact) return exact;
  return HEADER_ALIASES[normalizeHeader(raw)] ?? null;
}

export function buildRouteImportTemplateWorkbook(): XLSX.WorkBook {
  const sheet = XLSX.utils.aoa_to_sheet([
    [...ROUTE_IMPORT_HEADERS],
    [
      'São Luís → Imperatriz',
      'São Luís',
      'Imperatriz',
      'Cliente Exemplo',
      'Filial Matriz',
      350,
      2,
      'Sim',
    ],
  ]);
  sheet['!cols'] = ROUTE_IMPORT_HEADERS.map((header) => ({
    wch: Math.max(14, header.length + 2),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Rotas');
  return workbook;
}

export function workbookToArrayBuffer(workbook: XLSX.WorkBook): ArrayBuffer {
  const buffer = XLSX.write(workbook, {bookType: 'xlsx', type: 'array'});
  return buffer as ArrayBuffer;
}

export function parseRouteImportFile(buffer: ArrayBuffer, fileName: string): RouteImportRawRow[] {
  if (buffer.byteLength > IMPORT_MAX_FILE_BYTES) {
    throw new Error('Arquivo excede o tamanho máximo de 20 MB.');
  }

  const lower = fileName.toLowerCase();
  if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
    throw new Error('Formato inválido. Envie um arquivo .xlsx ou .xls.');
  }

  const workbook = XLSX.read(buffer, {type: 'array'});
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Planilha vazia.');
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (matrix.length === 0) {
    throw new Error('Planilha vazia.');
  }

  const headerRow = matrix[0] ?? [];
  const columnIndex = new Map<(typeof ROUTE_IMPORT_HEADERS)[number], number>();

  headerRow.forEach((cell, index) => {
    const header = resolveHeader(cell);
    if (header && !columnIndex.has(header)) {
      columnIndex.set(header, index);
    }
  });

  const requiredHeaders: (typeof ROUTE_IMPORT_HEADERS)[number][] = [
    'Origem',
    'Destino',
    'Cliente',
    'Filial',
    'Lead Time (dias)',
  ];
  const missing = requiredHeaders.filter((header) => !columnIndex.has(header));
  if (missing.length > 0) {
    throw new Error(`Colunas obrigatórias ausentes: ${missing.join(', ')}.`);
  }

  const rows: RouteImportRawRow[] = [];

  for (let i = 1; i < matrix.length; i += 1) {
    const line = matrix[i] ?? [];
    const isEmpty = line.every((cell) => cellToString(cell) === '');
    if (isEmpty) continue;

    const read = (header: (typeof ROUTE_IMPORT_HEADERS)[number]) => {
      const index = columnIndex.get(header);
      if (index == null) return '';
      return cellToString(line[index]);
    };

    rows.push({
      rowNumber: i + 1,
      routeName: read('Nome da Rota'),
      origin: read('Origem'),
      destination: read('Destino'),
      customerName: read('Cliente'),
      branchName: read('Filial'),
      distanceKm: read('Distância (KM)'),
      leadTimeDays: read('Lead Time (dias)'),
      active: read('Ativa'),
    });
  }

  if (rows.length === 0) {
    throw new Error('Nenhuma linha de dados encontrada na planilha.');
  }

  return rows;
}
