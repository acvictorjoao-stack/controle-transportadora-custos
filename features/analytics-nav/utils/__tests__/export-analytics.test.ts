import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {afterEach, describe, expect, it, vi} from 'vitest';
import * as XLSX from 'xlsx';

import type {AnalyticsExportPayload} from '../../types';
import {
  ANALYTICS_XLSX_EXTENSION,
  ANALYTICS_XLSX_MIME_TYPE,
  analyticsFilenameBase,
  analyticsPayloadToCsv,
  analyticsPayloadToMatrix,
  analyticsPayloadToXlsx,
  analyticsXlsxFilename,
  exportAnalyticsExcel,
  exportAnalyticsPdf,
  toAnalyticsSheetName,
} from '../export-analytics';

const payload: AnalyticsExportPayload = {
  title: 'Rentabilidade por Cliente',
  kpis: [
    {label: 'Receita Total', value: 'R$ 10.000,00'},
    {label: 'Margem Média', value: '31,0%'},
  ],
  columns: [
    {id: 'name', header: 'Cliente'},
    {id: 'revenue', header: 'Receita'},
    {id: 'profit', header: 'Lucro'},
    {id: 'status', header: 'Status'},
  ],
  rows: [
    {name: 'Mateus', revenue: 1000.5, profit: 310, status: 'Saudável', extra: 'ignorado'},
    {name: 'Cliente; "A", B\nLinha 2', revenue: '—', profit: null, status: undefined},
    {name: '=SUM(A1:A2)', revenue: 0, profit: -50.25, status: 'Crítica'},
  ],
};

function readWorkbook(buffer: ArrayBuffer) {
  const workbook = XLSX.read(new Uint8Array(buffer), {type: 'array'});
  const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
  return {workbook, sheet};
}

function bufferText(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString('latin1');
}

describe('Audit #23 — XLSX real', () => {
  it('gera pacote OOXML (zip com xl/workbook.xml), não CSV', async () => {
    const buffer = await analyticsPayloadToXlsx(payload);
    const bytes = new Uint8Array(buffer);

    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const text = bufferText(buffer);
    expect(text).toContain('[Content_Types].xml');
    expect(text).toContain('xl/workbook.xml');
    expect(text).toContain('xl/worksheets/sheet1.xml');
    expect(text.startsWith('\uFEFF')).toBe(false);
    expect(text).not.toContain('KPI;Valor');
  });

  it('preserva KPIs, cabeçalhos, linhas e ordem das colunas', async () => {
    const {sheet} = readWorkbook(await analyticsPayloadToXlsx(payload));
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      blankrows: true,
      raw: true,
    });

    expect(matrix).toEqual([
      ['KPI', 'Valor', null, null],
      ['Receita Total', 'R$ 10.000,00', null, null],
      ['Margem Média', '31,0%', null, null],
      [null, null, null, null],
      ['Cliente', 'Receita', 'Lucro', 'Status'],
      ['Mateus', 1000.5, 310, 'Saudável'],
      ['Cliente; "A", B\nLinha 2', '—', null, null],
      ['=SUM(A1:A2)', 0, -50.25, 'Crítica'],
    ]);
  });

  it('números viram células numéricas; textos não viram fórmula', async () => {
    const {sheet} = readWorkbook(await analyticsPayloadToXlsx(payload));

    expect(sheet.B6).toMatchObject({t: 'n', v: 1000.5});
    expect(sheet.C6).toMatchObject({t: 'n', v: 310});
    expect(sheet.C8).toMatchObject({t: 'n', v: -50.25});
    expect(sheet.B7).toMatchObject({t: 's', v: '—'});
    expect(sheet.A8).toMatchObject({t: 's', v: '=SUM(A1:A2)'});
    expect(sheet.A8.f).toBeUndefined();
    // Separadores de CSV permanecem dentro de uma única célula.
    expect(sheet.A7).toMatchObject({t: 's', v: 'Cliente; "A", B\nLinha 2'});
  });

  it('sem KPIs: cabeçalho na primeira linha; sem linhas: só cabeçalho', async () => {
    const {sheet} = readWorkbook(
      await analyticsPayloadToXlsx({
        title: 'Inteligência',
        columns: [
          {id: 'a', header: 'Rota'},
          {id: 'b', header: 'SLA'},
        ],
        rows: [],
      }),
    );
    expect(XLSX.utils.sheet_to_json(sheet, {header: 1})).toEqual([['Rota', 'SLA']]);
  });

  it('aba nomeada pelo título, sanitizada e limitada a 31 caracteres', async () => {
    const {workbook} = readWorkbook(await analyticsPayloadToXlsx(payload));
    expect(workbook.SheetNames).toEqual(['Rentabilidade por Cliente']);

    expect(toAnalyticsSheetName('Receita [mês]: 01/2026 * total?')).toBe(
      'Receita mês 01 2026 total',
    );
    expect(toAnalyticsSheetName('x'.repeat(40))).toHaveLength(31);
    expect(toAnalyticsSheetName(' / : ')).toBe('Dados');
  });

  it('extensão e nome do arquivo correspondem ao formato', () => {
    expect(ANALYTICS_XLSX_EXTENSION).toBe('.xlsx');
    expect(ANALYTICS_XLSX_MIME_TYPE).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(analyticsXlsxFilename('rentabilidade-clientes')).toBe(
      'rentabilidade-clientes.xlsx',
    );
  });
});

