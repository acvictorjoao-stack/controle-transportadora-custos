/**
 * Fase 2.1.5 — Portão automático da reconciliação financeira, SOMENTE LEITURA.
 *
 * - Só faz requisições GET/HEAD: o `fetch` do cliente recusa qualquer outro
 *   método antes de sair da máquina. As funções da migration 113/114 são
 *   `stable` e chamadas por GET (`rpc(..., {get: true})`).
 * - Só aceita o projeto HML autorizado (`HML_AUTHORIZED_PROJECT_REF`).
 * - Não altera `.env.local`: apenas lê o arquivo indicado. Não imprime chaves.
 * - Roda o resumo por empresa (todas, ou as de --company) e sai com:
 *     0 = aprovado, 1 = há achado atual na severidade do portão ou acima,
 *     2 = erro de uso, de rede ou de contrato.
 *
 * Uso (a partir desta worktree):
 *   npx tsx scripts/fase2-reconciliation-readonly.ts --env "../TRANSPORTADOS CUSTOS/.env.local"
 *   ... [--company <uuid>] [--from 2026-10-01 --to 2026-10-31] [--fail-on high] [--json]
 *
 * Este arquivo NÃO é importado pela aplicação Next.js.
 */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {createClient, type SupabaseClient} from '@supabase/supabase-js';

import {assertHmlAuthorizedProjectRef} from '../database/seeds/homologacao/env';
import {createReadOnlyFetch} from '../features/financial/consistency/read-only-fetch';
import {
  evaluateGate,
  formatGateReport,
  GATE_USAGE,
  GateUsageError,
  parseGateArgs,
  type CompanyGateInput,
  type GateSummaryRow,
} from '../features/financial/consistency/reconciliation-gate';

function loadEnvFile(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!match) continue;
    env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

/** Cliente que só consegue ler: qualquer método de escrita falha antes da rede. */
function readOnlyClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {persistSession: false, autoRefreshToken: false},
    global: {fetch: createReadOnlyFetch()},
  });
}

async function listCompanies(
  client: SupabaseClient,
  only: string[],
): Promise<Array<{id: string; slug: string}>> {
  let query = client.from('companies').select('id, slug').order('slug');
  if (only.length > 0) query = query.in('id', only);
  const {data, error} = await query;
  if (error) throw new Error(`companies: ${error.message}`);
  const companies = (data ?? []) as Array<{id: string; slug: string}>;
  const missing = only.filter((id) => !companies.some((company) => company.id === id));
  if (missing.length > 0) throw new Error(`Empresa não encontrada: ${missing.join(', ')}`);
  return companies;
}

async function main(): Promise<number> {
  const options = parseGateArgs(process.argv.slice(2));
  const env = loadEnvFile(resolve(options.envPath));
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes no arquivo informado.');
  }
  assertHmlAuthorizedProjectRef(url);
  const client = readOnlyClient(url, serviceKey);

  const companies = await listCompanies(client, options.companies);
  const inputs: CompanyGateInput[] = [];
  for (const company of companies) {
    const {data, error} = await client.rpc(
      'financial_reconciliation_summary',
      {p_company_id: company.id, p_from: options.dateFrom, p_to: options.dateTo},
      {get: true},
    );
    if (error) throw new Error(`${company.slug}: ${error.code ?? ''} ${error.message}`.trim());
    inputs.push({companyId: company.id, slug: company.slug, rows: (data ?? []) as GateSummaryRow[]});
  }

  const result = evaluateGate(inputs, options.failOn);
  const period = {dateFrom: options.dateFrom, dateTo: options.dateTo};
  console.log(options.json ? JSON.stringify({...result, period}, null, 2) : formatGateReport(result, period));
  return result.failed ? 1 : 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    if (error instanceof GateUsageError) {
      console.error(`${error.message}\n\n${GATE_USAGE}`);
    } else {
      console.error(`Erro: ${error instanceof Error ? error.message : String(error)}`);
    }
    process.exitCode = 2;
  });
