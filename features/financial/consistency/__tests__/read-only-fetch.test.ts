import {createClient} from '@supabase/supabase-js';
import {describe, expect, it, vi} from 'vitest';

import {createReadOnlyFetch} from '../read-only-fetch';

function fakeBase() {
  return vi.fn(async () => new Response('[]', {status: 200, headers: {'content-type': 'application/json'}}));
}

describe('fetch somente leitura do diagnóstico', () => {
  it('deixa passar GET e HEAD', async () => {
    const base = fakeBase();
    const guarded = createReadOnlyFetch(base as unknown as typeof fetch);
    await guarded('https://x.supabase.co/rest/v1/trips');
    await guarded('https://x.supabase.co/rest/v1/trips', {method: 'HEAD'});
    expect(base).toHaveBeenCalledTimes(2);
  });

  it.each(['POST', 'PATCH', 'PUT', 'DELETE'])('recusa %s antes da rede', async (method) => {
    const base = fakeBase();
    const guarded = createReadOnlyFetch(base as unknown as typeof fetch);
    await expect(guarded('https://x.supabase.co/rest/v1/trips', {method})).rejects.toThrow(
      /somente leitura/,
    );
    expect(base).not.toHaveBeenCalled();
  });

  it('falha com mensagem clara quando a rede não responde', async () => {
    const hanging = vi.fn(
      (_input: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const guarded = createReadOnlyFetch(hanging as unknown as typeof fetch, 50);
    await expect(guarded('https://x.supabase.co/rest/v1/trips')).rejects.toThrow(
      /Sem resposta do Supabase/,
    );
  });

  it('bloqueia insert, update, delete e rpc feitos pelo cliente Supabase', async () => {
    const base = fakeBase();
    const client = createClient('https://x.supabase.co', 'chave-de-teste', {
      auth: {persistSession: false, autoRefreshToken: false},
      global: {fetch: createReadOnlyFetch(base as unknown as typeof fetch)},
    });

    const insert = await client.from('trips').insert({id: '1'});
    const update = await client.from('trips').update({trip_status: 'x'}).eq('id', '1');
    const remove = await client.from('trips').delete().eq('id', '1');
    const rpc = await client.rpc('register_receivable_receipt', {});

    for (const result of [insert, update, remove, rpc]) {
      expect(result.error?.message ?? '').toMatch(/somente leitura/);
    }
    expect(base).not.toHaveBeenCalled();

    await client.from('trips').select('id').limit(1);
    expect(base).toHaveBeenCalledTimes(1);
  });
});
