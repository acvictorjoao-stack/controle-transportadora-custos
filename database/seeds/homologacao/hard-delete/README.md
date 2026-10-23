# Hard-delete transacional HML (manifesto 43)

Procedimento **preparado e revisável**, ainda **não autorizado para execução remota**.

> **Reset completo da base fictícia:** use o pacote
> [`../company-reset/`](../company-reset/) (migration 103). Este pacote (43 IDs)
> é ferramenta **estreita** para o manifesto parcial 2026-10-20 e **não** limpa
> drivers/rotas/viagens/folha/financeiro de uma carga completa.

## O que este pacote faz

- Valida localmente o manifesto de 43 IDs.
- Mantém allowlist embutida idêntica ao manifesto.
- Contém a migration `supabase/migrations/102_hml_hard_delete_manifest_43.sql` com a função
  `public.hml_hard_delete_manifest_43(uuid, text)` — **uma transação de banco**.
- Inventaria filhos CASCADE e refs SET NULL/RESTRICT (incl. arquivados) antes do 1º DELETE.
- Grava auditoria em `hml_hard_delete_audit_events` na mesma transação (não `portal_audit_logs`).
- Simula a transação em memória nos testes (rollback, lock, already_clean, cascade, refs, auditoria).
- Expõe um CLI de **plano local** (`scripts/prepare-hml-hard-delete.ts`).

## O que este pacote NÃO faz

- Não aplica a migration.
- Não chama a RPC no Supabase.
- Não executa seed nem soft-delete recovery.
- Não usa `service_role`.
- Não desliga triggers/constraints.
- Não usa `TRUNCATE`.
- Não autoriza Portal Master acting (só membership Super Admin).
- Advisory lock compartilhado com a migration 103 (`hashtextextended(company_id, 0)`).
- Project-ref: CLI valida host da URL; SQL exige GUC `app.hml_expected_project_ref`
  (defesa em profundidade — não prova criptográfica de projeto).

`HML_HARD_DELETE_REMOTE_EXECUTION_ENABLED` está **false**. Enquanto for false, `--execute` é bloqueado.
A migration **revoga EXECUTE** de `PUBLIC`/`anon`/`authenticated`/`service_role` — sem grant futuro, PostgREST não invoca a RPC.

## Soft-delete vs hard-delete

| | Soft-delete recovery | Hard-delete (este pacote) |
|---|---|---|
| Script | `scripts/recover-hml-partial-soft-delete.ts` | `scripts/prepare-hml-hard-delete.ts` (+ RPC futura) |
| Efeito | `UPDATE deleted_at` | `DELETE` físico transacional |
| Atomicidade | Várias chamadas PostgREST | Uma função PostgreSQL |
| Histórico | Pode inserir history via triggers | History validado e removido; docs extras abortam |
| Autorização | Super Admin + triplo gate recovery | Membership Super Admin + GUC operacional + confirm + flag código + GRANT |
| Estado atual | Dry-run por padrão | Remoto desabilitado; EXECUTE revogado |

Ver também `../PARTIAL_FAILURE.md`.

## Ordem de exclusão

1. `customer_history` (IDs descobertos e validados)
2. `vehicle_history` (IDs descobertos e validados)
3. `customer_contract_items`
4. `customer_addresses` / `customer_contacts`
5. `customer_contracts`
6. Sweep de `customer_history` residual (sync de receita)
7. `customers`
8. `suppliers`
9. `vehicles` (CASCADE limparia residual de `vehicle_history` / docs — docs pré-abortam se existirem)
10. `cost_centers` HML
11. `positions` HML
12. `branches` HML-IMP / HML-THE

## CASCADE (pré-check obrigatório)

Antes de qualquer DELETE, a função inventaria filhos CASCADE:

- `customer_addresses` / `customer_contacts` / `customer_contracts` / `customer_contract_items`: IDs sob pais do escopo devem ser ⊆ allowlist.
- `customer_documents` / `vehicle_documents`: qualquer linha sob o escopo → **abort** (fora dos 43).
- `customer_history` / `vehicle_history`: únicos CASCADE não-allowlist permitidos, após validação de vínculo.

## SET NULL / RESTRICT (pré-check obrigatório)

Contagens **globais** (sem filtrar só a empresa HML) — FKs por `id` podem cruzar tenants. Inclui soft-deleted.

Cobertura inclui `financial_*`, combustível, manutenção, pneus, viagens, payroll, drivers, employees, routes, `company_members`, e **H1** `customer_addresses|contacts|contracts|items|documents|history.branch_id` (067). Exclui da contagem só IDs que serão apagados na mesma tx. Qualquer hit residual → **abort**.

**Pendência remota (readonly):** confirmar zero hits cross-tenant no banco live; o código local não prova ausência remota.

## Autorização

1. **Identidade:** `auth.uid()` + **membership** Super Admin com `r.company_id = cm.company_id` + role sistema `'Super Admin'`.
2. **Portal Master:** `is_portal_owner_acting_for` → **recusado**.
3. **GUC** e **`p_confirm`:** gates **operacionais**, não autenticação.
   - Via app/PostgREST: JWT → `auth.uid()`; membership valida identidade; GUC só reforça intenção na sessão.
   - Via SQL direto: quem controla a sessão pode forjar claims JWT; por isso **EXECUTE fica revogado** (`public`/`anon`/`authenticated`/`service_role`) até autorização humana. Não executar limpeza em SQL ad hoc.
4. Flag de código `HML_HARD_DELETE_REMOTE_EXECUTION_ENABLED` (hoje `false`).
5. CLI: `--execute` + authorize flag + env confirm (bloqueados enquanto flag false).
6. **GRANT EXECUTE** futuro explícito (hoje revogado).

`SECURITY DEFINER` + `search_path = public`; refs `public.*`. Bypass de RLS do definer **não** substitui as validações.

## Concorrência

Advisory xact lock + `SELECT … FOR UPDATE` nos 43 alvos presentes. Limite residual: writers que não tocam nas linhas/FKs bloqueadas ainda podem correr (constraints permanecem ativas).

## Auditoria

- Destino: `hml_hard_delete_audit_events` (append-only via trigger; `actor_profile_id` ON DELETE RESTRICT).
- Revokes explícitos de `public`/`anon`/`authenticated`/`service_role`; só `GRANT SELECT` a `authenticated` (RLS Super Admin).
- INSERT na mesma tx pelo definer; falha → rollback. ACLs remotas efetivas **não** verificadas nesta preparação.
- `portal_audit_logs` **não** é usada.

## Desativação pós-uso (manual)

Sem segunda operação destrutiva automática:

```sql
revoke all on function public.hml_hard_delete_manifest_43(uuid, text) from public;
drop function if exists public.hml_hard_delete_manifest_43(uuid, text);
-- Manter hml_hard_delete_audit_events como evidência; não truncar.
```

## Comandos locais seguros

```bash
npx tsx scripts/prepare-hml-hard-delete.ts
npx vitest run database/seeds/homologacao/hard-delete
npx tsc --noEmit
```

## Revisão humana antes de qualquer execução

1. Diff desta pasta + migration 102.
2. Confirmar project ref e company id.
3. Releitura live dos 43 IDs + history + documentos CASCADE + refs SET NULL/RESTRICT (somente SELECT).
4. Confirmar HQ / is_system / roles / members intactos.
5. Autorização operacional escrita, separada do seed e do soft-delete.
6. Só então aplicar migration, reabilitar GRANT + flag de código.
