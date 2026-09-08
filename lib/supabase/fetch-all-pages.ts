/**
 * Paginação completa contra o teto PostgREST (`max_rows`, tipicamente 1000).
 *
 * Nunca trate `data.length === pageSize` como fim: use sempre `count: 'exact'`
 * na primeira página e continue até acumular `count` linhas.
 */

export const POSTGREST_PAGE_SIZE = 1000;

export type PagedFetchResult<T> = {
  data: T[] | null;
  error: {message: string; code?: string} | null;
  count: number | null;
};

export type FetchPageFn<T> = (
  from: number,
  to: number,
) => Promise<PagedFetchResult<T>>;

function defaultMapError(error: {message: string}): Error {
  return new Error(error.message);
}

/**
 * Busca todas as linhas de uma consulta, página a página.
 * `fetchPage` deve usar `.select(..., {count: 'exact'}).range(from, to)`.
 */
export async function fetchAllPagedRows<T>(
  fetchPage: FetchPageFn<T>,
  options?: {
    pageSize?: number;
    mapError?: (error: {message: string; code?: string}) => Error;
  },
): Promise<T[]> {
  const pageSize = Math.min(
    options?.pageSize ?? POSTGREST_PAGE_SIZE,
    POSTGREST_PAGE_SIZE,
  );
  const mapError = options?.mapError ?? defaultMapError;

  const first = await fetchPage(0, pageSize - 1);
  if (first.error) throw mapError(first.error);

  const firstRows = first.data ?? [];
  if (first.count == null) {
    throw mapError({
      message:
        'Paginação completa exige count:exact — count ausente na resposta PostgREST.',
    });
  }

  const total = first.count;
  const rows = [...firstRows];

  if (total === 0) return [];
  if (rows.length >= total) return rows.slice(0, total);

  for (let from = pageSize; from < total; from += pageSize) {
    const to = Math.min(from + pageSize - 1, total - 1);
    const page = await fetchPage(from, to);
    if (page.error) throw mapError(page.error);
    rows.push(...(page.data ?? []));
  }

  if (rows.length !== total) {
    throw mapError({
      message: `Fetch incompleto: esperado ${total} registro(s), obtido ${rows.length}.`,
    });
  }

  return rows;
}

/**
 * Busca todas as linhas dentro de um intervalo inclusivo `[range.from, range.to]`,
 * fatiando em páginas ≤ max_rows (necessário quando `to - from + 1 > 1000`).
 *
 * Contrato: o caller pede um prefixo/janela que deve existir por completo
 * (ex.: priorRows do Cash Flow). Páginas intermediárias incompletas ou
 * acumulado final menor que o intervalo solicitado falham explicitamente.
 * A última página pode ter tamanho < pageSize quando o próprio intervalo
 * residual for menor que pageSize.
 */
export async function fetchPagedRangeRows<T>(
  fetchPage: FetchPageFn<T>,
  range: {from: number; to: number},
  options?: {
    pageSize?: number;
    mapError?: (error: {message: string; code?: string}) => Error;
  },
): Promise<T[]> {
  if (range.to < range.from) return [];

  const pageSize = Math.min(
    Math.max(1, options?.pageSize ?? POSTGREST_PAGE_SIZE),
    POSTGREST_PAGE_SIZE,
  );
  const mapError = options?.mapError ?? defaultMapError;
  const expected = range.to - range.from + 1;
  const rows: T[] = [];

  for (let from = range.from; from <= range.to; from += pageSize) {
    const to = Math.min(from + pageSize - 1, range.to);
    const requested = to - from + 1;
    const isLastPage = to >= range.to;

    const page = await fetchPage(from, to);
    if (page.error) throw mapError(page.error);

    const pageRows = page.data ?? [];

    if (!isLastPage && pageRows.length < requested) {
      throw mapError({
        message: `Fetch incompleto no intervalo: página intermediária ${from}-${to} retornou ${pageRows.length} de ${requested} registro(s).`,
      });
    }

    if (isLastPage && pageRows.length === 0 && requested > 0) {
      throw mapError({
        message: `Fetch incompleto no intervalo: resposta vazia em ${from}-${to} (esperados ${requested} registro(s)).`,
      });
    }

    if (pageRows.length > requested) {
      rows.push(...pageRows.slice(0, requested));
    } else {
      rows.push(...pageRows);
    }

    if (isLastPage && pageRows.length < requested) {
      break;
    }
  }

  if (rows.length !== expected) {
    throw mapError({
      message: `Fetch incompleto no intervalo [${range.from}, ${range.to}]: esperado ${expected} registro(s), obtido ${rows.length}.`,
    });
  }

  return rows;
}
