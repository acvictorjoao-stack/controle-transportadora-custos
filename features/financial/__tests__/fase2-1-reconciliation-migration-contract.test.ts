import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

import {
  RECONCILIATION_CHECKS,
  RECONCILIATION_ENTITY_TYPES,
  RECONCILIATION_SEVERITIES,
} from '../consistency/reconciliation';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
}

function withoutComments(sql: string): string {
  return sql.replace(/^\s*--.*$/gm, '');
}

const sql = read('supabase/migrations/113_financial_reconciliation.sql');
const code = withoutComments(sql);

/** Tuplas (verificação, severidades, entidade) de cada linha de achado devolvida. */
function emittedRows(): Array<{checkId: string; severities: string[]; entityType: string}> {
  const pattern =
    /'(R\d\d)'(?:::text)?,\s*(case\b[\s\S]*?\bend|'\w+'(?:::text)?),\s*'(\w+)'(?:::text)?/g;
  return [...code.matchAll(pattern)].map((match) => ({
    checkId: match[1],
    severities: [...match[2].matchAll(/'(\w+)'/g)]
      .map((item) => item[1])
      .filter((value) => (RECONCILIATION_SEVERITIES as readonly string[]).includes(value)),
    entityType: match[3],
  }));
}

describe('Fase 2.1 — migration 113 (contrato estático)', () => {
  it('não grava nem altera estrutura: só cria funções e concede execução', () => {
    expect(code).not.toMatch(/\b(insert\s+into|update\s+public\.|delete\s+from|truncate|alter\s+table|drop\s+)/i);
    expect(code).not.toMatch(/\bcreate\s+(table|view|trigger|index|policy)\b/i);
    expect(code.match(/create or replace function public\.\w+/g)).toEqual([
      'create or replace function public.financial_reconciliation_in_period',
      'create or replace function public.financial_reconciliation_ref_state',
      'create or replace function public.financial_reconciliation_findings',
      'create or replace function public.financial_reconciliation_summary',
    ]);
  });

  it('roda com a permissão de quem consulta e não é volátil; só ref_state é security definer', () => {
    expect(code.match(/security definer/g)).toHaveLength(1);
    const refState = code.slice(
      code.indexOf('create or replace function public.financial_reconciliation_ref_state'),
      code.indexOf('create or replace function public.financial_reconciliation_findings'),
    );
    expect(refState).toContain('returns text\nlanguage plpgsql\nstable\nsecurity definer\nset search_path = public');
    expect(code.match(/security invoker/g)).toHaveLength(2);
    expect(code).toContain('language plpgsql\nstable\nsecurity invoker\nset search_path = public');
    expect(code).toContain('language sql\nstable\nsecurity invoker\nset search_path = public');
    expect(code).toContain('language sql\nimmutable\nset search_path = public');
  });

  it('exige financeiro:read ou super admin; só papel que ignora RLS passa sem eles (mesma regra da 110)', () => {
    // Cada termo com coalesce: um NULL não pode deixar a verificação passar.
    expect(code).toContain("coalesce(public.has_company_permission(p_company_id, 'financeiro:read'), false)");
    expect(code).toContain('coalesce(public.is_company_super_admin(p_company_id), false)');
    expect(code).toContain(
      'coalesce((select r.rolbypassrls from pg_catalog.pg_roles r where r.rolname = current_user), false)',
    );
    expect(read('supabase/migrations/110_trip_financial_summary.sql')).toContain(
      '(select r.rolbypassrls from pg_catalog.pg_roles r where r.rolname = current_user)',
    );
    expect(code).toContain("raise exception 'Sem permissão para a reconciliação financeira.' using errcode = '42501';");
  });

  it('ref_state exige a mesma permissão, só olha a própria empresa e não devolve dados', () => {
    const refState = code.slice(
      code.indexOf('create or replace function public.financial_reconciliation_ref_state'),
      code.indexOf('create or replace function public.financial_reconciliation_findings'),
    );
    expect(refState).toContain("coalesce(public.has_company_permission(p_company_id, 'financeiro:read'), false)");
    expect(refState).toContain('coalesce(public.request_is_service_context(), false)');
    // Dentro de security definer, current_user é o dono: rolbypassrls sempre passaria.
    expect(refState).not.toContain('rolbypassrls');
    const lookups =
      refState.match(/from public\.\w+ x where x\.id = p_id and x\.company_id = p_company_id;/g) ?? [];
    expect(lookups).toHaveLength(12);
    expect(refState.match(/\breturn '\w+';/g)).toEqual([
      "return 'missing';",
      "return 'deleted';",
      "return 'inactive';",
      "return 'ok';",
    ]);
  });

  it('R02 e R04 usam ref_state, não um join com a RLS de quem consulta', () => {
    expect(code).toContain('public.financial_reconciliation_ref_state(p_company_id, l.link, l.linked_id) as state');
    expect(code).toContain(
      'public.financial_reconciliation_ref_state(p_company_id, fe.source_module, fe.source_id) as state',
    );
    expect(code).not.toMatch(/left join public\.(vehicles|drivers|trips) x/);
  });

  it('anon nunca executa; authenticated e service_role executam', () => {
    for (const fn of [
      'financial_reconciliation_in_period(date, date, date)',
      'financial_reconciliation_ref_state(uuid, text, uuid)',
      'financial_reconciliation_findings(uuid, date, date, integer)',
      'financial_reconciliation_summary(uuid, date, date)',
    ]) {
      expect(code).toContain(`revoke all on function public.${fn} from public, anon;`);
      expect(code).toContain(`grant execute on function public.${fn} to authenticated, service_role;`);
    }
    expect(code).not.toMatch(/grant[^;]*to[^;]*\banon\b/i);
  });

  it('cada linha usa o filtro explícito da empresa', () => {
    const blocks = code.split('return query').slice(1);
    // R01 tem dois blocos (origem e duplicidade manual): 12 blocos para 11 verificações.
    expect(blocks.length).toBe(12);
    for (const block of blocks) {
      expect(block).toMatch(/company_id = p_company_id/);
    }
  });

  it('o limite por verificação fica entre 1 e 1000 (nulo = sem limite, só para o resumo)', () => {
    expect(code).toContain(
      'v_limit integer := case when p_limit is null then null else least(greatest(p_limit, 1), 1000) end;',
    );
    expect(code.match(/limit v_limit;/g)).toHaveLength(12);
    expect(code).toContain('from public.financial_reconciliation_findings(p_company_id, p_from, p_to, null) f');
  });
});

