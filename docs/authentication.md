# FleetControl — Autenticação

Documentação da infraestrutura de autenticação (Sprint 10 — Portal Master).

> Integração com Supabase Auth sobre a base SSR da Sprint 4. Nesta sprint não há cadastro de empresas, CRUDs ou RBAC completo.

---

## Visão Geral

| Aspecto | Decisão |
|---------|---------|
| Provedor | Supabase Auth (GoTrue) |
| Método | E-mail e senha |
| Sessão | Cookies HTTP via `@supabase/ssr` |
| Refresh | Middleware + `onAuthStateChange` no cliente |
| Cadastro público | **Não implementado** |

---

## Fluxo de Login

```
Usuário → /login
    ↓
LoginForm (Client Component)
    ↓
useAuth().signIn({ email, password })
    ↓
supabase.auth.signInWithPassword()  [supabase/auth/client.ts]
    ↓
Cookies de sessão gravados pelo @supabase/ssr
    ↓
onAuthStateChange atualiza AuthContext
    ↓
redirect → returnTo ou /
```

### Componentes envolvidos

| Arquivo | Responsabilidade |
|---------|------------------|
| `app/(auth)/login/page.tsx` | Página de login |
| `components/auth/login-form.tsx` | Formulário com validação e erros |
| `components/auth/auth-card.tsx` | Card do Design System |
| `contexts/auth/auth-context.tsx` | Estado global de sessão |
| `supabase/auth/client.ts` | `signInWithPassword` no browser |

### Erros tratados

Mapeados em `lib/auth/auth-errors.ts`:

- E-mail ou senha inválidos
- Usuário inexistente
- Sessão expirada
- Erro de rede
- Erros genéricos do Supabase

Erros são logados via `logAuthError()` (integração com `ErrorBoundary` / `logError`).

---

## Fluxo de Logout

```
HeaderUserMenu → useAuth().signOut()
    ↓
supabase.auth.signOut()
    ↓
AuthContext limpa user/session
    ↓
router.push('/login') + router.refresh()
```

Alternativa server-side: `signOutAction()` em `supabase/auth/actions.ts`.

---

## Recuperação de Sessão

### No carregamento da página

1. `AuthProvider` chama `getClientSession()` ao montar.
2. Sessão é restaurada dos cookies (persistência entre recarregamentos).
3. `isLoading` controla estados de skeleton no Header.

### Refresh automático

| Camada | Mecanismo |
|--------|-----------|
| Middleware | `supabase.auth.getUser()` em toda requisição |
| Cliente | `onAuthStateChange` escuta `TOKEN_REFRESHED`, `SIGNED_IN`, `SIGNED_OUT` |

O middleware renova tokens expirados e sincroniza cookies antes da resposta.

---

## Middleware

**Arquivo:** `middleware.ts` → `supabase/middleware/session.ts`

### Regras

| Situação | Ação |
|----------|------|
| Visitante acessa rota protegida | `redirect('/login?returnTo=...')` |
| Autenticado acessa `/login` ou `/recuperar-senha` | `redirect('/')` ou `returnTo` seguro |
| Rotas públicas (`/api/health/*`) | Sem bloqueio |

### Rotas protegidas

Todas as rotas do Application Shell (`(dashboard)`): `/`, `/empresas`, `/financeiro`, etc.

Definidas por exclusão em `lib/auth/redirect.ts` (`isProtectedRoute`).

---

## Providers

```
AppProviders (providers/index.tsx)
├── ThemeProvider
├── LoadingProvider
├── AppAuthProvider          ← Sprint 10
│   └── AuthProvider         ← contexts/auth/auth-context.tsx
└── ErrorBoundary
```

### Hooks disponíveis

| Hook | Arquivo | Retorna |
|------|---------|---------|
| `useAuth()` | `contexts/auth/use-auth.ts` | user, session, signIn, signOut, isLoading |
| `useUser()` | `hooks/use-user.ts` | user, isLoading, isAuthenticated |
| `useSession()` | `hooks/use-session.ts` | session, refreshSession |

---

## Helpers Supabase

Reutilizam os clientes da Sprint 4 (`supabase/client`, `supabase/server`).

| Contexto | Arquivo | Funções principais |
|----------|---------|-------------------|
| Client Components | `supabase/auth/client.ts` | `signInWithPassword`, `signOutClient`, `getClientSession` |
| Server Components | `supabase/auth/server.ts` | `getServerUser`, `getServerSession` |
| Server Actions | `supabase/auth/actions.ts` | `signInAction`, `signOutAction` |
| Route Handlers | `supabase/auth/route-handler.ts` | `createRouteHandlerClient`, `getRouteHandlerUser` |

Barrel: `supabase/auth/index.ts`

---

## Guards

**Arquivo:** `lib/auth/guards.ts`

| Função | Uso |
|--------|-----|
| `requireAuth()` | Server Component / Action — redireciona se sem sessão |
| `redirectIfAuthenticated()` | Páginas de auth — redireciona se já logado |
| `assertAuthenticated()` | Lança `AuthError` para ErrorBoundary |
| `getAuthUser()` | Retorna usuário ou `null` no servidor |

### Protected Routes (cliente)

`components/auth/protected-route.tsx` — redireciona visitantes para login com `returnTo`.

---

## Portal Master — Placeholders

**Arquivo:** `lib/auth/permissions.ts`

Papéis preparados (sem regras de negócio):

| Constante | Label |
|-----------|-------|
| `OWNER` | Proprietário |
| `ADMIN` | Administrador |
| `MANAGER` | Gestor |
| `OPERATOR` | Operador |

`hasPortalPermission()` retorna `true` até RBAC ser implementado.

---

## Estrutura de Arquivos

```
contexts/auth/
├── auth-context.tsx
└── use-auth.ts

providers/
└── auth-provider.tsx

hooks/
├── use-user.ts
└── use-session.ts

lib/auth/
├── auth-errors.ts
├── guards.ts
├── permissions.ts
└── redirect.ts

supabase/auth/
├── client.ts
├── server.ts
├── actions.ts
├── route-handler.ts
└── index.ts

components/auth/
├── login-form.tsx
├── auth-card.tsx
├── auth-logo.tsx
└── protected-route.tsx

app/(auth)/login/page.tsx
```

---

## Próximas Sprints

- Página de recuperação de senha (`/recuperar-senha`)
- RBAC com papéis reais do banco (`roles`, `permissions`)
- Onboarding de empresa (Sprint Organização)
- Portal Master completo
