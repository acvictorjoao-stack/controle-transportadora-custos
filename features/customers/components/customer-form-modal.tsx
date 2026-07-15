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
import type {BranchSelectOption} from '@/features/organization/branches/types';
import {digitsOnly, formatTaxId} from '@/features/master/companies/utils/format';
import {MSG} from '@/lib/feedback/messages';

import {
  createCustomerAction,
  createCustomerAddressAction,
  updateCustomerAction,
} from '../actions';
import {CUSTOMER_SEGMENTS, CUSTOMER_STATUSES} from '../constants/enums';
import type {Customer, CustomerSegment, CustomerStatus} from '../types';
import {CUSTOMER_SEGMENT_LABELS, CUSTOMER_STATUS_LABELS} from '../types';
import type {CreateCustomerInput} from '../validation';
import {CUSTOMER_NATIVE_SELECT_CLASS} from '../utils/form-styles';
import {
  formatPhoneInput,
  formatZipCodeInput,
  normalizePhoneDigits,
  normalizeZipCodeDigits,
} from '../utils/customer-format';
import {
  formatStateRegistrationInput,
  parseStateRegistrationInput,
} from '../utils/state-registration';

export interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
  branches: BranchSelectOption[];
  onSaved: () => void;
  ieStateUf?: string | null;
}

type FieldErrors = Partial<Record<keyof CreateCustomerInput, string>>;

type AddressDraft = {
  zipCode: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
};

const EMPTY_ADDRESS: AddressDraft = {
  zipCode: null,
  street: null,
  number: null,
  neighborhood: null,
  city: null,
  state: null,
};

function hasAddressData(address: AddressDraft): boolean {
  return Boolean(
    address.zipCode ||
      address.street ||
      address.number ||
      address.neighborhood ||
      address.city ||
      address.state,
  );
}

async function lookupCep(cep: string): Promise<Partial<AddressDraft> | null> {
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
      street: data.logradouro?.toUpperCase() || null,
      neighborhood: data.bairro?.toUpperCase() || null,
      city: data.localidade?.toUpperCase() || null,
      state: data.uf?.toUpperCase() || null,
    };
  } catch {
    return null;
  }
}

