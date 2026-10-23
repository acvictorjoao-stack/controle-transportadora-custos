# Falha parcial na carga HML

## Limite arquitetural (sem transação global)

A carga `npm run seed:hml -- --execute` **não** roda em transação global.

- Cada `create*` / update comita isoladamente via PostgREST.
- Não há rollback automático nem delete em cascata neste script.
- O arquivo `.hml-seed/manifest.json` e o `executionReport` são **apenas** rastreio local: **não** equivalem a um log transacional do banco.
- Por isso **não** implementamos “rollback fictício” nem limpeza automática.

Qualquer estratégia transacional real exigiria job/procedimento no banco (fora deste script) e **nova autorização**.

## Como identificar o que já foi gravado

1. Leia o erro: `HmlPhaseAbortError` / mensagem `Carga HML interrompida na fase "…"`.
2. Consulte o `executionReport` impresso no summary (`abortedPhase`, `phaseSummaries`, `operations` com `status=failed|success`).
3. Consulte `.hml-seed/manifest.json` (se existir): última `entity`/`key`/`id` com sucesso.
4. No banco (somente leitura), conte por `company_id` de `primeira-empresa`:
   - Principais: `branches` (além da HQ), `cost_centers` (`HML-*`), `positions` (`HML_*`), `customers`, `suppliers`, `vehicles`, `drivers`, `routes`, `employees`, `trips`, `fuel_records`, `maintenance_records`, `tires`, `payroll_expenses`, `customer_contracts`, `financial_entries`
   - Auxiliares: `customer_addresses`, `customer_contacts`, `customer_contract_items`, `trip_*`, `maintenance_parts|services`, `tire_*`
   - Integrações: `financial_entries` com `source_module` in (`fuel`,`maintenance`,`tires`,`trips`,`payroll`) e notes/`[HML]`

## Comportamento de nova execução

Enquanto os empty-guards detectarem dados preexistentes, um novo `--execute` **deve abortar** antes de escrever de novo.

Não repetir a carga automaticamente. Recuperação = inspeção humana + limpeza manual revisada (fora deste script) + só então nova autorização de `--execute`.

## Soft-delete controlado dos 43 IDs (parcial 2026-10-20)

Script: `scripts/recover-hml-partial-soft-delete.ts` (módulos em `database/seeds/homologacao/recovery/`).

### Controles

- Dry-run por padrão (somente leitura).
- EXECUTE exige `--execute` + `--i-authorize-soft-delete-of-manifest-43` + `HML_RECOVERY_CONFIRM=SOFT_DELETE_MANIFEST_43`.
- **Membership Super Admin** obrigatória em dry-run e EXECUTE (`assertHmlDestructiveMembershipSuperAdmin`; paridade migrations 102/103). Portal Master acting é recusado. Não usa `is_company_super_admin`. Falha de consulta, acting ou membership ausente → abort (fail-closed).
- Estados: `ACTIVE` (elegível), `SOFT_DELETED` (skip seguro), `INVALID` (abort).
- Pré-checks de vínculo **antes** da 1ª escrita. Contagens usam `deleted_at IS NULL` (ativos). Refs já arquivadas (`deleted_at NOT NULL`) **não** bloqueiam — paridade com soft-delete da app; FKs fantasma em linhas soft-deletadas são aceitas (`HML_RECOVERY_LINK_COVERAGE_NOTES.archivedRefsPolicy`).
- Filiais (`BRANCH_REF_TABLES` + `company_members.default_branch_id`):
  - **Cobertas** (todas com `company_id` + `branch_id` + `deleted_at`, confirmado em types/migrations): `vehicles`, `customers`, `customer_contracts`, `customer_addresses`, `customer_contacts`, `customer_contract_items`, `customer_documents`, `drivers`, `employees`, `fuel_records`, `fuel_documents`, `maintenance_records`, `maintenance_parts`, `maintenance_services`, `maintenance_schedules`, `maintenance_documents`, `tires`, `tire_movements`, `tire_inspections`, `tire_recaps`, `tire_documents`, `trips`, `trip_expenses`, `trip_stops`, `trip_occurrences`, `trip_checklists`, `trip_documents`, `trip_locations`, `payroll_expenses`, `financial_entries`, `financial_categories`, `financial_cost_centers`, `financial_documents`, `routes`.
  - **Fora do pré-check**: `suppliers` (sem `branch_id`), `vehicle_documents` (sem `branch_id`), todas as `*_history` (snapshots de auditoria, não vínculo operacional), storage paths.
  - Refs **externas** ativas bloqueiam. Refs **internas** ao manifesto só entram em `excludeIds` quando a tabela ∈ `HML_RECOVERY_TABLE_ORDER` (ordem filhos→pais comprovada). Contagem via total−subset (sem lista paginada); nula/inconsistente/erro de schema → abort sem escrita.
