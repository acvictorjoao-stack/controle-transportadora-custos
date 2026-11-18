'use client';

import {AlertTriangle, CheckCircle2, ExternalLink, Info, Loader2, Pencil, Trash2, Upload, X} from 'lucide-react';
import * as React from 'react';

import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {useConfirm} from '@/contexts/feedback/confirm-context';
import {MSG} from '@/lib/feedback/messages';
import {buildStorageFileUrl} from '@/lib/storage/private-files';
import {createClient} from '@/supabase/client';

import {
  createTripExpenseAction,
  deleteTripExpenseAction,
  updateTripExpenseAction,
} from '../actions';
import {TRIP_EXPENSE_PAID_BY, TRIP_EXPENSE_TYPES} from '../constants/enums';
import {TRIP_STORAGE_BUCKET} from '../constants';
import type {TripExpense, TripExpensePaidBy, TripExpensePaymentMethod, TripExpenseType} from '../types';
import {
  TRIP_EXPENSE_PAID_BY_LABELS,
  TRIP_EXPENSE_PAYMENT_METHOD_LABELS,
  TRIP_EXPENSE_TYPE_LABELS,
} from '../types';
import {todayCivilDate} from '@/lib/formatting/date';

import {formatDateBr} from '../utils/trip-status';
import {TRIP_NATIVE_SELECT_CLASS} from '../utils/form-styles';
import {
  EMPTY_PAYMENT_FORM,
  canLeavePaidByEmpty,
  changePaidBy,
  changePaymentMethod,
  describePaymentEffect,
  expenseTypeOptions,
  paymentFormFromExpense,
  paymentMethodOptions,
  paymentPayload,
  showsDueDate,
  showsPaymentMethod,
  validatePaymentForm,
  type TripExpensePaymentFormState,
} from '../utils/trip-expense-form';
import {
  SETTLED_EXPENSE_MESSAGE,
  describeTripExpenseDeletion,
  resolveTripExpenseStatus,
  type TripExpenseEntryRef,
  type TripExpenseStatus,
} from '../utils/trip-expense-status';

const ACCEPTED_RECEIPT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const MAX_RECEIPT_SIZE = 10 * 1024 * 1024;

type FieldErrors = Partial<Record<'paidBy' | 'paymentMethod' | 'dueDate' | 'amount', string>>;

function formatCurrency(value: number, currency = 'BRL') {
  return value.toLocaleString('pt-BR', {style: 'currency', currency});
}

/** Data padrão da despesa: hoje no fuso de negócio (em UTC, após 21h viraria amanhã). */
function todayIsoDate() {
  return todayCivilDate();
}

function expenseTypeLabel(type: string) {
  return TRIP_EXPENSE_TYPE_LABELS[type as TripExpenseType] ?? type;
}

function FieldError({message}: {message?: string}) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function StatusBadge({status}: {status: TripExpenseStatus}) {
  return (
    <Badge variant={status.tone} title={status.hint}>
      {status.label}
    </Badge>
  );
}

export interface TripExpensesTabProps {
  companyId: string;
  tripId: string;
  expenses: TripExpense[];
  /** Lançamentos das despesas (origem trip_expense); vazio sem acesso ao financeiro. */
  entries: TripExpenseEntryRef[];
  /** Falso quando o usuário não tem financeiro:read. */
  financialVisible: boolean;
  onSaved: () => void;
}

