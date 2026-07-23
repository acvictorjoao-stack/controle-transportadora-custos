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

const accountsPayableBaseSchema = z.object({
  supplierId: requiredUuid,
  supplier: requiredString,
  categoryId: requiredUuid,
  costCenterId: requiredUuid,
  description: requiredString,
  notes: optionalString,
  amount: requiredAmount,
  entryDate: z.string().trim().min(1, 'Informe a data de emissão.'),
  dueDate: z.string().trim().min(1, 'Informe a data de vencimento.'),
});

export const createAccountsPayableSchema = accountsPayableBaseSchema;

export const updateAccountsPayableSchema = accountsPayableBaseSchema;

export const markAccountsPayablePaidSchema = z.object({
  paidAt: z.string().trim().min(1, 'Informe a data do pagamento.'),
  paidAmount: requiredAmount,
});

export type CreateAccountsPayableInput = z.infer<typeof createAccountsPayableSchema>;
export type UpdateAccountsPayableInput = z.infer<typeof updateAccountsPayableSchema>;
export type MarkAccountsPayablePaidInput = z.infer<typeof markAccountsPayablePaidSchema>;
