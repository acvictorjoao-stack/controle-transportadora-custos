import {describe, expect, it, vi} from 'vitest';

import {listCompanyTripOccurrences} from '@/features/trips/queries/trips';

function occurrence(id: string, tripId: string) {
  return {
    id,
    company_id: 'company-1',
    branch_id: 'b1',
    trip_id: tripId,
    occurrence_type: 'delay',
    description: null,
    occurred_at: '2026-07-10T12:00:00.000Z',
    created_at: '2026-07-10T12:00:00.000Z',
    deleted_at: null,
  };
}

function createSupabaseMock(rows: unknown[]) {
  const calls: Array<{method: string; args: unknown[]}> = [];

  const builder = {
    select(...args: unknown[]) {
      calls.push({method: 'select', args});
      return builder;
    },
    order(...args: unknown[]) {
      calls.push({method: 'order', args});
      return builder;
    },
    gte(...args: unknown[]) {
      calls.push({method: 'gte', args});
      return builder;
    },
    lt(...args: unknown[]) {
      calls.push({method: 'lt', args});
      return builder;
    },
    lte(...args: unknown[]) {
      calls.push({method: 'lte', args});
      return builder;
    },
    eq(...args: unknown[]) {
      calls.push({method: 'eq', args});
      return builder;
    },
    is(...args: unknown[]) {
      calls.push({method: 'is', args});
      return builder;
    },
    in(...args: unknown[]) {
      calls.push({method: 'in', args});
      return builder;
    },
    range(from: number, to: number) {
      calls.push({method: 'range', args: [from, to]});
      return Promise.resolve({
        data: rows.slice(from, to + 1),
        error: null,
        count: rows.length,
      });
    },
  };

  const supabase = {
    from(table: string) {
      calls.push({method: 'from', args: [table]});
      return builder;
    },
  };

  return {supabase, calls};
}

describe('listCompanyTripOccurrences tenant/soft-delete', () => {
  it('always scopes by company_id and deleted_at null, with half-open occurred_at bounds', async () => {
    const {supabase, calls} = createSupabaseMock([]);

    await listCompanyTripOccurrences(supabase as never, 'company-1', {
      occurredAt: {
        gte: '2026-07-01T03:00:00.000Z',
        lt: '2026-08-01T03:00:00.000Z',
      },
      branchId: 'b1',
      tripIds: ['t1'],
    });

    expect(calls.some((c) => c.method === 'from' && c.args[0] === 'trip_occurrences')).toBe(
      true,
    );
    expect(calls).toContainEqual({method: 'eq', args: ['company_id', 'company-1']});
    expect(calls).toContainEqual({method: 'is', args: ['deleted_at', null]});
    expect(calls).toContainEqual({method: 'eq', args: ['branch_id', 'b1']});
    expect(calls).toContainEqual({
      method: 'gte',
      args: ['occurred_at', '2026-07-01T03:00:00.000Z'],
    });
    expect(calls).toContainEqual({
      method: 'lt',
      args: ['occurred_at', '2026-08-01T03:00:00.000Z'],
    });
    expect(calls.some((c) => c.method === 'lte')).toBe(false);
  });

  it('paginates past max_rows instead of truncating', async () => {
    const rows = Array.from({length: 1500}, (_, i) => occurrence(`o${i}`, `t${i}`));
    const {supabase, calls} = createSupabaseMock(rows);

    const result = await listCompanyTripOccurrences(supabase as never, 'company-1', {
      occurredAt: {gte: '2026-07-01T03:00:00.000Z', lt: '2026-08-01T03:00:00.000Z'},
    });

    expect(result).toHaveLength(1500);
    expect(calls.filter((c) => c.method === 'range').map((c) => c.args)).toEqual([
      [0, 999],
      [1000, 1499],
    ]);
  });

  it('keeps only occurrences of the given trips', async () => {
    const {supabase, calls} = createSupabaseMock([
      occurrence('o1', 't1'),
      occurrence('o2', 't2'),
    ]);

    const result = await listCompanyTripOccurrences(supabase as never, 'company-1', {
      occurredAt: {gte: '2026-07-01T03:00:00.000Z'},
      tripIds: ['t1'],
    });

    expect(result.map((item) => item.id)).toEqual(['o1']);
    expect(calls.some((c) => c.method === 'in')).toBe(false);
  });

  it('returns empty without querying when tripIds is empty', async () => {
    const from = vi.fn();
    const supabase = {from};
    const result = await listCompanyTripOccurrences(supabase as never, 'company-1', {
      occurredAt: {gte: '2026-07-01T03:00:00.000Z'},
      tripIds: [],
    });
    expect(result).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });
});
