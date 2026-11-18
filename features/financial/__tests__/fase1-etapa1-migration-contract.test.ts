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

  it('sem financeiro:read, campos financeiros e derivados saem NULL (sem resultado = frete)', () => {
    const view = summary.slice(0, summary.indexOf('comment on view public.trip_financial_summary'));
    for (const column of [
      'direct_costs',
      'fuel_costs',
      'maintenance_costs',
      'tire_costs',
      'direct_cost_entries',
      'advances_total',
      'reimbursements_total',
    ]) {
      expect(view).toContain(`case when vis.visible then costs.${column} end as ${column}`);
    }
    for (const column of [
      'receivable_entry_id',
      'receivable_status',
      'receivable_amount',
      'receivable_received',
    ]) {
      expect(view).toContain(`case when vis.visible then charge.${column} end as ${column}`);
    }
    expect(view).toMatch(
      /case when vis\.visible then\n\s+costs\.direct_costs - costs\.fuel_costs[^\n]*\n\s+end as other_costs/,
    );
    expect(view).toMatch(/case when vis\.visible then\n[^\n]+\n\s+- costs\.direct_costs\n\s+end as result/);
    expect(view).toMatch(/when vis\.visible\n\s+and coalesce\(t\.actual_freight_value/);
    expect(view).toContain('case when vis.visible then aba.unposted_trip_expenses_amount end');
    expect(view).toContain('case when vis.visible then aba.unposted_trip_expenses_count end');
    expect(view).toContain('when vis.visible and charge.receivable_entry_id is not null');
    expect(view).toContain('vis.visible as financial_visible');
    // Nenhuma coluna de custo sai "crua" (sem o filtro de visibilidade).
    expect(view).not.toMatch(/^\s+costs\.(direct_costs|fuel_costs|advances_total),?$/m);
  });

  it('a visibilidade usa a permissão do usuário; só quem ignora RLS conta como visível sem ela', () => {
    expect(summary).toContain("public.has_company_permission(t.company_id, 'financeiro:read')");
    expect(summary).toContain('public.is_company_super_admin(t.company_id)');
    expect(summary).toContain(
      '(select r.rolbypassrls from pg_catalog.pg_roles r where r.rolname = current_user)',
    );
    expect(summary).toMatch(/select coalesce\([\s\S]*?false\n\s+\) as visible/);
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

describe('Fase 1, Etapa 1 — teste em banco (somente local)', () => {
  const sql = readFileSync(resolve(process.cwd(), 'database/tests/fase-1-etapa1.sql'), 'utf8');

  it('cobre o usuário com trips:read e sem financeiro:read e desfaz tudo no fim', () => {
    expect(sql).toContain("array['trips:read', 'trips:create', 'trips:update', 'customers:read']");
    expect(sql).toContain('sem financeiro, custos, resultado e margem são NULL (nunca zero nem frete)');
    expect(sql.trimEnd().endsWith('rollback;')).toBe(true);
  });
});