describe('Audit #23 — download do botão “Excel”', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('baixa .xlsx com MIME OOXML e conteúdo legível como planilha', async () => {
    const anchor = {href: '', download: '', click: vi.fn()};
    vi.stubGlobal('document', {createElement: vi.fn(() => anchor)});
    let downloaded: Blob | undefined;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      downloaded = blob as Blob;
      return 'blob:analytics';
    });
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await exportAnalyticsExcel(payload, 'rentabilidade-clientes');

    expect(anchor.download).toBe('rentabilidade-clientes.xlsx');
    expect(anchor.download.endsWith('.csv')).toBe(false);
    expect(anchor.href).toBe('blob:analytics');
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith('blob:analytics');

    expect(downloaded).toBeInstanceOf(Blob);
    expect(downloaded!.type).toBe(ANALYTICS_XLSX_MIME_TYPE);
    expect(downloaded!.type).not.toContain('csv');

    const {sheet} = readWorkbook(await downloaded!.arrayBuffer());
    expect(sheet.A5).toMatchObject({v: 'Cliente'});
    expect(sheet.A6).toMatchObject({v: 'Mateus'});
    expect(sheet.B6).toMatchObject({t: 'n', v: 1000.5});
  });

  it('fonte do export Excel não referencia CSV', () => {
    const source = readFileSync(resolve(__dirname, '../export-analytics.ts'), 'utf8');
    const start = source.indexOf('export async function exportAnalyticsExcel');
    const end = source.indexOf('function escapeHtml', start);
    const block = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(block).not.toMatch(/csv/i);
    expect(block).toContain('analyticsPayloadToXlsx');
  });
});

