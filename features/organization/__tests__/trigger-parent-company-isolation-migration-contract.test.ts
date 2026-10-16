import {readdirSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

const migrationsDir = resolve(process.cwd(), 'supabase/migrations');
const MIGRATION = '101_trigger_parent_company_isolation.sql';

function readMigration(file: string): string {
  return readFileSync(resolve(migrationsDir, file), 'utf8').replace(/\r\n/g, '\n');
}

const allMigrations = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map(readMigration)
  .join('\n');

const migration = readMigration(MIGRATION);

/**
 * Checagens estáticas do texto das migrations (A33-01). Não executam SQL: o
 * comportamento em PostgreSQL é coberto por database/tests/
 * trigger-parent-company-isolation.sql, que roda só em banco local.
 */

/** Última definição de uma função, do CREATE até o fechamento do corpo. */
function finalFunction(name: string): string {
  const start = allMigrations.lastIndexOf(`create or replace function public.${name}(`);
  if (start < 0) return 'funcao-ausente';
  return allMigrations.slice(start, allMigrations.indexOf('\n$$;', start));
}

const RELATIONS: Array<[child: string, column: string, parent: string, oldFk: string, newFk: string]> = [
  ['customer_contract_items', 'contract_id', 'customer_contracts', 'customer_contract_items_contract_id_fkey', 'customer_contract_items_contract_company_fkey'],
  ['maintenance_parts', 'maintenance_record_id', 'maintenance_records', 'maintenance_parts_maintenance_record_id_fkey', 'maintenance_parts_record_company_fkey'],
  ['maintenance_services', 'maintenance_record_id', 'maintenance_records', 'maintenance_services_maintenance_record_id_fkey', 'maintenance_services_record_company_fkey'],
  ['tire_recaps', 'tire_id', 'tires', 'tire_recaps_tire_id_fkey', 'tire_recaps_tire_company_fkey'],
  ['tire_inspections', 'tire_id', 'tires', 'tire_inspections_tire_id_fkey', 'tire_inspections_tire_company_fkey'],
  ['tire_movements', 'tire_id', 'tires', 'tire_movements_tire_id_fkey', 'tire_movements_tire_company_fkey'],
];

const TRIGGER_FUNCTIONS = [
  'sync_customer_contract_revenue',
  'recalculate_maintenance_costs',
  'log_maintenance_parts_history',
  'log_maintenance_services_history',
  'refresh_tire_metrics',
  'log_tire_recap_history',
  'log_tire_inspection_history',
  'tire_recaps_refresh_metrics',
  'log_tire_movement_history',
];

describe('FK composta filho → pai (company_id, id)', () => {
  it('pais ganham chave única (company_id, id)', () => {
    for (const parent of ['customer_contracts', 'maintenance_records', 'tires']) {
      expect(migration).toContain(
        `alter table public.${parent}\n  add constraint ${parent}_company_id_id_key unique (company_id, id);`,
      );
    }
  });

  it('cada filho troca a FK simples pela composta, mantendo ON DELETE CASCADE', () => {
    for (const [child, column, parent, oldFk, newFk] of RELATIONS) {
      expect(migration).toContain(`alter table public.${child}\n  drop constraint if exists ${oldFk};`);
      expect(migration).toContain(
        `add constraint ${newFk}\n  foreign key (company_id, ${column})\n  references public.${parent} (company_id, id)\n  on delete cascade;`,
      );
    }
  });

  it('nenhuma migration posterior remove as FKs compostas', () => {
    for (const [, , , , newFk] of RELATIONS) {
      const created = allMigrations.lastIndexOf(`add constraint ${newFk}\n`);
      const dropped = allMigrations.lastIndexOf(`drop constraint if exists ${newFk}`);
      expect([newFk, dropped < created]).toEqual([newFk, true]);
    }
  });

});

describe('pré-checagem da 101', () => {
  const precheckStart = migration.indexOf('do $$\ndeclare\n  v_report text;');
  const precheck = migration.slice(precheckStart, migration.indexOf('\n$$;', precheckStart) + '\n$$;'.length);

  it('roda antes de qualquer ALTER TABLE', () => {
    expect(precheckStart).toBeGreaterThan(0);
    expect(precheckStart).toBeLessThan(migration.indexOf('alter table'));
  });

  it('usa LEFT JOIN em cada relação, sem JOIN interno', () => {
    for (const [child, column, parent] of RELATIONS) {
      expect(precheck).toContain(
        `from public.${child} c\n    left join public.${parent} p on p.id = c.${column}`,
      );
    }
    expect(precheck.match(/left join/g)).toHaveLength(RELATIONS.length);
    expect(precheck).not.toMatch(/^\s*(inner )?join\b/m);
  });

  it('conta separadamente outra empresa, pai inexistente e chave nula', () => {
    for (const [child, column] of RELATIONS) {
      const branch = precheck.slice(precheck.indexOf(`select '${child}'`), precheck.indexOf(`from public.${child} c`));
      expect(branch).toContain('count(*) filter (where p.id is not null and p.company_id <> c.company_id)');
      expect(branch).toContain(`count(*) filter (where c.${column} is not null and p.id is null)`);
      expect(branch).toContain(`count(*) filter (where c.company_id is null or c.${column} is null)`);
    }
    expect(precheck).toContain('where cross_company + orphans + null_keys > 0;');
  });

  it('aborta com mensagem clara e não corrige dados', () => {
    expect(precheck).toContain(
      "raise exception 'migration 101: registros filhos com vínculo inválido ao pai: %', v_report",
    );
    expect(precheck).toContain("format('%s (outra empresa: %s, pai inexistente: %s, chave nula: %s)'");
    expect(precheck).not.toMatch(/\b(insert|update|delete|truncate)\b/i);
  });

  it('teste comportamental executa cópia idêntica do bloco com casos cruzado, órfão e consistente', () => {
    const behavioral = readFileSync(
      resolve(process.cwd(), 'database/tests/trigger-parent-company-isolation.sql'),
      'utf8',
    ).replace(/\r\n/g, '\n');
    expect(behavioral).toContain(`execute $precheck$\n${precheck}\n$precheck$;`);
    expect(behavioral).toContain("'8.1 dados consistentes: pré-checagem passa'");
    expect(behavioral).toContain("'8.2 vínculo cruzado: pré-checagem aborta (P0001)'");
    expect(behavioral).toContain("'8.3 filho órfão: pré-checagem aborta (P0001)'");
    expect(behavioral).toContain("'dead0000-0000-4000-8000-000000000001'");
  });
});

describe('funções de trigger SECURITY DEFINER', () => {
  it('versão final de cada função está na 101, com SECURITY DEFINER e search_path fixo', () => {
    for (const fn of TRIGGER_FUNCTIONS) {
      const body = finalFunction(fn);
      expect([fn, migration.includes(body)]).toEqual([fn, true]);
      expect(body).toContain('security definer\nset search_path = public\n');
    }
  });

  it('recálculo de contrato filtra soma e UPDATE pela empresa do item', () => {
    const body = finalFunction('sync_customer_contract_revenue');
    expect(body).toContain('v_company_id := coalesce(new.company_id, old.company_id);');
    expect(body).toMatch(/from public\.customer_contract_items\s+where contract_id = v_contract_id\s+and company_id = v_company_id\s+and deleted_at is null/);
    expect(body).toMatch(/update public\.customer_contracts[\s\S]*where id = v_contract_id\s+and company_id = v_company_id;/);
  });

  it('recálculo de manutenção filtra somas, odômetro e UPDATE pela empresa do filho', () => {
    const body = finalFunction('recalculate_maintenance_costs');
    expect(body).toMatch(/from public\.maintenance_parts\s+where maintenance_record_id = v_record_id\s+and company_id = v_company_id\s+and deleted_at is null/);
    expect(body).toMatch(/from public\.maintenance_services\s+where maintenance_record_id = v_record_id\s+and company_id = v_company_id\s+and deleted_at is null/);
    expect(body).toMatch(/from public\.maintenance_records\s+where id = v_record_id\s+and company_id = v_company_id;/);
    expect(body).toMatch(/update public\.maintenance_records[\s\S]*where id = v_record_id\s+and company_id = v_company_id;/);
  });

  it('histórico de peças/serviços só lê o pai da mesma empresa do filho', () => {
    for (const fn of ['log_maintenance_parts_history', 'log_maintenance_services_history']) {
      expect(finalFunction(fn)).toMatch(
        /where id = coalesce\(new\.maintenance_record_id, old\.maintenance_record_id\)\s+and company_id = coalesce\(new\.company_id, old\.company_id\);/,
      );
    }
  });

  it('métricas de pneu usam só recapagens/inspeções da empresa do pneu', () => {
    const body = finalFunction('refresh_tire_metrics');
    expect(body).toMatch(/from public\.tire_recaps\s+where tire_id = p_tire_id\s+and company_id = v_company_id/);
    expect(body).toMatch(/from public\.tire_inspections\s+where tire_id = p_tire_id\s+and company_id = v_company_id/);
    expect(body).toMatch(/where id = p_tire_id\s+and company_id = v_company_id;/);
  });

  it('chamadores só recalculam pneu da mesma empresa do filho', () => {
    for (const fn of ['log_tire_recap_history', 'log_tire_inspection_history']) {
      expect(finalFunction(fn)).toMatch(
        /if exists \(\s+select 1 from public\.tires\s+where id = new\.tire_id and company_id = new\.company_id\s+\) then\s+perform public\.refresh_tire_metrics\(new\.tire_id\);/,
      );
    }
    expect(finalFunction('tire_recaps_refresh_metrics')).toMatch(
      /where id = coalesce\(new\.tire_id, old\.tire_id\)\s+and company_id = coalesce\(new\.company_id, old\.company_id\)/,
    );
  });

  it('recapagem e movimentação só alteram pneu da mesma empresa', () => {
    expect(finalFunction('log_tire_recap_history')).toMatch(
      /where id = new\.tire_id\s+and company_id = new\.company_id\s+and tire_status not in/,
    );
    const movement = finalFunction('log_tire_movement_history');
    expect(movement.match(/update public\.tires/g)).toHaveLength(3);
    // 3 UPDATEs + a leitura de v_tire
    expect(movement.match(/where id = new\.tire_id\s+and company_id = new\.company_id;/g)).toHaveLength(4);
    expect(movement).toMatch(/select \* into v_tire\s+from public\.tires\s+where id = new\.tire_id\s+and company_id = new\.company_id;/);
  });

  it('refresh_tire_metrics segue sem EXECUTE para anon/authenticated (096)', () => {
    const revokeAt = allMigrations.lastIndexOf('revoke all on function public.refresh_tire_metrics(uuid)');
    expect(revokeAt).toBeGreaterThan(0);
    expect(allMigrations.slice(revokeAt)).not.toMatch(
      /grant execute on function public\.refresh_tire_metrics\(uuid\)/,
    );
  });
});

describe('escopo da 101', () => {
  it('não cria nem remove policies e não altera grants', () => {
    expect(migration).not.toMatch(/\b(create|drop|alter) policy\b/);
    expect(migration).not.toMatch(/^\s*(grant|revoke)\b/m);
    expect(migration).not.toMatch(/security invoker/);
  });

  it('teste comportamental desfaz tudo com rollback', () => {
    const behavioral = readFileSync(
      resolve(process.cwd(), 'database/tests/trigger-parent-company-isolation.sql'),
      'utf8',
    ).replace(/\r\n/g, '\n');
    expect(behavioral.trimStart()).toMatch(/^--[\s\S]*?\nbegin;\n/);
    expect(behavioral.trimEnd().endsWith('rollback;')).toBe(true);
    expect(behavioral).not.toMatch(/^\s*commit;/m);
  });
});
