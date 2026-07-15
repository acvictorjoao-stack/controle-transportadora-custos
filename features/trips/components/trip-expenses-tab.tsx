'use client';

import {ExternalLink, Loader2, Pencil, Trash2, Upload, X} from 'lucide-react';
import * as React from 'react';

import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {useConfirm} from '@/contexts/feedback/confirm-context';
import {MSG} from '@/lib/feedback/messages';
import {createClient} from '@/supabase/client';

import {
  createTripExpenseAction,
  deleteTripExpenseAction,
  updateTripExpenseAction,
} from '../actions';
import {TRIP_EXPENSE_TYPES} from '../constants/enums';
import {TRIP_STORAGE_BUCKET} from '../constants';
import type {TripExpense, TripExpenseType} from '../types';
import {TRIP_EXPENSE_TYPE_LABELS} from '../types';
import {formatDateBr} from '../utils/trip-status';
import {TRIP_NATIVE_SELECT_CLASS} from '../utils/form-styles';

const ACCEPTED_RECEIPT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const MAX_RECEIPT_SIZE = 10 * 1024 * 1024;

function formatCurrency(value: number, currency = 'BRL') {
  return value.toLocaleString('pt-BR', {style: 'currency', currency});
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function expenseTypeLabel(type: string) {
  return TRIP_EXPENSE_TYPE_LABELS[type as TripExpenseType] ?? type;
}

export interface TripExpensesTabProps {
  companyId: string;
  tripId: string;
  expenses: TripExpense[];
  onSaved: () => void;
}

function TripExpensesTab({
  companyId,
  tripId,
  expenses,
  onSaved,
}: TripExpensesTabProps) {
  const confirm = useConfirm();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [type, setType] = React.useState<TripExpenseType>('toll');
  const [amount, setAmount] = React.useState('');
  const [expenseDate, setExpenseDate] = React.useState(todayIsoDate);
  const [description, setDescription] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [receiptUrl, setReceiptUrl] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  function resetForm() {
    setEditingId(null);
    setType('toll');
    setAmount('');
    setExpenseDate(todayIsoDate());
    setDescription('');
    setNotes('');
    setReceiptUrl(null);
    setError(null);
  }

  function startEdit(expense: TripExpense) {
    setEditingId(expense.id);
    setType(
      TRIP_EXPENSE_TYPES.includes(expense.expenseType as TripExpenseType)
        ? (expense.expenseType as TripExpenseType)
        : 'other',
    );
    setAmount(String(expense.amount));
    setExpenseDate(expense.expenseDate.slice(0, 10));
    setDescription(expense.description ?? '');
    setNotes(expense.notes ?? '');
    setReceiptUrl(expense.receiptUrl);
    setError(null);
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

      const {data: urlData} = supabase.storage
        .from(TRIP_STORAGE_BUCKET)
        .getPublicUrl(path);

      setReceiptUrl(`${urlData.publicUrl}?t=${Date.now()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar comprovante.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      tripId,
      expenseType: type,
      amount: amount || 0,
      expenseDate: expenseDate || null,
      description: description || null,
      notes: notes || null,
      receiptUrl,
    };

    const result = editingId
      ? await updateTripExpenseAction({...payload, id: editingId})
      : await createTripExpenseAction(payload);

    setSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    resetForm();
    onSaved();
  }

  async function handleDelete(expense: TripExpense) {
    const confirmed = await confirm({
      title: MSG.deleteConfirmTitle,
      description: MSG.deleteConfirmDescription,
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

    if (editingId === expense.id) resetForm();
    onSaved();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total de despesas</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">
          {formatCurrency(total)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {editingId ? 'Editar despesa' : 'Registrar despesa'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
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
                  {TRIP_EXPENSE_TYPES.map((item) => (
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
                  required
                />
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
                {editingId ? 'Salvar alterações' : 'Registrar'}
              </Button>
              {editingId && (
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
              id: 'amount',
              header: 'Valor',
              cell: (row) => formatCurrency(row.amount, row.currency),
            },
            {
              id: 'date',
              header: 'Data',
              cell: (row) => formatDateBr(row.expenseDate),
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
                    onClick={() => startEdit(row)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
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