describe('Audit #24 — título da tabela e seções adicionais', () => {
  const withSections: AnalyticsExportPayload = {
    title: 'DRE Operacional',
    kpis: [{label: 'Receita Total', value: 'R$ 100,00'}],
    tableTitle: 'Tabela Analítica',
    columns: [
      {id: 'category', header: 'Categoria'},
      {id: 'value', header: 'Valor'},
    ],
    rows: [{category: 'Receita', value: 100}],
    sections: [
      {
        title: 'Indicadores',
        columns: [
          {id: 'indicator', header: 'Indicador'},
          {id: 'value', header: 'Valor'},
        ],
        rows: [{indicator: 'Viagens', value: 3}],
      },
      {
        title: 'Custos por Rota',
        columns: [{id: 'route', header: 'Rota'}],
        rows: [],
      },
    ],
  };

  it('matriz inclui título da principal e cada seção com título e cabeçalho', () => {
    expect(analyticsPayloadToMatrix(withSections)).toEqual([
      ['KPI', 'Valor'],
      ['Receita Total', 'R$ 100,00'],
      [],
      ['Tabela Analítica'],
      ['Categoria', 'Valor'],
      ['Receita', 100],
      [],
      ['Indicadores'],
      ['Indicador', 'Valor'],
      ['Viagens', 3],
      [],
      ['Custos por Rota'],
      ['Rota'],
    ]);
  });

  it('XLSX contém as seções com valores numéricos preservados', async () => {
    const {sheet} = readWorkbook(await analyticsPayloadToXlsx(withSections));
    expect(sheet.A4).toMatchObject({v: 'Tabela Analítica'});
    expect(sheet.B6).toMatchObject({t: 'n', v: 100});
    expect(sheet.A8).toMatchObject({v: 'Indicadores'});
    expect(sheet.B10).toMatchObject({t: 'n', v: 3});
    expect(sheet.A12).toMatchObject({v: 'Custos por Rota'});
  });

  it('payload sem tableTitle/sections mantém a matriz anterior', () => {
    const matrix = analyticsPayloadToMatrix(payload);
    expect(matrix[4]).toEqual(['Cliente', 'Receita', 'Lucro', 'Status']);
    expect(matrix).toHaveLength(8);
  });

  it('PDF renderiza título da principal e as seções', () => {
    const written: string[] = [];
    const fakeWindow = {
      document: {
        open: vi.fn(),
        write: (html: string) => written.push(html),
        close: vi.fn(),
      },
    };
    vi.stubGlobal('window', {open: vi.fn(() => fakeWindow)});
    try {
      exportAnalyticsPdf(withSections, 'dre-operacional_2026-10-01_2026-10-31');
    } finally {
      vi.unstubAllGlobals();
    }

    const html = written.join('');
    expect(html).toContain('<h2>Tabela Analítica</h2>');
    expect(html).toContain('<h2>Indicadores</h2>');
    expect(html).toContain('<td>Viagens</td><td>3</td>');
    expect(html).toContain('<h2>Custos por Rota</h2>');
    expect(html).toContain('Sem dados');
    expect(html).toContain('dre-operacional_2026-10-01_2026-10-31.pdf');
    expect(html).not.toContain('Tabela / Ranking');
  });

  it('nome base inclui o período quando existe', () => {
    expect(
      analyticsFilenameBase('dre-operacional', {dateFrom: '2026-10-01', dateTo: '2026-10-31'}),
    ).toBe('dre-operacional_2026-10-01_2026-10-31');
    expect(analyticsFilenameBase('dashboard-executivo', {dateFrom: '2026-10-01'})).toBe(
      'dashboard-executivo_2026-10-01',
    );
    expect(analyticsFilenameBase('dre-operacional')).toBe('dre-operacional');
    expect(analyticsFilenameBase('x', {dateFrom: '../a b'})).toBe('x_-a-b');
  });
});

describe('analyticsPayloadToCsv (regressão)', () => {
  it('gera CSV com KPIs e ranking', () => {
    const csv = analyticsPayloadToCsv({
      title: 'Rentabilidade',
      kpis: [{label: 'Receita', value: 'R$ 10'}],
      columns: [
        {id: 'name', header: 'Cliente'},
        {id: 'profit', header: 'Lucro'},
      ],
      rows: [{name: 'Mateus', profit: 310}],
    });

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('KPI;Valor');
    expect(csv).toContain('Receita;R$ 10');
    expect(csv).toContain('Cliente;Lucro');
    expect(csv).toContain('Mateus;310');
  });

  it('mantém saída idêntica (linha em branco, vazios e escape)', () => {
    expect(analyticsPayloadToCsv(payload)).toBe(
      '\uFEFF' +
        [
          'KPI;Valor',
          'Receita Total;"R$ 10.000,00"',
          'Margem Média;"31,0%"',
          '',
          'Cliente;Receita;Lucro;Status',
          'Mateus;1000.5;310;Saudável',
          '"Cliente; ""A"", B\nLinha 2";—;;',
          '=SUM(A1:A2);0;-50.25;Crítica',
        ].join('\r\n'),
    );
  });
});
