/**
 * Fase 1 — Etapa 0: diagnóstico SOMENTE LEITURA do HML.
 *
 * - Só faz requisições GET/HEAD: o `fetch` do cliente recusa qualquer outro
 *   método antes de sair da máquina (sem INSERT, UPDATE, DELETE nem RPC).
 * - Só aceita o projeto HML autorizado (`HML_AUTHORIZED_PROJECT_REF`) e lê só
 *   a empresa `HML_AUTHORIZED_COMPANY_ID`.
 * - Não altera `.env.local`: apenas lê o arquivo indicado.
 *
 * Uso (a partir desta worktree):
 *   npx tsx scripts/fase1-etapa0-diagnostico-readonly.ts \
 *     --env "../TRANSPORTADOS CUSTOS/.env.local" \
 *     --out ./fase1-etapa0-relatorio.md
 *
 * Este arquivo NÃO é importado pela aplicação Next.js.
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {createClient, type SupabaseClient} from '@supabase/supabase-js';

import {
  HML_AUTHORIZED_COMPANY_ID,
} from '../database/seeds/homologacao/constants';
import {assertHmlAuthorizedProjectRef} from '../database/seeds/homologacao/env';
import {
  checkLinkIntegrity,
  findDuplicateSources,
  findEntryDateMismatches,
  findManualRelaunchCandidates,
  findPaidEntriesWithoutMovement,
  findTripDivergences,
  roundMoney,
  summarizeLegacyAdvances,
  summarizeMoneyWithoutAccount,
  summarizeTripExpenses,
  toNumber,
  type CategoryRow,
  type FinancialEntryRow,
  type FuelRecordRow,
  type MaintenanceRecordRow,
  type MovementRow,
  type TripExpenseRow,
  type TripRow,
} from '../features/financial/consistency/fase1-consistency';
import {
  computeTripFinancialSummaries,
  runAllFase1Invariants,
  type TripSummaryRow,
} from '../features/financial/consistency/trip-summary';
import {createReadOnlyFetch} from '../features/financial/consistency/read-only-fetch';

const PAGE_SIZE = 1000;

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

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

async function readAll<T>(
  client: SupabaseClient,
  table: string,
  columns: string,
  scope: 'company' | 'none' = 'company',
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = client.from(table).select(columns).range(from, from + PAGE_SIZE - 1);
    if (scope === 'company') query = query.eq('company_id', HML_AUTHORIZED_COMPANY_ID);
    const {data, error} = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

/** Testa se uma coluna/tabela existe (sinal de migration aplicada). */
async function probe(client: SupabaseClient, table: string, columns: string): Promise<string> {
  const {error} = await client.from(table).select(columns).limit(1);
  return error ? `ausente (${error.message})` : 'presente';
}

/** RLS: sem sessão, a chave anônima não pode ver dados financeiros. */
async function probeAnon(client: SupabaseClient, table: string): Promise<string> {
  const {data, error} = await client
    .from(table)
    .select('id')
    .eq('company_id', HML_AUTHORIZED_COMPANY_ID)
    .limit(1);
  if (error) return `bloqueado (${error.code ?? error.message})`;
  return (data ?? []).length === 0 ? 'nenhuma linha visível' : `ATENÇÃO: ${data?.length} linha(s) visível(is)`;
}

function brl(value: number): string {
  return value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
}

function table(header: string[], rows: (string | number)[][]): string {
  if (rows.length === 0) return '_Nenhum registro._\n';
  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n') + '\n';
}

