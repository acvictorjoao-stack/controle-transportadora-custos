import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
}

const COMPANY = '451a7940-a56b-425f-ae5f-e493d536591f';

describe('Fase 1, Etapa 2B — backfill (migration 112, contrato estático)', () => {
  const sql = read('supabase/migrations/112_backfill_trip_expenses.sql');
  const code = sql.replace(/^\s*--.*$/gm, '');

  it('só toca a empresa de teste', () => {
    expect(code).toContain(`c_company constant uuid := '${COMPANY}';`);
    const updates = code.match(/update public\.trip_expenses te[\s\S]*?;/g) ?? [];
    expect(updates).toHaveLength(1);
    expect(updates[0]).toContain('where te.company_id = c_company');
  });

  it('para antes de gravar se a contagem ou o total divergirem (10 / R$ 1.175,00)', () => {
    expect(code).toContain('c_expected_count constant integer := 10;');
    expect(code).toContain('c_expected_total constant numeric(14, 2) := 1175.00;');
    const firstCheck = code.indexOf('if v_count <> c_expected_count or v_total <> c_expected_total');
    expect(firstCheck).toBeGreaterThan(0);
    expect(firstCheck).toBeLessThan(code.indexOf('update public.trip_expenses'));
  });

  it('exige a 111 aplicada e recusa despesa que já tenha lançamento', () => {
    expect(code).toContain("to_regprocedure('public.sync_trip_expense_entry()') is null");
    expect(code).toContain('há despesa elegível com lançamento ativo');
  });

  it('não cria lançamento à mão: só informa quem pagou e deixa o gatilho da 111 criar', () => {
    expect(code).not.toMatch(/insert\s+into\s+public\.financial_entries/i);
    expect(code).not.toMatch(/update\s+public\.financial_entries/i);
    expect(code).not.toMatch(/delete\s+from/i);
    expect(code).toContain("set paid_by = 'company',\n      payment_method = 'not_informed'");
    expect(code).toContain("and te.paid_by is null;");
    expect(code).toContain("and te.expense_type <> 'advance'");
  });

  it('marca o lote e confere o resultado (um lançamento por despesa)', () => {
    expect(code).toContain("perform set_config('fleetcontrol.trip_expense_batch', c_batch, true);");
    expect(code).toContain("and fe.metadata ->> 'backfill' = c_batch");
    expect(code).toContain('v_orphans <> 0');
  });

  it('o lote é o que o gatilho da 111 grava em metadata', () => {
    const m111 = read('supabase/migrations/111_trip_expense_financial_sync.sql');
    expect(m111).toContain("nullif(current_setting('fleetcontrol.trip_expense_batch', true), '')");
    expect(m111).toContain("jsonb_build_object('backfill', v_batch)");
  });
});

describe('Fase 1, Etapa 2B — reversão do backfill', () => {
  const rollback = read('database/rollback/fase-1-112.sql');
  const code = rollback.replace(/^\s*--.*$/gm, '');

  it('estorna com histórico, pela função da 111, e só o lote da empresa de teste', () => {
    expect(code).toContain('perform public.close_trip_expense_entry(v_entry.id, null);');
    expect(code).toContain(`c_company constant uuid := '${COMPANY}';`);
    expect(code).toContain("c_batch constant text := 'fase1-2b-2026-11';");
    expect(code).not.toMatch(/delete\s+from/i);
  });

  it('para se houver movimento de caixa ou alteração posterior', () => {
    expect(code).toContain('há lançamento do lote com movimento de caixa');
    expect(code).toContain('lançamento do lote foi alterado depois do backfill');
  });

  it('religa a sincronização na mesma transação', () => {
    const disable = code.indexOf('disable trigger trip_expenses_sync_financial_entry');
    const enable = code.indexOf('enable trigger trip_expenses_sync_financial_entry');
    expect(disable).toBeGreaterThan(0);
    expect(enable).toBeGreaterThan(disable);
    expect(code.trimEnd().endsWith('commit;')).toBe(true);
  });
});
