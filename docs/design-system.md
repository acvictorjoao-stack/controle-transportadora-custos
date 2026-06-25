# FleetControl — Design System

Documentação oficial da infraestrutura visual do FleetControl.

> Visual moderno inspirado em Stripe, Linear, Vercel e Notion.  
> Evita aparência de ERP legado — prioriza clareza, espaçamento generoso e tipografia refinada.

---

## Índice

1. [Identidade Visual](#identidade-visual)
2. [Tipografia](#tipografia)
3. [Cores](#cores)
4. [Design Tokens](#design-tokens)
5. [Tema (Dark / Light)](#tema-dark--light)
6. [Componentes](#componentes)
7. [Estrutura de Pastas](#estrutura-de-pastas)
8. [Shadcn UI](#shadcn-ui)
9. [Boas Práticas](#boas-práticas)

---

## Identidade Visual

| Atributo | Valor |
|----------|-------|
| Nome | FleetControl |
| Tagline | Controle total da sua frota |
| Estilo | SaaS enterprise, minimalista, preciso |
| Cor primária | Indigo (`#4F46E5` light / `#818CF8` dark) |
| Superfícies | Zinc neutro com bordas sutis |
| Sombras | Leves — `shadow-card` como padrão |

### Princípios

- **Clareza** — hierarquia visual óbvia, sem ruído
- **Precisão** — números financeiros em JetBrains Mono com `tabular-nums`
- **Consistência** — tokens centralizados, nunca valores hardcoded
- **Escalabilidade** — componentes genéricos em `components/`, lógica de negócio em `features/`

---

## Tipografia

### Fontes

| Uso | Fonte | Variável CSS | Classe |
|-----|-------|--------------|--------|
| Texto geral | Inter | `--font-inter` | `font-sans` |
| Valores financeiros / numéricos | JetBrains Mono | `--font-jetbrains-mono` | `font-financial` ou `data-financial="true"` |

### Configuração

Fontes carregadas via `next/font/google` em `config/site/fonts.ts`.

### Escala tipográfica

| Token | Tamanho | Line Height |
|-------|---------|-------------|
| `xs` | 0.75rem | 1rem |
| `sm` | 0.875rem | 1.25rem |
| `base` | 1rem | 1.5rem |
| `lg` | 1.125rem | 1.75rem |
| `xl` | 1.25rem | 1.75rem |
| `2xl` | 1.5rem | 2rem |
| `3xl` | 1.875rem | 2.25rem |

### Uso de valores financeiros

```tsx
<span className="font-financial" data-financial="true">
  R$ 12.450,00
</span>
```

Componentes `MetricCard` e `StatCard` aplicam automaticamente a tipografia financeira no valor.

---

## Cores

### Paleta semântica (Light Mode)

| Token | Valor | Uso |
|-------|-------|-----|
| `background` | `#FAFAFA` | Fundo da aplicação |
| `foreground` | `#09090B` | Texto principal |
| `card` | `#FFFFFF` | Superfícies elevadas |
| `primary` | `#4F46E5` | Ações principais, links |
| `secondary` | `#F4F4F5` | Ações secundárias |
| `muted` | `#F4F4F5` | Fundos sutis |
| `muted-foreground` | `#71717A` | Texto secundário |
| `border` | `#E4E4E7` | Bordas e divisores |
| `destructive` | `#DC2626` | Erros, exclusões |
| `success` | `#16A34A` | Confirmações, tendências positivas |
| `warning` | `#D97706` | Alertas de atenção |
| `info` | `#2563EB` | Informações neutras |

### Dark Mode

| Token | Valor |
|-------|-------|
| `background` | `#09090B` |
| `foreground` | `#FAFAFA` |
| `card` | `#18181B` |
| `primary` | `#818CF8` |
| `border` | `#27272A` |

### Uso no Tailwind

```tsx
<div className="bg-background text-foreground border-border" />
<button className="bg-primary text-primary-foreground" />
<p className="text-muted-foreground" />
```

Tokens definidos em `app/globals.css` e espelhados em `config/design-tokens/colors.ts`.

---

## Design Tokens

Localização: `config/design-tokens/`

| Arquivo | Conteúdo |
|---------|----------|
| `colors.ts` | Paleta light/dark completa |
| `typography.ts` | Famílias, tamanhos, pesos |
| `spacing.ts` | Escala de espaçamento (múltiplos de 4px) |
| `radius.ts` | Border radius (`sm` → `full`) |
| `shadows.ts` | Sombras (`xs` → `xl`, `card`, `focus`) |
| `z-index.ts` | Camadas (`dropdown` → `toast`) |
| `breakpoints.ts` | Breakpoints responsivos |
| `animations.ts` | Durações, easing, keyframes |

### Espaçamentos de layout

| Token | Valor | Uso |
|-------|-------|-----|
| `pageX` | 1.5rem | Padding horizontal de página |
| `pageY` | 2rem | Padding vertical de página |
| `sectionGap` | 2rem | Gap entre seções |
| `cardPadding` | 1.5rem | Padding interno de cards |

### Radius padrão

`--radius: 0.5rem` (`radius-lg`) — estilo Vercel/Linear.

### Z-Index

```
dropdown: 1000 → sticky: 1100 → banner: 1200 → overlay: 1300
modal: 1400 → popover: 1500 → tooltip: 1600 → toast: 1700
```

---

## Tema (Dark / Light)

### Arquitetura

```
providers/theme-script.tsx   → Anti-flash no carregamento
providers/theme-provider.tsx → Re-export do provider
contexts/theme/theme-context.tsx → Lógica de tema + persistência
contexts/theme/use-theme.ts  → Hook useTheme()
constants/app/theme.ts       → THEME_STORAGE_KEY, THEMES
```

### Modos suportados

| Modo | Comportamento |
|------|---------------|
| `light` | Tema claro fixo |
| `dark` | Tema escuro fixo |
| `system` | Segue preferência do SO (padrão) |

### Persistência

Chave localStorage: `fleetcontrol-theme`

### Uso

```tsx
'use client';
import { useTheme } from '@/contexts/theme/use-theme';

function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>{resolvedTheme}</button>;
}
```

---

## Componentes

### `components/ui/` — Primitivos (Design System)

| Componente | Descrição |
|------------|-----------|
| `Button` | Botão com variantes: default, destructive, outline, secondary, ghost, link, success |
| `Input` | Campo de texto com estados de foco e erro |
| `Textarea` | Área de texto multilinha |
| `Card` | Superfície com Header, Title, Description, Content, Footer |
| `Badge` | Etiqueta de status com variantes semânticas |
| `Alert` | Mensagem de feedback com ícone |
| `Skeleton` | Placeholder de carregamento |

### `components/layout/` — Estrutura de página

| Componente | Descrição |
|------------|-----------|
| `PageContainer` | Container responsivo com max-width configurável |
| `PageTitle` | Título de página com descrição, badge e ações |
| `SectionHeader` | Cabeçalho de seção com ação opcional |

### `components/common/` — Compartilhados cross-feature

| Componente | Descrição |
|------------|-----------|
| `EmptyState` | Estado vazio com ícone, texto e CTA |

### `components/forms/` — Formulários

| Componente | Descrição |
|------------|-----------|
| `SearchInput` | Input de busca com ícone e botão limpar |

### `components/data-display/` — Dados e métricas

| Componente | Descrição |
|------------|-----------|
| `MetricCard` | KPI com valor financeiro, trend e ícone |
| `StatCard` | Estatística compacta com footer opcional |
| `TableContainer` | Wrapper de tabela com toolbar |
| `DataTable` | Tabela genérica tipada com loading e empty state |

### `components/feedback/` — Feedback visual

| Componente | Descrição |
|------------|-----------|
| `Loading` | Spinner inline com label |
| `PageLoader` | Loader de página inteira |

### Importação

```tsx
// Primitivos
import { Button, Card, Input } from '@/components/ui';

// Layout
import { PageContainer, PageTitle } from '@/components/layout';

// Data display
import { MetricCard, DataTable } from '@/components/data-display';
```

---

## Estrutura de Pastas

```
components/
├── ui/              → Primitivos sem regra de negócio
├── layout/          → Estrutura de página
├── common/          → Compartilhados entre features
├── forms/           → Inputs compostos
├── data-display/    → Tabelas, métricas, cards de dados
└── feedback/        → Loading, toasts (futuro)

config/
├── design-tokens/   → Tokens TypeScript
└── site/            → Fontes, branding

contexts/theme/      → Context API do tema
providers/           → Composição de providers
constants/app/       → Constantes da aplicação
types/global/        → Tipos globais (Theme, etc.)
```

### Regra de dependência

```
features/ → components/ → lib/
features/ NUNCA importa de outra feature diretamente
components/ NUNCA importa de features/
```

---

## Shadcn UI

### Configuração

Arquivo `components.json` na raiz do projeto:

- **Style:** new-york
- **Base color:** zinc
- **CSS variables:** habilitado
- **Icon library:** lucide-react
- **Aliases:** `@/components`, `@/lib/utils`

### Adicionar componentes

Quando dependências Radix forem instaladas:

```bash
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
```

Componentes base já implementados manualmente seguindo o padrão Shadcn (CVA + `cn()` + `data-slot`).

---

## Boas Práticas

### Faça

- Use tokens semânticos: `bg-primary`, `text-muted-foreground`
- Use `font-financial` para valores monetários e numéricos tabulares
- Use `PageContainer` + `PageTitle` em todas as páginas futuras
- Use `DataTable` genérico — defina colunas na feature, não no componente
- Use `cn()` de `@/lib/utils` para merge de classes
- Mantenha componentes de negócio em `features/*/components/`

### Não faça

- Não use cores hardcoded (`text-gray-500`, `bg-blue-600`)
- Não coloque lógica de negócio em `components/ui/`
- Não crie páginas dentro de `components/`
- Não duplique tokens — sempre referencie `config/design-tokens/`
- Não importe features dentro de componentes genéricos

### Padrão de variantes (CVA)

```tsx
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const variants = cva('base-classes', {
  variants: { variant: { default: '...' } },
  defaultVariants: { variant: 'default' },
});
```

### Acessibilidade

- Botões desabilitados durante loading
- `role="alert"` em Alert
- `role="status"` em Loading e PageLoader
- `aria-label` em botões de ícone
- Contraste WCAG AA em ambos os temas

---

## Referências

- Tokens TS: `config/design-tokens/index.ts`
- Tokens CSS: `app/globals.css`
- Fontes: `config/site/fonts.ts`
- Tema: `contexts/theme/theme-context.tsx`
- Utilitário `cn()`: `lib/utils.ts`