describe('Fase 2.1 — 113 × catálogo TypeScript', () => {
  const rows = emittedRows();

  it('devolve exatamente as verificações de banco do catálogo', () => {
    const database = RECONCILIATION_CHECKS.filter((check) => check.source === 'database').map(
      (check) => check.id,
    );
    expect([...new Set(rows.map((row) => row.checkId))].sort()).toEqual([...database].sort());
  });

  it('só usa severidades e entidades do contrato, e nunca acima da severidade do catálogo', () => {
    const rank = {critical: 0, high: 1, warning: 2} as const;
    for (const row of rows) {
      expect(RECONCILIATION_ENTITY_TYPES as readonly string[]).toContain(row.entityType);
      expect(row.severities.length).toBeGreaterThan(0);
      const check = RECONCILIATION_CHECKS.find((item) => item.id === row.checkId);
      for (const severity of row.severities as Array<keyof typeof rank>) {
        expect(rank[severity]).toBeGreaterThanOrEqual(rank[check!.severity]);
      }
    }
  });

  it('as colunas devolvidas são as do ReconciliationFindingRow', () => {
    const columns = /returns table \(\n([\s\S]*?)\n\)/.exec(code)?.[1] ?? '';
    expect(columns.split('\n').map((line) => line.trim().split(' ')[0])).toEqual([
      'check_id',
      'severity',
      'entity_type',
      'entity_id',
      'reference',
      'expected',
      'actual',
      'details',
      'legacy',
    ]);
  });

  it('só a R09 e o estorno sem original (constraint NOT VALID da 091) saem como legado', () => {
    const legacyBlocks = code
      .split('return query')
      .slice(1)
      .flatMap((block) => block.split('union all'))
      .filter((part) => /\n\s+true\n/.test(part));
    expect(legacyBlocks).toHaveLength(2);
    expect(legacyBlocks.some((part) => part.includes("'R09'"))).toBe(true);
    expect(legacyBlocks.some((part) => part.includes("'reversal_without_original'"))).toBe(true);
  });
});

