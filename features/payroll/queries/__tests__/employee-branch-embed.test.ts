import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

import {
  EMPLOYEE_BRANCH_EMBED,
  EMPLOYEE_COST_CENTER_EMBED,
  EMPLOYEE_LIST_WITH_RELATIONS_COLUMNS,
  EMPLOYEE_POSITION_EMBED,
} from '../../constants';

const generatedTypes = readFileSync(
  resolve(process.cwd(), 'supabase/types/database.ts'),
  'utf8',
);

describe('EMPLOYEE relation embeds — FKs compostas PostgREST', () => {
  it('position usa employees_position_company_fkey (não hint position_id)', () => {
    expect(EMPLOYEE_POSITION_EMBED).toBe(
      'positions!employees_position_company_fkey(id, code, name)',
    );
    expect(EMPLOYEE_POSITION_EMBED).not.toMatch(/positions:position_id/);
    expect(generatedTypes).toContain('foreignKeyName: "employees_position_company_fkey"');
    expect(generatedTypes).toMatch(
      /foreignKeyName:\s*"employees_position_company_fkey"[\s\S]*?columns:\s*\["company_id",\s*"position_id"\]/,
    );
  });

  it('cost_center usa employees_cost_center_company_fkey (não hint cost_center_id)', () => {
    expect(EMPLOYEE_COST_CENTER_EMBED).toBe(
      'cost_centers!employees_cost_center_company_fkey(id, code, name)',
    );
    expect(EMPLOYEE_COST_CENTER_EMBED).not.toMatch(/cost_centers:cost_center_id/);
    expect(generatedTypes).toContain('foreignKeyName: "employees_cost_center_company_fkey"');
    expect(generatedTypes).toMatch(
      /foreignKeyName:\s*"employees_cost_center_company_fkey"[\s\S]*?columns:\s*\["company_id",\s*"cost_center_id"\]/,
    );
  });

  it('branch usa employees_branch_company_fkey (não hint branch_id)', () => {
    expect(EMPLOYEE_BRANCH_EMBED).toBe(
      'branches!employees_branch_company_fkey(id, code, name)',
    );
    expect(EMPLOYEE_BRANCH_EMBED).not.toMatch(/branches:branch_id/);
    expect(generatedTypes).toContain('foreignKeyName: "employees_branch_company_fkey"');
    expect(generatedTypes).toMatch(
      /foreignKeyName:\s*"employees_branch_company_fkey"[\s\S]*?columns:\s*\["company_id",\s*"branch_id"\]/,
    );
  });

  it('EMPLOYEE_LIST_WITH_RELATIONS_COLUMNS inclui os três embeds corrigidos', () => {
    expect(EMPLOYEE_LIST_WITH_RELATIONS_COLUMNS).toContain(EMPLOYEE_POSITION_EMBED);
    expect(EMPLOYEE_LIST_WITH_RELATIONS_COLUMNS).toContain(EMPLOYEE_COST_CENTER_EMBED);
    expect(EMPLOYEE_LIST_WITH_RELATIONS_COLUMNS).toContain(EMPLOYEE_BRANCH_EMBED);
    expect(EMPLOYEE_LIST_WITH_RELATIONS_COLUMNS).not.toMatch(/positions:position_id/);
    expect(EMPLOYEE_LIST_WITH_RELATIONS_COLUMNS).not.toMatch(/cost_centers:cost_center_id/);
    expect(EMPLOYEE_LIST_WITH_RELATIONS_COLUMNS).not.toMatch(/branches:branch_id/);
  });
});
