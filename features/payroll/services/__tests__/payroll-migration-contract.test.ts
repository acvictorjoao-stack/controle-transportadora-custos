import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/091_payroll_expenses_rc_29_0_0.sql'),
  'utf8',
);

/**
 * Contrato SQL da migration 091. São checagens estáticas: o comportamento real
 * (FK cross-company recusada, RLS, unicidade sob concorrência) só pode ser
 * confirmado em banco depois de aplicar a migration.
 */

/** Ação ON DELETE declarada logo após a definição da constraint. */
function onDeleteAction(constraintName: string): string {
  const start = migration.indexOf(constraintName);
  if (start < 0) return 'constraint-ausente';
  return /on delete (\w+)/.exec(migration.slice(start))?.[1] ?? 'sem-on-delete';
}

/** Corpo de um CREATE TABLE, sem os objetos declarados depois dele. */
function tableBlock(table: string): string {
  const start = migration.indexOf(`create table public.${table} (`);
  return migration.slice(start, migration.indexOf('\n);', start));
}

/** Corpo de um CREATE UNIQUE INDEX, incluindo o predicado parcial. */
function uniqueIndexBlock(name: string): string {
  const start = migration.indexOf(`create unique index ${name}`);
  if (start < 0) return 'indice-ausente';
  return migration.slice(start, migration.indexOf(';', start));
}

/** Corpo de uma policy, do CREATE POLICY até o fim do comando. */
function policyBlock(name: string): string {
  const start = migration.indexOf(`create policy ${name}`);
  return migration.slice(start, migration.indexOf(';', start));
}

const COMPOSITE_FOREIGN_KEYS = [
  'drivers_branch_company_fkey',
  'employees_branch_company_fkey',
  'employees_position_company_fkey',
  'employees_cost_center_company_fkey',
  'payroll_expenses_branch_company_fkey',
  'payroll_expenses_employee_company_fkey',
  'payroll_expenses_driver_company_fkey',
  'payroll_expenses_position_company_fkey',
  'payroll_expenses_cost_center_company_fkey',
];

describe('FKs compostas (isolamento por empresa)', () => {
  it('toda referência de folha carrega company_id', () => {
    for (const constraint of COMPOSITE_FOREIGN_KEYS) {
      expect(migration).toContain(`constraint ${constraint}`);
    }
    expect(migration).toContain('foreign key (company_id, branch_id)');
    expect(migration).toContain('foreign key (company_id, employee_id)');
    expect(migration).toContain('foreign key (company_id, driver_id)');
    expect(migration).toContain('foreign key (company_id, position_id)');
    expect(migration).toContain('foreign key (company_id, cost_center_id)');
  });

  it('as colunas referenciadas têm chave única compatível', () => {
    expect(migration).toContain('branches_company_id_id_key unique (company_id, id)');
    expect(migration).toContain('drivers_company_id_id_key unique (company_id, id)');
    expect(migration).toContain('cost_centers_company_id_id_key unique (company_id, id)');
    expect(migration).toContain('positions_company_id_id_key unique (company_id, id)');
    expect(migration).toContain('employees_company_id_id_key unique (company_id, id)');
  });

  it('nenhuma FK composta usa SET NULL — company_id é NOT NULL', () => {
    for (const constraint of COMPOSITE_FOREIGN_KEYS) {
      expect([constraint, onDeleteAction(constraint)]).toEqual([constraint, 'restrict']);
    }
  });

  it('company_id é obrigatório nas três tabelas novas', () => {
    for (const table of ['positions', 'employees', 'payroll_expenses']) {
      expect(tableBlock(table)).toMatch(
        /company_id\s+uuid not null references public\.companies \(id\)/,
      );
    }
  });
});

describe('autorização do seed de cargos', () => {
  it('exige financeiro:create ou Super Admin, não apenas vínculo com a empresa', () => {
    expect(migration).toContain(
      "public.has_company_permission(p_company_id, 'financeiro:create')",
    );
    expect(migration).toContain('public.is_company_super_admin(p_company_id)');
    // Master sem contexto reprova nos dois helpers (090); com contexto, passa.
    expect(migration).not.toContain('public.is_company_member(p_company_id)');
  });

  it('SECURITY DEFINER não fica exposto a anon pelo EXECUTE default de PUBLIC', () => {
    expect(migration).toContain(
      'revoke all on function public.seed_positions_for_company(uuid, uuid) from public;',
    );
    expect(migration).toContain(
      'grant execute on function public.seed_positions_for_company(uuid, uuid) to authenticated, service_role;',
    );
  });

  it('seed concorrente não duplica cargos', () => {
    expect(migration).toContain(
      'on conflict (company_id, upper(code)) where deleted_at is null',
    );
    expect(migration).toContain('do nothing;');
    // O NOT EXISTS preserva cargos já existentes (inclusive renomeados).
    expect(migration).toContain('and upper(p.code) = v.code');
  });
});

describe('cargos do sistema', () => {
  it('is_system não pode ser excluído nem por financeiro:delete', () => {
    expect(policyBlock('positions_delete_authorized')).toContain('is_system = false');
  });
});

describe('hard delete de payroll_expenses', () => {
  it('authenticated não recebe DELETE', () => {
    expect(migration).toContain(
      'grant select, insert, update on public.payroll_expenses to authenticated;',
    );
    expect(migration).not.toContain(
      'grant select, insert, update, delete on public.payroll_expenses',
    );
  });

  it('não existe policy de DELETE — exclusão é lógica com estorno', () => {
    expect(migration).not.toContain('create policy payroll_expenses_delete_authorized');
  });

  it('trigger bloqueia DELETE físico, inclusive por service_role', () => {
    expect(migration).toContain('create trigger payroll_expenses_prevent_hard_delete');
    expect(migration).toContain('before delete on public.payroll_expenses');
    expect(migration).toContain('public.prevent_payroll_expense_hard_delete()');
    expect(migration).toContain("current_setting('app.allow_payroll_hard_delete', true)");
  });
});

describe('idempotência financeira da folha', () => {
  it('estorno é sempre par: reversal exige original e só ele preenche a coluna', () => {
    expect(migration).toContain('financial_entries_reversal_requires_original');
    expect(migration).toContain(
      "check ((entry_type = 'reversal') = (reversed_entry_id is not null))",
    );
  });

  it('origem de folha exige chave determinística (nada de installment_number nulo)', () => {
    expect(migration).toContain('financial_entries_payroll_origin_key');
    expect(migration).toContain(
      '(source_id is not null and installment_number is not null)',
    );
  });

  it('uma origem ativa por despesa + parcela, com estorno fora da chave', () => {
    const index = uniqueIndexBlock('idx_financial_entries_payroll_source_active');
    expect(index).toContain('(company_id, source_id, installment_number)');
    expect(index).toContain("source_module = 'payroll'");
    expect(index).toContain("entry_type <> 'reversal'");
    // Soft delete não libera a chave: excluir logicamente não permite duplicar.
    expect(index).not.toContain('deleted_at');
  });

  it('um único estorno por lançamento original, mesmo após soft delete', () => {
    const index = uniqueIndexBlock('idx_financial_entries_single_reversal');
    expect(index).toContain('(reversed_entry_id)');
    expect(index).toContain('where reversed_entry_id is not null');
    expect(index).not.toContain('deleted_at');
  });
});
