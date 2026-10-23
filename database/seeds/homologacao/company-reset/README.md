# Reset de dados de negócio HML (empresa de homologação)

Procedimento **preparado e revisável**, ainda **não autorizado** para apply/execução remota.

## Recomendação

Para reiniciar a base fictícia de `primeira-empresa` e rodar o seed de novo, use **este reset company-scoped**, não o hard-delete dos 43 IDs (`migration 102`).

| | Manifesto 43 (102) | Company business reset (103) |
|---|---|---|
| Escopo | Allowlist fixa de 43 UUIDs + history | Todo negócio da empresa HML, exceto preservados |
| Empty-guards pós-carga completa | **Não** limpa drivers/rotas/viagens/… | Sim |
| Empty-guards no estado parcial atual | Sim (live ≈ 43) | Sim |
| Critério | IDs do manifesto | `company_id` + predicados (`is_system` / HQ) |
| Complexidade | Alta (allowlist) | Mais simples e reutilizável |

`HML_COMPANY_RESET_REMOTE_EXECUTION_ENABLED` e `HML_HARD_DELETE_REMOTE_EXECUTION_ENABLED` estão **false**.

## O que este pacote faz

- Define a migration `supabase/migrations/103_hml_company_business_reset.sql` com
  `public.hml_reset_company_business_data(uuid, text)` — **uma transação**.
- Apaga dados de negócio (incl. soft-deleted) da empresa fixa
  `451a7940-a56b-425f-ae5f-e493d536591f`, incluindo `vision_providers`.
- `payroll_people` é VIEW — não exige DELETE.
- Preserva empresa, HQ, `is_system`, auth/members/roles, categorias financeiras de sistema.
- Mutação mínima intencional: `company_members.default_branch_id` de filiais não-HQ → HQ.
- Pré-checa referências **cross-tenant** (paridade com inventário FK da 102 + `driver_id`).
- Lock: advisory compartilhado com 102
  (`pg_advisory_xact_lock(hashtextextended(c_expected_company::text, 0))`)
  → `FOR UPDATE` empresa+HQ → IDs-alvo → `FOR UPDATE` pais
  (branches/CC/positions/suppliers/customers/contracts/vehicles/drivers/trips/routes/fuel/maintenance/tires)
  → cross-tenant → deletes. Impede 102∥103; não serializa demais writers da app.
- Auditoria append-only em `hml_company_reset_audit_events`.
- `REVOKE` imediato de `PUBLIC`/`anon`/`authenticated`/`service_role` (mitiga `pg_default_acl`).
- Project-ref: CLI valida host da URL; SQL exige GUC `app.hml_expected_project_ref`
  (não é prova criptográfica de projeto — ver limites no comentário da migration).

## O que NÃO faz

- Não aplica a migration.
- Não chama a RPC.
- Não executa seed.
- Não usa `service_role`.
- Não apaga a empresa, HQ, roles, members, profiles ou outras empresas.
- Não toca Storage (o seed HML não cria objetos).

## Preservar (obrigatório)

- `companies` (row da empresa)
- `auth.users` / `profiles` / autenticação
- `company_members`, `roles`, `role_permissions`
- Filial HQ (`is_headquarters`, `code = HQ`)
- `cost_centers` / `positions` / `financial_categories` / `financial_cost_centers` com `is_system = true`
- Portal / settings / schema compartilhado
- Dados de outras empresas

Antes de apagar filiais não-HQ: `UPDATE company_members.default_branch_id → HQ` (só na empresa-alvo).

## Ordem de exclusão (resumo)

1. Financeiro (history → documents → entries)
2. Folha (`payroll_expenses` com GUC `app.allow_payroll_hard_delete=on` na tx) → employees
3. Combustível / manutenção / pneus (filhos → pais)
4. Viagens (filhos → trips) → rotas
5. Clientes (history/docs/itens/contratos/contatos/endereços → customers) → suppliers
6. Motoristas / veículos (+ history/docs)
7. Seletivo: positions/cost_centers/financial_* custom (`is_system = false`)
8. Filiais não-HQ

## Autorização (futura execução)

1. Membership Super Admin (`r.company_id = cm.company_id`); Portal Master **recusado**
2. GUC + `p_confirm` = gates **operacionais** (não autenticação)
3. Flag `HML_COMPANY_RESET_REMOTE_EXECUTION_ENABLED` (hoje `false`)
4. CLI: `--execute` + authorize flag + env confirm
5. Project ref = `aobfjjaucdrwybebosxm`
6. `GRANT EXECUTE` futuro explícito (hoje revogado)

## Rollback

Hard-delete **não tem rollback**. Limite honesto: só restore de backup/PITR do projeto Supabase, se existir. A auditoria append-only registra contagens, não reconstrói linhas.

## Seed depois da limpeza

1. Confirmar pós-checks (empty-guards) só com SELECT.
2. Autorização humana **separada** para `npm run seed:hml -- --execute`.
3. Dry-run do seed antes do execute.

## Comandos locais seguros

```bash
npx tsx scripts/prepare-hml-company-reset.ts
npx vitest run database/seeds/homologacao/company-reset
npx tsc --noEmit
```

## Impedir uso acidental em outra empresa/projeto

- `company_id` e slug embutidos na função SQL
- Project ref fixo no CLI (`aobfjjaucdrwybebosxm`); `prepare-hml-company-reset.ts`
  aborta se `NEXT_PUBLIC_SUPABASE_URL` apontar para outro host
- GUC SQL `app.hml_expected_project_ref` (setada pelo CLI após validar URL)
- Flag remota `false` + EXECUTE revogado
- Confirm string + GUC distintos do hard-delete 43

**Limite honesto:** o Postgres dentro de um projeto Supabase não consegue ler o
project-ref da plataforma. A GUC só falha fechado se o operador/CLI esquecer de
setá-la ou setar valor diferente do embutido; não impede apply da migration no
projeto errado se alguém linkar o CLI ao ref errado e ainda assim setar a GUC.

## Relação com migration 102

A 102 permanece no repo como ferramenta **estreita** para o manifesto parcial documentado. Para o objetivo “base limpa + novo seed”, a **103** é a estratégia recomendada. Nenhuma das duas está autorizada para apply nesta etapa.
