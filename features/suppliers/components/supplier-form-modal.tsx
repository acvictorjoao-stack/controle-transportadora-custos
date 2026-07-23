'use client';

import {Loader2, Save} from 'lucide-react';
import * as React from 'react';

import {FormField} from '@/components/master/shared/form-field';
import {Modal} from '@/components/master/shared/modal';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {useToast} from '@/contexts/feedback/toast-context';
import {digitsOnly, formatTaxId} from '@/features/master/companies/utils/format';
import {MSG} from '@/lib/feedback/messages';

import {createSupplierAction, updateSupplierAction} from '../actions';
import {SUPPLIER_CATEGORIES, SUPPLIER_DOCUMENT_TYPES} from '../constants/enums';
import type {Supplier, SupplierCategory, SupplierDocumentType} from '../types';
import {SUPPLIER_CATEGORY_LABELS, SUPPLIER_DOCUMENT_TYPE_LABELS} from '../types';
import type {CreateSupplierInput} from '../validation';
import {
  formatPhoneInput,
  formatZipCodeInput,
  normalizePhoneDigits,
  normalizeZipCodeDigits,
  SUPPLIER_NATIVE_SELECT_CLASS,
} from '../utils/supplier-format';

export interface SupplierFormModalProps {
  open: boolean;
  onClose: () => void;
  supplier?: Supplier | null;
  onSaved: () => void;
}

type FieldErrors = Partial<Record<keyof CreateSupplierInput, string>>;

async function lookupCep(cep: string): Promise<{
  address?: string;
  district?: string;
  city?: string;
  state?: string;
} | null> {
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) return null;
    const data = (await response.json()) as {
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (data.erro) return null;
    return {
      address: data.logradouro?.toUpperCase() || undefined,
      district: data.bairro?.toUpperCase() || undefined,
      city: data.localidade?.toUpperCase() || undefined,
      state: data.uf?.toUpperCase() || undefined,
    };
  } catch {
    return null;
  }
}

