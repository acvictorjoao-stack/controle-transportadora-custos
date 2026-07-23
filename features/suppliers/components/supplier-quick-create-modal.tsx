'use client';

import {Loader2, Save} from 'lucide-react';
import * as React from 'react';

import {FormField} from '@/components/master/shared/form-field';
import {Modal} from '@/components/master/shared/modal';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useToast} from '@/contexts/feedback/toast-context';
import {digitsOnly, formatTaxId} from '@/features/master/companies/utils/format';

import {quickCreateSupplierAction} from '../actions';
import {SUPPLIER_CATEGORIES, SUPPLIER_DOCUMENT_TYPES} from '../constants/enums';
import type {Supplier, SupplierCategory, SupplierDocumentType} from '../types';
import {SUPPLIER_CATEGORY_LABELS, SUPPLIER_DOCUMENT_TYPE_LABELS} from '../types';
import {formatPhoneInput, SUPPLIER_NATIVE_SELECT_CLASS} from '../utils/supplier-format';

export interface SupplierQuickCreateModalProps {
  open: boolean;
  onClose: () => void;
  defaultCategories?: SupplierCategory[];
  onCreated: (supplier: Supplier) => void;
}

type QuickFormState = {
  corporateName: string;
  tradeName: string;
  document: string;
  documentType: SupplierDocumentType | '';
  categories: SupplierCategory[];
  phone: string;
  email: string;
};

function buildInitialState(defaultCategories: SupplierCategory[]): QuickFormState {
  return {
    corporateName: '',
    tradeName: '',
    document: '',
    documentType: '',
    categories: defaultCategories,
    phone: '',
    email: '',
  };
}

function SupplierQuickCreateModal({
  open,
  onClose,
  defaultCategories = ['outros'],
  onCreated,
}: SupplierQuickCreateModalProps) {
  const toast = useToast();
  const formKey = `${open}-${defaultCategories.join(',')}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo fornecedor"
      description="Cadastro rápido — complete os demais dados depois"
      size="lg"
    >
      <SupplierQuickCreateForm
        key={formKey}
        defaultCategories={defaultCategories}
        onClose={onClose}
        onCreated={onCreated}
        toast={toast}
      />
    </Modal>
  );
}

function SupplierQuickCreateForm({
  defaultCategories,
  onClose,
  onCreated,
  toast,
}: {
  defaultCategories: SupplierCategory[];
  onClose: () => void;
  onCreated: (supplier: Supplier) => void;
  toast: ReturnType<typeof useToast>;
}) {
  const [form, setForm] = React.useState(() => buildInitialState(defaultCategories));
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  function toggleCategory(cat: SupplierCategory) {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    const result = await quickCreateSupplierAction({
      corporateName: form.corporateName,
      tradeName: form.tradeName || null,
      document: form.document || null,
      documentType: form.documentType || null,
      categories: form.categories.length ? form.categories : ['outros'],
      phone: form.phone || null,
      email: form.email || null,
    });

    if (!result.success) {
      setError(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      setSubmitting(false);
      return;
    }

    toast.success('Fornecedor cadastrado');
    onCreated(result.data);
    onClose();
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Razão social / Nome"
          htmlFor="qs-corporate"
          error={fieldErrors.corporateName}
          required
        >
          <Input
            id="qs-corporate"
            value={form.corporateName}
            onChange={(e) =>
              setForm((prev) => ({...prev, corporateName: e.target.value.toUpperCase()}))
            }
            className="uppercase"
            required
          />
        </FormField>
        <FormField label="Nome fantasia" htmlFor="qs-trade" error={fieldErrors.tradeName}>
          <Input
            id="qs-trade"
            value={form.tradeName}
            onChange={(e) =>
              setForm((prev) => ({...prev, tradeName: e.target.value.toUpperCase()}))
            }
            className="uppercase"
          />
        </FormField>
        <FormField label="Tipo documento" htmlFor="qs-doctype" error={fieldErrors.documentType}>
          <select
            id="qs-doctype"
            value={form.documentType}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                documentType: e.target.value as SupplierDocumentType | '',
              }))
            }
            className={SUPPLIER_NATIVE_SELECT_CLASS}
          >
            <option value="">—</option>
            {SUPPLIER_DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {SUPPLIER_DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="CNPJ / CPF" htmlFor="qs-document" error={fieldErrors.document}>
          <Input
            id="qs-document"
            value={form.document ? formatTaxId(form.document) : ''}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                document: digitsOnly(e.target.value).slice(0, 14),
              }))
            }
          />
        </FormField>
        <FormField label="Telefone" htmlFor="qs-phone" error={fieldErrors.phone}>
          <Input
            id="qs-phone"
            value={form.phone ? formatPhoneInput(form.phone) : ''}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                phone: digitsOnly(e.target.value).slice(0, 11),
              }))
            }
          />
        </FormField>
        <FormField label="E-mail" htmlFor="qs-email" error={fieldErrors.email}>
          <Input
            id="qs-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({...prev, email: e.target.value}))}
          />
        </FormField>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          Categorias <span className="text-destructive">*</span>
        </p>
        {fieldErrors.categories && (
          <p className="text-sm text-destructive">{fieldErrors.categories}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {SUPPLIER_CATEGORIES.map((cat) => {
            const selected = form.categories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={
                  selected
                    ? 'rounded-md border border-primary bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary'
                    : 'rounded-md border border-input bg-background px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted'
                }
              >
                {SUPPLIER_CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
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

export {SupplierQuickCreateModal};
