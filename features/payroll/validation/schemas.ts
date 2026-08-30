import {z} from 'zod';

import {
  PAYROLL_EXPENSE_STATUSES,
  PAYROLL_EXPENSE_TYPES,
  PAYROLL_PAYMENT_METHODS,
  PAYROLL_PERSON_KINDS,
} from '../constants/enums';
import {normalizeCompetence} from '../utils/competence';

const optionalString = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v?.length ? v : null));

const optionalUuid = z
  .string()
  .uuid()
  .nullable()
  .optional()
  .transform((v) => v ?? null);

const optionalDate = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v?.length ? v.slice(0, 10) : null));

const requiredAmount = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === 'number' ? v : Number(String(v).replace(',', '.'))))
  .refine((v) => Number.isFinite(v) && v > 0, 'Informe um valor maior que zero.');

const competenceSchema = z
  .string()
  .trim()
  .min(1, 'Informe a competência.')
  .transform((v) => normalizeCompetence(v))
  .refine((v): v is string => v !== null, 'Competência inválida. Informe o mês e o ano.');

const payrollExpenseBaseSchema = z
  .object({
    personKind: z.enum(PAYROLL_PERSON_KINDS, {message: 'Selecione o funcionário.'}),
    personId: z.string().uuid('Selecione o funcionário.'),
    positionId: optionalUuid,
    costCenterId: z.string().uuid('Selecione o centro de custo.'),
    branchId: optionalUuid,
    competence: competenceSchema,
    expenseType: z.enum(PAYROLL_EXPENSE_TYPES, {message: 'Selecione o tipo de despesa.'}),
    expenseStatus: z.enum(PAYROLL_EXPENSE_STATUSES).optional().default('pending'),
    amount: requiredAmount,
    paymentMethod: z.enum(PAYROLL_PAYMENT_METHODS).nullish().transform((v) => v ?? null),
    dueDate: optionalDate,
    paidAt: optionalDate,
    notes: optionalString,
    /** Confirmação explícita para lançar uma despesa possivelmente duplicada. */
    confirmDuplicate: z.boolean().optional().default(false),
  })
  .refine((data) => data.expenseStatus !== 'pending' || data.dueDate !== null, {
    message: 'Informe a data de vencimento para despesas em aberto.',
    path: ['dueDate'],
  })
  .refine((data) => data.expenseStatus !== 'paid' || data.paidAt !== null, {
    message: 'Informe a data de pagamento para despesas pagas.',
    path: ['paidAt'],
  });

export const createPayrollExpenseSchema = payrollExpenseBaseSchema;
export const updatePayrollExpenseSchema = payrollExpenseBaseSchema;

export const createEmployeeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome.')
    .transform((v) => v.toUpperCase()),
  positionId: optionalUuid,
  costCenterId: optionalUuid,
  branchId: optionalUuid,
  cpf: z
    .string()
    .trim()
    .nullish()
    .transform((v) => {
      const digits = v?.replace(/\D/g, '') ?? '';
      return digits.length ? digits : null;
    })
    .refine((v) => v === null || v.length === 11, 'CPF deve ter 11 dígitos.'),
  registrationNumber: optionalString,
  email: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v?.length ? v.toLowerCase() : null))
    .refine((v) => v === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'E-mail inválido.'),
  phone: optionalString,
  contractType: z
    .enum(['clt', 'pj', 'autonomo', 'estagio', 'temporario', 'outros'])
    .nullish()
    .transform((v) => v ?? null),
  hiredAt: optionalDate,
  terminatedAt: optionalDate,
  notes: optionalString,
});

export const updateEmployeeSchema = createEmployeeSchema;

export const createPositionSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Informe o código.')
    .max(40, 'Código muito longo.')
    .regex(/^[A-Za-z0-9_-]+$/, 'Use apenas letras, números, hífen ou underscore.')
    .transform((v) => v.toUpperCase()),
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome.')
    .transform((v) => v.toUpperCase()),
  description: optionalString,
});

export const updatePositionSchema = createPositionSchema;

export type CreatePayrollExpenseInput = z.infer<typeof createPayrollExpenseSchema>;
export type UpdatePayrollExpenseInput = z.infer<typeof updatePayrollExpenseSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type CreatePositionInput = z.infer<typeof createPositionSchema>;
export type UpdatePositionInput = z.infer<typeof updatePositionSchema>;
