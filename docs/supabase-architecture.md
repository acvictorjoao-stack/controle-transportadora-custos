# FleetControl — Arquitetura Supabase

Documentação da infraestrutura Supabase do FleetControl (Sprint 4).

> Esta sprint prepara apenas a base de integração. Não há autenticação, tabelas, RLS, Storage, Realtime ou Edge Functions implementados.

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Variáveis de Ambiente](#variáveis-de-ambiente)
4. [Cliente Browser](#cliente-browser)
5. [Cliente Server](#cliente-server)
6. [Middleware](#middleware)
7. [Utilitários](#utilitários)
8. [Health Check](#health-check)
9. [Fluxo de Utilização](#fluxo-de-utilização)
10. [Boas Práticas](#boas-práticas)
11. [Convenções Adotadas](#convenções-adotadas)

---

## Visão Geral

O FleetControl utiliza o padrão oficial **Next.js App Router + Supabase SSR** com o pacote `@supabase/ssr`. A integração segue três contextos de execução distintos, cada um com seu próprio cliente:

| Contexto | Onde roda | Cliente |
|----------|-----------|---------|
| Browser | Client Components | `supabase/client/browser.ts` |
| Server | RSC, Server Actions, Route Handlers | `supabase/server/server.ts` |
| Middleware | `middleware.ts` (raiz) | `supabase/middleware/session.ts` |

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App                          │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │   Browser    │  │    Server    │  │    Middleware    │ │
│  │   Client     │  │    Client    │  │  updateSession   │ │
│  │ (singleton)  │  │ (por request)│  │  (por request)   │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘ │
│         │                 │                    │           │
│         └─────────────────┼────────────────────┘           │
│                           ▼                                 │
│                  ┌─────────────────┐                        │
│                  │  Supabase Cloud │                        │
│                  └─────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquitetura

### Estrutura de pastas

```
supabase/
├── client/          # Cliente para Client Components (browser)
├── server/          # Cliente para Server Components, Actions e Route Handlers
├── middleware/      # Lógica de sessão no middleware
├── types/           # Tipos do banco (placeholder — gerados nas próximas sprints)
└── utils/           # Env, config, erros e factory de clientes

middleware.ts        # Entry point do Next.js — delega para supabase/middleware
instrumentation.ts   # Validação de env na inicialização do servidor
app/api/health/supabase/route.ts  # Health check de conectividade
```

### Pacotes utilizados

- `@supabase/supabase-js` — SDK principal
- `@supabase/ssr` — adaptação SSR com cookies para Next.js

> **Não utilizar** `@supabase/auth-helpers-nextjs` (legado, incompatível com App Router).

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Chave pública anônima |

### Validação

A aplicação **não inicia** sem essas variáveis. A validação ocorre em dois pontos:

1. **`next.config.ts`** — falha no build/dev se ausentes
2. **`instrumentation.ts`** — falha na inicialização do servidor Node.js

Arquivo de referência: `supabase/utils/env.ts`

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sua-chave-anon"
```

---

## Cliente Browser

**Arquivo:** `supabase/client/browser.ts`

Utilizado exclusivamente em **Client Components** (`'use client'`).

```typescript
import { createClient } from '@/supabase/client';

export function MeuComponente() {
  const supabase = createClient();
  // ...
}
```

- Usa `createBrowserClient` do `@supabase/ssr`
- Singleton interno — múltiplas chamadas retornam a mesma instância
- Tipado com `Database` (placeholder em `supabase/types/`)

---

## Cliente Server

**Arquivo:** `supabase/server/server.ts`

Utilizado em **Server Components**, **Server Actions** e **Route Handlers**.

```typescript
import { createClient } from '@/supabase/server';

export default async function MinhaPage() {
  const supabase = await createClient();
  // ...
}
```

- Usa `createServerClient` com cookies do Next.js (`next/headers`)
- Nova instância por request (cookies do request atual)
- `setAll` em try/catch — Server Components não podem escrever cookies; o middleware cuida do refresh

---

## Middleware

**Arquivos:** `middleware.ts` (raiz) + `supabase/middleware/session.ts`

Responsabilidades atuais (Sprint 4):

- Leitura de sessão via cookies
- Refresh automático de tokens via `supabase.auth.getClaims()`
- Sincronização de cookies entre browser e servidor

**Não implementado nesta sprint:**

- Proteção de rotas
- Redirecionamento para login
- Verificação de permissões

### Padrão de cookies

O `@supabase/ssr` exige **apenas** `getAll` e `setAll`. Nunca usar `get`, `set` ou `remove` individuais.

O `setAll` no middleware recria `NextResponse.next({ request })` e aplica headers de cache para evitar vazamento de sessão em CDNs.

---

## Utilitários

| Arquivo | Responsabilidade |
|---------|------------------|
| `utils/env.ts` | Validação de variáveis de ambiente |
| `utils/config.ts` | URL, chave e endpoints centralizados |
| `utils/errors.ts` | Classes e helpers de erro padronizados |
| `utils/get-client.ts` | Re-exports nomeados por contexto |
| `utils/index.ts` | Barrel export |

### Obtenção do cliente correto

```typescript
// Client Components
import { getBrowserSupabaseClient } from '@/supabase/utils';

// Server (RSC, Actions, Route Handlers)
import { getServerSupabaseClient } from '@/supabase/utils';

// Ou imports diretos (preferido para clareza)
import { createClient } from '@/supabase/client';
import { createClient } from '@/supabase/server';
```

---

## Health Check

**Rota:** `GET /api/health/supabase`

Verifica conectividade com o projeto Supabase via endpoint público do Auth (`/auth/v1/health`).

- Não acessa tabelas
- Não depende de autenticação
- Timeout de 10 segundos

### Respostas

| Status HTTP | Body | Significado |
|-------------|------|-------------|
| 200 | `{ "status": "conectado" }` | Supabase acessível |
| 503 | `{ "status": "indisponível" }` | Supabase inacessível |
| 500 | `{ "status": "indisponível", "message": "..." }` | Erro de configuração (env ausente) |

Preparado para integração futura com monitoramento (uptime, alertas).

---

## Fluxo de Utilização

### 1. Client Component interativo

```
Usuário → Client Component → createClient() (browser) → Supabase API
```

### 2. Server Component com dados

```
Request → Server Component → await createClient() (server) → Supabase API
         ↑ cookies lidos do request
```

### 3. Cada request HTTP

```
Request → middleware.ts → updateSession() → getClaims() (refresh)
       → response com cookies atualizados → página/API
```

### 4. Monitoramento

```
Monitor → GET /api/health/supabase → fetch /auth/v1/health → status
```

---

## Boas Práticas

1. **Nunca misture clientes** — browser em Client Components, server em código server-only
2. **Nunca use `getSession()` no servidor** para autorização — use `getClaims()` ou `getUser()` (sprints futuras)
3. **Nunca importe o cliente server em Client Components** — vaza credenciais e quebra SSR
4. **Centralize configuração** — use `supabaseConfig` em vez de `process.env` direto
5. **Trate erros com helpers** — `formatSupabaseError()` e `getSupabaseErrorCode()`
6. **Tipos do banco** — quando migrations existirem, gere com `supabase gen types typescript` em `supabase/types/database.ts`

---

## Convenções Adotadas

| Convenção | Detalhe |
|-----------|---------|
| Pasta `supabase/` na raiz | Separada de `lib/` — domínio de infraestrutura backend |
| `createClient()` em client e server | Nome idêntico, imports diferentes por pasta |
| Chave `ANON_KEY` | Nome legado mantido (equivalente a `PUBLISHABLE_KEY` na doc oficial) |
| Middleware na raiz | Requisito do Next.js — lógica em `supabase/middleware/` |
| Health check em `/api/health/supabase` | Namespaceado para futuros checks (db, storage, etc.) |
| Documentação em português | Consistente com demais docs do FleetControl |
| Sem lógica de negócio | Sprint 4 = infraestrutura pura |

---

## Próximas Sprints (referência)

- Autenticação e proteção de rotas no middleware
- Migrations e tipos gerados
- Políticas RLS
- Módulos de negócio (veículos, viagens, financeiro, etc.)