function CustomerFormModal({
  open,
  onClose,
  customer,
  branches,
  onSaved,
  ieStateUf,
}: CustomerFormModalProps) {
  const isEdit = Boolean(customer);
  const formKey = `${open}-${customer?.id ?? 'new'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar cliente' : 'Novo cliente'}
      description={
        isEdit
          ? 'Atualize os dados do cliente'
          : 'Cadastro rápido — complete os demais dados depois'
      }
      size={isEdit ? 'xl' : 'lg'}
    >
      {isEdit ? (
        <CustomerEditFormContent
          key={formKey}
          customer={customer}
          branches={branches}
          onClose={onClose}
          onSaved={onSaved}
          ieStateUf={ieStateUf}
        />
      ) : (
        <CustomerCreateFormContent
          key={formKey}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}

function CustomerCreateFormContent({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [legalName, setLegalName] = React.useState('');
  const [tradeName, setTradeName] = React.useState<string | null>(null);
  const [taxId, setTaxId] = React.useState<string | null>(null);
  const [customerStatus, setCustomerStatus] =
    React.useState<CustomerStatus>('active');
  const [address, setAddress] = React.useState<AddressDraft>(EMPTY_ADDRESS);
  const [cepLoading, setCepLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const toast = useToast();
  const lastLookupCep = React.useRef<string | null>(null);

  function updateAddress<K extends keyof AddressDraft>(
    field: K,
    value: AddressDraft[K],
  ) {
    setAddress((prev) => ({...prev, [field]: value}));
  }

  async function handleCepChange(raw: string) {
    const digits = normalizeZipCodeDigits(raw);
    updateAddress('zipCode', digits);

    if (!digits || digits.length !== 8 || digits === lastLookupCep.current) {
      return;
    }

    lastLookupCep.current = digits;
    setCepLoading(true);
    const result = await lookupCep(digits);
    setCepLoading(false);

    if (!result) return;

    setAddress((prev) => ({
      ...prev,
      zipCode: digits,
      street: result.street ?? prev.street,
      neighborhood: result.neighborhood ?? prev.neighborhood,
      city: result.city ?? prev.city,
      state: result.state ?? prev.state,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    if (!legalName.trim()) {
      setFieldErrors({legalName: 'Informe a razão social.'});
      setSubmitting(false);
      return;
    }

    if (!taxId || taxId.length !== 14) {
      setFieldErrors({taxId: 'Informe um CNPJ válido.'});
      setSubmitting(false);
      return;
    }

    const payload = {
      legalName: legalName.trim().toUpperCase(),
      tradeName: tradeName?.trim().toUpperCase() || null,
      taxId,
      customerStatus,
    };

    const result = await createCustomerAction(payload);

    if (!result.success) {
      setFormError(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors as FieldErrors);
      setSubmitting(false);
      return;
    }

    if (hasAddressData(address)) {
      const addressResult = await createCustomerAddressAction(result.data.id, {
        addressType: 'headquarters',
        label: null,
        street: address.street?.toUpperCase() || null,
        number: address.number || null,
        complement: null,
        neighborhood: address.neighborhood?.toUpperCase() || null,
        city: address.city?.toUpperCase() || null,
        state: address.state?.toUpperCase() || null,
        zipCode: address.zipCode,
        country: 'BR',
        isPrimary: true,
      });

      if (!addressResult.success) {
        toast.success(
          'Cliente criado. O endereço não pôde ser salvo — complete na aba Endereços.',
        );
        onSaved();
        setSubmitting(false);
        onClose();
        return;
      }
    }

    toast.success(MSG.created('Cliente'));
    onSaved();
    setSubmitting(false);
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Razão Social"
          htmlFor="customer-legal-name"
          error={fieldErrors.legalName}
          required
        >
          <Input
            id="customer-legal-name"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value.toUpperCase())}
            className="uppercase"
            autoComplete="organization"
          />
        </FormField>
        <FormField
          label="Nome Fantasia"
          htmlFor="customer-trade-name"
          error={fieldErrors.tradeName}
          hint="Opcional"
        >
          <Input
            id="customer-trade-name"
            value={tradeName ?? ''}
            onChange={(e) =>
              setTradeName(e.target.value.toUpperCase() || null)
            }
            className="uppercase"
          />
        </FormField>
        <FormField
          label="CNPJ"
          htmlFor="customer-tax-id"
          error={fieldErrors.taxId}
          required
        >
          <Input
            id="customer-tax-id"
            inputMode="numeric"
            value={taxId ? formatTaxId(taxId) : ''}
            onChange={(e) => {
              const digits = digitsOnly(e.target.value).slice(0, 14);
              setTaxId(digits.length ? digits : null);
            }}
            maxLength={18}
          />
        </FormField>
        <FormField
          label="Status"
          htmlFor="customer-status"
          error={fieldErrors.customerStatus}
          required
        >
          <select
            id="customer-status"
            className={CUSTOMER_NATIVE_SELECT_CLASS}
            value={customerStatus}
            onChange={(e) =>
              setCustomerStatus(e.target.value as CustomerStatus)
            }
          >
            {CUSTOMER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CUSTOMER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <p className="text-sm font-medium text-foreground">
          Endereço
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            Opcional
          </span>
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FormField
            label="CEP"
            htmlFor="customer-zip"
            hint={cepLoading ? 'Buscando…' : undefined}
          >
            <Input
              id="customer-zip"
              inputMode="numeric"
              value={formatZipCodeInput(address.zipCode)}
              onChange={(e) => void handleCepChange(e.target.value)}
              maxLength={9}
              placeholder="00000-000"
            />
          </FormField>
          <FormField
            label="Endereço (Rua)"
            htmlFor="customer-street"
            className="md:col-span-2"
          >
            <Input
              id="customer-street"
              value={address.street ?? ''}
              onChange={(e) =>
                updateAddress('street', e.target.value.toUpperCase() || null)
              }
              className="uppercase"
            />
          </FormField>
          <FormField label="Número" htmlFor="customer-number">
            <Input
              id="customer-number"
              value={address.number ?? ''}
              onChange={(e) => updateAddress('number', e.target.value || null)}
            />
          </FormField>
          <FormField label="Bairro" htmlFor="customer-neighborhood">
            <Input
              id="customer-neighborhood"
              value={address.neighborhood ?? ''}
              onChange={(e) =>
                updateAddress(
                  'neighborhood',
                  e.target.value.toUpperCase() || null,
                )
              }
              className="uppercase"
            />
          </FormField>
          <FormField label="Cidade" htmlFor="customer-city">
            <Input
              id="customer-city"
              value={address.city ?? ''}
              onChange={(e) =>
                updateAddress('city', e.target.value.toUpperCase() || null)
              }
              className="uppercase"
            />
          </FormField>
          <FormField label="Estado (UF)" htmlFor="customer-state">
            <Input
              id="customer-state"
              value={address.state ?? ''}
              onChange={(e) =>
                updateAddress(
                  'state',
                  e.target.value.toUpperCase().slice(0, 2) || null,
                )
              }
              className="uppercase"
              maxLength={2}
              placeholder="SP"
            />
          </FormField>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting || cepLoading}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar
        </Button>
      </div>
    </form>
  );
}

function CustomerEditFormContent({
  customer,
  branches,
  onClose,
  onSaved,
  ieStateUf,
}: {
  customer?: Customer | null;
  branches: BranchSelectOption[];
  onClose: () => void;
  onSaved: () => void;
  ieStateUf?: string | null;
}) {
  const [formData, setFormData] = React.useState<CreateCustomerInput>(() => ({
    legalName: customer?.legalName ?? '',
    tradeName: customer?.tradeName ?? null,
    taxId: customer?.taxId ?? null,
    stateRegistration: customer?.stateRegistration ?? null,
    municipalRegistration: customer?.municipalRegistration ?? null,
    email: customer?.email ?? null,
    phone: customer?.phone ?? null,
    whatsapp: customer?.whatsapp ?? null,
    website: customer?.website ?? null,
    customerStatus: customer?.customerStatus ?? 'active',
    segment: customer?.segment ?? null,
    notes: customer?.notes ?? null,
    salesRepresentative: customer?.salesRepresentative ?? null,
    creditLimit: customer?.creditLimit ?? null,
    paymentTermDays: customer?.paymentTermDays ?? null,
    branchId: customer?.branchId ?? null,
  }));
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const toast = useToast();

  function updateField<K extends keyof CreateCustomerInput>(
    field: K,
    value: CreateCustomerInput[K],
  ) {
    setFormData((prev) => ({...prev, [field]: value}));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = {...prev};
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!customer) return;

    setSubmitting(true);
    setFormError(null);

    const result = await updateCustomerAction(customer.id, formData);

    setSubmitting(false);

    if (!result.success) {
      setFormError(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors as FieldErrors);
      return;
    }

    onSaved();
    toast.success(MSG.updated('Cliente'));
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Razão Social"
          htmlFor="customer-legal-name"
          error={fieldErrors.legalName}
          required
        >
          <Input
            id="customer-legal-name"
            value={formData.legalName}
            onChange={(e) => updateField('legalName', e.target.value.toUpperCase())}
          />
        </FormField>
        <FormField
          label="Nome Fantasia"
          htmlFor="customer-trade-name"
          error={fieldErrors.tradeName}
        >
          <Input
            id="customer-trade-name"
            value={formData.tradeName ?? ''}
            onChange={(e) =>
              updateField('tradeName', e.target.value.toUpperCase() || null)
            }
          />
        </FormField>
        <FormField label="CNPJ" htmlFor="customer-tax-id" error={fieldErrors.taxId}>
          <Input
            id="customer-tax-id"
            inputMode="numeric"
            value={formData.taxId ? formatTaxId(formData.taxId) : ''}
            onChange={(e) => {
              const digits = digitsOnly(e.target.value).slice(0, 14);
              updateField('taxId', digits.length ? digits : null);
            }}
            maxLength={18}
          />
        </FormField>
        <FormField
          label="Status"
          htmlFor="customer-status"
          error={fieldErrors.customerStatus}
        >
          <select
            id="customer-status"
            className={CUSTOMER_NATIVE_SELECT_CLASS}
            value={formData.customerStatus ?? 'active'}
            onChange={(e) =>
              updateField('customerStatus', e.target.value as CustomerStatus)
            }
          >
            {CUSTOMER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CUSTOMER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="IE" htmlFor="customer-ie" error={fieldErrors.stateRegistration}>
          <Input
            id="customer-ie"
            value={formatStateRegistrationInput(formData.stateRegistration, ieStateUf)}
            onChange={(e) =>
              updateField(
                'stateRegistration',
                parseStateRegistrationInput(e.target.value, ieStateUf) || null,
              )
            }
          />
        </FormField>
        <FormField
          label="IM"
          htmlFor="customer-im"
          error={fieldErrors.municipalRegistration}
        >
          <Input
            id="customer-im"
            value={formData.municipalRegistration ?? ''}
            onChange={(e) =>
              updateField(
                'municipalRegistration',
                e.target.value.toUpperCase() || null,
              )
            }
          />
        </FormField>
        <FormField label="E-mail" htmlFor="customer-email" error={fieldErrors.email}>
          <Input
            id="customer-email"
            type="email"
            value={formData.email ?? ''}
            onChange={(e) => updateField('email', e.target.value || null)}
          />
        </FormField>
        <FormField label="Telefone" htmlFor="customer-phone" error={fieldErrors.phone}>
          <Input
            id="customer-phone"
            inputMode="numeric"
            value={formatPhoneInput(formData.phone)}
            onChange={(e) =>
              updateField('phone', normalizePhoneDigits(e.target.value))
            }
            maxLength={15}
          />
        </FormField>
        <FormField
          label="WhatsApp"
          htmlFor="customer-whatsapp"
          error={fieldErrors.whatsapp}
        >
          <Input
            id="customer-whatsapp"
            inputMode="numeric"
            value={formatPhoneInput(formData.whatsapp)}
            onChange={(e) =>
              updateField('whatsapp', normalizePhoneDigits(e.target.value))
            }
            maxLength={15}
          />
        </FormField>
        <FormField label="Site" htmlFor="customer-website" error={fieldErrors.website}>
          <Input
            id="customer-website"
            value={formData.website ?? ''}
            onChange={(e) => updateField('website', e.target.value || null)}
          />
        </FormField>
        <FormField label="Segmento" htmlFor="customer-segment" error={fieldErrors.segment}>
          <select
            id="customer-segment"
            className={CUSTOMER_NATIVE_SELECT_CLASS}
            value={formData.segment ?? ''}
            onChange={(e) =>
              updateField(
                'segment',
                (e.target.value || null) as CustomerSegment | null,
              )
            }
          >
            <option value="">—</option>
            {CUSTOMER_SEGMENTS.map((s) => (
              <option key={s} value={s}>
                {CUSTOMER_SEGMENT_LABELS[s]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label="Responsável Comercial"
          htmlFor="customer-sales-rep"
          error={fieldErrors.salesRepresentative}
        >
          <Input
            id="customer-sales-rep"
            value={formData.salesRepresentative ?? ''}
            onChange={(e) =>
              updateField(
                'salesRepresentative',
                e.target.value.toUpperCase() || null,
              )
            }
          />
        </FormField>
        <FormField
          label="Limite de Crédito"
          htmlFor="customer-credit-limit"
          error={fieldErrors.creditLimit}
        >
          <Input
            id="customer-credit-limit"
            type="number"
            step="0.01"
            value={formData.creditLimit ?? ''}
            onChange={(e) =>
              updateField(
                'creditLimit',
                e.target.value ? Number(e.target.value) : null,
              )
            }
          />
        </FormField>
        <FormField
          label="Prazo de Pagamento (dias)"
          htmlFor="customer-payment-term"
          error={fieldErrors.paymentTermDays}
        >
          <Input
            id="customer-payment-term"
            type="number"
            value={formData.paymentTermDays ?? ''}
            onChange={(e) =>
              updateField(
                'paymentTermDays',
                e.target.value ? Number(e.target.value) : null,
              )
            }
          />
        </FormField>
        <FormField label="Filial" htmlFor="customer-branch" error={fieldErrors.branchId}>
          <select
            id="customer-branch"
            className={CUSTOMER_NATIVE_SELECT_CLASS}
            value={formData.branchId ?? ''}
            onChange={(e) => updateField('branchId', e.target.value || null)}
          >
            <option value="">—</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Observações" htmlFor="customer-notes" error={fieldErrors.notes}>
        <Textarea
          id="customer-notes"
          rows={3}
          value={formData.notes ?? ''}
          onChange={(e) =>
            updateField('notes', e.target.value.toUpperCase() || null)
          }
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

export {CustomerFormModal};
