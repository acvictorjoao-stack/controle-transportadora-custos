-- FleetControl Sprint 23 — financial enums

create type public.financial_entry_type as enum (
  'revenue',
  'expense',
  'transfer',
  'reimbursement',
  'advance',
  'reversal',
  'adjustment'
);

comment on type public.financial_entry_type is
  'Financial entry types: receita, despesa, transferência, reembolso, adiantamento, estorno, ajuste';

create type public.financial_entry_status as enum (
  'pending',
  'paid',
  'cancelled',
  'reversed',
  'overdue'
);

comment on type public.financial_entry_status is
  'Payment/settlement status for financial entries';

create type public.financial_cost_center_type as enum (
  'company',
  'branch',
  'vehicle',
  'driver',
  'trip',
  'client',
  'contract',
  'custom'
);

comment on type public.financial_cost_center_type is
  'Cost center dimensions: empresa, filial, veículo, motorista, viagem, cliente, contrato, customizado';

create type public.financial_document_type as enum (
  'invoice',
  'boleto',
  'receipt',
  'proof',
  'other'
);

comment on type public.financial_document_type is
  'Financial document types: NF, boleto, recibo, comprovante, outros';

create type public.financial_category_slug as enum (
  'combustivel',
  'pedagio',
  'manutencao',
  'pneus',
  'salarios',
  'diarias',
  'hospedagem',
  'alimentacao',
  'impostos',
  'seguros',
  'multas',
  'fretes',
  'receitas',
  'outros'
);

comment on type public.financial_category_slug is
  'Default financial category slugs seeded per company';
