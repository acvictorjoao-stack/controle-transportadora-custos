import {describe, expect, it, vi} from 'vitest';

import {
  POSTGREST_PAGE_SIZE,
  fetchAllPagedRows,
  fetchPagedRangeRows,
} from '../fetch-all-pages';

describe('fetchAllPagedRows', () => {
  it('returns empty when count is 0', async () => {
    const fetchPage = vi.fn().mockResolvedValue({data: [], error: null, count: 0});
    await expect(fetchAllPagedRows(fetchPage)).resolves.toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('returns a single page when count <= page size', async () => {
    const rows = Array.from({length: 3}, (_, i) => ({id: i}));
    const fetchPage = vi.fn().mockResolvedValue({
      data: rows,
      error: null,
      count: 3,
    });
    await expect(fetchAllPagedRows(fetchPage)).resolves.toEqual(rows);
    expect(fetchPage).toHaveBeenCalledWith(0, POSTGREST_PAGE_SIZE - 1);
  });

  it('accumulates multiple pages when count > 1000', async () => {
    const total = 1001;
    const page1 = Array.from({length: 1000}, (_, i) => ({id: i}));
    const page2 = [{id: 1000}];

    const fetchPage = vi.fn(async (from: number, to: number) => {
      if (from === 0) {
        return {data: page1, error: null, count: total};
      }
      expect(from).toBe(1000);
      expect(to).toBe(1000);
      return {data: page2, error: null, count: total};
    });

    const rows = await fetchAllPagedRows(fetchPage);
    expect(rows).toHaveLength(1001);
    expect(rows[1000]).toEqual({id: 1000});
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('throws when count is missing', async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      data: [{id: 1}],
      error: null,
      count: null,
    });
    await expect(fetchAllPagedRows(fetchPage)).rejects.toThrow(/count:exact/);
  });

  it('throws when accumulated rows do not match count', async () => {
    const fetchPage = vi.fn(async (from: number) => {
      if (from === 0) {
        return {
          data: Array.from({length: 1000}, (_, i) => ({id: i})),
          error: null,
          count: 1001,
        };
      }
      return {data: [], error: null, count: 1001};
    });
    await expect(fetchAllPagedRows(fetchPage)).rejects.toThrow(/esperado 1001/);
  });
});

describe('fetchPagedRangeRows', () => {
  it('splits a deep range into pages of at most 1000', async () => {
    const calls: Array<[number, number]> = [];
    const fetchPage = vi.fn(async (from: number, to: number) => {
      calls.push([from, to]);
      const size = to - from + 1;
      return {
        data: Array.from({length: size}, (_, i) => ({id: from + i})),
        error: null,
        count: null,
      };
    });

    const rows = await fetchPagedRangeRows(fetchPage, {from: 0, to: 1500});
    expect(rows).toHaveLength(1501);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1500],
    ]);
  });

  it('accepts a last page smaller than 1000 when the residual range is smaller', async () => {
    const calls: Array<[number, number]> = [];
    const fetchPage = vi.fn(async (from: number, to: number) => {
      calls.push([from, to]);
      const size = to - from + 1;
      return {
        data: Array.from({length: size}, (_, i) => ({id: from + i})),
        error: null,
        count: null,
      };
    });

    const rows = await fetchPagedRangeRows(fetchPage, {from: 0, to: 1009});
    expect(rows).toHaveLength(1010);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1009],
    ]);
  });

  it('throws on under-fetch in an intermediate page', async () => {
    const fetchPage = vi.fn(async (from: number, to: number) => {
      if (from === 0) {
        return {
          data: Array.from({length: 500}, (_, i) => ({id: i})),
          error: null,
          count: null,
        };
      }
      return {
        data: Array.from({length: to - from + 1}, (_, i) => ({id: from + i})),
        error: null,
        count: null,
      };
    });

    await expect(
      fetchPagedRangeRows(fetchPage, {from: 0, to: 1500}),
    ).rejects.toThrow(/página intermediária/);
  });

  it('throws when the last page is empty while rows are still expected', async () => {
    const fetchPage = vi.fn(async (from: number) => {
      if (from === 0) {
        return {
          data: Array.from({length: 1000}, (_, i) => ({id: i})),
          error: null,
          count: null,
        };
      }
      return {data: [], error: null, count: null};
    });

    await expect(
      fetchPagedRangeRows(fetchPage, {from: 0, to: 1009}),
    ).rejects.toThrow(/resposta vazia|esperado 1010/);
  });

  it('throws when accumulated rows are short of the requested range', async () => {
    const fetchPage = vi.fn(async (from: number, to: number) => {
      if (from === 0) {
        return {
          data: Array.from({length: 1000}, (_, i) => ({id: i})),
          error: null,
          count: null,
        };
      }
      // Last page returns fewer than requested (5 of 10).
      return {
        data: Array.from({length: 5}, (_, i) => ({id: from + i})),
        error: null,
        count: null,
      };
    });

    await expect(
      fetchPagedRangeRows(fetchPage, {from: 0, to: 1009}),
    ).rejects.toThrow(/esperado 1010/);
  });
});
