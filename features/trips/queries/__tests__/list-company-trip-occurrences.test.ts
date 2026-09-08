import {describe, expect, it, vi} from 'vitest';

import {listCompanyTripOccurrences} from '@/features/trips/queries/trips';

describe('listCompanyTripOccurrences tenant/soft-delete', () => {
  it('always scopes by company_id and deleted_at null', async () => {
    const calls: Array<{method: string; args: unknown[]}> = [];

    const terminal = {
      order(...args: unknown[]) {
        calls.push({method: 'order', args});
        return this;
      },
      limit(...args: unknown[]) {
        calls.push({method: 'limit', args});
        return this;
      },
      gte(...args: unknown[]) {
        calls.push({method: 'gte', args});
        return this;
      },
      lte(...args: unknown[]) {
        calls.push({method: 'lte', args});
        return this;
      },
      eq(...args: unknown[]) {
        calls.push({method: 'eq', args});
        return this;
      },
      is(...args: unknown[]) {
        calls.push({method: 'is', args});
        return this;
      },
      in(...args: unknown[]) {
        calls.push({method: 'in', args});
        return this;
      },
      then(resolve: (value: {data: unknown[]; error: null}) => unknown) {
        return Promise.resolve(resolve({data: [], error: null}));
      },
    };

    const supabase = {
      from(table: string) {
        calls.push({method: 'from', args: [table]});
        return {
          select() {
            calls.push({method: 'select', args: []});
            return terminal;
          },
        };
      },
    };

    await listCompanyTripOccurrences(supabase as never, 'company-1', {
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
      branchId: 'b1',
      tripIds: ['t1'],
    });

    expect(calls.some((c) => c.method === 'from' && c.args[0] === 'trip_occurrences')).toBe(
      true,
    );
    expect(
      calls.some(
        (c) =>
          c.method === 'eq' && c.args[0] === 'company_id' && c.args[1] === 'company-1',
      ),
    ).toBe(true);
    expect(
      calls.some(
        (c) =>
          c.method === 'is' && c.args[0] === 'deleted_at' && c.args[1] === null,
      ),
    ).toBe(true);
    expect(
      calls.some(
        (c) => c.method === 'gte' && c.args[0] === 'occurred_at' && c.args[1] === '2026-07-01',
      ),
    ).toBe(true);
    expect(
      calls.some(
        (c) =>
          c.method === 'lte' &&
          c.args[0] === 'occurred_at' &&
          String(c.args[1]).startsWith('2026-07-31'),
      ),
    ).toBe(true);
    expect(
      calls.some(
        (c) => c.method === 'in' && c.args[0] === 'trip_id' && Array.isArray(c.args[1]),
      ),
    ).toBe(true);
  });

  it('returns empty without querying when tripIds is empty', async () => {
    const from = vi.fn();
    const supabase = {from};
    const result = await listCompanyTripOccurrences(supabase as never, 'company-1', {
      tripIds: [],
    });
    expect(result).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });
});