describe('Fase 2.1 — 113 reaproveita as regras existentes (sem recriar)', () => {
  it('"ativo" é o mesmo predicado da DRE, da 109 e da I5', () => {
    expect(code.match(/entry_status not in \('cancelled', 'reversed'\)/g)!.length).toBeGreaterThanOrEqual(20);
    expect(code).toContain("fe.entry_type <> 'reversal'");
    expect(read('supabase/migrations/109_financial_entries_source_unique.sql')).toContain(
      "entry_status not in ('cancelled', 'reversed')",
    );
  });

  it('despesa de viagem exige lançamento nos mesmos casos da 111', () => {
    const m111 = read('supabase/migrations/111_trip_expense_financial_sync.sql');
    expect(m111).toContain("when p_paid_by = 'company' then 'paid'");
    expect(m111).toContain("when p_paid_by in ('driver', 'aggregate') then 'payable'");
    expect(m111).toContain("else 'none'");
    expect(m111).toContain("and new.expense_type <> 'advance'");
    expect(code).toContain("te.paid_by in ('company', 'driver', 'aggregate')");
    expect(code).toContain("x.paid_by in ('company', 'driver', 'aggregate')");
    expect(code).toContain("te.expense_type <> 'advance'");
  });

  it('valores das origens são os da integração (integration-events.ts)', () => {
    const events = read('features/financial/services/integration-events.ts');
    expect(events).toContain('record.finalAmount ?? record.totalCost ?? record.estimatedAmount ?? 0');
    expect(code).toContain('coalesce(mr.final_amount, mr.total_cost, mr.estimated_amount, 0)');
    expect(events).toContain('purchaseCost + (tire.totalRecapCost ?? 0)');
    expect(code).toContain('coalesce(ti.purchase_value, 0) + coalesce(ti.total_recap_cost, 0)');
    expect(events).toContain('amount: record.totalAmount');
    expect(code).toContain('round(fr.total_amount, 2)');
  });

  it('título de frete: ausente (R03) e frete = amount + adjustment_total (R05), como na 107', () => {
    const m107 = read('supabase/migrations/107_trip_receivable_sync.sql');
    expect(m107).toContain('if v_freight <> v_title.amount + v_title.adjustment_total then');
    expect(code).toContain("'missing_freight_charge'");
    expect(code).toContain("fe.trip_charge_key = 'freight'");
    expect(code).toContain('round(fe.amount + coalesce(fe.adjustment_total, 0), 2)');
    expect(code).toContain('coalesce(t.actual_freight_value, t.contracted_freight_value, 0)');
  });

  it('conta a receber: mesma regra de quitação de recompute_receivable_entry (107)', () => {
    const m107 = read('supabase/migrations/107_trip_receivable_sync.sql');
    expect(m107).toContain('v_settled := v_received > 0 and v_received >= v_entry.amount + v_adjustment;');
    expect(code).toContain('mv.received > 0 and mv.received >= fe.amount + mv.adjustment');
    expect(code).toContain(
      "sum(case m.kind when 'receipt' then m.amount when 'receipt_reversal' then -m.amount else 0 end)",
    );
  });

  it('datas no dia de Brasília, como toCivilDate', () => {
    expect(code).toContain("timezone('America/Sao_Paulo', fr.fueled_at)::date");
    expect(code).not.toMatch(/fueled_at::date/);
  });
});

describe('Fase 2.1 — reversão e teste em banco', () => {
  it('a reversão remove só as quatro funções', () => {
    const rollback = withoutComments(read('database/rollback/fase-2-1-113.sql'));
    expect(rollback.match(/drop function if exists public\.\w+/g)).toEqual([
      'drop function if exists public.financial_reconciliation_summary',
      'drop function if exists public.financial_reconciliation_findings',
      'drop function if exists public.financial_reconciliation_ref_state',
      'drop function if exists public.financial_reconciliation_in_period',
    ]);
    expect(rollback).not.toMatch(/\b(insert\s+into|update\s+public\.|delete\s+from|truncate|alter\s+table)/i);
  });

  it('o teste em banco cobre cada verificação, permissão e isolamento, e desfaz tudo', () => {
    const test = read('database/tests/fase-2-1-reconciliation.sql');
    expect(test).toContain("= 'R01:1,R02:1,R03:2,R04:1,R05:1,R06:1,R07:1,R08:1,R09:1,R10:1,R14:1'");
    expect(test).toContain('sem financeiro:read, a reconciliação é recusada');
    expect(test).toContain('o Financeiro da empresa B não consulta a empresa A');
    expect(test).toContain('anon não executa nenhuma das funções; authenticated executa');
    expect(test).toContain('Financeiro sem acesso aos módulos: nenhum órfão ou vínculo falso');
    expect(test).toContain('ref_state: id de outra empresa responde missing, sem revelar que existe');
    expect(test.trimEnd().endsWith('rollback;')).toBe(true);
  });
});