function TripExpensesTab({
  companyId,
  tripId,
  expenses,
  entries,
  financialVisible,
  onSaved,
}: TripExpensesTabProps) {
  const confirm = useConfirm();
  const [editing, setEditing] = React.useState<TripExpense | null>(null);
  const [type, setType] = React.useState<TripExpenseType>('toll');
  const [amount, setAmount] = React.useState('');
  const [expenseDate, setExpenseDate] = React.useState(todayIsoDate);
  const [description, setDescription] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [receiptUrl, setReceiptUrl] = React.useState<string | null>(null);
  const [payment, setPayment] = React.useState<TripExpensePaymentFormState>(EMPTY_PAYMENT_FORM);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const statusById = React.useMemo(
    () =>
      new Map(
        expenses.map((expense) => [
          expense.id,
          resolveTripExpenseStatus({expense, entries, financialVisible}),
        ]),
      ),
    [expenses, entries, financialVisible],
  );

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const notIntegrated = expenses.filter(
    (expense) => statusById.get(expense.id)?.key === 'not_integrated',
  );
  const editingStatus = editing ? statusById.get(editing.id) : undefined;
  const paymentLocked = Boolean(editingStatus?.settledByFinance);
  const allowEmptyPaidBy = canLeavePaidByEmpty(editing);
  const effect = describePaymentEffect(payment, type);

  function resetForm() {
    setEditing(null);
    setType('toll');
    setAmount('');
    setExpenseDate(todayIsoDate());
    setDescription('');
    setNotes('');
    setReceiptUrl(null);
    setPayment(EMPTY_PAYMENT_FORM);
    setFieldErrors({});
    setError(null);
  }

  function startEdit(expense: TripExpense) {
    setEditing(expense);
    // Tipo fora da lista atual (registro muito antigo) cai em "Outros", como antes.
    setType(
      TRIP_EXPENSE_TYPES.includes(expense.expenseType) ? expense.expenseType : 'other',
    );
    setAmount(String(expense.amount));
    setExpenseDate(expense.expenseDate.slice(0, 10));
    setDescription(expense.description ?? '');
    setNotes(expense.notes ?? '');
    setReceiptUrl(expense.receiptUrl);
    setPayment(paymentFormFromExpense(expense));
    setFieldErrors({});
    setError(null);
    setSuccess(null);
  }

  async function handleReceiptUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ACCEPTED_RECEIPT_TYPES.includes(file.type)) {
      setError('Formato de comprovante não permitido. Use JPG, PNG, WEBP ou PDF.');
      return;
    }
    if (file.size > MAX_RECEIPT_SIZE) {
      setError('Comprovante muito grande. Máximo 10 MB.');
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `${companyId}/${tripId}/expense-receipt-${Date.now()}.${ext}`;

      const {error: uploadError} = await supabase.storage
        .from(TRIP_STORAGE_BUCKET)
        .upload(path, file, {upsert: true, contentType: file.type});

      if (uploadError) throw new Error(uploadError.message);

      setReceiptUrl(buildStorageFileUrl(TRIP_STORAGE_BUCKET, path));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar comprovante.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const issues = paymentLocked ? [] : validatePaymentForm(payment, editing);
    const nextErrors: FieldErrors = {};
    for (const issue of issues) nextErrors[issue.field] = issue.message;
    if (!amount || Number(amount) <= 0) nextErrors.amount = 'Informe um valor maior que zero.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    const payload = {
      tripId,
      expenseType: type,
      amount: amount || 0,
      expenseDate: expenseDate || null,
      description: description || null,
      notes: notes || null,
      receiptUrl,
      // Pagamento travado (já pago pelo Financeiro): nada é reenviado.
      ...(paymentLocked ? {} : paymentPayload(payment)),
    };

    const result = editing
      ? await updateTripExpenseAction({...payload, id: editing.id})
      : await createTripExpenseAction(payload);

    setSaving(false);

    if (!result.success) {
      setError(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors as FieldErrors);
      return;
    }

    const message = editing ? 'Despesa atualizada.' : 'Despesa registrada.';
    resetForm();
    setSuccess(message);
    onSaved();
  }

  async function handleDelete(expense: TripExpense) {
    setError(null);
    setSuccess(null);
    const status = statusById.get(expense.id);
    if (status?.settledByFinance) {
      setError(SETTLED_EXPENSE_MESSAGE);
      return;
    }

    const confirmed = await confirm({
      title: MSG.deleteConfirmTitle,
      description: status ? describeTripExpenseDeletion(status) : MSG.deleteConfirmDescription,
      confirmLabel: MSG.deleteConfirmLabel,
      variant: 'destructive',
    });
    if (!confirmed) return;

    const result = await deleteTripExpenseAction({
      id: expense.id,
      tripId,
    });

    if (!result.success) {
      setError(result.error);
      return;
    }

    if (editing?.id === expense.id) resetForm();
    setSuccess('Despesa excluída.');
    onSaved();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de despesas da aba</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(total)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {expenses.length} despesa(s) registrada(s)
            </p>
          </CardContent>
        </Card>
        {notIntegrated.length > 0 && (
          <Alert variant="warning" className="h-full">
            <AlertTriangle />
            <AlertDescription>
              {notIntegrated.length} despesa(s) sem &quot;quem pagou&quot; ainda estão fora do
              financeiro, do resultado e da DRE. Edite e informe quem pagou.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {editing ? 'Editar despesa' : 'Registrar despesa'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && !error && (
              <Alert variant="success">
                <CheckCircle2 />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor="expense-type">
                  Tipo
                </label>
                <select
                  id="expense-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as TripExpenseType)}
                  className={TRIP_NATIVE_SELECT_CLASS}
                  required
                >
                  {expenseTypeOptions(editing?.expenseType ?? null).map((item) => (
                    <option key={item} value={item}>
                      {TRIP_EXPENSE_TYPE_LABELS[item]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor="expense-amount">
                  Valor
                </label>
                <Input
                  id="expense-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={paymentLocked}
                  aria-invalid={Boolean(fieldErrors.amount)}
                  required
                />
                <FieldError message={fieldErrors.amount} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor="expense-date">
                  Data
                </label>
                <Input
                  id="expense-date"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor="expense-description">
                  Descrição
                </label>
                <Input
                  id="expense-description"
                  placeholder="Descrição"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <fieldset className="space-y-3 rounded-lg border border-border p-3">
              <legend className="px-1 text-xs font-medium text-muted-foreground">Pagamento</legend>

              {paymentLocked && (
                <Alert variant="info">
                  <Info />
                  <AlertDescription>{SETTLED_EXPENSE_MESSAGE}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground" htmlFor="expense-paid-by">
                    Quem pagou
                  </label>
                  <select
                    id="expense-paid-by"
                    value={payment.paidBy}
                    onChange={(e) => {
                      setPayment(changePaidBy(payment, e.target.value as TripExpensePaidBy | ''));
                      setFieldErrors({});
                    }}
                    className={TRIP_NATIVE_SELECT_CLASS}
                    disabled={paymentLocked}
                    aria-invalid={Boolean(fieldErrors.paidBy)}
                  >
                    <option value="" disabled={!allowEmptyPaidBy}>
                      {allowEmptyPaidBy ? 'Não informado' : 'Selecione'}
                    </option>
                    {TRIP_EXPENSE_PAID_BY.map((item) => (
                      <option key={item} value={item}>
                        {TRIP_EXPENSE_PAID_BY_LABELS[item]}
                      </option>
                    ))}
                  </select>
                  <FieldError message={fieldErrors.paidBy} />
                </div>

                {showsPaymentMethod(payment) && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground" htmlFor="expense-payment-method">
                      Forma de pagamento
                    </label>
                    <select
                      id="expense-payment-method"
                      value={payment.paymentMethod}
                      onChange={(e) => {
                        setPayment(
                          changePaymentMethod(payment, e.target.value as TripExpensePaymentMethod | ''),
                        );
                        setFieldErrors((current) => ({...current, paymentMethod: undefined, dueDate: undefined}));
                      }}
                      className={TRIP_NATIVE_SELECT_CLASS}
                      disabled={paymentLocked}
                      aria-invalid={Boolean(fieldErrors.paymentMethod)}
                    >
                      <option value="" disabled>
                        Selecione
                      </option>
                      {paymentMethodOptions(payment.paidBy).map((item) => (
                        <option key={item} value={item}>
                          {TRIP_EXPENSE_PAYMENT_METHOD_LABELS[item]}
                        </option>
                      ))}
                    </select>
                    <FieldError message={fieldErrors.paymentMethod} />
                  </div>
                )}

                {showsDueDate(payment) && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground" htmlFor="expense-due-date">
                      Vencimento
                    </label>
                    <Input
                      id="expense-due-date"
                      type="date"
                      value={payment.dueDate}
                      onChange={(e) => {
                        setPayment({...payment, dueDate: e.target.value});
                        setFieldErrors((current) => ({...current, dueDate: undefined}));
                      }}
                      disabled={paymentLocked}
                      aria-invalid={Boolean(fieldErrors.dueDate)}
                      required
                    />
                    <FieldError message={fieldErrors.dueDate} />
                  </div>
                )}
              </div>

              {effect && !paymentLocked && (
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  {effect}
                </p>
              )}
            </fieldset>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="expense-notes">
                Observação
              </label>
              <Textarea
                id="expense-notes"
                rows={2}
                placeholder="Observações opcionais"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_RECEIPT_TYPES.join(',')}
                className="hidden"
                onChange={handleReceiptUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Comprovante
              </Button>
              {receiptUrl && (
                <>
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="size-3.5" />
                    Ver comprovante
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setReceiptUrl(null)}
                  >
                    <X className="size-4" />
                    Remover
                  </Button>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving || uploading}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                {editing ? 'Salvar alterações' : 'Registrar'}
              </Button>
              {editing && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <TableContainer>
        <DataTable
          columns={[
            {
              id: 'type',
              header: 'Tipo',
              cell: (row) => expenseTypeLabel(row.expenseType),
            },
            {
              id: 'description',
              header: 'Descrição',
              className: 'max-w-[16rem] truncate',
              cell: (row) => row.description ?? '—',
            },
            {
              id: 'amount',
              header: 'Valor',
              className: 'whitespace-nowrap',
              cell: (row) => formatCurrency(row.amount, row.currency),
            },
            {
              id: 'date',
              header: 'Data',
              className: 'whitespace-nowrap',
              cell: (row) => formatDateBr(row.expenseDate),
            },
            {
              id: 'paidBy',
              header: 'Quem pagou',
              cell: (row) =>
                row.paidBy ? (
                  <div className="leading-tight">
                    <p>{TRIP_EXPENSE_PAID_BY_LABELS[row.paidBy]}</p>
                    {row.paymentMethod && (
                      <p className="text-xs text-muted-foreground">
                        {TRIP_EXPENSE_PAYMENT_METHOD_LABELS[row.paymentMethod]}
                        {row.paymentMethod === 'supplier_credit' && row.dueDate
                          ? ` · vence ${formatDateBr(row.dueDate)}`
                          : ''}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Não informado</span>
                ),
            },
            {
              id: 'status',
              header: 'Situação financeira',
              cell: (row) => {
                const status = statusById.get(row.id);
                return status ? <StatusBadge status={status} /> : null;
              },
            },
            {
              id: 'actions',
              header: '',
              className: 'w-28',
              cell: (row) => (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Editar despesa"
                    onClick={() => startEdit(row)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Excluir despesa"
                    onClick={() => handleDelete(row)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ),
            },
          ]}
          data={expenses}
          getRowKey={(row) => row.id}
          emptyTitle="Nenhuma despesa"
          emptyDescription="Registre pedágios, alimentação e outras despesas da viagem."
        />
      </TableContainer>
    </div>
  );
}

export {TripExpensesTab};
