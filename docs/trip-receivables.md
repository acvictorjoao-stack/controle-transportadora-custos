# Cobrança de frete: Viagens × Contas a Receber

Cada viagem com frete e condição de pagamento tem um título em `financial_entries`, criado junto com a viagem.

## Regras

| Situação | Comportamento |
|----------|---------------|
| Viagem cadastrada com frete | Exige cliente e condição; título pendente criado na mesma transação |
| Frete ou cliente alterado sem movimentos | Título sincronizado, com histórico |
| Frete alterado com movimentos | Só por ajuste no título, com motivo |
| Cliente alterado com movimentos | Bloqueado |
| Recebimento parcial | Título aberto até a quitação; valor acima do saldo é recusado |
| Viagem cancelada sem recebimento | Título cancelado automaticamente |
| Viagem cancelada com recebimento | Bloqueado até o Financeiro estornar |
| Viagem antiga | Sem título; receita `trips` existente permanece |

Saldo do título: `amount + adjustment_total - paid_amount`.

## Onde cada valor é reconhecido

| Relatório | Regra |
|-----------|-------|
| DRE | Frete das viagens concluídas, por `completed_at`; títulos não entram |
| Fluxo de Caixa | `financial_cash_flow_lines`: uma linha por recebimento ou estorno, mais o saldo em aberto |
| `get_financial_stats` | Título de frete só conta com a viagem concluída |

## Banco

| Objeto | Função |
|--------|--------|
| `trips_sync_receivable` | Trigger que mantém o título alinhado à viagem |
| `financial_entries_guard_receivable` | Impede alterar título por fora das regras |
| `financial_entry_movements` | Recebimentos, estornos e ajustes; somente inclusão |
| `register_receivable_receipt` | RPC de recebimento, idempotente |
| `reverse_receivable_receipt` | RPC de estorno, exige motivo |
| `adjust_receivable_amount` | RPC de ajuste, exige motivo e atualiza a viagem |

## Publicação

Aplique as migrations 105 a 108 **antes** de publicar o código: a aplicação lê colunas e a view criadas por elas.

Depois de aplicar, regenere `supabase/types/database.ts`.

Teste de banco, somente em ambiente local com as migrations aplicadas:

```bash
psql -v ON_ERROR_STOP=1 -f database/tests/trip-receivables.sql
```
