/**
 * `fetch` que só deixa sair GET e HEAD.
 * Usado pelo diagnóstico da Fase 1 para garantir, antes da rede, que nenhuma
 * escrita (INSERT, UPDATE, DELETE) nem RPC (POST) chegue ao Supabase.
 *
 * Cada requisição tem tempo limite: sem rede, o diagnóstico falha em segundos
 * em vez de ficar parado.
 */
const READ_METHODS = new Set(['GET', 'HEAD']);
export const READ_ONLY_FETCH_TIMEOUT_MS = 20_000;

export function createReadOnlyFetch(
  base: typeof fetch = fetch,
  timeoutMs: number = READ_ONLY_FETCH_TIMEOUT_MS,
): typeof fetch {
  return (input, init) => {
    const requestMethod =
      typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET';
    const method = (init?.method ?? requestMethod).toUpperCase();
    if (!READ_METHODS.has(method)) {
      return Promise.reject(new Error(`Bloqueado: diagnóstico somente leitura (${method}).`));
    }
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    return base(input, {...init, signal}).catch((error: unknown) => {
      if (timeout.aborted) {
        throw new Error(`Sem resposta do Supabase em ${timeoutMs / 1000} s (rede ou proxy).`);
      }
      throw error;
    });
  };
}
