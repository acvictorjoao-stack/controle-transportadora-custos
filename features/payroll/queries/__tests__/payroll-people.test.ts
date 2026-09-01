import type {SupabaseClient} from '@supabase/supabase-js';
import {describe, expect, it, vi} from 'vitest';

import {listPayrollPeople} from '../employees';

const COMPANY_ID = 'company-1';

function createPeopleStub(rows: Record<string, unknown>[]) {
  const query = {
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    ilike: vi.fn(() => query),
    then: (resolve: (value: {data: typeof rows; error: null}) => void) =>
      Promise.resolve({data: rows, error: null}).then(resolve),
  };

  return {
    client: {
      from: vi.fn(() => ({
        select: vi.fn(() => query),
      })),
    } as unknown as SupabaseClient,
    query,
  };
}

describe('listPayrollPeople', () => {
  it('mapeia colaboradores e motoristas da view payroll_people', async () => {
    const {client} = createPeopleStub([
      {
        id: 'driver-1',
        person_kind: 'driver',
        name: 'MOTORISTA A',
        position_id: null,
        cost_center_id: null,
        active: true,
      },
      {
        id: 'employee-1',
        person_kind: 'employee',
        name: 'JOÃO SILVA',
        position_id: 'position-1',
        cost_center_id: 'cc-1',
        active: true,
      },
    ]);

    const people = await listPayrollPeople(client, COMPANY_ID);

    expect(people).toHaveLength(2);
    expect(people[0]).toMatchObject({kind: 'driver', name: 'MOTORISTA A'});
    expect(people[1]).toMatchObject({
      kind: 'employee',
      name: 'JOÃO SILVA',
      positionId: 'position-1',
      costCenterId: 'cc-1',
    });
  });

  it('filtra por empresa via query', async () => {
    const {client, query} = createPeopleStub([]);

    await listPayrollPeople(client, COMPANY_ID);

    expect(query.eq).toHaveBeenCalledWith('company_id', COMPANY_ID);
    expect(query.eq).toHaveBeenCalledWith('active', true);
  });
});
