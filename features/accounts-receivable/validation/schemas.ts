import {z} from 'zod';

import {RECEIVABLE_PAYMENT_METHODS} from '../constants';

const requiredString = z
  .string()
  .trim()
  .min(1, 'Campo obrigatório.')
  .transform((v) => v.toUpperCase());

// Campo opcional aceita null (formulário envia null para vazio).
const optionalString = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v?.length ? v.toUpperCase() : null));

const requiredUuid = z.string().uuid('Selecione uma opção válida.');

const requiredAmount = z
  .union([z.number(), z.string()])
  .transform((v) => {
    if (typeof v === 'number') return v;
    const normalized = String(v)
      .replace(/\s/g, '')
      .replace(/R\$/gi, '')
      .replace(/\./g, '')
      .replace(',', '.');
    return Number(normalized);
  })
  .refine((v) => Number.isFinite(v) && v > 0, 'Informe um valor válido.');

const accountsReceivableBaseSchema = z.object({
  client: requiredString,
  categoryId: requiredUuid,
  costCenterId: requiredUuid,
  description: requiredString,
  notes: optionalString,
  amount: requiredAmount,
  entryDate: z.string().trim().min(1, 'Informe a data de emissão.'),
  dueDate: z.string().trim().min(1, 'Informe a data de vencimento.'),
});

export const createAccountsReceivableSchema = accountsReceivableBaseSchema;

export const updateAccountsReceivableSchema = accountsReceivableBaseSchema;

const idempotencyKey = z.string().uuid('Operação inválida.');

const requiredReason = z.string().trim().min(3, 'Informe o motivo.');

export const markAccountsReceivableReceivedSchema = z.object({
  paidAt: z.string().trim().min(1, 'Informe a data do recebimento.'),
  paidAmount: requiredAmount,
  paymentMethod: z
    .enum(RECEIVABLE_PAYMENT_METHODS)
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  notes: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v?.length ? v : null)),
  idempotencyKey,
});

export const reverseReceivableReceiptSchema = z.object({
  reason: requiredReason,
  idempotencyKey,
});

export const adjustReceivableAmountSchema = z.object({
  newAmount: requiredAmount,
  reason: requiredReason,
  idempotencyKey,
});

export type CreateAccountsReceivableInput = z.infer<typeof createAccountsReceivableSchema>;
export type UpdateAccountsReceivableInput = z.infer<typeof updateAccountsReceivableSchema>;
export type MarkAccountsReceivableReceivedInput = z.input<
  typeof markAccountsReceivableReceivedSchema
>;
export type ParsedReceiptInput = z.infer<typeof markAccountsReceivableReceivedSchema>;
export type ReverseReceivableReceiptInput = z.infer<typeof reverseReceivableReceiptSchema>;
export type AdjustReceivableAmountInput = z.infer<typeof adjustReceivableAmountSchema>;
