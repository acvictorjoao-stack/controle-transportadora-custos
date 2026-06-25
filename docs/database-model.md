# FleetControl — Modelo Físico de Banco de Dados

Documentação do schema físico PostgreSQL/Supabase do FleetControl (Sprint 8.1).

> **ERP Financeiro para Transportadoras** — SaaS multi-tenant, alta performance, preparado para BI, IA e auditoria.

> Referências: [`domain-model.md`](./domain-model.md) · [`supabase-architecture.md`](./supabase-architecture.md)

> **Esta sprint projeta apenas o modelo físico.** Não há SQL, migrations, tabelas, RLS, policies ou triggers.

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Convenções Globais](#convenções-globais)
3. [Tipos e ENUMs](#tipos-e-enums)
4. [Colunas Padrão](#colunas-padrão)
5. [Estratégias Transversais](#estratégias-transversais)
6. [Índices Recomendados](#índices-recomendados)
7. [Módulo 1 — Organização](#módulo-1--organização)
8. [Módulo 2 — Cadastros](#módulo-2--cadastros)
9. [Módulo 3 — Operação](#módulo-3--operação)
10. [Módulo 4 — Financeiro](#módulo-4--financeiro)
11. [Módulo 5 — Custos Operacionais](#módulo-5--custos-operacionais)
12. [Módulo 6 — RH](#módulo-6--rh)
13. [Módulo 7 — Inteligência](#módulo-7--inteligência)
14. [Mapa de Relacionamentos](#mapa-de-relacionamentos)
15. [Matriz de Criação](#matriz-de-criação)
16. [Decisões Arquiteturais](#decisões-arquiteturais)

---

## Visão Geral

| Aspecto | Decisão |
|---------|---------|
| SGBD | PostgreSQL 15+ (Supabase) |
| Multi-tenant | Shared schema, coluna `company_id` |
| PK | `UUID` (`gen_random_uuid()` na migration) |
| Nomenclatura | Inglês, `snake_case`, plural para tabelas |
| Identidade | `auth.users` (Supabase) + `profiles` (app) |
| Moeda | `NUMERIC(15,2)` — BRL padrão |
| Datas | `TIMESTAMPTZ` (UTC no banco) |
| Metadados | `JSONB` quando flexibilidade necessária |
| BI/IA | Tabelas normalizadas + `domain_events` + snapshots |

### Schemas lógicos (namespaces futuros)

| Schema | Conteúdo |
|--------|----------|
| `public` | Tabelas de negócio do tenant |
| `auth` | Supabase Auth (gerenciado) |
| `audit` | `audit_logs`, `entity_versions` (opcional) |
| `analytics` | Read models, snapshots de KPI (futuro) |

---

## Convenções Globais

### Prefixos e sufixos

| Padrão | Uso |
|--------|-----|
| `*_id` | Chave estrangeira UUID |
| `is_*` | Booleanos |
| `*_at` | Timestamps |
| `*_date` | Datas sem hora (`DATE`) |
| `*_amount` | Valores monetários |
| `metadata` | JSONB extensível |

### Tabelas de plataforma vs tenant

| Tipo | `company_id` | Exemplos |
|------|--------------|----------|
| Plataforma | Ausente | `saas_plans`, `permissions` |
| Tenant root | Ausente (é o tenant) | `companies` |
| Tenant-scoped | **Obrigatório** | `customers`, `trips`, `expenses` |
| Tenant + branch | Obrigatório + `branch_id` opcional/obrigatório | `trips`, `bank_accounts` |

### Integração Supabase Auth

```
auth.users (Supabase)
    └── profiles (1:1) — id = auth.users.id
            └── company_members (N:N companies)
```

---

## Tipos e ENUMs

> Definidos como `ENUM` PostgreSQL na migration. Valores iniciais:

| ENUM | Valores |
|------|---------|
| `entity_status` | `active`, `inactive`, `blocked`, `archived` |
| `trip_status` | `draft`, `scheduled`, `in_progress`, `completed`, `invoiced`, `cancelled` |
| `financial_status` | `pending`, `confirmed`, `approved`, `paid`, `received`, `partial`, `overdue`, `cancelled` |
| `document_status` | `valid`, `expiring`, `expired`, `pending` |
| `maintenance_status` | `scheduled`, `in_progress`, `completed`, `cancelled` |
| `incident_severity` | `low`, `medium`, `high`, `critical` |
| `alert_severity` | `info`, `warning`, `critical` |
| `subscription_status` | `trial`, `active`, `past_due`, `cancelled`, `suspended` |
| `reconciliation_status` | `open`, `in_progress`, `closed`, `divergent` |
| `driver_link_type` | `employee`, `contractor`, `aggregated` |
| `vehicle_asset_status` | `active`, `maintenance`, `inactive`, `sold` |
| `audit_action` | `create`, `update`, `delete`, `restore`, `login`, `export` |
| `domain_event_status` | `pending`, `processed`, `failed` |
| `polymorphic_entity_type` | `company`, `branch`, `customer`, `contract`, `driver`, `vehicle`, `trailer`, `implement`, `trip`, `tire`, `maintenance`, `fuel_record`, `expense`, `revenue` |
| `tire_status` | `in_stock`, `installed`, `in_retread`, `retreaded`, `discarded` |
| `tire_event_type` | `stock_entry`, `install`, `rotate`, `retread`, `discard`, `transfer` |
| `payment_record_status` | `confirmed`, `reversed`, `cancelled` |

---

## Colunas Padrão

### Bloco A — Tenant-scoped (maioria das tabelas)

| Campo | Tipo | Obrig. | Padrão | Observação |
|-------|------|--------|--------|------------|
| `id` | `UUID` | Sim | — | PK |
| `company_id` | `UUID` | Sim | — | FK → `companies.id` |
| `created_at` | `TIMESTAMPTZ` | Sim | `now()` | Imutável após insert |
| `updated_at` | `TIMESTAMPTZ` | Sim | `now()` | Atualizado por app/trigger futuro |
| `deleted_at` | `TIMESTAMPTZ` | Não | `NULL` | Soft delete |
| `created_by` | `UUID` | Não | `NULL` | FK → `profiles.id` |
| `updated_by` | `UUID` | Não | `NULL` | FK → `profiles.id` |
| `status` | `entity_status` | Sim | `active` | Status do registro |
| `notes` | `TEXT` | Não | `NULL` | Notas livres |

### Bloco B — Tenant + Branch (operação e financeiro)

| Campo adicional | Tipo | Obrig. | Observação |
|-----------------|------|--------|------------|
| `branch_id` | `UUID` | Varia | FK → `branches.id`; obrigatório em `trips`, opcional em cadastros |

### Bloco C — Plataforma (sem tenant)

| Campo | Tipo | Obrig. | Padrão |
|-------|------|--------|--------|
| `id` | `UUID` | Sim | — |
| `created_at` | `TIMESTAMPTZ` | Sim | `now()` |
| `updated_at` | `TIMESTAMPTZ` | Sim | `now()` |

> Nas tabelas abaixo, **"Padrão A"** = Bloco A, **"Padrão A+B"** = Bloco A + `branch_id`.

### Nomenclatura de FKs (Sprint 8.1)

Todas as chaves estrangeiras usam inglês e sufixo `_id`. Proibido misturar português e inglês.

| FK padrão | Referência |
|-----------|------------|
| `company_id` | `companies.id` |
| `branch_id` | `branches.id` |
| `customer_id` | `customers.id` |
| `contract_id` | `contracts.id` |
| `driver_id` | `drivers.id` |
| `vehicle_id` | `vehicles.id` |
| `trip_id` | `trips.id` |

### Exceções ao Bloco A (Sprint 8.1)

| Tabela | `deleted_at` | Motivo |
|--------|--------------|--------|
| `audit_logs`, `domain_events`, `bank_transactions` | Ausente | Append-only / integridade contábil |
| `role_permissions`, `reconciliation_items` | Ausente | Junção imutável após gravação |
| `cash_flow_snapshots`, `indicator_snapshots` | Ausente | Read model derivado |
| `system_logs` | Ausente | Log técnico de curta retenção |

Todas as demais tabelas tenant-scoped **devem** possuir `company_id`, `created_at`, `updated_at`, `created_by`, `updated_by` e `deleted_at` (quando aplicável).

### Tabelas ajustadas ao Bloco A na Sprint 8.1

| Tabela | Campos adicionados |
|--------|-------------------|
| `role_permissions` | `company_id`, `created_at`, `created_by` |
| `driver_vehicles` | `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by` |
| `trip_compositions` | `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by` |
| `route_waypoints` | `updated_at`, `deleted_at`, `created_by`, `updated_by`, `status` |
| `reconciliation_items` | `company_id`, `created_at`, `created_by` |
| `tire_events` | Bloco A completo |
| `maintenance_parts` | Bloco A completo |
| `maintenance_services` | Bloco A completo |
| `tire_purchases` | Bloco A completo (nova) |
| `tire_purchase_items` | Bloco A completo (nova) |
| `receivable_payments` | Bloco A parcial — sem `deleted_at` (nova) |
| `payable_payments` | Bloco A parcial — sem `deleted_at` (nova) |

---

## Estratégias Transversais

### Soft Delete

| Regra | Detalhe |
|-------|---------|
| Mecanismo | `deleted_at IS NOT NULL` = excluído logicamente |
| Escopo | Cadastros, contratos, veículos, motoristas, categorias |
| Exceções | `audit_logs`, `domain_events`, `bank_transactions` — **sem** soft delete |
| Consultas | Views/queries filtram `deleted_at IS NULL` por padrão |
| Restauração | `deleted_at = NULL` + evento `EntityRestored` |

### Versionamento

| Tabela | Objetivo |
|--------|----------|
| `entity_versions` | Snapshot JSONB antes/depois de entidades críticas |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| `id` | `UUID` | Sim | PK |
| `company_id` | `UUID` | Sim | Tenant |
| `entity_type` | `polymorphic_entity_type` | Sim | Tipo da entidade |
| `entity_id` | `UUID` | Sim | ID da entidade |
| `version_number` | `INTEGER` | Sim | Sequencial por entidade |
| `snapshot_before` | `JSONB` | Não | Estado anterior |
| `snapshot_after` | `JSONB` | Sim | Estado novo |
| `changed_by` | `UUID` | Sim | FK → `profiles.id` |
| `changed_at` | `TIMESTAMPTZ` | Sim | `now()` |
| `change_reason` | `TEXT` | Não | Motivo da alteração |

**Entidades versionadas:** `contracts`, `drivers`, `vehicles`, `financial_categories`, `bank_accounts`, `subscriptions`.

### Logs

| Tabela | Propósito | Retenção |
|--------|-----------|----------|
| `system_logs` | Debug técnico (nível, stack) | 30–90 dias |
| `audit_logs` | Compliance (quem fez o quê) | Por plano SaaS (1–7 anos) |
| `domain_events` | Integração entre contextos | 1 ano + arquivo |

### Auditoria

**Tabelas com histórico obrigatório (`audit_logs` + `entity_versions`):**

`companies`, `subscriptions`, `company_members`, `roles`, `customers`, `contracts`, `drivers`, `vehicles`, `trips`, `freight_documents`, `revenues`, `expenses`, `accounts_payable`, `accounts_receivable`, `receivable_payments`, `payable_payments`, `bank_transactions`, `bank_reconciliations`, `driver_salaries`, `driver_commissions`.

**Eventos de domínio registrados em `domain_events`:**

| Evento | Origem |
|--------|--------|
| `TripCompleted` | `trips` |
| `TripInvoiced` | `trips` |
| `RevenueConfirmed` | `revenues` |
| `ExpenseApproved` | `expenses` |
| `AccountReceivableReceived` | `receivable_payments` |
| `AccountPayablePaid` | `payable_payments` |
| `DocumentExpiring` | `documents` |
| `VehicleMaintenanceStarted` | `maintenances` |
| `FuelRecordCreated` | `fuel_records` |
| `DriverAdvanceGranted` | `driver_advances` |
| `SubscriptionStatusChanged` | `subscriptions` |

---

## Índices Recomendados

> Padrão: `idx_{tabela}_{colunas}`. Índices parciais onde indicado.

| Índice | Tabela(s) | Colunas | Motivo |
|--------|-----------|---------|--------|
| PK | Todas | `id` | Acesso por chave |
| Tenant | Tenant-scoped | `company_id` | **RLS futuro** + filtro universal |
| Tenant parcial | Tenant-scoped | `(company_id)` WHERE `deleted_at IS NULL` | Listagens ativas |
| Branch | Operação/financeiro | `(company_id, branch_id)` | Escopo por unidade |
| Customer | `trips`, `contracts`, `revenues` | `(company_id, customer_id)` | BI por cliente |
| Driver | `trips`, `fuel_records` | `(company_id, driver_id)` | Performance operacional |
| Vehicle | Custos, `trips` | `(company_id, vehicle_id)` | Custo por ativo |
| Data | Transacionais | `(company_id, created_at DESC)` | Listagens cronológicas |
| Competência | `revenues`, `expenses` | `(company_id, competence_date)` | DRE e relatórios |
| Vencimento | Contas | `(company_id, due_date)` WHERE status IN (`pending`,`overdue`) | Alertas e aging |
| Status | Operacionais | `(company_id, status)` | Filtros de UI |
| Viagem ativa | `trips` | `(company_id, status)` WHERE status IN (`scheduled`,`in_progress`) | Painel operacional |
| Placa | `vehicles`, `trailers` | `(company_id, plate)` UNIQUE | Unicidade por tenant |
| CPF/CNPJ | `customers`, `suppliers` | `(company_id, tax_id)` UNIQUE | Unicidade fiscal |
| Documento vencendo | `documents` | `(company_id, expires_at)` WHERE status != `expired` | Job de alertas |
| Eventos | `domain_events` | `(company_id, event_type, created_at DESC)` | Consumers e IA |
| Auditoria | `audit_logs` | `(company_id, entity_type, entity_id, created_at DESC)` | Investigação |
| Pagamentos CR | `receivable_payments` | `(company_id, accounts_receivable_id)` | Baixas parciais |
| Pagamentos CP | `payable_payments` | `(company_id, accounts_payable_id)` | Baixas parciais |
| Pneus | `tires`, `tire_events` | `(company_id, serial_code)` UNIQUE; `(company_id, tire_id, event_at)` | Ciclo de vida |
| Compra pneus | `tire_purchases` | `(company_id, supplier_id, purchase_date)` | Histórico de compras |
| GIN metadata | Tabelas com JSONB | `metadata` GIN | Consultas flexíveis BI |
| Slug tenant | `companies` | `slug` UNIQUE | URL tenant |

---

## Módulo 1 — Organização

### `saas_plans`

| | |
|---|---|
| **Objetivo** | Planos de assinatura da plataforma |
| **PK** | `id` |
| **FK** | — |
| **Padrão** | C (plataforma) |

| Campo | Tipo | Obrig. | Padrão | Observação |
|-------|------|--------|--------|------------|
| `name` | `TEXT` | Sim | — | Nome comercial |
| `slug` | `TEXT` | Sim | — | UNIQUE |
| `description` | `TEXT` | Não | — | |
| `price_monthly` | `NUMERIC(15,2)` | Sim | — | Preço mensal |
| `price_yearly` | `NUMERIC(15,2)` | Não | — | Preço anual |
| `max_users` | `INTEGER` | Sim | — | Limite hard |
| `max_vehicles` | `INTEGER` | Sim | — | Limite hard |
| `max_branches` | `INTEGER` | Sim | — | Limite hard |
| `enabled_modules` | `JSONB` | Sim | `'[]'` | Módulos habilitados |
| `is_active` | `BOOLEAN` | Sim | `true` | |

---

### `companies`

| | |
|---|---|
| **Objetivo** | Tenant — transportadora cliente |
| **PK** | `id` |
| **FK** | — |
| **Padrão** | C + campos próprios |

| Campo | Tipo | Obrig. | Padrão | Observação |
|-------|------|--------|--------|------------|
| `legal_name` | `TEXT` | Sim | — | Razão social |
| `trade_name` | `TEXT` | Não | — | Nome fantasia |
| `tax_id` | `TEXT` | Sim | — | CNPJ UNIQUE |
| `slug` | `TEXT` | Sim | — | URL tenant UNIQUE |
| `email` | `TEXT` | Sim | — | Contato principal |
| `phone` | `TEXT` | Não | — | |
| `address_*` | `TEXT` | Não | — | Logradouro, cidade, UF, CEP |
| `logo_url` | `TEXT` | Não | — | Storage futuro |
| `settings` | `JSONB` | Sim | `'{}'` | Configurações globais |
| `status` | `entity_status` | Sim | `active` | |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Sim | `now()` | |
| `deleted_at` | `TIMESTAMPTZ` | Não | — | Soft delete |

---

### `branches`

| | |
|---|---|
| **Objetivo** | Filial / unidade operacional |
| **PK** | `id` |
| **FK** | `company_id` → `companies` |
| **Padrão** | A |
| **Relacionamento** | N:1 `companies` |

| Campo | Tipo | Obrig. | Padrão | Observação |
|-------|------|--------|--------|------------|
| `code` | `TEXT` | Sim | — | UNIQUE `(company_id, code)` |
| `name` | `TEXT` | Sim | — | |
| `tax_id` | `TEXT` | Não | — | CNPJ filial |
| `is_headquarters` | `BOOLEAN` | Sim | `false` | Matriz |
| `address_*` | `TEXT` | Não | — | |
| `metadata` | `JSONB` | Sim | `'{}'` | |

---

### `profiles`

| | |
|---|---|
| **Objetivo** | Perfil de app vinculado ao Supabase Auth |
| **PK** | `id` (= `auth.users.id`) |
| **FK** | — |
| **Relacionamento** | 1:1 `auth.users` |

| Campo | Tipo | Obrig. | Padrão | Observação |
|-------|------|--------|--------|------------|
| `full_name` | `TEXT` | Sim | — | |
| `email` | `TEXT` | Sim | — | UNIQUE, espelho auth |
| `avatar_url` | `TEXT` | Não | — | |
| `phone` | `TEXT` | Não | — | |
| `preferences` | `JSONB` | Sim | `'{}'` | Tema, idioma |
| `last_login_at` | `TIMESTAMPTZ` | Não | — | |
| `status` | `entity_status` | Sim | `active` | |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Sim | `now()` | |

---

### `permissions`

| | |
|---|---|
| **Objetivo** | Catálogo global RBAC |
| **PK** | `id` |
| **Padrão** | C |

| Campo | Tipo | Obrig. | Padrão | Observação |
|-------|------|--------|--------|------------|
| `code` | `TEXT` | Sim | — | Ex: `trips:write` UNIQUE |
| `resource` | `TEXT` | Sim | — | Ex: `trips` |
| `action` | `TEXT` | Sim | — | Ex: `write` |
| `description` | `TEXT` | Não | — | |

---

### `roles`

| | |
|---|---|
| **Objetivo** | Perfil de acesso por empresa |
| **PK** | `id` |
| **FK** | `company_id` → `companies` |
| **Padrão** | A |
| **Relacionamento** | N:1 `companies`; N:N `permissions` via `role_permissions` |

| Campo | Tipo | Obrig. | Padrão | Observação |
|-------|------|--------|--------|------------|
| `name` | `TEXT` | Sim | — | UNIQUE `(company_id, name)` |
| `description` | `TEXT` | Não | — | |
| `is_system` | `BOOLEAN` | Sim | `false` | Admin = `true`, imutável |

---

### `role_permissions` (N:N)

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| `role_id` | `UUID` | Sim | PK composta, FK → `roles` |
| `permission_id` | `UUID` | Sim | PK composta, FK → `permissions` |
| `company_id` | `UUID` | Sim | Denormalizado para RLS |
| `created_at` | `TIMESTAMPTZ` | Sim | `now()` |
| `created_by` | `UUID` | Não | FK → `profiles.id` |

---

### `company_members` (N:N usuário ↔ empresa)

| | |
|---|---|
| **Objetivo** | Vínculo usuário-empresa com papel |
| **PK** | `id` |
| **FK** | `company_id`, `profile_id`, `role_id`, `default_branch_id` |

| Campo | Tipo | Obrig. | Padrão | Observação |
|-------|------|--------|--------|------------|
| Padrão A | — | — | — | Sem `branch_id` no bloco |
| `profile_id` | `UUID` | Sim | — | FK → `profiles` |
| `role_id` | `UUID` | Sim | — | FK → `roles` |
| `default_branch_id` | `UUID` | Não | — | FK → `branches` |
| `invited_at` | `TIMESTAMPTZ` | Não | — | |
| `accepted_at` | `TIMESTAMPTZ` | Não | — | |

**UNIQUE:** `(company_id, profile_id)`

---

### `subscriptions`

| | |
|---|---|
| **Objetivo** | Assinatura ativa empresa ↔ plano |
| **PK** | `id` |
| **FK** | `company_id`, `saas_plan_id` |
| **Relacionamento** | N:1 `companies`, `saas_plans`; 1:N `saas_invoices` |

| Campo | Tipo | Obrig. | Padrão | Observação |
|-------|------|--------|--------|------------|
| Padrão A | — | — | — | |
| `saas_plan_id` | `UUID` | Sim | — | FK |
| `status` | `subscription_status` | Sim | `trial` | |
| `trial_ends_at` | `TIMESTAMPTZ` | Não | — | |
| `current_period_start` | `TIMESTAMPTZ` | Sim | — | |
| `current_period_end` | `TIMESTAMPTZ` | Sim | — | |
| `cancelled_at` | `TIMESTAMPTZ` | Não | — | |

---

### `saas_invoices`

| | |
|---|---|
| **Objetivo** | Faturas de cobrança SaaS |
| **FK** | `company_id`, `subscription_id` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | |
| `subscription_id` | `UUID` | Sim | FK |
| `amount` | `NUMERIC(15,2)` | Sim | |
| `due_date` | `DATE` | Sim | |
| `paid_at` | `TIMESTAMPTZ` | Não | |
| `status` | `financial_status` | Sim | |

---

## Módulo 2 — Cadastros

### `customers`

| | |
|---|---|
| **Objetivo** | Cliente da transportadora |
| **PK** | `id` |
| **FK** | `company_id` |
| **Padrão** | A |
| **Relacionamento** | 1:N `contracts`, `trips`, `revenues` |

| Campo | Tipo | Obrig. | Padrão | Observação |
|-------|------|--------|--------|------------|
| `person_type` | `TEXT` | Sim | — | `individual` \| `company` |
| `legal_name` | `TEXT` | Sim | — | |
| `trade_name` | `TEXT` | Não | — | |
| `tax_id` | `TEXT` | Sim | — | UNIQUE `(company_id, tax_id)` |
| `email` / `phone` | `TEXT` | Não | — | |
| `credit_limit` | `NUMERIC(15,2)` | Não | — | |
| `payment_term_days` | `INTEGER` | Não | `30` | Prazo padrão |
| `address_*` | `TEXT` | Não | — | |
| `metadata` | `JSONB` | Sim | `'{}'` | |

---

### `contracts`

| | |
|---|---|
| **Objetivo** | Acordo comercial com cliente |
| **FK** | `company_id`, `customer_id` |
| **Relacionamento** | N:1 `customers`; 1:N `trips`, `service_orders`, `revenues` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | |
| `customer_id` | `UUID` | Sim | FK |
| `code` | `TEXT` | Sim | UNIQUE `(company_id, code)` |
| `title` | `TEXT` | Sim | |
| `start_date` | `DATE` | Sim | |
| `end_date` | `DATE` | Não | NULL = indeterminado |
| `auto_renew` | `BOOLEAN` | Sim | `false` |
| `billing_rules` | `JSONB` | Sim | Tarifas, indexação |
| `sla_rules` | `JSONB` | Não | SLA operacional |

---

### `drivers`

| | |
|---|---|
| **Objetivo** | Motorista habilitado |
| **FK** | `company_id`, `branch_id` (opcional) |
| **Relacionamento** | 1:N `trips`, RH; N:N `vehicles` via `driver_vehicles` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A+B | — | — | `branch_id` opcional |
| `full_name` | `TEXT` | Sim | |
| `cpf` | `TEXT` | Sim | UNIQUE `(company_id, cpf)` |
| `cnh_number` | `TEXT` | Sim | |
| `cnh_category` | `TEXT` | Sim | A, B, C, D, E |
| `cnh_expires_at` | `DATE` | Sim | Bloqueio se vencida |
| `link_type` | `driver_link_type` | Sim | Próprio/terceiro/agregado |
| `phone` / `email` | `TEXT` | Não | |

---

### `vehicle_types`

| | |
|---|---|
| **Objetivo** | Classificação de veículos/implementos/reboques |
| **FK** | `company_id` (NULL = tipo plataforma) |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | `company_id` nullable |
| `name` | `TEXT` | Sim | |
| `category` | `TEXT` | Sim | `truck`, `trailer`, `implement` |
| `default_capacity_kg` | `NUMERIC(12,2)` | Não | |
| `icon` | `TEXT` | Não | |

---

### `vehicles`

| | |
|---|---|
| **Objetivo** | Ativo rodoviário principal |
| **FK** | `company_id`, `branch_id`, `vehicle_type_id` |
| **Relacionamento** | 1:N custos; N:N `trailers` via `trip_compositions` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A+B | — | — | |
| `vehicle_type_id` | `UUID` | Sim | FK |
| `plate` | `TEXT` | Sim | UNIQUE `(company_id, plate)` |
| `chassis` | `TEXT` | Não | |
| `brand` / `model` / `year` | `TEXT`/`INTEGER` | Não | |
| `odometer_km` | `NUMERIC(12,1)` | Sim | `0` — monotônico |
| `asset_status` | `vehicle_asset_status` | Sim | `active` |
| `capacity_kg` | `NUMERIC(12,2)` | Não | |

---

### `trailers`

| | |
|---|---|
| **Objetivo** | Reboque / semirreboque |
| **FK** | `company_id`, `vehicle_type_id`, `current_vehicle_id` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | |
| `vehicle_type_id` | `UUID` | Sim | FK |
| `plate` | `TEXT` | Sim | UNIQUE `(company_id, plate)` |
| `axles` | `INTEGER` | Não | |
| `capacity_kg` | `NUMERIC(12,2)` | Não | |
| `current_vehicle_id` | `UUID` | Não | FK → `vehicles` (acoplado) |

---

### `implements`

| | |
|---|---|
| **Objetivo** | Implemento acoplável |
| **FK** | `company_id`, `vehicle_id` (opcional) |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | |
| `code` | `TEXT` | Sim | UNIQUE `(company_id, code)` |
| `name` | `TEXT` | Sim | |
| `vehicle_id` | `UUID` | Não | FK atual |
| `capacity_kg` | `NUMERIC(12,2)` | Não | |

---

### `driver_vehicles` (N:N)

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| `driver_id` | `UUID` | Sim | PK composta |
| `vehicle_id` | `UUID` | Sim | PK composta |
| `company_id` | `UUID` | Sim | Denormalizado para RLS |
| `is_primary` | `BOOLEAN` | Sim | `false` |
| `authorized_at` | `DATE` | Sim | |
| `created_at` | `TIMESTAMPTZ` | Sim | `now()` |
| `updated_at` | `TIMESTAMPTZ` | Sim | `now()` |
| `deleted_at` | `TIMESTAMPTZ` | Não | Soft delete |
| `created_by` | `UUID` | Não | FK → `profiles.id` |
| `updated_by` | `UUID` | Não | FK → `profiles.id` |

---

### `suppliers`

| | |
|---|---|
| **Objetivo** | Fornecedor / prestador |
| **Relacionamento** | 1:N `expenses`, `maintenances`, `fuel_records` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | |
| `legal_name` | `TEXT` | Sim | |
| `tax_id` | `TEXT` | Sim | UNIQUE `(company_id, tax_id)` |
| `supplier_type` | `TEXT` | Não | `fuel`, `workshop`, `parts` |
| `payment_term_days` | `INTEGER` | Não | |

---

### `insurers`

| | |
|---|---|
| **Objetivo** | Seguradora parceira |
| **Relacionamento** | 1:N `vehicle_insurances` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | |
| `legal_name` | `TEXT` | Sim | |
| `tax_id` | `TEXT` | Sim | UNIQUE `(company_id, tax_id)` |

---

### `documents` (polimórfico)

| | |
|---|---|
| **Objetivo** | Documentação legal vinculada a qualquer entidade |
| **FK** | `company_id`, `entity_id` + `entity_type` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | |
| `entity_type` | `polymorphic_entity_type` | Sim | Tipo alvo |
| `entity_id` | `UUID` | Sim | ID alvo |
| `document_type` | `TEXT` | Sim | `cnh`, `crlv`, `antt`, `insurance` |
| `document_number` | `TEXT` | Não | |
| `issued_at` | `DATE` | Não | |
| `expires_at` | `DATE` | Não | Alerta automático |
| `file_url` | `TEXT` | Não | Storage futuro |
| `document_status` | `document_status` | Sim | Calculado/atualizado |

**Índice:** `(company_id, entity_type, entity_id)`

---

## Módulo 3 — Operação

### `routes`

| | |
|---|---|
| **Objetivo** | Trajeto reutilizável |
| **Relacionamento** | 1:N `route_waypoints`, `trips` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | |
| `name` | `TEXT` | Sim | |
| `origin_city` / `destination_city` | `TEXT` | Sim | |
| `distance_km` | `NUMERIC(10,2)` | Não | |
| `estimated_duration_min` | `INTEGER` | Não | |
| `estimated_toll_amount` | `NUMERIC(15,2)` | Não | |
| `is_template` | `BOOLEAN` | Sim | `true` |

---

### `route_waypoints`

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | Sem `branch_id` |
| `route_id` | `UUID` | Sim | FK |
| `sequence` | `INTEGER` | Sim | Ordem |
| `city` / `state` | `TEXT` | Sim | |
| `latitude` / `longitude` | `NUMERIC` | Não | GPS futuro |

---

### `service_orders`

| | |
|---|---|
| **Objetivo** | Demanda operacional do cliente |
| **FK** | `customer_id`, `contract_id` |
| **Relacionamento** | 1:N `trips` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A+B | — | — | |
| `customer_id` | `UUID` | Sim | FK |
| `contract_id` | `UUID` | Não | FK |
| `code` | `TEXT` | Sim | UNIQUE `(company_id, code)` |
| `priority` | `TEXT` | Sim | `low`, `normal`, `high`, `urgent` |
| `due_at` | `TIMESTAMPTZ` | Não | SLA |
| `description` | `TEXT` | Não | |

---

### `trips` ★ Aggregate Root

| | |
|---|---|
| **Objetivo** | Unidade central operacional |
| **FK** | `customer_id`, `contract_id`, `vehicle_id`, `driver_id`, `route_id`, `service_order_id` |
| **Relacionamento** | 1:N `pickups`, `deliveries`, `incidents`, `freight_documents`, custos |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A+B | — | — | `branch_id` obrigatório |
| `code` | `TEXT` | Sim | UNIQUE `(company_id, code)` |
| `customer_id` | `UUID` | Sim | FK |
| `contract_id` | `UUID` | Não | FK |
| `vehicle_id` | `UUID` | Sim | FK |
| `driver_id` | `UUID` | Sim | FK |
| `route_id` | `UUID` | Não | FK |
| `service_order_id` | `UUID` | Não | FK |
| `trip_status` | `trip_status` | Sim | `draft` |
| `scheduled_start_at` | `TIMESTAMPTZ` | Não | |
| `started_at` / `completed_at` | `TIMESTAMPTZ` | Não | |
| `odometer_start_km` / `odometer_end_km` | `NUMERIC` | Não | |
| `freight_amount` | `NUMERIC(15,2)` | Não | Valor do frete |
| `metadata` | `JSONB` | Sim | `'{}'` | |

---

### `trip_compositions` (N:N viagem ↔ reboques)

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| `trip_id` | `UUID` | Sim | PK composta |
| `trailer_id` | `UUID` | Sim | PK composta |
| `company_id` | `UUID` | Sim | RLS |
| `sequence` | `INTEGER` | Sim | Ordem na composição |
| `created_at` | `TIMESTAMPTZ` | Sim | `now()` |
| `updated_at` | `TIMESTAMPTZ` | Sim | `now()` |
| `deleted_at` | `TIMESTAMPTZ` | Não | Soft delete |
| `created_by` | `UUID` | Não | FK → `profiles.id` |
| `updated_by` | `UUID` | Não | FK → `profiles.id` |

---

### `pickups` / `deliveries`

| Tabela | Objetivo | FK principal |
|--------|----------|--------------|
| `pickups` | Coleta de carga | `trip_id` |
| `deliveries` | Entrega de carga | `trip_id` |

| Campos comuns | Tipo | Observação |
|---------------|------|------------|
| Padrão A | — | Sem `branch_id` |
| `trip_id` | `UUID` | FK |
| `sequence` | `INTEGER` | Ordem na viagem |
| `recipient_name` | `TEXT` | Remetente/destinatário |
| `address_*` | `TEXT` | |
| `weight_kg` / `volume_m3` | `NUMERIC` | Coleta alimenta CT-e |
| `scheduled_at` / `completed_at` | `TIMESTAMPTZ` | |
| `proof_file_url` | `TEXT` | Canhoto (entrega) |
| `status` | `TEXT` | `pending`, `done`, `cancelled`/`refused` |

---

### `incidents`

| | |
|---|---|
| **Objetivo** | Ocorrência operacional |
| **FK** | `trip_id`, `driver_id`, `vehicle_id` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | |
| `trip_id` | `UUID` | Sim | FK |
| `driver_id` | `UUID` | Não | FK |
| `vehicle_id` | `UUID` | Não | FK |
| `incident_type` | `TEXT` | Sim | `damage`, `delay`, `accident`, `theft` |
| `severity` | `incident_severity` | Sim | |
| `description` | `TEXT` | Sim | |
| `resolved_at` | `TIMESTAMPTZ` | Não | |
| `expense_id` | `UUID` | Não | FK → `expenses` se gerou custo |

---

### `freight_documents` (CT-e)

| | |
|---|---|
| **Objetivo** | Conhecimento de transporte eletrônico |
| **FK** | `trip_id`, `customer_id` |
| **Relacionamento** | 1:1 ou 1:N por viagem; gera `revenues` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A+B | — | — | |
| `trip_id` | `UUID` | Sim | FK |
| `customer_id` | `UUID` | Sim | FK |
| `series` | `TEXT` | Sim | Série fiscal |
| `number` | `INTEGER` | Sim | UNIQUE `(company_id, branch_id, series, number)` |
| `sefaz_status` | `TEXT` | Sim | `draft`, `authorized`, `cancelled` |
| `access_key` | `TEXT` | Não | Chave CT-e |
| `xml_url` | `TEXT` | Não | |
| `issued_at` | `TIMESTAMPTZ` | Não | |
| `total_amount` | `NUMERIC(15,2)` | Sim | |

---

## Módulo 4 — Financeiro

### `financial_categories`

| | |
|---|---|
| **Objetivo** | Classificação hierárquica receita/despesa |
| **FK** | `company_id`, `parent_id` (self) |
| **Relacionamento** | Árvore pai/filho |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | |
| `parent_id` | `UUID` | Não | FK self |
| `code` | `TEXT` | Sim | UNIQUE `(company_id, code)` |
| `name` | `TEXT` | Sim | |
| `category_type` | `TEXT` | Sim | `revenue` \| `expense` |
| `level` | `INTEGER` | Sim | Profundidade |

---

### `cost_centers`

| | |
|---|---|
| **Objetivo** | Centro de custo para alocação |
| **FK** | `company_id`, `branch_id` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A+B | — | — | |
| `code` | `TEXT` | Sim | UNIQUE `(company_id, code)` |
| `name` | `TEXT` | Sim | |
| `responsible_profile_id` | `UUID` | Não | FK → `profiles` |

---

### `payment_methods`

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | |
| `name` | `TEXT` | Sim | |
| `method_type` | `TEXT` | Sim | `pix`, `boleto`, `card`, `cash`, `transfer` |
| `is_system` | `BOOLEAN` | Sim | Catálogo padrão |

---

### `bank_accounts`

| | |
|---|---|
| **Objetivo** | Conta bancária da empresa |
| **Relacionamento** | 1:N `bank_transactions`, `bank_reconciliations` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A+B | — | — | |
| `bank_code` / `agency` / `account_number` | `TEXT` | Sim | |
| `account_type` | `TEXT` | Sim | `checking`, `savings` |
| `current_balance` | `NUMERIC(15,2)` | Sim | `0` — calculado |
| `is_default` | `BOOLEAN` | Sim | `false` |

---

### `revenues`

| | |
|---|---|
| **Objetivo** | Receita reconhecida |
| **FK** | `customer_id`, `contract_id`, `trip_id`, `freight_document_id`, `financial_category_id`, `cost_center_id` |
| **Relacionamento** | 1:N `accounts_receivable` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A+B | — | — | |
| `customer_id` | `UUID` | Sim | FK |
| `contract_id` | `UUID` | Não | FK |
| `trip_id` | `UUID` | Não | FK |
| `freight_document_id` | `UUID` | Não | FK |
| `financial_category_id` | `UUID` | Sim | FK |
| `cost_center_id` | `UUID` | Não | FK |
| `amount` | `NUMERIC(15,2)` | Sim | |
| `competence_date` | `DATE` | Sim | Competência |
| `cash_date` | `DATE` | Não | Caixa |
| `origin` | `TEXT` | Sim | `trip`, `manual`, `contract` |
| `financial_status` | `financial_status` | Sim | `pending` |

---

### `expenses`

| | |
|---|---|
| **Objetivo** | Despesa reconhecida |
| **FK** | `supplier_id`, `vehicle_id`, `financial_category_id`, `cost_center_id` |
| **Relacionamento** | 1:N `accounts_payable`; origem polimórfica opcional |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A+B | — | — | |
| `supplier_id` | `UUID` | Não | FK |
| `vehicle_id` | `UUID` | Não | FK |
| `financial_category_id` | `UUID` | Sim | FK |
| `cost_center_id` | `UUID` | Não | FK |
| `amount` | `NUMERIC(15,2)` | Sim | |
| `competence_date` | `DATE` | Sim | |
| `origin` | `TEXT` | Sim | `fuel`, `maintenance`, `manual`, etc. |
| `source_entity_type` | `TEXT` | Não | Polimórfico origem |
| `source_entity_id` | `UUID` | Não | |
| `approved_by` | `UUID` | Não | FK → `profiles` |
| `approved_at` | `TIMESTAMPTZ` | Não | |
| `financial_status` | `financial_status` | Sim | |

---

### `accounts_receivable`

| | |
|---|---|
| **Objetivo** | Título a receber |
| **FK** | `revenue_id`, `customer_id` |
| **Relacionamento** | 1:N `receivable_payments` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | |
| `revenue_id` | `UUID` | Sim | FK |
| `customer_id` | `UUID` | Sim | FK |
| `amount` | `NUMERIC(15,2)` | Sim | |
| `amount_received` | `NUMERIC(15,2)` | Sim | `0` — soma de `receivable_payments` confirmados |
| `due_date` | `DATE` | Sim | |
| `installment_number` | `INTEGER` | Sim | `1` |
| `financial_status` | `financial_status` | Sim | |

---

### `accounts_payable`

| | |
|---|---|
| **Objetivo** | Título a pagar |
| **FK** | `expense_id`, `supplier_id` |
| **Relacionamento** | 1:N `payable_payments` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | |
| `expense_id` | `UUID` | Sim | FK |
| `supplier_id` | `UUID` | Não | FK |
| `amount` | `NUMERIC(15,2)` | Sim | |
| `amount_paid` | `NUMERIC(15,2)` | Sim | `0` — soma de `payable_payments` confirmados |
| `due_date` | `DATE` | Sim | |
| `installment_number` | `INTEGER` | Sim | `1` |
| `financial_status` | `financial_status` | Sim | |

---

### `receivable_payments`

| | |
|---|---|
| **Objetivo** | Registro de cada recebimento (total ou parcial) contra um título a receber |
| **FK** | `accounts_receivable_id`, `bank_transaction_id`, `payment_method_id` |
| **Relacionamento** | N:1 `accounts_receivable`; 1:1 `bank_transactions`; N:1 `payment_methods` |

**Responsabilidades**

| Responsabilidade | Detalhe |
|------------------|---------|
| Baixa financeira | Vincula título (`accounts_receivable`) à movimentação bancária |
| Rastreabilidade | Cada recebimento é um registro auditável independente |
| Atualização do título | Incrementa `accounts_receivable.amount_received` e recalcula `financial_status` |
| Conciliação | `bank_transaction_id` é o elo para `reconciliation_items` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| `id` | `UUID` | Sim | PK |
| `company_id` | `UUID` | Sim | FK → `companies.id` |
| `accounts_receivable_id` | `UUID` | Sim | FK |
| `bank_transaction_id` | `UUID` | Sim | FK — `transaction_type = credit` |
| `payment_method_id` | `UUID` | Não | FK |
| `amount` | `NUMERIC(15,2)` | Sim | Sempre positivo |
| `received_at` | `TIMESTAMPTZ` | Sim | Data efetiva do recebimento |
| `payment_record_status` | `payment_record_status` | Sim | `confirmed` |
| `reversal_of_id` | `UUID` | Não | FK self — estorno |
| `notes` | `TEXT` | Não | |
| `created_at` | `TIMESTAMPTZ` | Sim | `now()` |
| `created_by` | `UUID` | Não | FK → `profiles.id` |

**Pagamentos parciais**

- Um `accounts_receivable` aceita N `receivable_payments`.
- Regra: `SUM(receivable_payments.amount WHERE status = confirmed) = accounts_receivable.amount_received`.
- `financial_status` do título: `pending` → `partial` (quando `0 < amount_received < amount`) → `received` (quando `amount_received = amount`).

**Estornos**

- Estorno **não exclui** o pagamento original.
- Cria novo `receivable_payment` com `payment_record_status = reversed` e `reversal_of_id` apontando ao original.
- Cria `bank_transaction` inversa (`transaction_type = debit`, `reversal_of_id`).
- Decrementa `accounts_receivable.amount_received`.

**Conciliação**

- A conciliação opera sobre `bank_transactions`, não diretamente sobre `receivable_payments`.
- Fluxo: `receivable_payment` → `bank_transaction` → `reconciliation_items` → `bank_reconciliations`.

---

### `payable_payments`

| | |
|---|---|
| **Objetivo** | Registro de cada pagamento (total ou parcial) contra um título a pagar |
| **FK** | `accounts_payable_id`, `bank_transaction_id`, `payment_method_id` |
| **Relacionamento** | N:1 `accounts_payable`; 1:1 `bank_transactions`; N:1 `payment_methods` |

**Responsabilidades**

| Responsabilidade | Detalhe |
|------------------|---------|
| Baixa financeira | Vincula título (`accounts_payable`) à movimentação bancária |
| Rastreabilidade | Cada pagamento é um registro auditável independente |
| Atualização do título | Incrementa `accounts_payable.amount_paid` e recalcula `financial_status` |
| Conciliação | `bank_transaction_id` é o elo para `reconciliation_items` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| `id` | `UUID` | Sim | PK |
| `company_id` | `UUID` | Sim | FK → `companies.id` |
| `accounts_payable_id` | `UUID` | Sim | FK |
| `bank_transaction_id` | `UUID` | Sim | FK — `transaction_type = debit` |
| `payment_method_id` | `UUID` | Não | FK |
| `amount` | `NUMERIC(15,2)` | Sim | Sempre positivo |
| `paid_at` | `TIMESTAMPTZ` | Sim | Data efetiva do pagamento |
| `payment_record_status` | `payment_record_status` | Sim | `confirmed` |
| `reversal_of_id` | `UUID` | Não | FK self — estorno |
| `notes` | `TEXT` | Não | |
| `created_at` | `TIMESTAMPTZ` | Sim | `now()` |
| `created_by` | `UUID` | Não | FK → `profiles.id` |

**Pagamentos parciais**

- Um `accounts_payable` aceita N `payable_payments`.
- Regra: `SUM(payable_payments.amount WHERE status = confirmed) = accounts_payable.amount_paid`.
- `financial_status` do título: `pending` → `partial` → `paid`.

**Estornos**

- Mesma regra de `receivable_payments`: registro inverso + `bank_transaction` de crédito com `reversal_of_id`.
- Decrementa `accounts_payable.amount_paid`.

**Conciliação**

- Fluxo: `payable_payment` → `bank_transaction` → `reconciliation_items` → `bank_reconciliations`.

---

### `bank_transactions`

| | |
|---|---|
| **Objetivo** | Movimentação bancária — efeito no saldo da conta |
| **FK** | `bank_account_id`, `payment_method_id`, `receivable_payment_id`, `payable_payment_id` |
| **Regras** | Sem soft delete; estorno via registro inverso; **não** vincula diretamente a títulos |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| `id` | `UUID` | Sim | PK |
| `company_id` | `UUID` | Sim | |
| `bank_account_id` | `UUID` | Sim | FK |
| `payment_method_id` | `UUID` | Não | FK |
| `receivable_payment_id` | `UUID` | Não | FK — preenchido em recebimentos |
| `payable_payment_id` | `UUID` | Não | FK — preenchido em pagamentos |
| `transaction_type` | `TEXT` | Sim | `credit` \| `debit` |
| `amount` | `NUMERIC(15,2)` | Sim | Sempre positivo |
| `transaction_date` | `DATE` | Sim | |
| `description` | `TEXT` | Não | |
| `reversal_of_id` | `UUID` | Não | FK self — estorno |
| `created_at` | `TIMESTAMPTZ` | Sim | `now()` |
| `created_by` | `UUID` | Não | |

---

### `bank_reconciliations`

| | |
|---|---|
| **Objetivo** | Sessão de conciliação bancária |
| **FK** | `bank_account_id` |
| **Relacionamento** | N:N `bank_transactions` via `reconciliation_items` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | |
| `bank_account_id` | `UUID` | Sim | FK |
| `period_start` / `period_end` | `DATE` | Sim | |
| `reconciliation_status` | `reconciliation_status` | Sim | `open` |
| `closed_at` | `TIMESTAMPTZ` | Não | Período fechado |
| `closed_by` | `UUID` | Não | |

---

### `reconciliation_items` (N:N)

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| `reconciliation_id` | `UUID` | Sim | PK composta |
| `bank_transaction_id` | `UUID` | Sim | PK composta |
| `company_id` | `UUID` | Sim | Denormalizado para RLS |
| `statement_line_id` | `UUID` | Não | FK `bank_statement_lines` (futuro) |
| `matched_at` | `TIMESTAMPTZ` | Sim | |
| `created_at` | `TIMESTAMPTZ` | Sim | `now()` |
| `created_by` | `UUID` | Não | FK → `profiles.id` |

---

### `cash_flow_snapshots` (read model BI)

| | |
|---|---|
| **Objetivo** | Projeção materializada de fluxo de caixa |
| **Nota** | Derivado — não é fonte de verdade; alimentado por job |

| Campo | Tipo | Observação |
|-------|------|------------|
| `company_id` / `branch_id` | `UUID` | |
| `snapshot_date` | `DATE` | |
| `flow_type` | `TEXT` | `projected` \| `realized` |
| `inflow_amount` / `outflow_amount` | `NUMERIC` | |
| `balance_amount` | `NUMERIC` | |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Controle do job materializador |

---

## Módulo 5 — Custos Operacionais

> Todas geram `expenses` via `source_entity_type` + `source_entity_id` (evento de domínio).

### `fuel_records` (Abastecimentos)

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | |
| `vehicle_id` | `UUID` | Sim | FK |
| `driver_id` | `UUID` | Não | FK |
| `trip_id` | `UUID` | Não | FK |
| `supplier_id` | `UUID` | Não | Posto — FK |
| `fuel_type` | `TEXT` | Sim | `diesel`, `ethanol`, etc. |
| `liters` | `NUMERIC(10,3)` | Sim | |
| `unit_price` | `NUMERIC(10,4)` | Sim | |
| `total_amount` | `NUMERIC(15,2)` | Sim | |
| `odometer_km` | `NUMERIC(12,1)` | Sim | >= anterior |
| `is_full_tank` | `BOOLEAN` | Sim | `false` |
| `filled_at` | `TIMESTAMPTZ` | Sim | |
| `expense_id` | `UUID` | Não | FK gerada |

---

### Fluxo de Pneus (ciclo de vida completo)

```
suppliers
    ↓
tire_purchases (NF / compra) ──► expenses ──► accounts_payable ──► payable_payments
    ↓
tire_purchase_items (entrada em estoque)
    ↓
tires (tire_status = in_stock)
    ↓
tire_events: stock_entry → install → rotate → retread → discard
    ↓
expenses (recapagem) ──► accumulated_cost atualizado
    ↓
KPI: cost_per_km = accumulated_cost / (discard_odometer_km − install_odometer_km)
```

| Etapa | Tabela | Ação |
|-------|--------|------|
| Compra | `tire_purchases` | Registra NF, fornecedor, valor total |
| Fornecedor | `suppliers` | `supplier_type = 'parts'` ou `'tire'` |
| Entrada em estoque | `tire_purchase_items` + `tires` | Cria pneu com `tire_status = in_stock` |
| Instalação | `tire_events` (`install`) | Monta no veículo/reboque; grava odômetro |
| Movimentação / Rodízio | `tire_events` (`rotate`, `transfer`) | Troca de posição ou ativo |
| Recapagem | `tire_events` (`retread`) | Gera `expense`; incrementa `accumulated_cost` |
| Descarte | `tire_events` (`discard`) | `tire_status = discarded`; fecha ciclo de km |
| Custo/km | `tires` + `indicator_snapshots` | Fórmula abaixo |

**Fórmula custo por km (por pneu)**

```
cost_per_km = tires.accumulated_cost / (tires.discard_odometer_km − tires.install_odometer_km)
```

- `accumulated_cost` = `purchase_amount` + Σ custos de `retread` em `tire_events`.
- Materializado em `indicator_snapshots` via KPI `tire_cost_per_km`.

---

### `tire_purchases`

| | |
|---|---|
| **Objetivo** | Cabeçalho de compra de pneus (NF do fornecedor) |
| **FK** | `supplier_id` |
| **Relacionamento** | N:1 `suppliers`; 1:N `tire_purchase_items`; gera `expenses` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | |
| `supplier_id` | `UUID` | Sim | FK |
| `invoice_number` | `TEXT` | Não | Número da NF |
| `purchase_date` | `DATE` | Sim | |
| `total_amount` | `NUMERIC(15,2)` | Sim | |
| `expense_id` | `UUID` | Não | FK gerada |

**UNIQUE:** `(company_id, supplier_id, invoice_number)` quando `invoice_number` preenchido

---

### `tire_purchase_items`

| | |
|---|---|
| **Objetivo** | Item da compra — origem do cadastro individual do pneu |
| **FK** | `tire_purchase_id`, `tire_id` |
| **Relacionamento** | N:1 `tire_purchases`; 1:1 `tires` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | |
| `tire_purchase_id` | `UUID` | Sim | FK |
| `tire_id` | `UUID` | Sim | FK — pneu criado neste item |
| `serial_code` | `TEXT` | Sim | |
| `brand` | `TEXT` | Sim | |
| `size` | `TEXT` | Sim | |
| `unit_price` | `NUMERIC(15,2)` | Sim | |
| `quantity` | `INTEGER` | Sim | `1` |

---

### `tires`

| | |
|---|---|
| **Objetivo** | Ativo rastreável individual de pneu |
| **FK** | `vehicle_id`, `trailer_id`, `supplier_id`, `tire_purchase_item_id` |
| **Relacionamento** | N:1 veículo ou reboque; 1:N `tire_events` |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | `status` do Bloco A = registro; ciclo em `tire_status` |
| `tire_purchase_item_id` | `UUID` | Não | FK — origem da compra |
| `supplier_id` | `UUID` | Não | FK — fornecedor da compra |
| `vehicle_id` | `UUID` | Não | FK — quando instalado |
| `trailer_id` | `UUID` | Não | FK — quando em reboque |
| `serial_code` | `TEXT` | Sim | UNIQUE `(company_id, serial_code)` |
| `brand` / `size` | `TEXT` | Sim | |
| `position` | `TEXT` | Não | Ex: `front_left` — posição atual |
| `tire_status` | `tire_status` | Sim | `in_stock` |
| `purchase_amount` | `NUMERIC(15,2)` | Sim | Valor de aquisição |
| `accumulated_cost` | `NUMERIC(15,2)` | Sim | `purchase_amount` + recapagens |
| `life_km` | `NUMERIC` | Não | Vida útil estimada |
| `current_km` | `NUMERIC` | Sim | `0` — km rodado no ciclo atual |
| `install_odometer_km` | `NUMERIC` | Não | Odômetro na instalação |
| `discard_odometer_km` | `NUMERIC` | Não | Odômetro no descarte |
| `installed_at` | `DATE` | Não | |

---

### `tire_events`

| | |
|---|---|
| **Objetivo** | Histórico de movimentações do pneu (instalação, rodízio, recapagem, descarte) |
| **FK** | `tire_id`, `vehicle_id`, `trailer_id` |
| **Relacionamento** | N:1 `tires`; gera `expenses` em recapagem |

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | |
| `tire_id` | `UUID` | Sim | FK |
| `event_type` | `tire_event_type` | Sim | Ver fluxo acima |
| `vehicle_id` | `UUID` | Não | FK — ativo no momento |
| `trailer_id` | `UUID` | Não | FK |
| `from_position` | `TEXT` | Não | Posição anterior (rodízio) |
| `to_position` | `TEXT` | Não | Posição nova |
| `odometer_km` | `NUMERIC` | Não | Odômetro do ativo |
| `cost_amount` | `NUMERIC(15,2)` | Não | Custo do evento (recapagem) |
| `expense_id` | `UUID` | Não | FK — gerada em `retread` |
| `event_at` | `TIMESTAMPTZ` | Sim | |

**Regras por `event_type`**

| Tipo | Efeito em `tires` |
|------|-------------------|
| `stock_entry` | `tire_status = in_stock` |
| `install` | `tire_status = installed`; preenche `vehicle_id`/`trailer_id`, `position`, `install_odometer_km` |
| `rotate` / `transfer` | Atualiza `position` e/ou `vehicle_id`/`trailer_id` |
| `retread` | `tire_status = retreaded`; incrementa `accumulated_cost` |
| `discard` | `tire_status = discarded`; preenche `discard_odometer_km` |

---

### `maintenances`

| Campo | Tipo | Obrig. | Observação |
|-------|------|--------|------------|
| Padrão A | — | — | |
| `vehicle_id` | `UUID` | Não | FK |
| `trailer_id` | `UUID` | Não | FK |
| `implement_id` | `UUID` | Não | FK |
| `supplier_id` | `UUID` | Não | Oficina |
| `maintenance_type` | `TEXT` | Sim | `preventive` \| `corrective` |
| `maintenance_status` | `maintenance_status` | Sim | |
| `odometer_km` | `NUMERIC` | Não | |
| `total_amount` | `NUMERIC(15,2)` | Sim | `0` |
| `scheduled_at` / `completed_at` | `TIMESTAMPTZ` | Não | |
| `expense_id` | `UUID` | Não | FK gerada |

---

### `maintenance_parts` / `maintenance_services`

| Tabela | Padrão | Campos principais |
|--------|--------|-------------------|
| `maintenance_parts` | A | `maintenance_id`, `name`, `quantity`, `unit_price`, `total_amount` |
| `maintenance_services` | A | `maintenance_id`, `supplier_id`, `description`, `amount` |

---

### `vehicle_insurances` (Seguro)

| Campo | Tipo | Observação |
|-------|------|------------|
| Padrão A | — | |
| `vehicle_id` | `UUID` | FK |
| `insurer_id` | `UUID` | FK |
| `policy_number` | `TEXT` | |
| `premium_amount` | `NUMERIC(15,2)` | |
| `coverage_amount` | `NUMERIC(15,2)` | |
| `starts_at` / `ends_at` | `DATE` | |
| `expense_id` | `UUID` | FK gerada |

---

### `vehicle_ipva` / `vehicle_licensing`

| Tabela | Campos principais |
|--------|-------------------|
| `vehicle_ipva` | `vehicle_id`, `fiscal_year`, `amount`, `paid_at`, `expense_id` |
| `vehicle_licensing` | `vehicle_id`, `fiscal_year`, `amount`, `valid_until`, `expense_id` |

---

### `traffic_fines` (Multas)

| Campo | Tipo | Observação |
|-------|------|------------|
| Padrão A | — | |
| `vehicle_id` | `UUID` | FK |
| `driver_id` | `UUID` | Não | Responsável |
| `fine_code` | `TEXT` | Código infração |
| `amount` | `NUMERIC(15,2)` | |
| `fine_date` | `DATE` | |
| `responsible_party` | `TEXT` | `company` \| `driver` |
| `appeal_deadline` | `DATE` | Não |
| `expense_id` | `UUID` | FK |
| `driver_deduction_id` | `UUID` | Não — FK `driver_deductions` |

---

### `toll_records` (Pedágios)

| Campo | Tipo | Observação |
|-------|------|------------|
| Padrão A | — | |
| `trip_id` | `UUID` | FK |
| `vehicle_id` | `UUID` | FK |
| `plaza_name` | `TEXT` | |
| `amount` | `NUMERIC(15,2)` | |
| `toll_date` | `TIMESTAMPTZ` | |
| `is_estimated` | `BOOLEAN` | Rota vs realizado |
| `expense_id` | `UUID` | FK |

---

### `vehicle_washes` (Lavagens)

| Campo | Tipo | Observação |
|-------|------|------------|
| Padrão A | — | |
| `vehicle_id` | `UUID` | FK |
| `supplier_id` | `UUID` | Não |
| `wash_type` | `TEXT` | |
| `amount` | `NUMERIC(15,2)` | |
| `washed_at` | `TIMESTAMPTZ` | |
| `expense_id` | `UUID` | FK |

---

## Módulo 6 — RH

> Motorista cadastrado em `drivers`. RH gerencia compensação.

### `driver_salaries`

| Campo | Tipo | Observação |
|-------|------|------------|
| Padrão A | — | |
| `driver_id` | `UUID` | FK |
| `base_amount` | `NUMERIC(15,2)` | |
| `pay_frequency` | `TEXT` | `monthly`, `biweekly` |
| `starts_at` / `ends_at` | `DATE` | Vigência |
| `accounts_payable_id` | `UUID` | Não — gerado no ciclo |

---

### `driver_daily_allowances` (Diárias)

| Campo | Tipo | Observação |
|-------|------|------------|
| Padrão A | — | |
| `driver_id` | `UUID` | FK |
| `trip_id` | `UUID` | FK |
| `days` | `INTEGER` | Sim |
| `daily_rate` | `NUMERIC(15,2)` | |
| `total_amount` | `NUMERIC(15,2)` | |
| `expense_id` | `UUID` | FK |

---

### `driver_commissions` (Comissões)

| Campo | Tipo | Observação |
|-------|------|------------|
| Padrão A | — | |
| `driver_id` | `UUID` | FK |
| `trip_id` | `UUID` | Não |
| `revenue_id` | `UUID` | Não |
| `calculation_base` | `TEXT` | `net_revenue`, `freight` |
| `rate_percent` | `NUMERIC(5,2)` | Não |
| `fixed_amount` | `NUMERIC(15,2)` | Não |
| `total_amount` | `NUMERIC(15,2)` | |
| `accounts_payable_id` | `UUID` | Não |

---

### `driver_advances` (Adiantamentos)

| Campo | Tipo | Observação |
|-------|------|------------|
| Padrão A | — | |
| `driver_id` | `UUID` | FK |
| `trip_id` | `UUID` | Não |
| `amount` | `NUMERIC(15,2)` | |
| `reason` | `TEXT` | Não |
| `advanced_at` | `TIMESTAMPTZ` | |
| `balance_amount` | `NUMERIC(15,2)` | Saldo devedor |
| `bank_transaction_id` | `UUID` | Não |

---

### `driver_deductions` (Descontos)

| Campo | Tipo | Observação |
|-------|------|------------|
| Padrão A | — | |
| `driver_id` | `UUID` | FK |
| `traffic_fine_id` | `UUID` | Não |
| `incident_id` | `UUID` | Não |
| `driver_advance_id` | `UUID` | Não |
| `amount` | `NUMERIC(15,2)` | |
| `reason` | `TEXT` | |
| `installments` | `INTEGER` | Sim — `1` |
| `approved_by` | `UUID` | Não |

---

## Módulo 7 — Inteligência

### `domain_events`

| Campo | Tipo | Observação |
|-------|------|------------|
| `id` | `UUID` | PK |
| `company_id` | `UUID` | Não — eventos de plataforma |
| `event_type` | `TEXT` | Ex: `TripCompleted` |
| `aggregate_type` | `TEXT` | Ex: `trips` |
| `aggregate_id` | `UUID` | |
| `payload` | `JSONB` | Dados do evento |
| `domain_event_status` | `domain_event_status` | `pending` |
| `created_at` | `TIMESTAMPTZ` | `now()` |
| `processed_at` | `TIMESTAMPTZ` | Não |

---

### `audit_logs` (append-only)

| Campo | Tipo | Observação |
|-------|------|------------|
| `id` | `UUID` | PK |
| `company_id` | `UUID` | |
| `profile_id` | `UUID` | FK — quem |
| `audit_action` | `audit_action` | |
| `entity_type` | `TEXT` | |
| `entity_id` | `UUID` | |
| `changes_before` | `JSONB` | Não |
| `changes_after` | `JSONB` | Não |
| `ip_address` | `INET` | Não |
| `user_agent` | `TEXT` | Não |
| `created_at` | `TIMESTAMPTZ` | `now()` — **sem update/delete** |

---

### `system_logs`

| Campo | Tipo | Observação |
|-------|------|------------|
| `id` | `UUID` | PK |
| `level` | `TEXT` | `debug`, `info`, `warn`, `error` |
| `message` | `TEXT` | |
| `context` | `JSONB` | |
| `stack_trace` | `TEXT` | Não |
| `created_at` | `TIMESTAMPTZ` | Retenção curta |

---

### `kpis` / `indicator_snapshots`

| Tabela | Objetivo |
|--------|----------|
| `kpis` | Definição de KPI (fórmula, meta, periodicidade) — Padrão A |
| `indicator_snapshots` | Valor materializado por período/branch — BI |

Campos `kpis`: `code`, `name`, `formula`, `target_value`, `period_type`, `metadata`.

Campos `indicator_snapshots`: `kpi_id`, `branch_id`, `period_date`, `value`, `trend`, `metadata`.

---

### `alerts`

| Campo | Tipo | Observação |
|-------|------|------------|
| Padrão A | — | |
| `alert_type` | `TEXT` | `document_expiry`, `overdue_account`, etc. |
| `severity` | `alert_severity` | |
| `title` / `message` | `TEXT` | |
| `entity_type` / `entity_id` | | Origem polimórfica |
| `acknowledged_at` | `TIMESTAMPTZ` | Não |
| `acknowledged_by` | `UUID` | Não |

---

### `dashboards` / `dashboard_widgets`

| Tabela | Relacionamento |
|--------|----------------|
| `dashboards` | N:1 `profiles` (personalizado) ou template por `role_id` |
| `dashboard_widgets` | N:1 `dashboards`; referencia `kpi_id` ou config JSONB |

---

### `notifications`

| Campo | Tipo | Observação |
|-------|------|------------|
| Padrão A | — | |
| `profile_id` | `UUID` | FK destinatário |
| `alert_id` | `UUID` | Não — FK |
| `channel` | `TEXT` | `in_app`, `email`, `push` |
| `title` / `body` | `TEXT` | |
| `read_at` | `TIMESTAMPTZ` | Não |
| `sent_at` | `TIMESTAMPTZ` | Não |

---

### `ai_queries` / `ai_insights`

| Tabela | Objetivo |
|--------|----------|
| `ai_queries` | Pergunta do usuário, contexto, resposta — read-only |
| `ai_insights` | Insight gerado automaticamente (anomalia, recomendação) |

Campos `ai_queries`: `profile_id`, `question`, `context_snapshot` JSONB, `answer`, `tokens_used`, `created_at`.

Campos `ai_insights`: `insight_type`, `title`, `description`, `confidence_score`, `source_data` JSONB, `entity_type`, `entity_id`.

---

## Mapa de Relacionamentos

### Tipos de cardinalidade

| Tipo | Exemplos no FleetControl |
|------|--------------------------|
| **1:1** | `profiles` ↔ `auth.users`; `subscriptions` ↔ `companies` (ativa); `freight_documents` ↔ `revenues` (opcional) |
| **1:N** | `companies` → `branches`; `customers` → `contracts`; `trips` → `pickups`; `expenses` → `accounts_payable`; `accounts_receivable` → `receivable_payments`; `accounts_payable` → `payable_payments` |
| **N:N** | `roles` ↔ `permissions` (`role_permissions`); `profiles` ↔ `companies` (`company_members`); `drivers` ↔ `vehicles` (`driver_vehicles`); `trips` ↔ `trailers` (`trip_compositions`); `bank_reconciliations` ↔ `bank_transactions` (`reconciliation_items`) |

### Diagrama textual completo

```
PLATAFORMA
 ├── saas_plans
 │      └── subscriptions ──► saas_invoices
 └── permissions
        └── role_permissions ◄── roles

auth.users (Supabase)
 └── profiles
        └── company_members ──► companies (TENANT)
                ├── branches
                │      ├── cost_centers
                │      ├── bank_accounts
                │      │      ├── bank_transactions
                │      │      └── bank_reconciliations
                │      │             └── reconciliation_items
                │      └── trips (branch_id)
                │
                ├── roles ──► role_permissions ──► permissions
                ├── company_members (profile + role)
                │
                ├── financial_categories (hierárquico)
                ├── payment_methods
                ├── vehicle_types
                │
                ├── customers
                │      ├── contracts
                │      │      ├── service_orders
                │      │      │      └── trips
                │      │      ├── trips
                │      │      └── revenues
                │      └── revenues ──► accounts_receivable ──► receivable_payments ──► bank_transactions
                │
                ├── suppliers
                │      ├── expenses ──► accounts_payable ──► payable_payments ──► bank_transactions
                │      ├── tire_purchases ──► tire_purchase_items ──► tires
                │      ├── maintenances
                │      └── fuel_records
                │
                ├── insurers
                │      └── vehicle_insurances
                │
                ├── drivers
                │      ├── driver_vehicles ◄──► vehicles
                │      ├── documents (polimórfico)
                │      ├── trips
                │      ├── driver_salaries
                │      ├── driver_daily_allowances
                │      ├── driver_commissions
                │      ├── driver_advances
                │      ├── driver_deductions
                │      └── traffic_fines (responsável)
                │
                ├── vehicles
                │      ├── trailers ◄── trip_compositions ──► trips
                │      ├── implements
                │      ├── documents
                │      ├── fuel_records ──► expenses
                │      ├── tires ──► tire_events
                │      │      └── tire_purchases ──► tire_purchase_items
                │      ├── maintenances ──► maintenance_parts / maintenance_services
                │      ├── vehicle_insurances ──► expenses
                │      ├── vehicle_ipva ──► expenses
                │      ├── vehicle_licensing ──► expenses
                │      ├── traffic_fines ──► expenses / driver_deductions
                │      ├── toll_records ──► expenses
                │      ├── vehicle_washes ──► expenses
                │      └── trips
                │
                └── trips ★ (aggregate root)
                       ├── route ──► route_waypoints
                       ├── pickups
                       ├── deliveries
                       ├── incidents ──► expenses / alerts
                       ├── freight_documents (CT-e) ──► revenues
                       ├── toll_records
                       ├── fuel_records
                       └── domain_events: TripCompleted

READ MODELS / INTELIGÊNCIA
 ├── cash_flow_snapshots ◄── revenues + expenses + bank_transactions
 ├── indicator_snapshots ◄── kpis
 ├── dashboards ──► dashboard_widgets
 ├── alerts ──► notifications
 ├── audit_logs (append-only, todos os módulos)
 ├── entity_versions (entidades críticas)
 ├── domain_events (integração entre contextos)
 ├── ai_queries / ai_insights (read-only)
 └── system_logs (técnico)
```

---

## Matriz de Criação

> Ordem de criação de tabelas nas migrations (Sprint 8+). Nível = pode ser criada após todos os níveis anteriores.

| Nível | Tabela | Depende de |
|-------|--------|------------|
| **0** | `saas_plans` | — |
| **0** | `permissions` | — |
| **1** | `companies` | — |
| **1** | `profiles` | `auth.users` (Supabase) |
| **2** | `subscriptions` | `companies`, `saas_plans` |
| **2** | `saas_invoices` | `subscriptions` |
| **2** | `branches` | `companies` |
| **2** | `roles` | `companies` |
| **2** | `role_permissions` | `roles`, `permissions` |
| **2** | `company_members` | `companies`, `profiles`, `roles`, `branches` |
| **3** | `vehicle_types` | `companies` |
| **3** | `financial_categories` | `companies` |
| **3** | `cost_centers` | `companies`, `branches` |
| **3** | `payment_methods` | `companies` |
| **3** | `bank_accounts` | `companies`, `branches` |
| **3** | `suppliers` | `companies` |
| **3** | `insurers` | `companies` |
| **3** | `customers` | `companies` |
| **4** | `drivers` | `companies`, `branches` |
| **4** | `vehicles` | `companies`, `branches`, `vehicle_types` |
| **4** | `trailers` | `companies`, `vehicle_types`, `vehicles` |
| **4** | `implements` | `companies`, `vehicles` |
| **4** | `driver_vehicles` | `drivers`, `vehicles` |
| **4** | `documents` | `companies` + entidade polimórfica |
| **5** | `contracts` | `customers` |
| **6** | `routes` | `companies` |
| **6** | `route_waypoints` | `routes` |
| **6** | `service_orders` | `customers`, `contracts` |
| **7** | `trips` | `customers`, `vehicles`, `drivers`, `branches`, `contracts`, `routes` |
| **7** | `trip_compositions` | `trips`, `trailers` |
| **8** | `pickups` | `trips` |
| **8** | `deliveries` | `trips` |
| **8** | `incidents` | `trips` |
| **8** | `freight_documents` | `trips`, `customers` |
| **9** | `revenues` | `customers`, `financial_categories`, `trips` |
| **9** | `expenses` | `financial_categories`, `suppliers` |
| **10** | `accounts_receivable` | `revenues`, `customers` |
| **10** | `accounts_payable` | `expenses`, `suppliers` |
| **10** | `receivable_payments` | `accounts_receivable`, `bank_transactions`, `payment_methods` |
| **10** | `payable_payments` | `accounts_payable`, `bank_transactions`, `payment_methods` |
| **10** | `bank_transactions` | `bank_accounts`, `payment_methods` |
| **11** | `bank_reconciliations` | `bank_accounts` |
| **11** | `reconciliation_items` | `bank_reconciliations`, `bank_transactions` |
| **12** | `fuel_records` | `vehicles`, `trips` |
| **12** | `tire_purchases` | `suppliers` |
| **12** | `tires` | `suppliers` |
| **12** | `tire_purchase_items` | `tire_purchases`, `tires` |
| **12** | `tire_events` | `tires`, `vehicles`, `trailers` |
| **12** | `maintenances` | `vehicles`, `suppliers` |
| **12** | `maintenance_parts` / `maintenance_services` | `maintenances` |
| **12** | `vehicle_insurances` | `vehicles`, `insurers` |
| **12** | `vehicle_ipva` / `vehicle_licensing` | `vehicles` |
| **12** | `traffic_fines` | `vehicles`, `drivers` |
| **12** | `toll_records` | `trips`, `vehicles` |
| **12** | `vehicle_washes` | `vehicles` |
| **13** | `driver_salaries` | `drivers` |
| **13** | `driver_daily_allowances` | `drivers`, `trips` |
| **13** | `driver_commissions` | `drivers`, `trips`, `revenues` |
| **13** | `driver_advances` | `drivers` |
| **13** | `driver_deductions` | `drivers` |
| **14** | `domain_events` | aggregates existentes |
| **14** | `audit_logs` | `profiles` |
| **14** | `entity_versions` | entidades críticas |
| **15** | `kpis` | `companies` |
| **15** | `indicator_snapshots` | `kpis` |
| **15** | `alerts` | entidades de origem |
| **15** | `dashboards` / `dashboard_widgets` | `profiles`, `kpis` |
| **15** | `notifications` | `profiles`, `alerts` |
| **15** | `cash_flow_snapshots` | financeiro (read model) |
| **16** | `ai_queries` / `ai_insights` | analytics |
| **16** | `system_logs` | — |

### Cadeia resumida (matriz vertical)

```
saas_plans
    ↓
permissions
    ↓
companies
    ↓
branches ─────────────────────────────────────────┐
    ↓                                              │
profiles (auth.users)                              │
    ↓                                              │
roles → role_permissions                           │
    ↓                                              │
company_members                                    │
    ↓                                              │
vehicle_types · financial_categories ·             │
payment_methods · cost_centers · bank_accounts ·  │
suppliers · insurers · customers                   │
    ↓                                              │
drivers · vehicles · trailers · implements         │
    ↓                                              │
contracts                                        ←─┘
    ↓
routes → service_orders
    ↓
trips → pickups · deliveries · incidents · freight_documents
    ↓
revenues · expenses
    ↓
accounts_receivable · accounts_payable · receivable_payments · payable_payments · bank_transactions
    ↓
bank_reconciliations
    ↓
fuel_records · maintenances · tire_purchases · tires · insurances · fines · tolls · washes
    ↓
driver_salaries · daily_allowances · commissions · advances · deductions
    ↓
domain_events · audit_logs · kpis · alerts · dashboards · ai_insights
```

---

## Decisões Arquiteturais

| # | Decisão | Justificativa |
|---|---------|---------------|
| **DB-01** | Nomes em inglês (`snake_case`) | Padrão PostgreSQL/Supabase; compatível com ORMs e BI |
| **DB-02** | UUID como PK | Segurança (não sequencial), merge multi-tenant, Supabase-friendly |
| **DB-03** | `company_id` em todas as tabelas tenant | RLS futuro; filtro universal; índice composto |
| **DB-04** | `profiles` espelha `auth.users` | Padrão Supabase; dados de app separados de auth |
| **DB-05** | Polimorfismo via `entity_type` + `entity_id` | `documents`, alertas, auditoria — flexível sem 20 FKs |
| **DB-06** | Custos → `expenses` via FK `expense_id` | Rastreabilidade financeira; origem em `source_entity_*` |
| **DB-07** | `bank_transactions` sem soft delete | Integridade contábil; estorno por registro inverso |
| **DB-08** | `audit_logs` append-only | Compliance; imutabilidade |
| **DB-09** | `domain_events` com JSONB payload | Desacoplamento CQRS; consumidores Analytics/Financial |
| **DB-10** | `cash_flow_snapshots` materializado | Performance BI; não duplicar lógica em queries pesadas |
| **DB-11** | ENUMs PostgreSQL para status | Validação no banco; performance vs CHECK text |
| **DB-12** | `NUMERIC(15,2)` para valores | Precisão monetária; sem float |
| **DB-13** | UNIQUE compostos com `company_id` | Unicidade por tenant (placa, CNPJ, código) |
| **DB-14** | Índices parciais `deleted_at IS NULL` | Performance em listagens ativas |
| **DB-15** | `trips` como hub operacional | FK centralizada; queries de BI por viagem |
| **DB-16** | `receivable_payments` / `payable_payments` como entidade de baixa | Separa título de movimentação bancária; suporta parciais e estornos |
| **DB-17** | Ciclo de pneus via `tire_purchases` → `tires` → `tire_events` | Compra, estoque, instalação, recapagem e custo/km rastreáveis |
| **DB-18** | Nomenclatura 100% inglês nas FKs | `company_id`, `branch_id`, `customer_id`, etc. — sem mistura PT/EN |

---

## Inventário de Tabelas

| Módulo | Qtd | Tabelas |
|--------|-----|---------|
| Organização | 10 | `saas_plans`, `companies`, `branches`, `profiles`, `permissions`, `roles`, `role_permissions`, `company_members`, `subscriptions`, `saas_invoices` |
| Cadastros | 11 | `customers`, `contracts`, `drivers`, `vehicle_types`, `vehicles`, `trailers`, `implements`, `driver_vehicles`, `suppliers`, `insurers`, `documents` |
| Operação | 9 | `routes`, `route_waypoints`, `service_orders`, `trips`, `trip_compositions`, `pickups`, `deliveries`, `incidents`, `freight_documents` |
| Financeiro | 14 | `financial_categories`, `cost_centers`, `payment_methods`, `bank_accounts`, `revenues`, `expenses`, `accounts_receivable`, `accounts_payable`, `receivable_payments`, `payable_payments`, `bank_transactions`, `bank_reconciliations`, `reconciliation_items`, `cash_flow_snapshots` |
| Custos | 14 | `fuel_records`, `tire_purchases`, `tire_purchase_items`, `tires`, `tire_events`, `maintenances`, `maintenance_parts`, `maintenance_services`, `vehicle_insurances`, `vehicle_ipva`, `vehicle_licensing`, `traffic_fines`, `toll_records`, `vehicle_washes` |
| RH | 5 | `driver_salaries`, `driver_daily_allowances`, `driver_commissions`, `driver_advances`, `driver_deductions` |
| Inteligência | 12 | `domain_events`, `audit_logs`, `entity_versions`, `system_logs`, `kpis`, `indicator_snapshots`, `alerts`, `dashboards`, `dashboard_widgets`, `notifications`, `ai_queries`, `ai_insights` |
| **Total** | **~75** | |

---

> **Próxima sprint:** Migrations SQL a partir deste modelo (Sprint 9), iniciando pelos níveis 0–3, com RLS e policies.

