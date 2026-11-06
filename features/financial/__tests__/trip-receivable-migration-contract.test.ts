import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

function migration(file: string): string {
  return readFileSync(resolve(process.cwd(), 'supabase/migrations', file), 'utf8');
}

describe('migrations de título de frete — contrato estático', () => {
  const terms = migration('105_trip_payment_terms.sql');
  const movements = migration('106_financial_entry_movements.sql');
  const sync = migration('107_trip_receivable_sync.sql');
  const cashFlow = migration('108_cash_flow_movements.sql');
  const all = [terms, movements, sync, cashFlow].join('\n');

  it('não altera linhas existentes nem faz backfill', () => {
    const withoutComments = all.replace(/^\s*--.*$/gm, '');
    expect(withoutComments).not.toMatch(/^\s*update\s+public\.(trips|financial_entries)\s*\n\s*set[\s\S]*?;\s*$/im.source === '' ? /$^/ : /^update public\./im);
    expect(withoutComments).not.toMatch(/^\s*delete from/im);
  });

  it('a cobrança da viagem tem chave única', () => {
    expect(terms).toContain('create unique index if not exists idx_financial_entries_trip_charge');
    expect(terms).toContain('(company_id, trip_id, trip_charge_key)');
  });

  it('movimentos só são lidos por authenticated', () => {
    expect(movements).toContain('revoke all on table public.financial_entry_movements');
    expect(movements).toContain('from public, anon, authenticated, service_role;');
    expect(movements).toContain('grant select on public.financial_entry_movements to authenticated;');
    expect(movements).not.toMatch(/grant[^;]*(insert|update|delete)[^;]*financial_entry_movements/i);
  });

  it('movimentos isolam a empresa com FK composta', () => {
    expect(movements).toContain('foreign key (company_id, financial_entry_id)');
    expect(movements).toContain('references public.financial_entries (company_id, id)');
  });

  it('funções com security definer fixam o search_path', () => {
    const definers = sync.match(/security definer\nset search_path = public/g) ?? [];
    const total = sync.match(/security definer/g) ?? [];
    expect(total.length).toBeGreaterThan(0);
    expect(definers).toHaveLength(total.length);
  });

  it('funções internas não ficam expostas', () => {
    expect(sync).toContain(
      'revoke all on function public.recompute_receivable_entry(uuid) from public, anon, authenticated;',
    );
    expect(sync).toContain(
      'revoke all on function public.assert_receivable_actor(uuid, text) from public, anon, authenticated;',
    );
  });

  it('a proteção do título cobre inclusão, alteração e exclusão', () => {
    expect(sync).toContain('before insert or update or delete on public.financial_entries');
  });

  it('a view do caixa respeita a RLS de quem consulta', () => {
    expect(cashFlow).toContain('with (security_invoker = true)');
    expect(cashFlow).toContain('revoke all on table public.financial_cash_flow_lines');
  });

  it('título de frete só vira receita com a viagem concluída', () => {
    expect(cashFlow).toContain("t.trip_status = 'completed'");
  });
});
