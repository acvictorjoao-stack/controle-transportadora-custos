# FleetControl — Modelo de Domínio

Documentação da arquitetura de domínio do FleetControl (Sprint 6).

> **ERP Financeiro para Transportadoras** — SaaS multi-tenant projetado para centenas de empresas com isolamento lógico, RBAC granular e rastreabilidade financeira ponta a ponta.

> Esta sprint projeta **apenas o domínio**. Não há SQL, migrations, tabelas, código, APIs ou telas.

---

## Índice

1. [Visão Estratégica](#visão-estratégica)
2. [Princípios de Modelagem](#princípios-de-modelagem)
3. [Multi-Tenancy](#multi-tenancy)
4. [Bounded Contexts](#bounded-contexts)
5. [Catálogo de Entidades](#catálogo-de-entidades)
   - [Organização](#organização)
   - [Cadastros](#cadastros)
   - [Operação](#operação)
   - [Financeiro](#financeiro)
   - [Custos Operacionais](#custos-operacionais)
   - [RH](#rh)
   - [Inteligência](#inteligência)
6. [Diagrama de Relacionamentos](#diagrama-de-relacionamentos)
7. [Context Map](#context-map)
8. [Ordem de Implementação](#ordem-de-implementação)
9. [Glossário](#glossário)
10. [Decisões Arquiteturais](#decisões-arquiteturais)

---

## Visão Estratégica

O FleetControl unifica três pilares:

| Pilar | Responsabilidade |
|-------|------------------|
| **Operação** | Viagens, rotas, entregas, coletas, CT-e, ordens de serviço |
| **Financeiro** | Receitas, despesas, fluxo de caixa, contas a pagar/receber, conciliação |
| **Frota & Custos** | Veículos, manutenções, abastecimentos, pneus, impostos, multas |

Cada transação operacional deve ser **rastreável financeiramente** até o centro de custo, veículo, motorista, cliente e contrato de origem.

```
┌─────────────────────────────────────────────────────────────────┐
│                        FleetControl SaaS                        │
│  ┌──────────┐  ┌────────────┐  ┌───────────┐  ┌─────────────┐ │
│  │  Tenant  │  │  Identity  │  │  Billing  │  │  Analytics  │ │
│  │ (Empresa)│  │ (RBAC)     │  │ (Planos)  │  │ (KPIs/IA)   │ │
│  └────┬─────┘  └─────┬──────┘  └─────┬─────┘  └──────┬──────┘ │
│       │              │               │                │       │
│  ┌────┴──────────────┴───────────────┴────────────────┴─────┐  │
│  │                    Core de Negócio                       │  │
│  │  Fleet ── Operations ── Financial ── Maintenance ── HR  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Princípios de Modelagem

1. **Tenant-first** — Toda entidade de negócio pertence a uma `Empresa` (tenant). Isolamento é requisito não negociável.
2. **Filial como escopo operacional** — Operações, financeiro e frota são filtráveis por `Filial`.
3. **Agregados com raiz clara** — Cada bounded context define aggregate roots e invariantes.
4. **Eventos de domínio** — Mudanças relevantes publicam eventos consumidos por Analytics, Notification e Financial.
5. **Auditoria transversal** — Toda mutação relevante gera registro em `Auditoria` / `Evento`.
6. **Soft delete com histórico** — Cadastros críticos não são excluídos fisicamente; usam inativação.
7. **Documentos polimórficos** — `Documento` referencia qualquer entidade via tipo + id (veículo, motorista, contrato, etc.).
8. **Motorista como entidade compartilhada** — Cadastro em Fleet; compensação em HR (Shared Kernel controlado).

---

## Multi-Tenancy

### Estratégia

| Aspecto | Decisão |
|---------|---------|
| Modelo | **Shared Database, Shared Schema** com coluna `empresa_id` em todas as entidades de negócio |
| Isolamento | Row-Level Security (futuro) + validação em camada de aplicação |
| Escopo | `Empresa` → `Filial` → recursos |
| Usuário | Pode pertencer a múltiplas empresas com perfis distintos |
| Plano SaaS | Limita recursos (veículos, usuários, filiais, módulos habilitados) |

### Hierarquia de isolamento

```
PLATAFORMA (FleetControl)
 └── EMPRESA (Tenant)
      ├── PLANO_SAAS (assinatura, limites, módulos)
      ├── FILIAL (unidade operacional)
      │    ├── Operações, Frota, Financeiro local
      │    └── Centros de Custo
      └── USUÁRIO (membro da empresa, com Perfil + Permissões)
```

---

## Bounded Contexts

| Context | Responsabilidade | Entidades principais |
|---------|------------------|----------------------|
| **Identity** | Autenticação, sessão, credenciais | Usuário (credenciais), Sessão |
| **Tenant** | Empresa, filial, plano, limites SaaS | Empresa, Filial, PlanoSaaS, Assinatura |
| **Access Control** | RBAC, perfis, permissões | Perfil, Permissão, UsuarioPerfil |
| **Billing** | Cobrança da plataforma, faturas SaaS | Assinatura, FaturaSaaS, LimitePlano |
| **Registry** | Cadastros mestres compartilhados | Cliente, Fornecedor, Seguradora, TipoVeiculo |
| **Fleet** | Ativos rodoviários e documentação | Veículo, Implemento, Reboque, Documento |
| **Commercial** | Relação comercial com clientes | Contrato, TabelaPreco (futuro) |
| **Operations** | Execução logística | Viagem, Rota, Coleta, Entrega, Conhecimento, OS, Ocorrência |
| **Financial** | Contabilidade gerencial e tesouraria | Receita, Despesa, ContaPagar, ContaReceber, Movimentação, Conciliação |
| **Cost Management** | Custos operacionais da frota | Abastecimento, Pneu, Manutenção, Multa, Pedágio, etc. |
| **HR** | Compensação de motoristas | Salário, Diária, Comissão, Adiantamento, Desconto |
| **Analytics** | KPIs, indicadores, dashboards | KPI, Indicador, Alerta |
| **Audit** | Rastreabilidade e conformidade | Auditoria, Log, Evento |
| **AI** | Insights e assistente inteligente | ConsultaIA, Insight, Recomendação |
| **Notification** | Alertas e comunicações | Notificação, CanalNotificação |

### Context Map (integrações)

```
                    ┌─────────────┐
                    │   Billing   │◄──── Tenant
                    └──────┬──────┘
                           │ conformist
┌──────────┐         ┌─────┴─────┐         ┌──────────────┐
│ Identity │◄───────►│  Tenant   │────────►│Access Control│
└────┬─────┘  ACL    └─────┬─────┘  ACL    └──────┬───────┘
     │                     │                       │
     │              ┌──────┴──────┐                │
     │              │   Registry   │◄───────────────┘
     │              │  (Cadastros) │
     │              └──────┬──────┘
     │         ┌────────────┼────────────┐
     │         ▼            ▼            ▼
     │    ┌────────┐   ┌──────────┐  ┌────────┐
     │    │ Fleet  │   │Commercial│  │   HR   │
     │    └───┬────┘   └────┬─────┘  └───┬────┘
     │        │             │            │
     │        └──────┬──────┴────────────┘
     │               ▼
     │         ┌────────────┐
     │         │ Operations │──────► Financial
     │         └─────┬──────┘   events
     │               │
     │               ▼
     │      ┌─────────────────┐
     │      │ Cost Management │
     │      └────────┬────────┘
     │               │ events
     ▼               ▼
┌─────────┐    ┌───────────┐    ┌──────────────┐
│  Audit  │◄───│ Analytics │◄───│     AI       │
└─────────┘    └─────┬─────┘    └──────────────┘
                     │
                     ▼
              ┌──────────────┐
              │ Notification │
              └──────────────┘
```

**Padrões de integração:**
- **Operations → Financial**: eventos (`ViagemFinalizada`, `DespesaRegistrada`) geram lançamentos
- **Cost Management → Financial**: custos operacionais geram despesas e movimentações
- **HR → Financial**: folha, comissões e adiantamentos geram contas a pagar
- **Analytics**: consome eventos (read model / CQRS futuro)
- **Audit**: escuta todos os contextos (cross-cutting)

---

## Catálogo de Entidades

> Para cada entidade: **Objetivo**, **Responsabilidade**, **Dependências**, **Relacionamentos**, **Regras de negócio**.

---

### Organização

#### Empresa

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Representar o tenant — cada transportadora cliente do SaaS |
| **Responsabilidade** | Dados cadastrais, configurações globais, limites do plano, status da conta |
| **Quem depende** | Todas as entidades de negócio |
| **Relacionamentos** | 1:N Filiais, Usuários, Clientes, Veículos, Planos (via Assinatura) |
| **Regras** | CNPJ único na plataforma; inativação bloqueia acesso mas preserva dados; slug único para URL tenant |

#### Filial

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Unidade operacional dentro da empresa (matriz, filial, ponto de apoio) |
| **Responsabilidade** | Escopo de operações, financeiro e frota; endereço e dados fiscais locais |
| **Quem depende** | Viagens, Veículos, Contas, Centros de Custo, Movimentações |
| **Relacionamentos** | N:1 Empresa; 1:N Veículos, Viagens, Centros de Custo |
| **Regras** | Pelo menos uma filial ativa por empresa; código interno único por empresa; veículo pode ser alocado a filial |

#### Usuário

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Pessoa que acessa o sistema (identidade global na plataforma) |
| **Responsabilidade** | Credenciais, perfil pessoal, preferências, vínculos com empresas |
| **Quem depende** | Auditoria, Logs, Notificações, ações do sistema |
| **Relacionamentos** | N:N Empresas (via MembroEmpresa); N:N Perfis; 1:N Sessões |
| **Regras** | E-mail único na plataforma; pode pertencer a múltiplas empresas; status global independente do vínculo |

#### Perfil

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Agrupar permissões para um papel (ex: Gestor Financeiro, Operador) |
| **Responsabilidade** | Definir o que o usuário pode fazer dentro de uma empresa |
| **Quem depende** | Controle de acesso em todos os módulos |
| **Relacionamentos** | N:1 Empresa; N:N Permissões; N:N Usuários |
| **Regras** | Perfis são por empresa; perfil Admin é imutável e exclusivo; herança de permissões não permitida (explícito) |

#### Permissão

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Unidade atômica de autorização (RBAC) |
| **Responsabilidade** | Definir ação + recurso (ex: `viagens:write`, `financeiro:read`) |
| **Quem depende** | Perfis, middleware de autorização |
| **Relacionamentos** | N:N Perfis; catálogo global da plataforma |
| **Regras** | Permissões são definidas pela plataforma, não pelo tenant; formato `recurso:ação`; escopo pode incluir filial |

#### Plano SaaS

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Definir tier de assinatura da plataforma FleetControl |
| **Responsabilidade** | Limites (veículos, usuários, filiais), módulos habilitados, preço |
| **Quem depende** | Assinatura, validações de limite, Billing |
| **Relacionamentos** | 1:N Assinaturas; define módulos disponíveis |
| **Regras** | Planos são globais (plataforma); upgrade/downgrade com efeito no próximo ciclo; limites hard vs soft |

#### Assinatura

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Vínculo ativo entre Empresa e Plano SaaS |
| **Responsabilidade** | Ciclo de cobrança, status, trial, renovação |
| **Quem depende** | Billing, limites operacionais |
| **Relacionamentos** | N:1 Empresa; N:1 PlanoSaaS; 1:N FaturasSaaS |
| **Regras** | Uma assinatura ativa por empresa; trial expira automaticamente; inadimplência restringe funcionalidades |

---

### Cadastros

#### Cliente

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Empresa ou pessoa que contrata serviços de transporte |
| **Responsabilidade** | Dados comerciais, fiscal, contato, condições de pagamento padrão |
| **Quem depende** | Contratos, Viagens, Receitas, Contas a Receber |
| **Relacionamentos** | N:1 Empresa; 1:N Contratos, Viagens, Receitas |
| **Regras** | CPF/CNPJ único por empresa; inativação não cancela contratos ativos; crédito/limite configurável |

#### Contrato

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Acordo comercial formal com cliente |
| **Responsabilidade** | Vigência, tarifas, SLA, tipo de operação, regras de faturamento |
| **Quem depende** | Viagens, Receitas, Ordens de Serviço |
| **Relacionamentos** | N:1 Cliente, Empresa; 1:N Viagens, Receitas |
| **Regras** | Vigência com início/fim; renovação automática opcional; viagem deve referenciar contrato quando exigido; tarifa congelada ou indexada |

#### Motorista

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Profissional habilitado que conduz veículos da frota |
| **Responsabilidade** | Dados pessoais, CNH, categoria, validade, vínculo (próprio/terceiro/agregado) |
| **Quem depende** | Viagens, RH, Custos, Ocorrências, Multas |
| **Relacionamentos** | N:1 Empresa; 1:N Viagens, Salários, Comissões, Multas; N:N Veículos (habilitação) |
| **Regras** | CNH válida obrigatória para viagem; bloqueio automático se documento vencido; tipo de vínculo define regras de RH |

#### Veículo

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Ativo rodoviário principal da frota (cavalo, truck, van) |
| **Responsabilidade** | Placa, chassi, tipo, capacidade, status operacional, odômetro |
| **Quem depende** | Viagens, Custos Operacionais, Manutenções, Documentos |
| **Relacionamentos** | N:1 Empresa, Filial, TipoVeiculo; 1:N Abastecimentos, Manutenções, Pneus, Multas; N:N Reboques |
| **Regras** | Placa única por empresa; status: ativo, manutenção, inativo, vendido; odômetro monotônico; bloqueio se documentos vencidos |

#### Implemento

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Equipamento acoplável que não é reboque nem veículo (ex: carroceria, tanque) |
| **Responsabilidade** | Identificação, tipo, capacidade, compatibilidade |
| **Quem depende** | Composição de frota, Viagens |
| **Relacionamentos** | N:1 Empresa; N:1 Veículo (opcional); 1:N Documentos |
| **Regras** | Pode ser transferido entre veículos; manutenção independente |

#### Reboque

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Unidade rebocada (carreta, semirreboque, bitrem) |
| **Responsabilidade** | Placa, capacidade de carga, eixos, tipo |
| **Quem depende** | Composição veicular, Viagens, Custos |
| **Relacionamentos** | N:1 Empresa; acoplado a Veículo; 1:N Pneus, Documentos |
| **Regras** | Pode formar composição (cavalo + 1 ou 2 reboques); placa única por empresa |

#### Tipo de Veículo

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Classificação padronizada de veículos/implementos/reboques |
| **Responsabilidade** | Nome, categoria, capacidade padrão, ícone |
| **Quem depende** | Veículos, Reboques, Relatórios, KPIs |
| **Relacionamentos** | N:1 Empresa (ou global); 1:N Veículos |
| **Regras** | Tipos padrão da plataforma + customização por empresa; inativação não afeta histórico |

#### Documento

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Registro de documentação legal e operacional |
| **Responsabilidade** | Tipo, número, validade, arquivo, entidade vinculada |
| **Quem depende** | Compliance, Alertas, bloqueios operacionais |
| **Relacionamentos** | Polimórfico: Veículo, Motorista, Contrato, Empresa, Filial |
| **Regras** | Alerta antes do vencimento; bloqueio configurável; tipos: CRLV, CNH, ANTT, seguro, etc. |

#### Seguradora

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Empresa de seguros parceira |
| **Responsabilidade** | Dados cadastrais, contatos, apólices vinculadas |
| **Quem depende** | Seguros de veículos, Sinistros (futuro) |
| **Relacionamentos** | N:1 Empresa; 1:N Apólices/Seguros |
| **Regras** | CNPJ único por empresa; pode ser compartilhada entre filiais |

#### Fornecedor

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Prestador de serviços ou fornecedor de produtos |
| **Responsabilidade** | Dados comerciais, fiscal, condições de pagamento |
| **Quem depende** | Despesas, Contas a Pagar, Manutenções, Abastecimentos |
| **Relacionamentos** | N:1 Empresa; 1:N Despesas, ContasPagar, Manutenções |
| **Regras** | CPF/CNPJ único por empresa; categorização por tipo (oficina, posto, etc.) |

---

### Operação

#### Viagem

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Unidade central de operação logística — deslocamento com carga |
| **Responsabilidade** | Ciclo completo: planejamento → execução → encerramento → faturamento |
| **Quem depende** | Financeiro, Custos, RH, Analytics, CT-e |
| **Relacionamentos** | N:1 Empresa, Filial, Cliente, Contrato, Veículo, Motorista, Rota; 1:N Coletas, Entregas, Ocorrências, Conhecimentos, Custos |
| **Regras** | Status: rascunho → programada → em andamento → finalizada → faturada → cancelada; motorista e veículo obrigatórios; encerramento gera eventos financeiros |

#### Rota

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Trajeto planejado entre origem e destino |
| **Responsabilidade** | Pontos, distância estimada, tempo, pedágios estimados |
| **Quem depende** | Viagens, Custos (pedágio), KPIs |
| **Relacionamentos** | N:1 Empresa; 1:N Viagens; N:N Pontos de parada |
| **Regras** | Reutilizável entre viagens; pode ser template; distância atualizável com GPS (futuro) |

#### Conhecimento (CT-e)

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Documento fiscal de transporte de cargas |
| **Responsabilidade** | Numeração, status SEFAZ, XML, vinculação à viagem |
| **Quem depende** | Faturamento, Receitas, Compliance fiscal |
| **Relacionamentos** | N:1 Viagem, Empresa, Cliente; gera Receita |
| **Regras** | Numeração sequencial por série/filial; status: rascunho, autorizado, cancelado; obrigatório para faturamento fiscal |

#### Ordem de Serviço (OS)

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Demanda operacional formal do cliente |
| **Responsabilidade** | Solicitação, prioridade, prazo, tipo de serviço |
| **Quem depende** | Viagens, Contratos |
| **Relacionamentos** | N:1 Cliente, Contrato, Empresa; 1:N Viagens |
| **Regras** | Pode gerar uma ou mais viagens; SLA vinculado ao contrato; status: aberta, em execução, concluída, cancelada |

#### Ocorrência

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Evento não planejado durante operação |
| **Responsabilidade** | Tipo, descrição, gravidade, tratativa, evidências |
| **Quem depende** | Alertas, Analytics, possível impacto financeiro |
| **Relacionamentos** | N:1 Viagem, Motorista, Veículo; pode gerar Despesa |
| **Regras** | Tipos: avaria, atraso, acidente, roubo, etc.; pode bloquear encerramento da viagem; exige tratativa para alto impacto |

#### Entrega

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Ponto de descarga da carga na viagem |
| **Responsabilidade** | Endereço, destinatário, comprovante, data/hora |
| **Quem depende** | Viagem, SLA, faturamento parcial |
| **Relacionamentos** | N:1 Viagem; pode ter Documento (canhoto) |
| **Regras** | Ordem sequencial na viagem; comprovante obrigatório para encerramento; status: pendente, realizada, recusada |

#### Coleta

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Ponto de retirada da carga na viagem |
| **Responsabilidade** | Endereço, remetente, peso/volume, data/hora |
| **Quem depende** | Viagem, CT-e |
| **Relacionamentos** | N:1 Viagem; antecede Entrega(s) |
| **Regras** | Peso/volume informado alimenta CT-e; status: pendente, realizada, cancelada |

---

### Financeiro

#### Receita

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Entrada financeira reconhecida |
| **Responsabilidade** | Valor, competência, origem, status de recebimento |
| **Quem depende** | Fluxo de Caixa, Contas a Receber, KPIs |
| **Relacionamentos** | N:1 Empresa, Filial, Cliente, Contrato, Viagem, CategoriaFinanceira, CentroCusto |
| **Regras** | Origem rastreável (viagem, manual, contrato); competência vs caixa; status: prevista, confirmada, recebida, cancelada |

#### Despesa

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Saída financeira reconhecida |
| **Responsabilidade** | Valor, competência, origem, aprovação |
| **Quem depende** | Fluxo de Caixa, Contas a Pagar, KPIs |
| **Relacionamentos** | N:1 Empresa, Filial, Fornecedor, CategoriaFinanceira, CentroCusto, Veículo (opcional) |
| **Regras** | Pode originar de custo operacional automaticamente; aprovação por alçada; status: prevista, aprovada, paga, cancelada |

#### Fluxo de Caixa

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Visão consolidada de entradas e saídas por período |
| **Responsabilidade** | Projeção, realizado, saldo — **read model** agregado |
| **Quem depende** | Dashboard financeiro, decisões de tesouraria |
| **Relacionamentos** | Derivado de Receitas, Despesas, Movimentações |
| **Regras** | Não é entidade persistida primária — calculado; separação realizada vs prevista; recorte por filial e conta |

#### Conta a Pagar

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Obrigação financeira com vencimento |
| **Responsabilidade** | Valor, vencimento, parcelas, status de pagamento |
| **Quem depende** | Tesouraria, Fluxo de Caixa, Conciliação |
| **Relacionamentos** | N:1 Despesa, Fornecedor, Empresa; 1:N Pagamentos |
| **Regras** | Pode ser parcelada; juros/multa por atraso; status: aberta, parcial, paga, vencida, cancelada |

#### Conta a Receber

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Crédito a receber de cliente |
| **Responsabilidade** | Valor, vencimento, parcelas, status |
| **Quem depende** | Tesouraria, Fluxo de Caixa, inadimplência |
| **Relacionamentos** | N:1 Receita, Cliente, Empresa; 1:N Recebimentos |
| **Regras** | Gerada a partir de receita ou faturamento; aging automático; status: aberta, parcial, recebida, vencida, cancelada |

#### Categoria Financeira

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Classificação contábil gerencial de receitas e despesas |
| **Responsabilidade** | Hierarquia, tipo (receita/despesa), código |
| **Quem depende** | Receitas, Despesas, Relatórios, DRE |
| **Relacionamentos** | N:1 Empresa; estrutura hierárquica (pai/filho) |
| **Regras** | Árvore de categorias; não excluir com lançamentos; plano padrão + customização |

#### Centro de Custo

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Unidade de alocação de custos e receitas |
| **Responsabilidade** | Código, nome, filial, responsável |
| **Quem depende** | Receitas, Despesas, KPIs por unidade |
| **Relacionamentos** | N:1 Empresa, Filial; 1:N Lançamentos |
| **Regras** | Pode ser por filial, veículo, rota ou projeto; obrigatório em lançamentos acima de valor configurável |

#### Forma de Pagamento

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Método utilizado em transações financeiras |
| **Responsabilidade** | Nome, tipo (pix, boleto, cartão, dinheiro, transferência) |
| **Quem depende** | Pagamentos, Recebimentos, Movimentações |
| **Relacionamentos** | N:1 Empresa; usada em Movimentações |
| **Regras** | Catálogo padrão + customização; inativação preserva histórico |

#### Conta Bancária

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Conta de tesouraria da empresa |
| **Responsabilidade** | Banco, agência, número, saldo, filial |
| **Quem depende** | Movimentações, Conciliação, Fluxo de Caixa |
| **Relacionamentos** | N:1 Empresa, Filial; 1:N Movimentações |
| **Regras** | Saldo calculado (não editável diretamente); uma conta padrão por filial; multi-moeda (futuro) |

#### Movimentação

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Registro de entrada/saída em conta bancária |
| **Responsabilidade** | Valor, data, tipo, conta, forma de pagamento |
| **Quem depende** | Conciliação, saldo de conta, Fluxo de Caixa |
| **Relacionamentos** | N:1 ContaBancaria, FormaPagamento; vinculada a ContaPagar ou ContaReceber |
| **Regras** | Toda movimentação altera saldo; estorno gera movimentação inversa; não excluir — apenas estornar |

#### Conciliação Bancária

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Casamento entre extrato bancário e movimentações do sistema |
| **Responsabilidade** | Período, itens conciliados, divergências |
| **Quem depende** | Integridade financeira, auditoria |
| **Relacionamentos** | N:1 ContaBancaria, Empresa; N:N Movimentações, ItensExtrato |
| **Regras** | Período fechado não reabre; divergência gera alerta; importação de OFX/CNAB (futuro) |

---

### Custos Operacionais

#### Abastecimento

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Registro de combustível consumido |
| **Responsabilidade** | Litros, valor, posto, odômetro, tipo combustível |
| **Quem depende** | Despesas, KPIs (km/l), Custos por veículo |
| **Relacionamentos** | N:1 Veículo, Motorista, Fornecedor (posto), Viagem (opcional); gera Despesa |
| **Regras** | Odômetro >= anterior; média km/l calculada; tanque cheio vs parcial |

#### Pneu

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Controle individual de pneu (ativo rastreável) |
| **Responsabilidade** | Marca, medida, posição, vida útil (km), status |
| **Quem depende** | Custos, Manutenções, KPIs de desgaste |
| **Relacionamentos** | N:1 Veículo ou Reboque; 1:N Movimentações de pneu (recapagem, rodízio) |
| **Regras** | Posição no veículo; alerta por km ou data; histórico de posições |

#### Manutenção

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Intervenção em veículo/implemento/reboque |
| **Responsabilidade** | Tipo (preventiva/corretiva), oficina, custo, odômetro |
| **Quem depende** | Despesas, Disponibilidade da frota, Alertas |
| **Relacionamentos** | N:1 Veículo, Fornecedor; 1:N Peças, Serviços; gera Despesa |
| **Regras** | Status: agendada, em execução, concluída; veículo em manutenção bloqueado para viagem; preventiva por km/tempo |

#### Peça

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Item físico utilizado em manutenção |
| **Responsabilidade** | Nome, quantidade, valor unitário |
| **Quem depende** | Manutenção, custo total |
| **Relacionamentos** | N:1 Manutenção |
| **Regras** | Valor compõe custo da manutenção; pode vincular a estoque (futuro) |

#### Serviço

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Mão de obra ou serviço em manutenção |
| **Responsabilidade** | Descrição, valor, fornecedor |
| **Quem depende** | Manutenção, custo total |
| **Relacionamentos** | N:1 Manutenção, Fornecedor |
| **Regras** | Separado de peças para análise de custo |

#### Seguro

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Apólice de seguro de veículo/carga |
| **Responsabilidade** | Vigência, valor, cobertura, seguradora |
| **Quem depende** | Documentos, Despesas, Compliance |
| **Relacionamentos** | N:1 Veículo, Seguradora; gera Despesa periódica |
| **Regras** | Alerta de vencimento; custo rateado por veículo; sinistro (futuro) |

#### IPVA

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Imposto sobre propriedade de veículo |
| **Responsabilidade** | Exercício, valor, data pagamento, veículo |
| **Quem depende** | Despesas, Documentos |
| **Relacionamentos** | N:1 Veículo; gera Despesa |
| **Regras** | Anual por veículo; alerta por calendário estadual |

#### Licenciamento

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Licenciamento anual do veículo |
| **Responsabilidade** | Exercício, valor, validade |
| **Quem depende** | Documentos, bloqueio operacional |
| **Relacionamentos** | N:1 Veículo; gera Despesa |
| **Regras** | Bloqueio de viagem se vencido; renovação anual |

#### Multa

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Infração de trânsito |
| **Responsabilidade** | Código, valor, data, responsável, recurso |
| **Quem depende** | Despesas, RH (desconto motorista) |
| **Relacionamentos** | N:1 Veículo, Motorista; gera Despesa; pode gerar Desconto (RH) |
| **Regras** | Responsabilidade: empresa ou motorista; recurso com prazo; desconto em folha se motorista |

#### Pedágio

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Custo de pedágio em viagem ou rota |
| **Responsabilidade** | Valor, praça, data, tag/placa |
| **Quem depende** | Despesas, custo da viagem |
| **Relacionamentos** | N:1 Viagem, Veículo; gera Despesa |
| **Regras** | Pode ser estimado (rota) vs realizado; integração tag eletrônica (futuro) |

#### Lavagem

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Serviço de limpeza do veículo |
| **Responsabilidade** | Valor, data, fornecedor, tipo |
| **Quem depende** | Despesas, custo operacional |
| **Relacionamentos** | N:1 Veículo, Fornecedor; gera Despesa |
| **Regras** | Frequência configurável; custo por veículo/mês |

---

### RH

> **Nota:** `Motorista` é cadastrado em Fleet/Registry. RH gerencia apenas compensação.

#### Salário

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Remuneração fixa do motorista |
| **Responsabilidade** | Valor base, vigência, tipo (mensal, quinzenal) |
| **Quem depende** | Folha, Contas a Pagar |
| **Relacionamentos** | N:1 Motorista; gera ContaPagar periódica |
| **Regras** | Histórico de reajustes; vigência com início/fim |

#### Diária

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Pagamento por dia de viagem |
| **Responsabilidade** | Valor, quantidade de dias, viagem |
| **Quem depende** | Custo da viagem, Contas a Pagar |
| **Relacionamentos** | N:1 Motorista, Viagem; gera Despesa/ContaPagar |
| **Regras** | Calculada no encerramento da viagem; valor pode vir do contrato |

#### Comissão

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Remuneração variável por performance |
| **Responsabilidade** | Percentual ou valor fixo, base de cálculo, período |
| **Quem depende** | Receita da viagem, folha |
| **Relacionamentos** | N:1 Motorista, Viagem ou período; gera ContaPagar |
| **Regras** | Base: receita líquida, frete, margem; cálculo no faturamento |

#### Adiantamento

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Pagamento antecipado ao motorista |
| **Responsabilidade** | Valor, data, motivo, saldo devedor |
| **Quem depende** | Acerto de viagem, descontos |
| **Relacionamentos** | N:1 Motorista, Viagem (opcional); gera Movimentação; abate em Comissão/Diária |
| **Regras** | Saldo de adiantamento por motorista; desconto automático no acerto |

#### Desconto

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Retenção sobre pagamento do motorista |
| **Responsabilidade** | Valor, motivo (multa, dano, adiantamento) |
| **Quem depende** | Acerto financeiro do motorista |
| **Relacionamentos** | N:1 Motorista; pode originar de Multa ou Ocorrência |
| **Regras** | Parcelável; aprovação para valores acima de limite; histórico auditável |

---

### Inteligência

#### Dashboard

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Painel visual consolidado |
| **Responsabilidade** | Layout, widgets, filtros — **read model** |
| **Quem depende** | KPIs, Indicadores, Alertas |
| **Relacionamentos** | Compõe KPIs e Indicadores; personalizável por usuário |
| **Regras** | Configurável por perfil; dados em tempo real via eventos |

#### KPI

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Métrica-chave de performance |
| **Responsabilidade** | Nome, fórmula, meta, periodicidade |
| **Quem depende** | Dashboard, Alertas |
| **Relacionamentos** | Calculado de Operations, Financial, Fleet |
| **Regras** | Exemplos: margem por viagem, custo/km, disponibilidade frota, inadimplência |

#### Indicador

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Métrica derivada ou composta |
| **Responsabilidade** | Valor atual, tendência, comparativo |
| **Quem depende** | Dashboard, Relatórios |
| **Relacionamentos** | N:1 KPI ou fórmula customizada |
| **Regras** | Histórico para gráficos; recorte por filial/período |

#### Alerta

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Notificação proativa de condição |
| **Responsabilidade** | Tipo, severidade, entidade, ação requerida |
| **Quem depende** | Notification, Dashboard |
| **Relacionamentos** | Origina de Documento, KPI, Ocorrência, Conta vencida |
| **Regras** | Severidade: info, warning, critical; escalação configurável; ack pelo usuário |

#### Auditoria

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Registro imutável de ações no sistema |
| **Responsabilidade** | Quem, quando, o quê, antes/depois |
| **Quem depende** | Compliance, investigações |
| **Relacionamentos** | N:1 Usuário, Empresa; referencia qualquer entidade |
| **Regras** | Append-only; nunca excluir; retenção configurável por plano |

#### Log

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Registro técnico de execução |
| **Responsabilidade** | Nível, mensagem, stack, contexto |
| **Quem depende** | Debugging, monitoramento |
| **Relacionamentos** | Sistema (não domínio de negócio) |
| **Regras** | Separado de Auditoria; retenção curta; sem dados sensíveis |

#### Evento

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Fato de domínio publicado para integração |
| **Responsabilidade** | Tipo, payload, timestamp, aggregate |
| **Quem depende** | Analytics, Financial, Notification, Audit |
| **Relacionamentos** | Publicado por qualquer aggregate root |
| **Regras** | Exemplos: `ViagemFinalizada`, `DespesaAprovada`, `DocumentoVencendo`; idempotência no consumo |

#### IA (Assistente)

| Atributo | Descrição |
|----------|-----------|
| **Objetivo** | Camada de inteligência artificial |
| **Responsabilidade** | Consultas, insights, recomendações, anomalias |
| **Quem depende** | Analytics, Operations, Financial (read-only) |
| **Relacionamentos** | Consome KPIs, Eventos, histórico |
| **Regras** | Somente leitura no domínio; respostas contextualizadas por empresa; sem mutação autônoma |

---

## Diagrama de Relacionamentos

```
PLATAFORMA
 └── PLANO_SAAS
      └── ASSINATURA
           └── EMPRESA (Tenant) ─────────────────────────────────────────────┐
                ├── FILIAL ─────────────────────────────────────────────┐   │
                │    ├── CENTRO_DE_CUSTO                                  │   │
                │    ├── CONTA_BANCARIA                                   │   │
                │    │      ├── MOVIMENTAÇÃO                              │   │
                │    │      └── CONCILIAÇÃO_BANCÁRIA                      │   │
                │    └── (escopo operacional)                               │   │
                │                                                           │   │
                ├── USUÁRIO ◄──► PERFIL ◄──► PERMISSÃO (RBAC)              │   │
                │    ├── AUDITORIA                                          │   │
                │    └── DASHBOARD (personalizado)                          │   │
                │                                                           │   │
                ├── CATEGORIA_FINANCEIRA                                    │   │
                ├── FORMA_DE_PAGAMENTO                                      │   │
                ├── TIPO_DE_VEÍCULO                                         │   │
                │                                                           │   │
                ├── CLIENTE ──────────────────────────────────────────────┐  │   │
                │    ├── CONTRATO                                         │  │   │
                │    │      ├── ORDEM_DE_SERVIÇO                           │  │   │
                │    │      ├── VIAGEM ◄────────────────────────────┐   │  │   │
                │    │      └── RECEITA ──► CONTA_A_RECEBER          │   │  │   │
                │    └── RECEITA                                      │   │  │   │
                │                                                    │   │  │   │
                ├── FORNECEDOR ─────────────────────────────────────┐  │   │  │   │
                │    ├── DESPESA ──► CONTA_A_PAGAR                  │  │   │  │   │
                │    ├── MANUTENÇÃO                                   │  │   │  │   │
                │    └── ABASTECIMENTO                                │  │   │  │   │
                │                                                    │  │   │  │   │
                ├── SEGURADORA                                        │  │   │  │   │
                │    └── SEGURO                                       │  │   │  │   │
                │                                                    │  │   │  │   │
                ├── VEÍCULO ────────────────────────────────────┐   │  │   │  │   │
                │    ├── REBOQUE (composição)                      │   │  │   │  │   │
                │    ├── IMPLEMENTO                                │   │  │   │  │   │
                │    ├── DOCUMENTO (CRLV, ANTT...)                 │   │  │   │  │   │
                │    ├── ABASTECIMENTO ──► DESPESA                 │   │  │   │  │   │
                │    ├── PNEU                                      │   │  │   │  │   │
                │    ├── MANUTENÇÃO                                │   │  │   │  │   │
                │    │      ├── PEÇA                               │   │  │   │  │   │
                │    │      └── SERVIÇO                            │   │  │   │  │   │
                │    ├── SEGURO ──► DESPESA                        │   │  │   │  │   │
                │    ├── IPVA ──► DESPESA                          │   │  │   │  │   │
                │    ├── LICENCIAMENTO ──► DESPESA                 │   │  │   │  │   │
                │    ├── MULTA ──► DESPESA ──► DESCONTO (RH)       │   │  │   │  │   │
                │    ├── LAVAGEM ──► DESPESA                       │   │  │   │  │   │
                │    └── VIAGEM ◄──────────────────────────────────┘   │  │   │  │   │
                │                                                     │  │   │  │   │
                ├── MOTORISTA ────────────────────────────────────┐  │  │   │  │   │
                │    ├── DOCUMENTO (CNH)                          │  │  │   │  │   │
                │    ├── VIAGEM ◄─────────────────────────────────┘  │  │   │  │   │
                │    ├── SALÁRIO ──► CONTA_A_PAGAR                     │  │   │  │   │
                │    ├── DIÁRIA ──► DESPESA                            │  │   │  │   │
                │    ├── COMISSÃO ──► CONTA_A_PAGAR                    │  │   │  │   │
                │    ├── ADIANTAMENTO ──► MOVIMENTAÇÃO                 │  │   │  │   │
                │    ├── DESCONTO                                      │  │   │  │   │
                │    └── MULTA (responsável)                           │  │   │  │   │
                │                                                      │  │   │  │   │
                └── VIAGEM (aggregate root operacional) ◄──────────────┘  │   │  │   │
                     ├── ROTA                                              │   │  │   │
                     ├── COLETA                                            │   │  │   │
                     ├── ENTREGA                                           │   │  │   │
                     ├── CONHECIMENTO (CT-e) ──► RECEITA                   │   │  │   │
                     ├── OCORRÊNCIA ──► ALERTA / DESPESA                   │   │  │   │
                     ├── PEDÁGIO ──► DESPESA                               │   │  │   │
                     ├── CUSTOS (abastecimento, etc.)                      │   │  │   │
                     └── EVENTO: ViagemFinalizada ──────────────────────┘   │  │   │
                                                                              │  │   │
                FLUXO_DE_CAIXA (read model) ◄── RECEITAS + DESPESAS + MOVIMENTAÇØES
                KPI / INDICADOR / ALERTA ◄── EVENTOS de todos os domínios
                IA ◄── KPIs + EVENTOS + histórico (read-only)
                NOTIFICAÇÃO ◄── ALERTA + EVENTOS
```

---

## Ordem de Implementação

### Fase 0 — Fundação (pré-requisito de tudo)

| Ordem | Entidade | Context | Depende de |
|-------|----------|---------|------------|
| 1 | Plano SaaS | Billing | — (plataforma) |
| 2 | Permissão | Access Control | — (catálogo plataforma) |
| 3 | Empresa | Tenant | Plano SaaS |
| 4 | Assinatura | Billing | Empresa, Plano SaaS |
| 5 | Filial | Tenant | Empresa |
| 6 | Usuário | Identity | — |
| 7 | Perfil | Access Control | Empresa, Permissão |
| 8 | MembroEmpresa (Usuário ↔ Empresa) | Tenant | Usuário, Empresa, Perfil |

### Fase 1 — Cadastros base

| Ordem | Entidade | Depende de |
|-------|----------|------------|
| 9 | Tipo de Veículo | Empresa |
| 10 | Categoria Financeira | Empresa |
| 11 | Centro de Custo | Empresa, Filial |
| 12 | Forma de Pagamento | Empresa |
| 13 | Conta Bancária | Empresa, Filial |
| 14 | Fornecedor | Empresa |
| 15 | Seguradora | Empresa |
| 16 | Cliente | Empresa |

### Fase 2 — Frota e pessoas

| Ordem | Entidade | Depende de |
|-------|----------|------------|
| 17 | Motorista | Empresa |
| 18 | Veículo | Empresa, Filial, Tipo de Veículo |
| 19 | Reboque | Empresa, Tipo de Veículo |
| 20 | Implemento | Empresa |
| 21 | Documento | Empresa + entidade vinculada |

### Fase 3 — Comercial

| Ordem | Entidade | Depende de |
|-------|----------|------------|
| 22 | Contrato | Cliente, Empresa |

### Fase 4 — Operação

| Ordem | Entidade | Depende de |
|-------|----------|------------|
| 23 | Rota | Empresa |
| 24 | Ordem de Serviço | Cliente, Contrato |
| 25 | Viagem | Cliente, Contrato, Veículo, Motorista, Filial, Rota |
| 26 | Coleta | Viagem |
| 27 | Entrega | Viagem |
| 28 | Ocorrência | Viagem |
| 29 | Conhecimento (CT-e) | Viagem, Cliente |

### Fase 5 — Financeiro core

| Ordem | Entidade | Depende de |
|-------|----------|------------|
| 30 | Receita | Cliente, Contrato, Viagem, Categoria, Centro de Custo |
| 31 | Despesa | Fornecedor, Categoria, Centro de Custo |
| 32 | Conta a Receber | Receita, Cliente |
| 33 | Conta a Pagar | Despesa, Fornecedor |
| 34 | Movimentação | Conta Bancária, Forma de Pagamento |
| 35 | Conciliação Bancária | Conta Bancária, Movimentação |
| 36 | Fluxo de Caixa | Receitas, Despesas, Movimentações (read model) |

### Fase 6 — Custos operacionais

| Ordem | Entidade | Depende de |
|-------|----------|------------|
| 37 | Abastecimento | Veículo, Fornecedor, Viagem |
| 38 | Pneu | Veículo/Reboque |
| 39 | Manutenção | Veículo, Fornecedor |
| 40 | Peça / Serviço | Manutenção |
| 41 | Seguro | Veículo, Seguradora |
| 42 | IPVA / Licenciamento | Veículo |
| 43 | Multa | Veículo, Motorista |
| 44 | Pedágio | Viagem, Veículo |
| 45 | Lavagem | Veículo, Fornecedor |

### Fase 7 — RH

| Ordem | Entidade | Depende de |
|-------|----------|------------|
| 46 | Salário | Motorista |
| 47 | Diária | Motorista, Viagem |
| 48 | Comissão | Motorista, Viagem/Receita |
| 49 | Adiantamento | Motorista |
| 50 | Desconto | Motorista, Multa |

### Fase 8 — Inteligência e plataforma

| Ordem | Entidade | Depende de |
|-------|----------|------------|
| 51 | Evento | Todos os aggregates |
| 52 | Auditoria | Usuário, todas as mutações |
| 53 | KPI / Indicador | Dados agregados |
| 54 | Alerta | KPI, Documento, Conta, Ocorrência |
| 55 | Dashboard | KPI, Indicador, Alerta |
| 56 | Notificação | Alerta, Evento |
| 57 | IA | KPIs, Eventos, histórico |

### Diagrama de dependências (resumo)

```
Fase 0: Plano → Empresa → Filial → Usuário/Perfil
           ↓
Fase 1: Categorias, Fornecedores, Clientes
           ↓
Fase 2: Motorista, Veículo, Documentos
           ↓
Fase 3: Contrato
           ↓
Fase 4: Viagem (+ Coleta, Entrega, CT-e, Ocorrência)
           ↓
Fase 5: Receita/Despesa → Contas → Movimentação → Fluxo de Caixa
           ↓
Fase 6: Custos operacionais (alimentam Despesa)
           ↓
Fase 7: RH (alimenta Conta a Pagar)
           ↓
Fase 8: Analytics, Alertas, IA
```

---

## Glossário

| Termo | Definição |
|-------|-----------|
| **Tenant** | Empresa cliente do SaaS FleetControl |
| **CT-e** | Conhecimento de Transporte Eletrônico — documento fiscal |
| **Aggregate Root** | Entidade raiz que garante invariantes (ex: Viagem, Contrato) |
| **Bounded Context** | Fronteira de modelo com linguagem ubíqua própria |
| **Composição** | Conjunto cavalo + reboque(s) para uma viagem |
| **Competência** | Período contábil de reconhecimento da receita/despesa |
| **Caixa** | Momento efetivo de entrada/saída de dinheiro |
| **Centro de Custo** | Unidade para alocação e análise de resultados |
| **Evento de Domínio** | Fato que ocorreu e outros contextos precisam saber |
| **Read Model** | Projeção otimizada para leitura (Fluxo de Caixa, Dashboard) |
| **RBAC** | Role-Based Access Control — autorização por perfil |

---

## Decisões Arquiteturais

| # | Decisão | Justificativa |
|---|---------|---------------|
| ADR-D01 | Shared schema com `empresa_id` | Custo operacional, simplicidade, RLS futuro |
| ADR-D02 | Viagem como aggregate root operacional | Centraliza ciclo e eventos financeiros |
| ADR-D03 | Motorista em Shared Kernel (Fleet + HR) | Cadastro único, compensação separada |
| ADR-D04 | Documento polimórfico | Flexibilidade sem tabelas por tipo |
| ADR-D05 | Fluxo de Caixa como read model | Evita duplicação e inconsistência |
| ADR-D06 | Custos operacionais geram Despesa via evento | Desacoplamento Cost → Financial |
| ADR-D07 | CT-e vinculado à Viagem | Rastreabilidade fiscal obrigatória |
| ADR-D08 | Auditoria append-only cross-cutting | Compliance e investigação |
| ADR-D09 | Permissões globais, perfis por tenant | Consistência de segurança na plataforma |
| ADR-D10 | IA read-only | Segurança — sem mutação autônoma no domínio |

---

> **Próxima sprint sugerida:** Sprint 7 — Schema físico e migrations a partir deste modelo, iniciando pela Fase 0 e Fase 1.
