# FleetControl — Application Shell

Documentação da infraestrutura de navegação e layout do FleetControl.

> Toda página futura do sistema utilizará esta estrutura.

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Navegação Centralizada](#navegação-centralizada)
4. [Sidebar](#sidebar)
5. [Header](#header)
6. [Breadcrumb](#breadcrumb)
7. [Page Layout](#page-layout)
8. [Layouts por Contexto](#layouts-por-contexto)
9. [Loading Global](#loading-global)
10. [Error Boundary](#error-boundary)
11. [Como Usar](#como-usar)

---

## Visão Geral

O Application Shell é a casca visual e estrutural que envolve todo o conteúdo autenticado do FleetControl. Ele é composto por:

- **Sidebar** — navegação lateral enterprise
- **Header** — barra superior global
- **Main Content** — área de conteúdo scrollável
- **Providers** — tema, loading, error boundary

```
┌─────────────────────────────────────────────────────────┐
│ AppShell                                                │
│ ┌──────────┬──────────────────────────────────────────┐ │
│ │ Sidebar  │ AppHeader                                │ │
│ │          ├──────────────────────────────────────────┤ │
│ │  Nav     │ MainContent                              │ │
│ │  Groups  │  └─ ScrollableArea                     │ │
│ │          │      └─ ContentContainer               │ │
│ │  Footer  │          └─ {children}                 │ │
│ └──────────┴──────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Arquitetura

### Camadas

| Camada | Localização | Responsabilidade |
|--------|-------------|------------------|
| Config | `config/navigation/` | Definição de módulos, rotas, ícones |
| Constants | `constants/routes/` | Paths centralizados |
| Lib | `lib/navigation/` | Breadcrumb, filtro de permissões |
| Context | `contexts/shell/`, `contexts/loading/` | Estado da sidebar e loading |
| Components | `components/layout/` | Shell, sidebar, header, page layout |
| App Routes | `app/(dashboard)/`, etc. | Layouts por route group |

### Regra de dependência

```
app/(dashboard)/layout.tsx
  → DashboardLayout
    → AppShell
      → Sidebar + AppHeader + MainContent
```

Features futuras importam componentes de layout — nunca o contrário.

---

## Navegação Centralizada

### Arquivos

| Arquivo | Conteúdo |
|---------|----------|
| `constants/routes/paths.ts` | Todas as rotas (`ROUTES.dashboard`, etc.) |
| `config/navigation/modules.ts` | Grupos, itens, ícones, permissões |
| `types/global/navigation.ts` | Tipos `NavItem`, `NavGroup`, `Permission` |
| `hooks/use-nav-permissions.ts` | Hook de permissões (placeholder `*`) |
| `lib/navigation/filter-nav.ts` | Filtro por RBAC (pass-through por ora) |

### Grupos de módulos

| Grupo | Módulos |
|-------|---------|
| Principal | Dashboard |
| Cadastros | Empresas, Filiais, Clientes, Contratos |
| Operações | Veículos, Motoristas, Viagens |
| Financeiro | Fluxo de Caixa, Contas a Pagar, Contas a Receber |
| Manutenção | Pneus, Abastecimentos |
| Análise | Relatórios, BI, IA |
| Sistema | Configurações |

### Permissões (preparado)

Cada item possui `permission?: string`. Exemplo: `veiculos:read`.

O hook `useNavPermissions()` retorna `['*']` até RBAC ser implementado.

### Multi-Tenant (preparado)

- Rotas tenant: `ROUTES.tenantDashboard(slug)`
- Layout dedicado: `app/[tenant]/layout.tsx`
- Footer da sidebar exibe empresa ativa e plano

---

## Sidebar

### Localização

`components/layout/sidebar/`

| Componente | Função |
|------------|--------|
| `sidebar.tsx` | Container principal, responsivo |
| `sidebar-header.tsx` | Logo + botão recolher |
| `sidebar-nav.tsx` | Lista de grupos |
| `sidebar-nav-item.tsx` | Item com submenu e estado ativo |
| `sidebar-footer.tsx` | Empresa, plano, usuário, versão |

### Funcionalidades

| Feature | Implementação |
|---------|---------------|
| Responsiva | Drawer overlay em mobile (`< 768px`) |
| Recolhível | Toggle desktop, persistência em `localStorage` |
| Submenu | Financeiro e Manutenção com children |
| Estado ativo | `isNavItemActive()` baseado em `pathname` |
| Permissões | Filtragem via `hasPermission()` |
| Persistência | Chave `fleetcontrol-sidebar-collapsed` |

### Context

```tsx
import { useSidebar } from '@/contexts/shell/use-sidebar';

const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebar();
```

---

## Header

### Localização

`components/layout/header/`

| Componente | Função |
|------------|--------|
| `app-header.tsx` | Composição do header global |
| `header-logo.tsx` | Logo FleetControl |
| `header-search.tsx` | Pesquisa global (placeholder) |
| `header-theme-toggle.tsx` | Alternância dark/light |
| `header-notifications.tsx` | Central de notificações (placeholder) |
| `header-user-menu.tsx` | Avatar + menu dropdown (placeholder) |

### Elementos

- Logo (mobile)
- Breadcrumb (desktop)
- Pesquisa global (desabilitada — placeholder)
- Botão "Nova Ação" (placeholder)
- Toggle de tema
- Notificações (placeholder)
- Menu do usuário (placeholder)

---

## Breadcrumb

### Localização

- Componente: `components/layout/breadcrumb/breadcrumb.tsx`
- Lógica: `lib/navigation/breadcrumb.ts`

### Comportamento

- Geração automática a partir de `usePathname()`
- Suporte a rotas dinâmicas (`[tenant]`)
- Labels customizados via mapa de segmentos
- Fallback: formata segmento kebab-case

```tsx
// /financeiro/contas-a-pagar
// FleetControl > Financeiro > Contas a Pagar
```

---

## Page Layout

### Hierarquia de componentes

```
DashboardLayout
└── AppShell
    └── MainContent
        └── ScrollableArea
            └── ContentContainer
                ├── PageHeader
                ├── ActionBar
                └── Section
                    └── PageContainer (opcional, max-width)
```

| Componente | Propósito |
|------------|-----------|
| `AppShell` | Casca completa (sidebar + header + main) |
| `DashboardLayout` | Layout padrão autenticado |
| `MainContent` | `<main>` flexível |
| `ScrollableArea` | Área com scroll vertical |
| `ContentContainer` | Padding e gap padrão (`p-6 gap-6`) |
| `Section` | Seção com título/descrição opcionais |
| `PageHeader` | Cabeçalho de página (título + ações) |
| `ActionBar` | Barra de ações/filtros |
| `PageContainer` | Container com max-width |

### Exemplo de página futura

```tsx
// app/(dashboard)/veiculos/page.tsx (futuro)
import {
  ContentContainer,
  PageHeader,
  ActionBar,
  Section,
} from '@/components/layout';

export default function VeiculosPage() {
  return (
    <ContentContainer>
      <PageHeader
        title="Veículos"
        description="Gestão da frota de veículos"
        actions={<Button>Novo Veículo</Button>}
      />
      <ActionBar leading={<SearchInput />} />
      <Section title="Lista de Veículos">
        {/* conteúdo da feature */}
      </Section>
    </ContentContainer>
  );
}
```

---

## Layouts por Contexto

| Route Group | Layout | Arquivo |
|-------------|--------|---------|
| `(dashboard)` | `DashboardLayout` | `app/(dashboard)/layout.tsx` |
| `(auth)` | `AuthLayout` | `app/(auth)/layout.tsx` |
| `(marketing)` | `MarketingLayout` | `app/(marketing)/layout.tsx` |
| `[tenant]` | `TenantLayout` | `app/[tenant]/layout.tsx` |

Todos são **placeholders sem conteúdo** — apenas estrutura.

---

## Loading Global

### Componentes

| Componente | Uso |
|------------|-----|
| `TopProgress` | Barra de progresso fixa no topo |
| `PageLoader` | Loader de página inteira |
| `PageSkeleton` | Skeleton de layout de página |
| `Skeleton` | Placeholder genérico (ui/) |

### Context

```tsx
import { useLoading } from '@/contexts/loading/use-loading';

const { startLoading, stopLoading, setProgress } = useLoading();
```

Provider registrado em `providers/index.tsx`.

---

## Error Boundary

### Componentes

| Componente | Função |
|------------|--------|
| `ErrorBoundary` | Class component React |
| `ErrorFallback` | UI amigável com botão retry |

### Logging

`lib/logging/error-logger.ts` — preparado para Sentry/Datadog.

Em desenvolvimento, erros são logados no console.

### Uso

Error boundary global em `AppProviders`. Para boundaries locais:

```tsx
import { ErrorBoundary } from '@/components/feedback';

<ErrorBoundary>
  <ComponenteRisco />
</ErrorBoundary>
```

---

## Como Usar

### Nova página no dashboard

1. Criar rota em `constants/routes/paths.ts`
2. Adicionar item em `config/navigation/modules.ts`
3. Criar página em `app/(dashboard)/{modulo}/page.tsx`
4. Usar `ContentContainer` + `PageHeader` + conteúdo da feature

### Nunca fazer

- Strings de rota espalhadas no código
- Sidebar/header dentro de features
- Lógica de negócio nos componentes de layout
- Duplicar estrutura de shell em páginas individuais

---

## Referências

- Design System: `docs/design-system.md`
- Rotas: `constants/routes/paths.ts`
- Navegação: `config/navigation/modules.ts`
- Shell placeholder: `constants/app/shell.ts`
