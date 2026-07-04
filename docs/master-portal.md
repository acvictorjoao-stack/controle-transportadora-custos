# FleetControl — Portal Master

Documentação do Portal Master (Sprints 11–15 — Administração do SaaS).

> Área exclusiva do proprietário do FleetControl para administrar empresas clientes. Integrado com Supabase Auth, `portal_users`, RLS e provisionamento automático.

---

## Visão Geral

| Aspecto | Decisão |
|---------|---------|
| Route Group | `app/(master)/` |
| URL base | `/master` |
| Layout | `MasterLayout` — shell independente das transportadoras |
| Autenticação | Sessão Supabase (Sprint 10) |
| Autorização | Papel `OWNER` via `portal_users` + RPC `is_portal_owner()` |
| Dados | Supabase (`companies`, `company_members`, `profiles`, etc.) |

---

## Arquitetura

```
app/(master)/
├── layout.tsx                    → requireOwner() + MasterLayout
└── master/
    ├── page.tsx                  → /master (Dashboard — KPIs reais)
    ├── empresas/
    │   ├── page.tsx              → /master/empresas (Listagem paginada)
    │   └── [id]/page.tsx         → /master/empresas/:id (Detalhes + CRUD)
    ├── planos/page.tsx           → /master/planos (catálogo via RPC)
    ├── usuarios/page.tsx         → /master/usuarios (placeholder)
    ├── logs/page.tsx             → /master/logs (placeholder)
    └── configuracoes/page.tsx    → /master/configuracoes (placeholder)

features/master/
├── companies/                    → Queries, actions, validação, componentes
├── dashboard/                    → KPIs e últimos cadastros
├── plans/                        → Catálogo de planos (RPC get_plan_catalog)
└── provisioning/                 → Orquestração de nova empresa

components/master/
├── dashboard/                    → KPIs e últimos cadastros (UI)
├── empresas/                     → Re-exports + AccessLinkPreview
├── plans/                        → Grid de planos
└── shared/                       → Sidebar, shell, modal, guards
```

### Separação Portal Master vs Portal do Cliente

| Portal Master | Portal do Cliente (Transportadora) |
|---------------|-------------------------------------|
| Route group `(master)` | Route group `(dashboard)` |
| URL `/master/*` | URL `/`, `/empresas`, `/financeiro`, etc. |
| `MasterAppShell` + `MasterSidebar` | `AppShell` + `Sidebar` |
| `masterNavigationGroups` | `navigationGroups` |
| Papel `OWNER` (`portal_users`) | Papéis da empresa (RBAC tenant) |
| Gestão de empresas SaaS | Operação da transportadora |

---

## Segurança

### Camadas de proteção

1. **Middleware** — exige sessão válida em `/master/*`
2. **Server Layout** — `requireOwner()` em `app/(master)/layout.tsx`
3. **Client Layout** — `MasterProtectedRoute` em `MasterLayout`
4. **Server Actions** — `isPortalOwner()` em cada action
5. **RLS** — políticas `*_portal_owner` nas tabelas tenant

### Autorização OWNER

```typescript
// lib/auth/portal.ts
isPortalOwner()  → RPC is_portal_owner()
getMyPortalRole() → RPC get_my_portal_role()
```

Papéis definidos em `portal_users` (`OWNER`, `SUPPORT`, `FINANCE`). Apenas `OWNER` acessa o portal nesta fase.

---

## Fluxo de Criação de Empresa

```
/master/empresas → Nova Empresa
    ↓
NovaEmpresaModal → NovaEmpresaForm
    ↓
provisionCompanyAction (Server Action)
    ↓
provisionCompany service
    ├── insert companies (provision_status = in_progress)
    ├── createUser via Supabase Admin API (service_role)
    ├── waitForProfile (trigger on_auth_user_created)
    └── RPC complete_company_provisioning
    ↓
ProvisionSuccess — credenciais + link de acesso
```

### Link de acesso

`AccessLinkPreview` exibe URLs geradas a partir do slug (`buildAccessLinks`).

---

## Migrations relevantes

| Migration | Conteúdo |
|-----------|----------|
| `015_portal_users.sql` | Tabela `portal_users`, RPCs de papel |
| `016_portal_owner_companies_rls.sql` | OWNER select/update em `companies` |
| `017_company_provisioning.sql` | `provision_status`, RPCs de provisionamento |
| `018_portal_users_grants.sql` | Grants para `portal_users` |
| `019_portal_owner_read_policies.sql` | OWNER read em `profiles`, `company_members`, `branches`, `roles` |
| `020_companies_insert_portal_owner.sql` | INSERT em `companies` restrito a `is_portal_owner()` |

---

## Rotas

| Constante | Caminho |
|-----------|---------|
| `ROUTES.master` | `/master` |
| `ROUTES.masterEmpresas` | `/master/empresas` |
| `ROUTES.masterEmpresaDetail(id)` | `/master/empresas/:id` |
| `ROUTES.masterPlanos` | `/master/planos` |
| `ROUTES.masterUsuarios` | `/master/usuarios` |
| `ROUTES.masterLogs` | `/master/logs` |
| `ROUTES.masterConfiguracoes` | `/master/configuracoes` |

---

## Próximas Integrações (Sprint 16+)

- [ ] Páginas placeholder: Usuários, Logs, Configurações
- [ ] RBAC granular para papéis `SUPPORT` e `FINANCE`
- [ ] Billing e assinaturas por plano
- [ ] Logs de auditoria persistidos

---

## Nota sobre Estrutura de Rotas

O route group `(master)` não aparece na URL. As páginas ficam em `app/(master)/master/` para mapear `/master/*`, evitando conflito com o dashboard das transportadoras em `/`.
