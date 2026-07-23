import {z} from 'zod';

import {OPERATION_PAYMENT_TYPES} from '../constants/operation-financial';
import {
  DEFAULT_INSTALLMENT_INTERVAL_DAYS,
  MAX_INSTALLMENT_COUNT,
  MIN_INSTALLMENT_COUNT,
} from '../utils/installment-schedule';

const optionalString = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v?.length ? v : null));

const positiveInt = (fallback: number, message: string) =>
  z
    .union([z.number(), z.string()])
    .nullish()
    .transform((v) => {
      if (v === undefined || v === null || v === '') return fallback;
      const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
      return Number.isFinite(n) ? Math.floor(n) : fallback;
    })
    .refine(
      (v) => v >= MIN_INSTALLMENT_COUNT && v <= MAX_INSTALLMENT_COUNT,
      message,
    );

/** Shared payment + installment fields for operational forms. */
export const operationPaymentFieldsSchema = z.object({
  paymentType: z.enum(OPERATION_PAYMENT_TYPES).default('cash'),
  /** First due date when paymentType = credit. */
  paymentDueDate: optionalString,
  installmentCount: positiveInt(
    1,
    `Informe entre ${MIN_INSTALLMENT_COUNT} e ${MAX_INSTALLMENT_COUNT} parcelas.`,
  ).default(1),
  installmentIntervalDays: positiveInt(
    DEFAULT_INSTALLMENT_INTERVAL_DAYS,
    'Informe um intervalo válido em dias.',
  ).default(DEFAULT_INSTALLMENT_INTERVAL_DAYS),
});

export type OperationPaymentFieldsInput = z.infer<typeof operationPaymentFieldsSchema>;

export function refineOperationPaymentFields(
  data: OperationPaymentFieldsInput,
  ctx: z.RefinementCtx,
): void {
  if (data.paymentType !== 'credit') return;

  if (!data.paymentDueDate) {
    ctx.addIssue({
      code: 'custom',
      path: ['paymentDueDate'],
      message: 'Informe o primeiro vencimento para pagamento a prazo.',
    });
  }

  if (data.installmentCount < MIN_INSTALLMENT_COUNT) {
    ctx.addIssue({
      code: 'custom',
      path: ['installmentCount'],
      message: 'Informe o número de parcelas.',
    });
  }

  if (data.installmentIntervalDays < 1) {
    ctx.addIssue({
      code: 'custom',
      path: ['installmentIntervalDays'],
      message: 'Informe o intervalo entre parcelas.',
    });
  }
}
