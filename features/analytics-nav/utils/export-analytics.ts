import type {AnalyticsExportPayload} from '../types';

export const ANALYTICS_XLSX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const ANALYTICS_XLSX_EXTENSION = '.xlsx';

type AnalyticsSheetCell = string | number | null;

/**
 * Matriz única da exportação (CSV e XLSX): bloco de KPIs, linha em branco,
 * cabeçalho e linhas da tabela, na ordem de `payload.columns`.
 */
export function analyticsPayloadToMatrix(
  payload: AnalyticsExportPayload,
): AnalyticsSheetCell[][] {
  const matrix: AnalyticsSheetCell[][] = [];

  if (payload.kpis?.length) {
    matrix.push(['KPI', 'Valor']);
    for (const kpi of payload.kpis) {
      matrix.push([kpi.label, kpi.value]);
    }
    matrix.push([]);
  }

  matrix.push(payload.columns.map((col) => col.header));
  for (const row of payload.rows) {
    matrix.push(payload.columns.map((col) => row[col.id] ?? null));
  }

  return matrix;
}

function escapeCsvCell(value: AnalyticsSheetCell): string {
  const raw = value == null ? '' : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

/** Gera CSV com BOM UTF-8 (abre corretamente no Excel). */
export function analyticsPayloadToCsv(payload: AnalyticsExportPayload): string {
  const lines = analyticsPayloadToMatrix(payload).map((cells) =>
    cells.map(escapeCsvCell).join(';'),
  );
  return `\uFEFF${lines.join('\r\n')}`;
}

/** Nome de aba válido no Excel: até 31 caracteres, sem `[]:*?/\`. */
export function toAnalyticsSheetName(title: string): string {
  const cleaned = title.replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 31).trim() || 'Dados';
}

/** Gera planilha XLSX (OOXML) com o mesmo conteúdo do CSV. */
export async function analyticsPayloadToXlsx(
  payload: AnalyticsExportPayload,
): Promise<ArrayBuffer> {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet(analyticsPayloadToMatrix(payload));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, toAnalyticsSheetName(payload.title));
  return XLSX.write(workbook, {bookType: 'xlsx', type: 'array'}) as ArrayBuffer;
}

export function analyticsXlsxFilename(filenameBase: string): string {
  return `${filenameBase}${ANALYTICS_XLSX_EXTENSION}`;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportAnalyticsExcel(
  payload: AnalyticsExportPayload,
  filenameBase: string,
): Promise<void> {
  const buffer = await analyticsPayloadToXlsx(payload);
  downloadBlob(
    analyticsXlsxFilename(filenameBase),
    new Blob([buffer], {type: ANALYTICS_XLSX_MIME_TYPE}),
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Abre documento imprimível para salvar como PDF. */
export function exportAnalyticsPdf(
  payload: AnalyticsExportPayload,
  filenameBase: string,
) {
  const kpiHtml = payload.kpis?.length
    ? `<section><h2>KPIs</h2><ul>${payload.kpis
        .map(
          (kpi) =>
            `<li><strong>${escapeHtml(kpi.label)}</strong>: ${escapeHtml(kpi.value)}</li>`,
        )
        .join('')}</ul></section>`
    : '';

  const headerHtml = payload.columns
    .map((col) => `<th>${escapeHtml(col.header)}</th>`)
    .join('');

  const bodyHtml = payload.rows
    .map((row) => {
      const cells = payload.columns
        .map((col) => `<td>${escapeHtml(String(row[col.id] ?? ''))}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(payload.title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 18px; margin-bottom: 8px; }
    h2 { font-size: 14px; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
    th { background: #f4f4f4; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(payload.title)}</h1>
  <p style="color:#666;font-size:12px">Arquivo: ${escapeHtml(filenameBase)}.pdf</p>
  ${kpiHtml}
  <section>
    <h2>Tabela / Ranking</h2>
    <table>
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${bodyHtml || '<tr><td colspan="99">Sem dados</td></tr>'}</tbody>
    </table>
  </section>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}

export async function copyShareableAnalyticsUrl(url: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch {
    // fallback below
  }

  try {
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(input);
    return ok;
  } catch {
    return false;
  }
}
