'use client';

import {Loader2, Save} from 'lucide-react';
import * as React from 'react';

import {FormField} from '@/components/master/shared/form-field';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {useToast} from '@/contexts/feedback/toast-context';
import {
  formatPhoneInput,
  formatZipCodeInput,
  normalizePhoneDigits,
  normalizeZipCodeDigits,
} from '@/features/customers/utils/customer-format';
import {formatTaxId} from '@/features/master/companies/utils/format';
import {MSG} from '@/lib/feedback/messages';

import {updateCompanyProfileAction} from '../actions';
import type {CompanyProfile} from '../types';
import type {UpdateCompanyProfileInput} from '../validation';

export interface CompanyProfileFormProps {
  company: CompanyProfile;
  onSaved: (company: CompanyProfile) => void;
}

type FieldErrors = Partial<Record<keyof UpdateCompanyProfileInput, string>>;

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

function CompanyProfileForm({company, onSaved}: CompanyProfileFormProps) {
  const toast = useToast();
  const [formData, setFormData] = React.useState<UpdateCompanyProfileInput>(() => ({
    legalName: company.legalName,
    tradeName: company.tradeName,
    taxId: company.taxId,
    email: company.email,
    phone: company.phone,
    whatsapp: company.whatsapp,
    website: company.website,
    stateRegistration: company.stateRegistration,
    municipalRegistration: company.municipalRegistration,
    addressStreet: company.addressStreet,
    addressNumber: company.addressNumber,
    addressComplement: company.addressComplement,
    addressNeighborhood: company.addressNeighborhood,
    addressCity: company.addressCity,
    addressState: company.addressState,
    addressZip: company.addressZip,
    addressCountry: company.addressCountry ?? 'Brasil',
  }));
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  function updateField<K extends keyof UpdateCompanyProfileInput>(
    field: K,
    value: UpdateCompanyProfileInput[K],
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const result = await updateCompanyProfileAction(formData);

    if (!result.success) {
      setFormError(result.error ?? MSG.operationFailed);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors as FieldErrors);
      }
      setSubmitting(false);
      return;
    }

    onSaved(result.data);
    toast.success(MSG.updatedFeminine('Empresa'));
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dados cadastrais</CardTitle>
          <CardDescription>Informações fiscais e de identificação</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Razão Social" htmlFor="legalName" required error={fieldErrors.legalName}>
            <Input
              id="legalName"
              className="uppercase"
              value={formData.legalName}
              onChange={(e) => updateField('legalName', e.target.value.toUpperCase())}
            />
          </FormField>
          <FormField label="Nome Fantasia" htmlFor="tradeName" error={fieldErrors.tradeName}>
            <Input
              id="tradeName"
              className="uppercase"
              value={formData.tradeName ?? ''}
              onChange={(e) =>
                updateField('tradeName', e.target.value ? e.target.value.toUpperCase() : null)
              }
            />
          </FormField>
          <FormField label="CNPJ" htmlFor="taxId" required error={fieldErrors.taxId}>
            <Input
              id="taxId"
              value={formatTaxId(formData.taxId)}
              onChange={(e) => updateField('taxId', e.target.value)}
            />
          </FormField>
          <FormField label="Inscrição Estadual" htmlFor="stateRegistration" error={fieldErrors.stateRegistration}>
            <Input
              id="stateRegistration"
              className="uppercase"
              value={formData.stateRegistration ?? ''}
              onChange={(e) =>
                updateField(
                  'stateRegistration',
                  e.target.value ? e.target.value.toUpperCase() : null,
                )
              }
            />
          </FormField>
          <FormField label="Inscrição Municipal" htmlFor="municipalRegistration" error={fieldErrors.municipalRegistration}>
            <Input
              id="municipalRegistration"
              className="uppercase"
              value={formData.municipalRegistration ?? ''}
              onChange={(e) =>
                updateField(
                  'municipalRegistration',
                  e.target.value ? e.target.value.toUpperCase() : null,
                )
              }
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="E-mail" htmlFor="email" required error={fieldErrors.email}>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
          </FormField>
          <FormField label="Telefone" htmlFor="phone" error={fieldErrors.phone}>
            <Input
              id="phone"
              value={formatPhoneInput(formData.phone)}
              onChange={(e) => updateField('phone', normalizePhoneDigits(e.target.value))}
            />
          </FormField>
          <FormField label="WhatsApp" htmlFor="whatsapp" error={fieldErrors.whatsapp}>
            <Input
              id="whatsapp"
              value={formatPhoneInput(formData.whatsapp)}
              onChange={(e) => updateField('whatsapp', normalizePhoneDigits(e.target.value))}
            />
          </FormField>
          <FormField label="Site" htmlFor="website" error={fieldErrors.website}>
            <Input
              id="website"
              value={formData.website ?? ''}
              onChange={(e) => updateField('website', e.target.value || null)}
              placeholder="https://"
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="CEP" htmlFor="addressZip" error={fieldErrors.addressZip}>
            <Input
              id="addressZip"
              value={formatZipCodeInput(formData.addressZip)}
              onChange={(e) => updateField('addressZip', normalizeZipCodeDigits(e.target.value))}
            />
          </FormField>
          <FormField label="Endereço" htmlFor="addressStreet" error={fieldErrors.addressStreet} className="sm:col-span-2">
            <Input
              id="addressStreet"
              className="uppercase"
              value={formData.addressStreet ?? ''}
              onChange={(e) =>
                updateField(
                  'addressStreet',
                  e.target.value ? e.target.value.toUpperCase() : null,
                )
              }
            />
          </FormField>
          <FormField label="Número" htmlFor="addressNumber" error={fieldErrors.addressNumber}>
            <Input
              id="addressNumber"
              value={formData.addressNumber ?? ''}
              onChange={(e) => updateField('addressNumber', e.target.value || null)}
            />
          </FormField>
          <FormField label="Complemento" htmlFor="addressComplement" error={fieldErrors.addressComplement}>
            <Input
              id="addressComplement"
              className="uppercase"
              value={formData.addressComplement ?? ''}
              onChange={(e) =>
                updateField(
                  'addressComplement',
                  e.target.value ? e.target.value.toUpperCase() : null,
                )
              }
            />
          </FormField>
          <FormField label="Bairro" htmlFor="addressNeighborhood" error={fieldErrors.addressNeighborhood}>
            <Input
              id="addressNeighborhood"
              className="uppercase"
              value={formData.addressNeighborhood ?? ''}
              onChange={(e) =>
                updateField(
                  'addressNeighborhood',
                  e.target.value ? e.target.value.toUpperCase() : null,
                )
              }
            />
          </FormField>
          <FormField label="Cidade" htmlFor="addressCity" error={fieldErrors.addressCity}>
            <Input
              id="addressCity"
              className="uppercase"
              value={formData.addressCity ?? ''}
              onChange={(e) =>
                updateField(
                  'addressCity',
                  e.target.value ? e.target.value.toUpperCase() : null,
                )
              }
            />
          </FormField>
          <FormField label="Estado" htmlFor="addressState" error={fieldErrors.addressState}>
            <select
              id="addressState"
              value={formData.addressState ?? ''}
              onChange={(e) => updateField('addressState', e.target.value || null)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="">Selecione</option>
              {BRAZILIAN_STATES.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </FormField>
          <FormField label="País" htmlFor="addressCountry" error={fieldErrors.addressCountry}>
            <Input
              id="addressCountry"
              className="uppercase"
              value={formData.addressCountry ?? 'Brasil'}
              onChange={(e) =>
                updateField('addressCountry', e.target.value ? e.target.value.toUpperCase() : 'BRASIL')
              }
            />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar
        </Button>
      </div>
    </form>
  );
}

export {CompanyProfileForm};
