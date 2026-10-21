import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

import {
  DRIVER_BRANCH_EMBED,
  DRIVER_DETAIL_COLUMNS,
  DRIVER_LIST_COLUMNS,
} from '../../constants';

const generatedTypes = readFileSync(
  resolve(process.cwd(), 'supabase/types/database.ts'),
  'utf8',
);

describe('DRIVER_BRANCH_EMBED — FK composta PostgREST', () => {
  it('usa o nome da FK composta gerada nos types (não o hint branch_id)', () => {
    expect(DRIVER_BRANCH_EMBED).toBe(
      'branches!drivers_branch_company_fkey(id, name, code)',
    );
    expect(DRIVER_BRANCH_EMBED).not.toMatch(/branches:branch_id/);
    expect(generatedTypes).toContain('foreignKeyName: "drivers_branch_company_fkey"');
    expect(generatedTypes).toMatch(
      /foreignKeyName:\s*"drivers_branch_company_fkey"[\s\S]*?columns:\s*\["company_id",\s*"branch_id"\]/,
    );
  });

  it('list e detail compartilham o mesmo embed de filial', () => {
    expect(DRIVER_LIST_COLUMNS).toContain(DRIVER_BRANCH_EMBED);
    expect(DRIVER_DETAIL_COLUMNS).toContain(DRIVER_BRANCH_EMBED);
    expect(DRIVER_LIST_COLUMNS).not.toMatch(/branches:branch_id/);
    expect(DRIVER_DETAIL_COLUMNS).not.toMatch(/branches:branch_id/);
  });
});