async function main(): Promise<void> {
  const envPath = argValue('--env');
  if (!envPath) {
    throw new Error('Informe --env com o caminho do .env.local (somente leitura).');
  }
  const env = loadEnvFile(resolve(envPath));
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey || !anonKey) {
    throw new Error('Variáveis do Supabase ausentes no arquivo informado.');
  }
  const projectRef = assertHmlAuthorizedProjectRef(url);
  const reader = readOnlyClient(url, serviceKey);
  const anon = readOnlyClient(url, anonKey);

  const migrationState = {
    '105 trips.payment_condition': await probe(reader, 'trips', 'payment_condition, payment_due_date'),
    '105 financial_entries.trip_charge_key/adjustment_total': await probe(
      reader,
      'financial_entries',
      'trip_charge_key, adjustment_total',
    ),
    '106 financial_entry_movements': await probe(reader, 'financial_entry_movements', 'id, kind'),
    '108 financial_cash_flow_lines': await probe(reader, 'financial_cash_flow_lines', 'line_id'),
    '110 trip_financial_summary': await probe(reader, 'trip_financial_summary', 'trip_id, result'),
  };
  const has110 = migrationState['110 trip_financial_summary'] === 'presente';
  const has105 = migrationState['105 financial_entries.trip_charge_key/adjustment_total'] === 'presente';
  const has106 = migrationState['106 financial_entry_movements'] === 'presente';

  const rls = {
    financial_entries: await probeAnon(anon, 'financial_entries'),
    financial_entry_movements: has106 ? await probeAnon(anon, 'financial_entry_movements') : 'n/a',
    trip_expenses: await probeAnon(anon, 'trip_expenses'),
    trips: await probeAnon(anon, 'trips'),
  };

  const entryColumns = [
    'id, entry_type, entry_status, amount, paid_amount, paid_at, entry_date, due_date',
    'description, category_id, source_module, source_id, installment_number, trip_id',
    'fuel_record_id, maintenance_record_id, tire_id, deleted_at',
    ...(has105 ? ['trip_charge_key, adjustment_total'] : []),
  ].join(', ');

  const [trips, expenses, entries, movements, categories, fuelRecords, maintenanceRecords] =
    await Promise.all([
      readAll<TripRow>(
        reader,
        'trips',
        'id, trip_number, trip_status, completed_at, actual_freight_value, contracted_freight_value, freight_margin, deleted_at',
      ),
      readAll<TripExpenseRow>(
        reader,
        'trip_expenses',
        'id, trip_id, expense_type, amount, expense_date, description, deleted_at',
      ),
      readAll<FinancialEntryRow>(reader, 'financial_entries', entryColumns),
      has106
        ? readAll<MovementRow>(
            reader,
            'financial_entry_movements',
            'id, financial_entry_id, kind, amount, movement_date, payment_method',
          )
        : Promise.resolve([] as MovementRow[]),
      readAll<CategoryRow>(reader, 'financial_categories', 'id, slug'),
      readAll<FuelRecordRow>(reader, 'fuel_records', 'id, fueled_at, deleted_at'),
      readAll<MaintenanceRecordRow>(
        reader,
        'maintenance_records',
        'id, opened_at, completed_at, deleted_at',
      ),
    ]);

  const expenseGroups = summarizeTripExpenses(expenses, trips);
  const paidWithoutMovement = findPaidEntriesWithoutMovement(entries, movements);
  const duplicates = findDuplicateSources(entries);
  const relaunch = findManualRelaunchCandidates(entries, expenses, categories);
  const advances = summarizeLegacyAdvances(expenses, entries);
  const withoutAccount = summarizeMoneyWithoutAccount(entries, movements);
  const divergences = findTripDivergences(trips, expenses, entries);
  const dateMismatches = findEntryDateMismatches(entries, fuelRecords, maintenanceRecords);
  const integrity = checkLinkIntegrity({
    trips,
    expenses,
    entries,
    movements,
    fuelRecords,
    maintenanceRecords,
  });
  // I1: com a migration 110, compara a view real com a DRE; sem ela, o espelho
  // em TypeScript mostra o que a tela vai exibir depois da migration.
  const summaries: TripSummaryRow[] = has110
    ? await readAll<TripSummaryRow>(
        reader,
        'trip_financial_summary',
        'trip_id, trip_number, freight_amount, direct_costs, fuel_costs, maintenance_costs, tire_costs, other_costs, result, advances_total, unposted_trip_expenses_amount, unposted_trip_expenses_count',
      )
    : computeTripFinancialSummaries({trips, expenses, entries, categories});
  const invariants = runAllFase1Invariants({
    trips,
    expenses,
    entries,
    movements,
    categories,
    summaries,
  });

  // Fluxo de Caixa como a tela calcula hoje (resumo sem saldo inicial).
  const cashLines = await readAll<{
    entry_type: string;
    line_status: string;
    source_module: string | null;
    line_amount: number | string;
    deleted_at: string | null;
  }>(reader, 'financial_cash_flow_lines', 'entry_type, line_status, source_module, line_amount, deleted_at');
  let received = 0;
  let paid = 0;
  const ignoredTypes = new Map<string, number>();
  for (const line of cashLines) {
    if (line.deleted_at !== null) continue;
    const isReceivable = line.source_module === 'accounts_receivable' || line.entry_type === 'revenue';
    const isPayable = line.source_module === 'accounts_payable' || line.entry_type === 'expense';
    if (!isReceivable && !isPayable) {
      ignoredTypes.set(line.entry_type, (ignoredTypes.get(line.entry_type) ?? 0) + 1);
      continue;
    }
    if (line.line_status === 'paid') {
      if (isReceivable) received += toNumber(line.line_amount);
      if (isPayable) paid += toNumber(line.line_amount);
    }
  }

  const liveTrips = trips.filter((trip) => trip.deleted_at === null);
  const report = [
    `# Fase 1 — Etapa 0: diagnóstico somente leitura`,
    ``,
    `Gerado em ${new Date().toISOString()} · projeto \`${projectRef}\` · empresa \`${HML_AUTHORIZED_COMPANY_ID}\``,
    ``,
    `Totais lidos: ${liveTrips.length} viagens ativas (${trips.length} no total), ${expenses.length} despesas de viagem, ${entries.length} lançamentos, ${movements.length} movimentos, ${fuelRecords.length} abastecimentos, ${maintenanceRecords.length} manutenções.`,
    ``,
    `## Estado das migrations 105 a 110`,
    table(['Objeto', 'Situação'], Object.entries(migrationState)),
    `## RLS (chave anônima, sem sessão)`,
    table(['Tabela', 'Resultado'], Object.entries(rls)),
    `## 1. Despesas da viagem por tipo e situação`,
    table(
      ['Tipo', 'Situação', 'Qtde', 'Total'],
      expenseGroups.map((group) => [group.expenseType, group.situation, group.count, brl(group.total)]),
    ),
    `## 2. Lançamentos pagos sem movimento`,
    table(
      ['Origem', 'Tipo', 'Qtde', 'Total'],
      paidWithoutMovement.map((group) => [group.sourceModule, group.entryType, group.count, brl(group.total)]),
    ),
    `## 3. Possíveis duplicidades por origem`,
    table(
      ['Tipo', 'Chave', 'Lançamentos'],
      duplicates.map((group) => [group.kind, group.key, group.entryIds.join(', ')]),
    ),
    `## 4. Despesas de viagem relançadas à mão`,
    table(
      ['Lançamento', 'Descrição', 'Valor', 'Data', 'Motivo', 'Despesas da aba candidatas'],
      relaunch.map((row) => [
        row.entryId,
        row.description ?? '—',
        brl(row.amount),
        row.entryDate,
        row.reason,
        row.matchedExpenseIds.join(', ') || '—',
      ]),
    ),
    `## 5. Adiantamentos antigos`,
    table(
      ['Origem', 'Qtde', 'Total'],
      [
        ['trip_expenses (tipo advance)', advances.tripExpenseAdvances.count, brl(advances.tripExpenseAdvances.total)],
        ['financial_entries (advance)', advances.financialAdvanceEntries.count, brl(advances.financialAdvanceEntries.total)],
        ['financial_entries (reimbursement)', advances.financialReimbursementEntries.count, brl(advances.financialReimbursementEntries.total)],
      ],
    ),
    `## 6. Recebimentos e pagamentos sem conta associada`,
    `Nenhuma tabela de contas existe ainda; todo movimento e todo título pago estão sem conta.`,
    ``,
    table(
      ['Registro', 'Qtde', 'Total'],
      [
        ...Object.entries(withoutAccount.movementsByKind).map(([kind, value]) => [
          `movimento ${kind}`,
          value.count,
          brl(value.total),
        ]),
        ['título pago sem movimento', withoutAccount.paidEntriesWithoutMovement.count, brl(withoutAccount.paidEntriesWithoutMovement.total)],
      ],
    ),
    `## 7. Divergências entre viagem, DRE e margem gravada`,
    `Dashboard executivo usa o mesmo pacote da DRE (\`getOperationalDreBundle\`), portanto não diverge dela.`,
    ``,
    table(
      ['Viagem', 'Status', 'Frete', 'Tela (frete − aba)', 'DRE (frete − financeiro)', 'Margem gravada'],
      divergences.map((row) => [
        row.tripNumber ?? row.tripId,
        row.tripStatus,
        brl(row.freight),
        brl(row.screenResult),
        brl(row.dreResult),
        row.storedMargin === null ? '—' : brl(row.storedMargin),
      ]),
    ),
    `### Fluxo de Caixa como a tela calcula`,
    table(
      ['Medida', 'Valor'],
      [
        ['Entradas recebidas', brl(roundMoney(received))],
        ['Saídas pagas', brl(roundMoney(paid))],
        ['Saldo Atual (sem saldo inicial)', brl(roundMoney(received - paid))],
        ['Linhas ignoradas pelo resumo (por tipo)', [...ignoredTypes.entries()].map(([type, count]) => `${type}: ${count}`).join(', ') || '—'],
      ],
    ),
    `### Resultado da viagem pela fonte única (Etapa 1)`,
    has110
      ? 'Lido da view `trip_financial_summary` (migration 110 aplicada).'
      : `Migration 110 ainda não aplicada: valores do espelho em TypeScript da view, iguais à DRE por construção.`,
    ``,
    table(
      ['Viagem', 'Frete', 'Custo direto', 'Resultado', 'Aba fora do financeiro'],
      summaries
        .filter((row) => toNumber(row.unposted_trip_expenses_amount) !== 0 || toNumber(row.direct_costs) !== 0)
        .map((row) => [
          row.trip_number ?? row.trip_id,
          brl(toNumber(row.freight_amount)),
          brl(toNumber(row.direct_costs)),
          brl(toNumber(row.result)),
          `${brl(toNumber(row.unposted_trip_expenses_amount))} (${row.unposted_trip_expenses_count})`,
        ]),
    ),
    `## 8. Datas de lançamento de abastecimento e manutenção`,
    table(
      ['Lançamento', 'Origem', 'Data gravada', 'Dia em Brasília', 'Instante de origem'],
      dateMismatches.map((row) => [row.entryId, row.sourceModule, row.entryDate, row.expectedDate, row.sourceInstant]),
    ),
    `## 9. Integridade de vínculos`,
    table(
      ['Verificação', 'Qtde', 'Exemplos'],
      Object.entries(integrity).map(([key, ids]) => [key, ids.length, ids.slice(0, 5).join(', ') || '—']),
    ),
    `## Invariantes da Fase 1 (estado atual)`,
    table(
      ['Id', 'Invariante', 'Exigida na etapa', 'Violações', 'Exemplos'],
      invariants.map((result) => [
        result.id,
        result.description,
        result.stage,
        result.violations.length,
        result.violations.slice(0, 3).join('; ') || '—',
      ]),
    ),
  ].join('\n');

  const outPath = argValue('--out');
  if (outPath) {
    writeFileSync(resolve(outPath), report, 'utf8');
    console.log(`Relatório gravado em ${resolve(outPath)}`);
  } else {
    console.log(report);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
