import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

import {
  PAYROLL_EXPENSE_COST_CENTER_EMBED,
  PAYROLL_EXPENSE_DRIVER_EMBED,
  PAYROLL_EXPENSE_EMPLOYEE_EMBED,
  PAYROLL_EXPENSE_LIST_COLUMNS,
  PAYROLL_EXPENSE_POSITION_EMBED,
} from '../../constants';

const generatedTypes = readFileSync(
  resolve(process.cwd(), 'supabase/types/database.ts'),
  'utf8',
);

describe('PAYROLL_EXPENSE embeds — FKs compostas PostgREST', () => {
  it('employee usa payroll_expenses_employee_company_fkey', () => {
    expect(PAYROLL_EXPENSE_EMPLOYEE_EMBED).toBe(
      'employees!payroll_expenses_employee_company_fkey(id, name)',
    );
    expect(PAYROLL_EXPENSE_EMPLOYEE_EMBED).not.toMatch(/employees:employee_id/);
    expect(generatedTypes).toContain('foreignKeyName: "payroll_expenses_employee_company_fkey"');
    expect(generatedTypes).toMatch(
      /foreignKeyName:\s*"payroll_expenses_employee_company_fkey"[\s\S]*?columns:\s*\["company_id",\s*"employee_id"\]/,
    );
  });

  it('driver usa payroll_expenses_driver_company_fkey', () => {
    expect(PAYROLL_EXPENSE_DRIVER_EMBED).toBe(
      'drivers!payroll_expenses_driver_company_fkey(id, name)',
    );
    expect(PAYROLL_EXPENSE_DRIVER_EMBED).not.toMatch(/drivers:driver_id/);
    expect(generatedTypes).toContain('foreignKeyName: "payroll_expenses_driver_company_fkey"');
    expect(generatedTypes).toMatch(
      /foreignKeyName:\s*"payroll_expenses_driver_company_fkey"[\s\S]*?columns:\s*\["company_id",\s*"driver_id"\]/,
    );
  });

  it('position usa payroll_expenses_position_company_fkey', () => {
    expect(PAYROLL_EXPENSE_POSITION_EMBED).toBe(
      'positions!payroll_expenses_position_company_fkey(id, code, name)',
    );
    expect(PAYROLL_EXPENSE_POSITION_EMBED).not.toMatch(/positions:position_id/);
    expect(generatedTypes).toContain('foreignKeyName: "payroll_expenses_position_company_fkey"');
  });

  it('cost_center usa payroll_expenses_cost_center_company_fkey', () => {
    expect(PAYROLL_EXPENSE_COST_CENTER_EMBED).toBe(
      'cost_centers!payroll_expenses_cost_center_company_fkey(id, code, name)',
    );
    expect(PAYROLL_EXPENSE_COST_CENTER_EMBED).not.toMatch(/cost_centers:cost_center_id/);
    expect(generatedTypes).toContain(
      'foreignKeyName: "payroll_expenses_cost_center_company_fkey"',
    );
  });

  it('PAYROLL_EXPENSE_LIST_COLUMNS inclui os quatro embeds e não usa hints por coluna', () => {
    expect(PAYROLL_EXPENSE_LIST_COLUMNS).toContain(PAYROLL_EXPENSE_EMPLOYEE_EMBED);
    expect(PAYROLL_EXPENSE_LIST_COLUMNS).toContain(PAYROLL_EXPENSE_DRIVER_EMBED);
    expect(PAYROLL_EXPENSE_LIST_COLUMNS).toContain(PAYROLL_EXPENSE_POSITION_EMBED);
    expect(PAYROLL_EXPENSE_LIST_COLUMNS).toContain(PAYROLL_EXPENSE_COST_CENTER_EMBED);
    expect(PAYROLL_EXPENSE_LIST_COLUMNS).not.toMatch(/employees:employee_id/);
    expect(PAYROLL_EXPENSE_LIST_COLUMNS).not.toMatch(/drivers:driver_id/);
    expect(PAYROLL_EXPENSE_LIST_COLUMNS).not.toMatch(/positions:position_id/);
    expect(PAYROLL_EXPENSE_LIST_COLUMNS).not.toMatch(/cost_centers:cost_center_id/);
  });
});
