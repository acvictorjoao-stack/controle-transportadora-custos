import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
}

function migration(file: string): string {
  return read(`supabase/migrations/${file}`);
}

/** Corpo de uma função `create or replace function public.<nome>(...)`. */
function functionBody(sql: string, name: string): string {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  expect(start, `função ${name}`).toBeGreaterThanOrEqual(0);
  const open = sql.indexOf('$$', start);
  const close = sql.indexOf('$$;', open + 2);
  return sql.slice(start, close + 3);
}

/** SQL de nível superior: tira comentários e corpos de função. */
function topLevel(sql: string): string {
  return sql.replace(/\$\$[\s\S]*?\$\$/g, '$$ $$').replace(/^\s*--.*$/gm, '');
}

/** Colunas do select da view, na ordem. */
function viewColumns(sql: string): string[] {
  const start = sql.indexOf('create or replace view public.trip_financial_summary');
  const select = sql.indexOf('\nselect\n', start);
  const from = sql.indexOf('\nfrom public.trips t', select);
  const columns: string[] = [];
  for (const line of sql.slice(select, from).split('\n')) {
    const alias = /\bas (\w+),?$/.exec(line.trim());
    const plain = /^(?:t|aba)\.(\w+),?$/.exec(line.trim());
    if (alias) columns.push(alias[1]);
    else if (plain) columns.push(plain[1]);
  }
  return columns;
}

