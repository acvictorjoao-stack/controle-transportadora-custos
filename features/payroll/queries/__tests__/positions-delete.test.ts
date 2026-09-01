import {describe, expect, it, vi} from 'vitest';

import {softDeletePosition} from '../positions';

const COMPANY_ID = 'company-1';
const PROFILE_ID = 'profile-1';
const POSITION_ID = 'position-1';

function createDeleteStub(existing: {is_system: boolean} | null) {
  const getQuery = {
    eq: vi.fn(() => getQuery),
    is: vi.fn(() => getQuery),
    maybeSingle: vi.fn(async () => ({
      data: existing
        ? {
            id: POSITION_ID,
            company_id: COMPANY_ID,
            code: 'MOTORISTA',
            name: 'MOTORISTA',
            description: null,
            is_system: existing.is_system,
            status: 'active',
            created_at: '',
            updated_at: '',
          }
        : null,
      error: null,
    })),
  };

  return {
    client: {
      from: vi.fn(() => ({
        select: vi.fn((_, opts?: {head?: boolean}) => {
          if (opts?.head) {
            return {
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  is: vi.fn(async () => ({count: 0, error: null})),
                })),
              })),
            };
          }
          return getQuery;
        }),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(async () => ({error: null})),
            })),
          })),
        })),
      })),
    },
  };
}

describe('softDeletePosition', () => {
  it('impede exclusão de cargo is_system', async () => {
    const {client} = createDeleteStub({is_system: true});

    await expect(
      softDeletePosition(client as never, COMPANY_ID, POSITION_ID, PROFILE_ID),
    ).rejects.toThrow('Cargos do sistema não podem ser excluídos.');
  });
});