- Checkpoint local `.hml-seed/recovery-partial-log.jsonl` **não** é fonte de verdade:
  - decisões de UPDATE/SKIP vêm **somente** do estado live;
  - DRY_RUN: checkpoint inválido → aviso e continua o diagnóstico;
  - EXECUTE: checkpoint inválido/incompatível → abort (fail-closed, sem bypass);
  - IDs do checkpoint fora do manifesto → aviso; **nunca** autorizam escrita;
  - divergência checkpoint vs live → aviso; live manda;
  - falha de append após UPDATE → log + resume pelo live (`SOFT_DELETED` → skip).

### Efeitos de gatilhos (não revertidos)

- `customers` / `customer_contracts` / `vehicles`: INSERT em histórico (`delete` / `contract_cancel`).
- `customer_contract_items`: `sync_customer_contract_revenue` recalcula `contracted_revenue` do contrato pai (escopo `company_id` na migration 101).
- Ordem filhos → pais mitiga estado intermediário; não há rollback de history.

### Limites da reconciliação

Este script **não** declara que os dados estão limpos nem que a recuperação foi concluída. Após qualquer EXECUTE parcial ou completo, o operador deve reconciliação **somente de leitura** antes de nova autorização de seed.

Não faz hard-delete. Não usa `service_role`. Seed `--execute` continua exigindo autorização separada.

## Soft-delete vs hard-delete (não confundir)

| Aspecto | Soft-delete (recovery) | Hard-delete (preparado, não autorizado) |
|---|---|---|
| Pacote | `database/seeds/homologacao/recovery/` | `database/seeds/homologacao/hard-delete/` |
| CLI | `scripts/recover-hml-partial-soft-delete.ts` | `scripts/prepare-hml-hard-delete.ts` |
| Efeito | `UPDATE … SET deleted_at` | `DELETE` físico em **uma** transação SQL |
| Atomicidade | Sem transação global (PostgREST) | Função `hml_hard_delete_manifest_43` |
| Filhos / FKs | Pré-check de vínculos ativos; soft-deleted não bloqueia | Pré-check CASCADE + SET NULL/RESTRICT **incluindo** arquivados; filho/documento extra aborta |
| Autorização | Super Admin + triplo gate recovery | Membership Super Admin (Portal Master recusado) + GUC operacional + confirm + flag código + GRANT EXECUTE |
| Auditoria | Checkpoint local JSONL (não é log de banco) | `hml_hard_delete_audit_events` na mesma tx (`portal_audit_logs` incompatível) |
| Estado atual | Dry-run por padrão; EXECUTE com autorização | Remoto **desabilitado**; migration **não** aplicar; RPC **fora** do `package.json` |

Hard-delete dos 43: ver `hard-delete/README.md` e `supabase/migrations/102_hml_hard_delete_manifest_43.sql`.
**Reset completo** da base fictícia (recomendado para novo seed): ver `company-reset/README.md` e
`supabase/migrations/103_hml_company_business_reset.sql`.
**Não** aplicar migrations 102/103 nem invocar RPCs sem nova autorização humana explícita, distinta deste soft-delete.

Pré-checks hard-delete (código local): `customer_*.branch_id` (H1) e contagens **globais** de FK (H2). Pendência remota readonly: confirmar zero hits cross-tenant e ACLs efetivas (`proacl`/`relacl`) após eventual apply — o código local não prova o estado do banco.

## Reconciliação somente de leitura após falha parcial (recovery ou seed)

Procedimento sugerido (sem escrita):

1. Conferir manifesto parcial / `execution-summary` locais (rastreio, não log transacional).
2. Rodar diagnóstico readonly do manifesto (ex.: `npx tsx scripts/diag-hml-manifest-readonly.ts`) se disponível.
3. Contar por `company_id` (ativos e, se útil, soft-deletados) as tabelas do plano + `drivers`/`routes`/`trips`/`fuel_*`/`maintenance_*`/`tires`/`employees`/`payroll_*`/`financial_entries`.
4. Rodar dry-run do recovery (sem `--execute`) e revisar `classify`, `linkCheck`, `decisionSummary`, avisos de checkpoint.
5. Só então, com autorização humana explícita e triplo gate, considerar EXECUTE — fora do escopo automático desta documentação.

Enquanto empty-guards / contagens indicarem resíduos HML, **não** repetir `seed:hml --execute`.

## Integrações financeiras obrigatórias

Na carga HML, a verificação de lançamentos de combustível, manutenção, pneus, viagens concluídas e folha é **obrigatória**.

- Operacionais: o domínio já dispara o hook no create; a seed **só valida** o que persistiu (quantidade + vínculo), sem reexecutar o hook para “compensar” falha.
- Folha: executa `syncPayrollFinancialEntry` **uma vez** e valida 1 lançamento.
- Critério: `ids.length === expectedInstallmentsFromPayment(paymentType, installmentCount)` (cash=1, credit=N).
- Métricas separadas: `financialIntegrationCalls` (syncs) ≠ `financialEntriesCreated` (parcelas).
- Falha → interrompe a fase com resumo (sucesso/falha/divergências).
