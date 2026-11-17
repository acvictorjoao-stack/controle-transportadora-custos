import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

function migration(file: string): string {
  return readFileSync(resolve(process.cwd(), 'supabase/migrations', file), 'utf8').replace(
    /\r\n/g,
    '\n',
  );
}

function withoutComments(sql: string): string {
  return sql.replace(/^\s*--.*$/gm, '');
}

describe('Fase 1, Etapa 1 — migrations 109 e 110 (contrato estático)', () => {
  const unique = migration('109_financial_entries_source_unique.sql');
  const summary = migration('110_trip_financial_summary.sql');
  const both = withoutComments(`${unique}\n${summary}`);

  it('não altera nem apaga dados', () => {
    expect(both).not.toMatch(/\b(update|delete\s+from|insert\s+into|truncate)\b/i);
  });

  it('a 109 para com a lista de duplicidades em vez de resolver sozinha', () => {
    expect(unique).toContain('raise exception');
    expect(unique).toContain('having count(*) > 1');
  });

  it('o índice usa o mesmo predicado de "ativo" da DRE e da invariante I5', () => {
    expect(unique).toContain('create unique index if not exists idx_financial_entries_source_installment_active');
    expect(unique).toContain('(coalesce(installment_number, 1))');
    for (const clause of [
      'source_id is not null',
      'deleted_at is null',
      "entry_status not in ('cancelled', 'reversed')",
      "entry_type <> 'reversal'",
    ]) {
      expect(unique).toContain(clause);
    }
  });

  it('a view respeita a RLS de quem consulta e só authenticated lê', () => {
    expect(summary).toContain('create or replace view public.trip_financial_summary');
    expect(summary).toContain('with (security_invoker = true)');
    expect(summary).toContain('from public, anon, authenticated, service_role;');
    expect(summary).toContain('grant select on public.trip_financial_summary to authenticated;');
    expect(summary).not.toMatch(/grant[^;]*(insert|update|delete)[^;]*trip_financial_summary/i);
  });

  it('frete e custo direto seguem as regras da DRE', () => {
    expect(summary).toContain('coalesce(t.actual_freight_value, t.contracted_freight_value, 0)');
    expect(summary).toContain("fe.entry_status not in ('cancelled', 'reversed')");
    expect(summary).toContain("sum(fe.amount) filter (where fe.entry_type = 'expense')");
    expect(summary).toContain('where t.deleted_at is null');
  });

  it('adiantamento não entra no custo da viagem nem no resultado das estatísticas', () => {
    expect(summary).toContain("filter (where fe.entry_type = 'advance')");
    const stats = summary.slice(summary.indexOf('create or replace function public.get_financial_stats'));
    expect(stats).toMatch(/when entry_type = 'expense' then -amount\n\s+else 0\n\s+end as result_amount/);
    expect(stats).toContain("'balance', coalesce((select round(sum(result_amount)::numeric, 2) from signed), 0)");
    // O caixa continua vendo o adiantamento como saída.
    expect(stats).toMatch(/'cash_flow', coalesce\(\(\n\s+select round\(sum\(signed_amount\)::numeric, 2\)/);
    expect(stats).not.toContain('sum(abs(signed_amount))');
  });

  it('get_financial_stats mantém security invoker e search_path fixo', () => {
    expect(summary).toContain('security invoker\nset search_path = public');
  });
});

describe('Fase 1, Etapa 1 — reversão documentada', () => {
  const rollback = readFileSync(
    resolve(process.cwd(), 'database/rollback/fase-1-109-110.sql'),
    'utf8',
  ).replace(/\r\n/g, '\n');

  it('remove só a view e o índice e devolve get_financial_stats da 108', () => {
    const code = withoutComments(rollback);
    expect(code).toContain('drop view if exists public.trip_financial_summary;');
    expect(code).toContain('drop index if exists public.idx_financial_entries_source_installment_active;');
    expect(code).not.toMatch(/\b(update|delete\s+from|insert\s+into|truncate)\b/i);
    expect(code).not.toContain('result_amount');
    expect(code).toContain("when entry_type in ('expense', 'advance') then -amount");
  });
});
