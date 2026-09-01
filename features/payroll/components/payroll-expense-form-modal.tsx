'use client';

import {Loader2, Save} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import {FormField} from '@/components/master/shared/form-field';
import {Modal} from '@/components/master/shared/modal';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {useConfirm} from '@/contexts/feedback/confirm-context';
import {useToast} from '@/contexts/feedback/toast-context';
import {ROUTES} from '@/constants/routes/paths';
import {
  formatCurrencyInput,
  maskCurrencyInput,
  parseCurrencyInput,
} from '@/features/accounts-payable/utils/currency';
import type {CostCenterSelectOption} from '@/features/cost-centers/types';
import {financialInputClassName} from '@/features/financial/utils/form-styles';
import {MSG} from '@/lib/feedback/messages';

import {createPayrollExpenseAction, updatePayrollExpenseAction} from '../actions';
import {
  PAYROLL_DUPLICATE_FIELD,
  PAYROLL_EXPENSE_STATUSES,
  PAYROLL_EXPENSE_TYPES,
  PAYROLL_PAYMENT_METHODS,
} from '../constants';
import type {
  PayrollExpense,
  PayrollExpenseStatus,
  PayrollExpenseType,
  PayrollPaymentMethod,
  PayrollPersonOption,
  Position,
} from '../types';
import {
  PAYROLL_EXPENSE_STATUS_LABELS,
  PAYROLL_EXPENSE_TYPE_LABELS,
  PAYROLL_PAYMENT_METHOD_LABELS,
  PAYROLL_PERSON_KIND_LABELS,
} from '../types';
import {competenceToMonthInput, currentCompetenceMonthInput} from '../utils/competence';

export interface PayrollExpenseFormModalProps {
  open: boolean;
  onClose: () => void;
  expense?: PayrollExpense | null;
  people: PayrollPersonOption[];
  positions: Position[];
  costCenters: CostCenterSelectOption[];
  onSaved: (expense: PayrollExpense) => void;
}

interface PayrollFormState {
  personId: string;
  positionId: string;
  costCenterId: string;
  competence: string;
  expenseType: PayrollExpenseType;
  expenseStatus: PayrollExpenseStatus;
  paymentMethod: string;
  dueDate: string;
  paidAt: string;
  notes: string;
}

type FieldErrors = Record<string, string>;