function SupplierFormModal({open, onClose, supplier, onSaved}: SupplierFormModalProps) {
  const isEdit = Boolean(supplier);
  const formKey = `${open}-${supplier?.id ?? 'new'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar fornecedor' : 'Novo fornecedor'}
      description={
        isEdit
          ? 'Atualize os dados do fornecedor'
          : 'Cadastre empresas e pessoas físicas que prestam serviços ou fornecem produtos'
      }
      size="xl"
    >
      <SupplierFormContent
        key={formKey}
        supplier={supplier}
        isEdit={isEdit}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

function SupplierFormContent({
  supplier,
  isEdit,
  onClose,
  onSaved,
}: {
  supplier?: Supplier | null;
  isEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [formData, setFormData] = React.useState(() => ({
    corporateName: supplier?.corporateName ?? '',
    tradeName: supplier?.tradeName ?? null,
    document: supplier?.document ?? null,
    documentType: (supplier?.documentType ?? null) as SupplierDocumentType | null,
    categories: (supplier?.categories?.length ? supplier.categories : ['outros']) as SupplierCategory[],
    phone: supplier?.phone ?? null,
    email: supplier?.email ?? null,
    contactName: supplier?.contactName ?? null,
    zipCode: supplier?.zipCode ?? null,
    address: supplier?.address ?? null,
    number: supplier?.number ?? null,
    district: supplier?.district ?? null,
    city: supplier?.city ?? null,
    state: supplier?.state ?? null,
    active: supplier?.active ?? true,
    notes: supplier?.notes ?? null,
  }));
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [cepLoading, setCepLoading] = React.useState(false);

  function updateField<K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) {
    setFormData((prev) => ({...prev, [field]: value}));
    setFieldErrors((prev) => {
      if (!prev[field as keyof FieldErrors]) return prev;
      const next = {...prev};
      delete next[field as keyof FieldErrors];
      return next;
    });
  }

  function toggleCategory(cat: SupplierCategory) {
    setFormData((prev) => {
      const has = prev.categories.includes(cat);
      const categories = has
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat];
      return {...prev, categories: categories.length ? categories : ['outros']};
    });
  }

  async function handleCepBlur() {
    const cep = formData.zipCode ? normalizeZipCodeDigits(formData.zipCode) : '';
    if (cep.length !== 8) return;
    setCepLoading(true);
    const result = await lookupCep(cep);
    setCepLoading(false);
    if (!result) return;
    setFormData((prev) => ({
      ...prev,
      address: result.address ?? prev.address,
      district: result.district ?? prev.district,
      city: result.city ?? prev.city,
      state: result.state ?? prev.state,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const payload: CreateSupplierInput = {
      ...formData,
      categories: formData.categories.length ? formData.categories : ['outros'],
    };

    const result =
      isEdit && supplier
        ? await updateSupplierAction(supplier.id, payload)
        : await createSupplierAction(payload);

    if (!result.success) {
      setFormError(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors as FieldErrors);
      setSubmitting(false);
      return;
    }

    toast.success(isEdit ? MSG.updated('Fornecedor') : MSG.created('Fornecedor'));
    onSaved();
    onClose();
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Razão social / Nome"
          htmlFor="sup-corporate"
          error={fieldErrors.corporateName}
          required
        >
          <Input
            id="sup-corporate"
            value={formData.corporateName}
            onChange={(e) => updateField('corporateName', e.target.value.toUpperCase())}
            className="uppercase"
            required
          />
        </FormField>
        <FormField label="Nome fantasia" htmlFor="sup-trade" error={fieldErrors.tradeName}>
          <Input
            id="sup-trade"
            value={formData.tradeName ?? ''}
            onChange={(e) => updateField('tradeName', e.target.value.toUpperCase() || null)}
            className="uppercase"
          />
        </FormField>
        <FormField label="Tipo documento" htmlFor="sup-doctype" error={fieldErrors.documentType}>
          <select
            id="sup-doctype"
            value={formData.documentType ?? ''}
            onChange={(e) =>
              updateField(
                'documentType',
                (e.target.value || null) as SupplierDocumentType | null,
              )
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
        <FormField label="CNPJ / CPF" htmlFor="sup-document" error={fieldErrors.document}>
          <Input
            id="sup-document"
            value={formData.document ? formatTaxId(formData.document) : ''}
            onChange={(e) => updateField('document', digitsOnly(e.target.value).slice(0, 14) || null)}
          />
        </FormField>
        <FormField label="Telefone" htmlFor="sup-phone" error={fieldErrors.phone}>
          <Input
            id="sup-phone"
            value={formData.phone ? formatPhoneInput(formData.phone) : ''}
            onChange={(e) =>
              updateField('phone', normalizePhoneDigits(e.target.value) || null)
            }
          />
        </FormField>
        <FormField label="E-mail" htmlFor="sup-email" error={fieldErrors.email}>
          <Input
            id="sup-email"
            type="email"
            value={formData.email ?? ''}
            onChange={(e) => updateField('email', e.target.value || null)}
          />
        </FormField>
        <FormField label="Contato" htmlFor="sup-contact" error={fieldErrors.contactName}>
          <Input
            id="sup-contact"
            value={formData.contactName ?? ''}
            onChange={(e) => updateField('contactName', e.target.value.toUpperCase() || null)}
            className="uppercase"
          />
        </FormField>
        <FormField label="Status" htmlFor="sup-active">
          <select
            id="sup-active"
            value={formData.active ? '1' : '0'}
            onChange={(e) => updateField('active', e.target.value === '1')}
            className={SUPPLIER_NATIVE_SELECT_CLASS}
          >
            <option value="1">Ativo</option>
            <option value="0">Inativo</option>
          </select>
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
            const selected = formData.categories.includes(cat);
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FormField label="CEP" htmlFor="sup-zip" error={fieldErrors.zipCode}>
          <Input
            id="sup-zip"
            value={formData.zipCode ? formatZipCodeInput(formData.zipCode) : ''}
            onChange={(e) =>
              updateField('zipCode', normalizeZipCodeDigits(e.target.value) || null)
            }
            onBlur={handleCepBlur}
            disabled={cepLoading}
          />
        </FormField>
        <FormField label="Endereço" htmlFor="sup-address" error={fieldErrors.address} className="sm:col-span-2">
          <Input
            id="sup-address"
            value={formData.address ?? ''}
            onChange={(e) => updateField('address', e.target.value.toUpperCase() || null)}
            className="uppercase"
          />
        </FormField>
        <FormField label="Número" htmlFor="sup-number" error={fieldErrors.number}>
          <Input
            id="sup-number"
            value={formData.number ?? ''}
            onChange={(e) => updateField('number', e.target.value.toUpperCase() || null)}
          />
        </FormField>
        <FormField label="Bairro" htmlFor="sup-district" error={fieldErrors.district}>
          <Input
            id="sup-district"
            value={formData.district ?? ''}
            onChange={(e) => updateField('district', e.target.value.toUpperCase() || null)}
            className="uppercase"
          />
        </FormField>
        <FormField label="Cidade" htmlFor="sup-city" error={fieldErrors.city}>
          <Input
            id="sup-city"
            value={formData.city ?? ''}
            onChange={(e) => updateField('city', e.target.value.toUpperCase() || null)}
            className="uppercase"
          />
        </FormField>
        <FormField label="UF" htmlFor="sup-state" error={fieldErrors.state}>
          <Input
            id="sup-state"
            value={formData.state ?? ''}
            onChange={(e) =>
              updateField('state', e.target.value.toUpperCase().slice(0, 2) || null)
            }
            className="uppercase"
            maxLength={2}
          />
        </FormField>
      </div>

      <FormField label="Observações" htmlFor="sup-notes" error={fieldErrors.notes}>
        <Textarea
          id="sup-notes"
          value={formData.notes ?? ''}
          onChange={(e) => updateField('notes', e.target.value || null)}
          rows={3}
        />
      </FormField>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar
        </Button>
      </div>
    </form>
  );
}

export {SupplierFormModal};
