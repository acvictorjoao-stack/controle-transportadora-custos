import {z} from 'zod';

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

const optionalUuid = z
  .string()
  .uuid()
  .nullable()
  .optional()
  .transform((v) => v ?? null);

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
  costCenterId: optionalUuid,
  description: requiredString,
  notes: optionalString,
  amount: requiredAmount,
  entryDate: z.string().trim().min(1, 'Informe a data de emissão.'),
  dueDate: z.string().trim().min(1, 'Informe a data de vencimento.'),
});

export const createAccountsReceivableSchema = accountsReceivableBaseSchema;

export const updateAccountsReceivableSchema = accountsReceivableBaseSchema;

export const markAccountsReceivableReceivedSchema = z.object({
  paidAt: z.string().trim().min(1, 'Informe a data do recebimento.'),
  paidAmount: requiredAmount,
});

export type CreateAccountsReceivableInput = z.infer<typeof createAccountsReceivableSchema>;
export type UpdateAccountsReceivableInput = z.infer<typeof updateAccountsReceivableSchema>;
export type MarkAccountsReceivableReceivedInput = z.infer<
  typeof markAccountsReceivableReceivedSchema
>;
