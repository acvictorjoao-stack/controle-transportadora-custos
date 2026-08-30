import type {SupabaseClient} from '@supabase/supabase-js';
import {describe, expect, it, vi} from 'vitest';

import {ensurePositionDefaults} from '../positions';

const COMPANY_ID = 'company-1';

function createRpcStub(result: {error: {code?: string; message: string} | null}) {
  const rpc = vi.fn(async () => result);
  return {client: {rpc} as unknown as SupabaseClient, rpc};
}

describe('ensurePositionDefaults', () => {
  it('semeia os cargos da empresa autenticada', async () => {
    const {client, rpc} = createRpcStub({error: null});

    await ensurePositionDefaults(client, COMPANY_ID);

    expect(rpc).toHaveBeenCalledWith('seed_positions_for_company', {
      p_company_id: COMPANY_ID,
      p_created_by: null,
    });
  });

  it('quem só lê a folha continua abrindo a tela sem permissão de semear', async () => {
    const {client} = createRpcStub({
      error: {code: '42501', message: 'not authorized to seed positions for this company'},
    });

    await expect(ensurePositionDefaults(client, 'company-2')).resolves.toBeUndefined();
  });

  it('outros erros do banco continuam falhando', async () => {
    const {client} = createRpcStub({
      error: {code: '23505', message: 'duplicate key value violates unique constraint'},
    });

    await expect(ensurePositionDefaults(client, 'company-3')).rejects.toThrow();
  });
});