function PayrollExpenseFormModal({
  open,
  onClose,
  expense,
  people,
  positions,
  costCenters,
  onSaved,
}: PayrollExpenseFormModalProps) {
  const isEdit = Boolean(expense);
  const formKey = `${open}-${expense?.id ?? 'new'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar despesa de pessoal' : 'Nova despesa de pessoal'}
      description={
        isEdit
          ? 'Atualize a despesa de folha — o lançamento financeiro é sincronizado automaticamente.'
          : 'Lance salário, encargos ou benefícios de um motorista ou colaborador.'
      }
      size="xl"
    >
      <PayrollExpenseFormContent
        key={formKey}
        expense={expense}
        isEdit={isEdit}
        people={people}
        positions={positions}
        costCenters={costCenters}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

function PayrollExpenseFormContent({
  expense,
  isEdit,
  people,
  positions,
  costCenters,
  onClose,
  onSaved,
}: {
  expense?: PayrollExpense | null;
  isEdit: boolean;
  people: PayrollPersonOption[];
  positions: Position[];
  costCenters: CostCenterSelectOption[];
  onClose: () => void;
  onSaved: (expense: PayrollExpense) => void;
}) {
  const confirm = useConfirm();
  const toast = useToast();

  const [formData, setFormData] = React.useState<PayrollFormState>(() => ({
    personId: expense?.personId ?? '',
    positionId: expense?.positionId ?? '',
    costCenterId: expense?.costCenterId ?? '',
    competence: expense
      ? competenceToMonthInput(expense.competence)
      : currentCompetenceMonthInput(),
    expenseType: expense?.expenseType ?? 'salario',
    expenseStatus: expense?.expenseStatus ?? 'pending',
    paymentMethod: expense?.paymentMethod ?? '',
    dueDate: expense?.dueDate ?? '',
    paidAt: expense?.paidAt ?? '',
    notes: expense?.notes ?? '',
  }));
  const [amountDisplay, setAmountDisplay] = React.useState(() =>
    formatCurrencyInput(expense?.amount ?? 0),
  );
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const selectedPerson = people.find((person) => person.id === formData.personId) ?? null;

  function updateField<K extends keyof PayrollFormState>(
    field: K,
    value: PayrollFormState[K],
  ) {
    setFormData((prev) => ({...prev, [field]: value}));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = {...prev};
        delete next[field];
        return next;
      });
    }
    setFormError(null);
  }

  /**
   * Ao escolher a pessoa, herda cargo e centro de custo do cadastro quando
   * existirem — os campos seguem editáveis (rateio pode diferir do cadastro).
   */
  function handlePersonChange(personId: string) {
    const person = people.find((item) => item.id === personId) ?? null;

    setFormData((prev) => ({
      ...prev,
      personId,
      positionId: person?.positionId ?? prev.positionId,
      costCenterId: person?.costCenterId ?? prev.costCenterId,
    }));
    setFieldErrors((prev) => {
      const next = {...prev};
      delete next.personId;
      return next;
    });
    setFormError(null);
  }

  async function submit(confirmDuplicate: boolean) {
    const payload = {
      personKind: selectedPerson?.kind ?? 'employee',
      personId: formData.personId,
      positionId: formData.positionId || null,
      costCenterId: formData.costCenterId,
      branchId: null,
      competence: formData.competence,
      expenseType: formData.expenseType,
      expenseStatus: formData.expenseStatus,
      amount: parseCurrencyInput(amountDisplay),
      paymentMethod: (formData.paymentMethod || null) as PayrollPaymentMethod | null,
      dueDate: formData.dueDate || null,
      paidAt: formData.paidAt || null,
      notes: formData.notes || null,
      confirmDuplicate,
    };

    return isEdit && expense
      ? updatePayrollExpenseAction(expense.id, payload)
      : createPayrollExpenseAction(payload);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    let result = await submit(false);

    // Duplicidade suave: o servidor detecta e devolve o campo de confirmação.
    if (!result.success && result.fieldErrors?.[PAYROLL_DUPLICATE_FIELD]) {
      const proceed = await confirm({
        title: 'Despesa semelhante encontrada',
        description:
          'Já existe uma despesa semelhante para este funcionário nesta competência. Deseja continuar?',
        confirmLabel: 'Continuar',
      });

      if (!proceed) {
        setSubmitting(false);
        return;
      }

      result = await submit(true);
    }

    if (!result.success) {
      setFormError(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      setSubmitting(false);
      return;
    }

    onSaved(result.data);
    toast.success(
      isEdit ? MSG.updatedFeminine('Despesa') : MSG.createdFeminine('Despesa'),
    );
    if (result.warning) toast.error(result.warning);
    onClose();
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Funcionário
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Funcionário"
            htmlFor="pay-person"
            error={fieldErrors.personId}
            hint={
              people.length === 0
                ? 'Nenhum funcionário cadastrado.'
                : selectedPerson
                  ? `Origem: ${PAYROLL_PERSON_KIND_LABELS[selectedPerson.kind]}`
                  : 'Motoristas vêm do cadastro operacional; demais cargos, de colaboradores.'
            }
            required
          >
            {people.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Nenhum funcionário cadastrado.</p>
                <Link
                  href={ROUTES.administracaoFuncionarios}
                  className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  Cadastrar funcionário
                </Link>
              </div>
            ) : (
              <select
                id="pay-person"
                value={formData.personId}
                onChange={(e) => handlePersonChange(e.target.value)}
                className={financialInputClassName}
                required
              >
                <option value="">Selecione</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} · {PAYROLL_PERSON_KIND_LABELS[person.kind]}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <FormField
            label="Cargo"
            htmlFor="pay-position"
            error={fieldErrors.positionId}
            hint={
              positions.length === 0
                ? 'Nenhum cargo cadastrado. Cadastre em Administração → Cargos.'
                : undefined
            }
          >
            <select
              id="pay-position"
              value={formData.positionId}
              onChange={(e) => updateField('positionId', e.target.value)}
              className={financialInputClassName}
              disabled={positions.length === 0}
            >
              <option value="">
                {positions.length === 0 ? 'Cadastre um cargo primeiro' : 'Não informado'}
              </option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.name}
                </option>
              ))}
            </select>
            {positions.length === 0 ? (
              <Link
                href={ROUTES.administracaoCargos}
                className="mt-1 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Cadastrar cargo
              </Link>
            ) : null}
          </FormField>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Despesa
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            label="Competência"
            htmlFor="pay-competence"
            error={fieldErrors.competence}
            required
          >
            <Input
              id="pay-competence"
              type="month"
              value={formData.competence}
              onChange={(e) => updateField('competence', e.target.value)}
              required
            />
          </FormField>

          <FormField
            label="Tipo de despesa"
            htmlFor="pay-type"
            error={fieldErrors.expenseType}
            required
          >
            <select
              id="pay-type"
              value={formData.expenseType}
              onChange={(e) =>
                updateField('expenseType', e.target.value as PayrollExpenseType)
              }
              className={financialInputClassName}
              required
            >
              {PAYROLL_EXPENSE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {PAYROLL_EXPENSE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Valor" htmlFor="pay-amount" error={fieldErrors.amount} required>
            <Input
              id="pay-amount"
              inputMode="decimal"
              placeholder="0,00"
              value={amountDisplay}
              onChange={(e) => {
                setAmountDisplay(maskCurrencyInput(e.target.value));
                setFieldErrors((prev) => {
                  const next = {...prev};
                  delete next.amount;
                  return next;
                });
              }}
              required
            />
          </FormField>

          <FormField
            label="Centro de custo"
            htmlFor="pay-cost-center"
            error={fieldErrors.costCenterId}
            required
          >
            <select
              id="pay-cost-center"
              value={formData.costCenterId}
              onChange={(e) => updateField('costCenterId', e.target.value)}
              className={financialInputClassName}
              required
            >
              <option value="">Selecione</option>
              {costCenters.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.code ? `${center.code} — ${center.name}` : center.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Forma de pagamento"
            htmlFor="pay-method"
            error={fieldErrors.paymentMethod}
          >
            <select
              id="pay-method"
              value={formData.paymentMethod}
              onChange={(e) => updateField('paymentMethod', e.target.value)}
              className={financialInputClassName}
            >
              <option value="">Não informado</option>
              {PAYROLL_PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {PAYROLL_PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Situação" htmlFor="pay-status" error={fieldErrors.expenseStatus}>
            <select
              id="pay-status"
              value={formData.expenseStatus}
              onChange={(e) =>
                updateField('expenseStatus', e.target.value as PayrollExpenseStatus)
              }
              className={financialInputClassName}
            >
              {PAYROLL_EXPENSE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PAYROLL_EXPENSE_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Pagamento
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Data de vencimento"
            htmlFor="pay-due-date"
            error={fieldErrors.dueDate}
            hint="Obrigatória para despesas em aberto — é o que leva a despesa para Contas a Pagar."
            required={formData.expenseStatus === 'pending'}
          >
            <Input
              id="pay-due-date"
              type="date"
              value={formData.dueDate}
              onChange={(e) => updateField('dueDate', e.target.value)}
              required={formData.expenseStatus === 'pending'}
            />
          </FormField>

          <FormField
            label="Data de pagamento"
            htmlFor="pay-paid-at"
            error={fieldErrors.paidAt}
            hint="Obrigatória para despesas já pagas."
            required={formData.expenseStatus === 'paid'}
          >
            <Input
              id="pay-paid-at"
              type="date"
              value={formData.paidAt}
              onChange={(e) => updateField('paidAt', e.target.value)}
              required={formData.expenseStatus === 'paid'}
            />
          </FormField>
        </div>

        <FormField label="Observações" htmlFor="pay-notes" error={fieldErrors.notes}>
          <Textarea
            id="pay-notes"
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value.toUpperCase())}
            className="uppercase"
            rows={3}
          />
        </FormField>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Salvar
        </Button>
      </div>
    </form>
  );
}

export {PayrollExpenseFormModal};
