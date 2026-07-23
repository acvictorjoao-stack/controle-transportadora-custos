'use client';

import * as React from 'react';

import {FormField} from '@/components/master/shared/form-field';
import {Input} from '@/components/ui/input';
import {cn} from '@/lib/utils';

import {
  OPERATION_PAYMENT_TYPE_LABELS,
  OPERATION_PAYMENT_TYPES,
  type OperationPaymentType,
} from '../constants/operation-financial';
import {
  buildInstallmentSchedule,
  DEFAULT_INSTALLMENT_INTERVAL_DAYS,
  type InstallmentScheduleItem,
} from '../utils/installment-schedule';

export interface OperationPaymentValue {
  paymentType: OperationPaymentType;
  paymentDueDate: string | null;
  installmentCount: number;
  installmentIntervalDays: number;
}

export interface OperationPaymentFieldsProps {
  idPrefix: string;
  value: OperationPaymentValue;
  onChange: (patch: Partial<OperationPaymentValue>) => void;
  errors?: Partial<Record<keyof OperationPaymentValue, string>>;
  selectClassName: string;
  /** Total amount used to preview installment split (optional). */
  totalAmount?: number | null;
  className?: string;
  /** When false, hides installment count/interval (single due date only). */
  enableInstallments?: boolean;
}

function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
}

function formatDateBr(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

function OperationPaymentFields({
  idPrefix,
  value,
  onChange,
  errors = {},
  selectClassName,
  totalAmount,
  className,
  enableInstallments = true,
}: OperationPaymentFieldsProps) {
  const isCredit = value.paymentType === 'credit';

  const preview: InstallmentScheduleItem[] = React.useMemo(() => {
    if (!isCredit || !enableInstallments) return [];
    if (!value.paymentDueDate) return [];
    const amount = typeof totalAmount === 'number' ? totalAmount : 0;
    if (amount <= 0) return [];
    const count = Math.max(1, value.installmentCount || 1);
    return buildInstallmentSchedule({
      totalAmount: amount,
      installmentCount: count,
      firstDueDate: value.paymentDueDate,
      intervalDays: value.installmentIntervalDays || DEFAULT_INSTALLMENT_INTERVAL_DAYS,
    });
  }, [
    enableInstallments,
    isCredit,
    totalAmount,
    value.installmentCount,
    value.installmentIntervalDays,
    value.paymentDueDate,
  ]);

  return (
    <div className={cn('contents', className)}>
      <FormField
        label="Forma de pagamento"
        htmlFor={`${idPrefix}-payment-type`}
        error={errors.paymentType}
      >
        <select
          id={`${idPrefix}-payment-type`}
          value={value.paymentType}
          onChange={(e) => {
            const paymentType = e.target.value as OperationPaymentType;
            if (paymentType === 'cash') {
              onChange({
                paymentType,
                paymentDueDate: null,
                installmentCount: 1,
                installmentIntervalDays: DEFAULT_INSTALLMENT_INTERVAL_DAYS,
              });
              return;
            }
            onChange({
              paymentType,
              installmentCount: Math.max(1, value.installmentCount || 1),
              installmentIntervalDays:
                value.installmentIntervalDays || DEFAULT_INSTALLMENT_INTERVAL_DAYS,
            });
          }}
          className={selectClassName}
        >
          {OPERATION_PAYMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {OPERATION_PAYMENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </FormField>

      <div
        className={cn(
          'col-span-full grid transition-[grid-template-rows] duration-300 ease-out',
          isCredit ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
        aria-hidden={!isCredit}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              'grid gap-4 pt-1 sm:grid-cols-2',
              'transition-opacity duration-300',
              isCredit ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
          >
            {enableInstallments && (
              <FormField
                label="Número de parcelas"
                htmlFor={`${idPrefix}-installment-count`}
                error={errors.installmentCount}
                required
              >
                <Input
                  id={`${idPrefix}-installment-count`}
                  type="number"
                  min={1}
                  max={48}
                  step={1}
                  value={value.installmentCount || 1}
                  onChange={(e) =>
                    onChange({
                      installmentCount: e.target.value ? Number(e.target.value) : 1,
                    })
                  }
                  required={isCredit}
                  tabIndex={isCredit ? undefined : -1}
                />
              </FormField>
            )}

            <FormField
              label={enableInstallments ? 'Primeiro vencimento' : 'Vencimento'}
              htmlFor={`${idPrefix}-payment-due`}
              error={errors.paymentDueDate}
              required
            >
              <Input
                id={`${idPrefix}-payment-due`}
                type="date"
                value={value.paymentDueDate ?? ''}
                onChange={(e) => onChange({paymentDueDate: e.target.value || null})}
                required={isCredit}
                tabIndex={isCredit ? undefined : -1}
              />
            </FormField>

            {enableInstallments && (
              <FormField
                label="Intervalo entre parcelas (dias)"
                htmlFor={`${idPrefix}-installment-interval`}
                error={errors.installmentIntervalDays}
                hint="Padrão: 30 dias"
              >
                <Input
                  id={`${idPrefix}-installment-interval`}
                  type="number"
                  min={1}
                  max={365}
                  step={1}
                  value={value.installmentIntervalDays || DEFAULT_INSTALLMENT_INTERVAL_DAYS}
                  onChange={(e) =>
                    onChange({
                      installmentIntervalDays: e.target.value
                        ? Number(e.target.value)
                        : DEFAULT_INSTALLMENT_INTERVAL_DAYS,
                    })
                  }
                  tabIndex={isCredit ? undefined : -1}
                />
              </FormField>
            )}

            {enableInstallments && preview.length > 0 && (
              <div className="col-span-full rounded-md border border-border/80 bg-muted/30 px-3 py-2">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Parcelas geradas automaticamente
                </p>
                <ul className="space-y-1 text-sm">
                  {preview.map((item) => (
                    <li
                      key={item.number}
                      className="flex items-center justify-between gap-3 text-foreground"
                    >
                      <span>
                        Parcela {item.number}
                        <span className="text-muted-foreground">
                          {' '}
                          · {formatDateBr(item.dueDate)}
                        </span>
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatMoney(item.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export {OperationPaymentFields};