describe('Fase 1, Etapa 2 — migration 111 (contrato estático)', () => {
  const sql = migration('111_trip_expense_financial_sync.sql');
  const sync = functionBody(sql, 'sync_trip_expense_entry');
  const close = functionBody(sql, 'close_trip_expense_entry');
  const guard = functionBody(sql, 'guard_trip_expense_entry');
  const onDelete = functionBody(sql, 'close_trip_expense_entry_on_delete');
  const treatment = functionBody(sql, 'trip_expense_financial_treatment');

  it('não altera dados existentes no nível da migration', () => {
    const top = topLevel(sql);
    // Instruções de dados no início da linha (o "insert or update" dos gatilhos não conta).
    expect(top).not.toMatch(/^\s*(update|delete\s+from|insert\s+into|truncate)\b/im);
    expect(top).not.toMatch(/\bdrop\s+(table|column)\b/i);
  });

  it('é idempotente: restrições e gatilhos são recriados sem erro', () => {
    for (const constraint of [
      'trip_expenses_paid_by_check',
      'trip_expenses_payment_method_check',
      'trip_expenses_payment_combination_check',
      'trip_expenses_supplier_credit_requires_due_date',
    ]) {
      expect(sql.indexOf(`drop constraint if exists ${constraint};`)).toBeLessThan(
        sql.indexOf(`add constraint ${constraint}`),
      );
    }
    for (const trigger of [
      'trip_expenses_sync_financial_entry',
      'trip_expenses_close_financial_entry',
      'financial_entries_guard_trip_expense',
    ]) {
      expect(sql.indexOf(`drop trigger if exists ${trigger} on`)).toBeLessThan(
        sql.indexOf(`create trigger ${trigger}`),
      );
    }
    expect(sql).not.toMatch(/^create function/m);
  });

  it('as colunas novas são opcionais e com valores válidos', () => {
    expect(sql).toContain('add column if not exists paid_by text');
    expect(sql).toContain('add column if not exists payment_method text');
    expect(sql).toContain('add column if not exists due_date date');
    expect(sql).not.toMatch(/paid_by text not null/);
    expect(sql).toContain("check (paid_by is null or paid_by in ('company', 'driver', 'aggregate', 'third_party'))");
    expect(sql).toContain('trip_expenses_payment_combination_check');
    expect(sql).toContain("(paid_by = 'driver' and payment_method in ('own_money', 'driver_advance'))");
    expect(sql).toContain("(paid_by = 'third_party' and payment_method is null)");
    expect(sql).toContain("check (payment_method is distinct from 'supplier_credit' or due_date is not null)");
  });

  it('é inerte para o código antigo, que não preenche paid_by (D10)', () => {
    expect(sync).toMatch(/if new\.paid_by is null and v_entry\.id is null then\n\s+return new;/);
  });

  it('mapeia quem pagou para o tratamento financeiro (D8)', () => {
    expect(treatment).toContain("when p_paid_by = 'company' and p_payment_method = 'supplier_credit' then 'payable'");
    expect(treatment).toContain("when p_paid_by = 'company' then 'paid'");
    expect(treatment).toContain("when p_paid_by = 'driver' and p_payment_method = 'driver_advance' then 'paid_by_advance'");
    expect(treatment).toContain("when p_paid_by in ('driver', 'aggregate') then 'payable'");
    expect(treatment).toContain("else 'none'");
  });

  it('terceiro e o tipo antigo "adiantamento" não geram custo (D13, D14)', () => {
    expect(sync).toContain("and new.expense_type <> 'advance'");
    expect(sync).toContain("and v_treatment <> 'none'");
  });

  it('gera no máximo um lançamento por despesa, com a chave do índice 109', () => {
    expect(sync).toContain("and fe.source_module = 'trip_expense'");
    expect(sync).toContain('and fe.source_id = new.id');
    expect(sync).toContain("and fe.entry_status not in ('cancelled', 'reversed')");
    expect(sync).toContain('for update;');
    // Inserção grava origem, id da despesa e parcela 1/1.
    expect(sync).toMatch(/'trip_expense', new\.id, true,\n\s+1, 1, v_metadata/);
    expect((sync.match(/insert into public\.financial_entries/g) ?? []).length).toBe(1);
  });

  it('reembolso baixa o lançamento original e não cria segundo custo', () => {
    expect(sync).toContain("v_settled := v_entry.metadata ->> 'treatment' = 'payable'");
    expect(sync).toContain("v_keep_settlement := v_settled and v_treatment = 'payable';");
    expect(guard).toContain("if old.metadata ->> 'treatment' is distinct from 'payable' then");
    expect(guard).toContain("if new.entry_status not in ('pending', 'paid', 'overdue') then");
  });

  it('pagamento ou movimento posterior exige estorno antes de alterar ou excluir', () => {
    expect(sync).toMatch(/if \(v_has_movements or v_settled\)\n\s+and \(/);
    expect(close).toContain('from public.financial_entry_movements m');
    expect(close).toContain('Estorne o pagamento no Financeiro antes.');
    expect(close).toContain("if v_entry.metadata ->> 'treatment' = 'payable'");
  });

  it('exclusão de despesa paga estorna e preserva o histórico; pendente é cancelada', () => {
    expect(close).toMatch(/'reversal', 'paid', 'Estorno — '/);
    expect(close).toContain('v_entry.amount, v_entry.currency');
    expect(close).toContain("'trip_expense', v_entry.source_id, true, v_entry.id,");
    expect(close).toContain("set entry_status = 'reversed'");
    expect(close).toContain("set entry_status = 'cancelled'");
    expect(close).not.toMatch(/delete\s+from/i);
  });

  it('isolamento: empresa fixa, viagem da mesma empresa e buscas filtradas por empresa', () => {
    expect(sync).toContain("raise exception 'Despesa de viagem não pode mudar de empresa.'");
    expect(sync).toMatch(/where t\.id = new\.trip_id\n\s+and t\.company_id = new\.company_id;/);
    expect(sync).toContain('where fe.company_id = new.company_id');
    expect(sync).toContain('where fc.company_id = new.company_id');
    expect(sync).toContain('where cc.company_id = new.company_id');
    expect(onDelete).toContain('where fe.company_id = old.company_id');
  });

  it('funções com security definer fixam o search_path', () => {
    const definers = sql.match(/security definer\nset search_path = public/g) ?? [];
    const total = sql.match(/security definer/g) ?? [];
    expect(total.length).toBe(4);
    expect(definers).toHaveLength(total.length);
  });

  it('funções internas não ficam expostas pela API', () => {
    for (const signature of [
      'close_trip_expense_entry(uuid, uuid)',
      'sync_trip_expense_entry()',
      'close_trip_expense_entry_on_delete()',
      'guard_trip_expense_entry()',
      'request_is_hml_company_reset()',
      'trip_expense_financial_treatment(text, text)',
    ]) {
      expect(sql).toContain(`revoke all on function public.${signature} from public, anon, authenticated;`);
    }
    expect(sql).not.toMatch(/grant execute on function public\.(sync|close|guard)_trip_expense/);
  });

  it('gatilhos: sincronização depois de gravar a despesa, encerramento antes de apagar, proteção do lançamento', () => {
    expect(sql).toMatch(/create trigger trip_expenses_sync_financial_entry\n\s+after insert or update on public\.trip_expenses/);
    expect(sql).toMatch(/create trigger trip_expenses_close_financial_entry\n\s+before delete on public\.trip_expenses/);
    expect(sql).toMatch(/create trigger financial_entries_guard_trip_expense\n\s+before insert or update or delete on public\.financial_entries/);
  });

  it('proteção: lançamento integrado não nasce, muda de valor, é estornado nem apagado por fora', () => {
    expect(guard).toContain("if new.source_module = 'trip_expense' then");
    expect(guard).toContain('Para estornar uma despesa de viagem, exclua ou altere a despesa na viagem.');
    expect(guard).toContain("raise exception 'Lançamento de despesa de viagem não pode ser excluído.'");
    for (const field of ['amount', 'trip_id', 'company_id', 'source_id', 'entry_type', 'deleted_at', 'category_id']) {
      expect(guard).toContain(`new.${field} is distinct from old.${field}`);
    }
  });

  it('reset da empresa de teste continua funcionando (mesmas GUCs da RPC 104)', () => {
    const reset104 = migration('104_hml_destructive_rpc_hardening.sql');
    expect(reset104).toContain("c_confirm text := 'HML_RESET_COMPANY_BUSINESS';");
    expect(reset104).toContain("c_guc text := 'app.allow_hml_company_reset';");
    expect(reset104).toContain("c_project_guc text := 'app.hml_expected_project_ref';");
    expect(sql).toContain(
      "select current_setting('app.allow_hml_company_reset', true) = 'HML_RESET_COMPANY_BUSINESS'",
    );
    expect(sql).toContain("and current_setting('app.hml_expected_project_ref', true) = 'aobfjjaucdrwybebosxm';");
    // Só DELETE passa pelo reset; no reset, apagar a despesa não toca o lançamento.
    expect(guard).toMatch(/if tg_op = 'DELETE' and public\.request_is_hml_company_reset\(\) then\n\s+return old;/);
    expect(onDelete).toMatch(/if public\.request_is_hml_company_reset\(\) then\n\s+return old;/);
  });

  it('compatível com a 110: mesmas colunas, na mesma ordem, e uma nova no fim', () => {
    const before = viewColumns(migration('110_trip_financial_summary.sql'));
    const after = viewColumns(sql);
    expect(before.length).toBe(26);
    expect(after).toEqual([...before, 'trip_expense_costs']);
    expect(sql).toContain('with (security_invoker = true)');
    expect(sql).toContain('case when vis.visible then costs.trip_expense_costs end as trip_expense_costs');
  });

  it('a view separa despesas de viagem de combustível, manutenção e pneus (sem contagem dupla)', () => {
    const view = sql.slice(sql.indexOf('create or replace view public.trip_financial_summary'));
    expect((view.match(/and fe\.source_module is distinct from 'trip_expense'/g) ?? []).length).toBe(3);
    expect(view).toMatch(/- costs\.trip_expense_costs\n\s+end as other_costs/);
    expect(view).toContain("and te.paid_by is distinct from 'third_party'");
    // Adiantamento continua fora do custo direto.
    expect(view).toContain("coalesce(round(sum(fe.amount) filter (where fe.entry_type = 'expense'), 2), 0)");
  });
});

describe('Fase 1, Etapa 2 — reversão da 111', () => {
  const rollback = read('database/rollback/fase-1-111.sql');
  const code = rollback.replace(/^\s*--.*$/gm, '');

  it('remove gatilhos e funções e devolve a view da 110', () => {
    for (const trigger of [
      'trip_expenses_sync_financial_entry',
      'trip_expenses_close_financial_entry',
      'financial_entries_guard_trip_expense',
    ]) {
      expect(code).toContain(`drop trigger if exists ${trigger}`);
    }
    expect(code).toContain('drop function if exists public.sync_trip_expense_entry();');
    expect(code).toContain('drop view if exists public.trip_financial_summary;');
    expect(code).toContain('create view public.trip_financial_summary');
    expect(code).not.toContain('trip_expense_costs');
    expect(code).toContain('grant select on public.trip_financial_summary to authenticated;');
    expect(code).toContain('with (security_invoker = true)');
  });

  it('não apaga dados nem as colunas informadas pelos usuários', () => {
    expect(code).not.toMatch(/\b(update|delete\s+from|insert\s+into|truncate)\b/i);
    expect(code).not.toMatch(/drop column/i);
  });
});

describe('Fase 1, Etapa 2 — teste em banco (somente local)', () => {
  const sql = read('database/tests/fase-1-etapa2.sql');

  it('cobre os cenários exigidos e desfaz tudo no fim', () => {
    for (const scenario of [
      'sem quem pagou, nada é integrado',
      'edição de valor atualiza o mesmo lançamento',
      'motorista com dinheiro próprio vira reembolso pendente',
      'Financeiro baixa o reembolso no próprio lançamento',
      'reembolso pago: valor não muda sem estornar o pagamento',
      'despesa paga excluída: original fica "reversed"',
      'reembolso pendente excluído: lançamento cancelado',
      'despesa paga por terceiro não gera custo',
      'segundo lançamento ativo para a mesma despesa é recusado pelo índice 109',
      'usuário só com viagens não lê o financeiro',
      'Financeiro não altera o valor do lançamento integrado',
      'outra empresa não enxerga as despesas da empresa A',
      'view: custo de despesas de viagem e resultado batem com os lançamentos',
      'no reset, os lançamentos integrados da empresa podem ser apagados',
    ]) {
      expect(sql).toContain(scenario);
    }
    expect(sql.trimEnd().endsWith('rollback;')).toBe(true);
  });
});
