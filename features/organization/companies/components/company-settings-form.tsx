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
import type {CompanySettings} from '@/features/organization/settings/types';
import {MSG} from '@/lib/feedback/messages';

import {updateCompanySettingsAction} from '../actions';
import type {CompanyProfile} from '../types';
import type {CompanySettingsInput} from '../validation';
import {LogoUpload} from './logo-upload';

const TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Fortaleza',
  'America/Recife',
  'America/Cuiaba',
  'UTC',
];

export interface CompanySettingsFormProps {
  company: CompanyProfile;
  onSaved: (company: CompanyProfile) => void;
}

type FieldErrors = Partial<Record<keyof CompanySettingsInput, string>>;

function CompanySettingsForm({company, onSaved}: CompanySettingsFormProps) {
  const toast = useToast();
  const [formData, setFormData] = React.useState<CompanySettingsInput>(() => ({
    currency: company.settings.currency,
    language: company.settings.language,
    timezone: company.settings.timezone,
    dateFormat: company.settings.dateFormat,
    timeFormat: company.settings.timeFormat,
    decimalPlaces: company.settings.decimalPlaces,
    distanceUnit: company.settings.distanceUnit,
    fuelUnit: company.settings.fuelUnit,
    primaryColor: company.settings.primaryColor,
    secondaryColor: company.settings.secondaryColor,
  }));
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [logoUrl, setLogoUrl] = React.useState(company.logoUrl);

  function updateField<K extends keyof CompanySettingsInput>(
    field: K,
    value: CompanySettingsInput[K],
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

    const result = await updateCompanySettingsAction(formData);

    if (!result.success) {
      setFormError(result.error ?? MSG.operationFailed);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors as FieldErrors);
      }
      setSubmitting(false);
      return;
    }

    onSaved(result.data);
    toast.success('Configurações salvas com sucesso.');
    setSubmitting(false);
  }

  function handleLogoUploaded(url: string | null) {
    setLogoUrl(url);
    onSaved({...company, logoUrl: url});
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
          <CardTitle>Logomarca</CardTitle>
          <CardDescription>Imagem exibida no sistema e documentos</CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUpload
            companyId={company.id}
            logoUrl={logoUrl}
            onUploaded={handleLogoUploaded}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regionalização</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Moeda" htmlFor="currency" error={fieldErrors.currency}>
            <select
              id="currency"
              value={formData.currency}
              onChange={(e) => updateField('currency', e.target.value as CompanySettings['currency'])}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="BRL">Real (BRL)</option>
              <option value="USD">Dólar (USD)</option>
              <option value="EUR">Euro (EUR)</option>
            </select>
          </FormField>
          <FormField label="Idioma" htmlFor="language" error={fieldErrors.language}>
            <select
              id="language"
              value={formData.language}
              onChange={(e) => updateField('language', e.target.value as CompanySettings['language'])}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English (US)</option>
              <option value="es-ES">Español</option>
            </select>
          </FormField>
          <FormField label="Fuso horário" htmlFor="timezone" error={fieldErrors.timezone}>
            <select
              id="timezone"
              value={formData.timezone}
              onChange={(e) => updateField('timezone', e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Formato de data" htmlFor="dateFormat" error={fieldErrors.dateFormat}>
            <select
              id="dateFormat"
              value={formData.dateFormat}
              onChange={(e) => updateField('dateFormat', e.target.value as CompanySettings['dateFormat'])}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="DD/MM/YYYY">DD/MM/AAAA</option>
              <option value="MM/DD/YYYY">MM/DD/AAAA</option>
              <option value="YYYY-MM-DD">AAAA-MM-DD</option>
            </select>
          </FormField>
          <FormField label="Formato de hora" htmlFor="timeFormat" error={fieldErrors.timeFormat}>
            <select
              id="timeFormat"
              value={formData.timeFormat}
              onChange={(e) => updateField('timeFormat', e.target.value as CompanySettings['timeFormat'])}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="24h">24 horas</option>
              <option value="12h">12 horas</option>
            </select>
          </FormField>
          <FormField label="Casas decimais" htmlFor="decimalPlaces" error={fieldErrors.decimalPlaces}>
            <Input
              id="decimalPlaces"
              type="number"
              min={0}
              max={4}
              value={formData.decimalPlaces}
              onChange={(e) => updateField('decimalPlaces', Number(e.target.value))}
            />
          </FormField>
          <FormField label="Unidade de distância" htmlFor="distanceUnit" error={fieldErrors.distanceUnit}>
            <select
              id="distanceUnit"
              value={formData.distanceUnit}
              onChange={(e) => updateField('distanceUnit', e.target.value as CompanySettings['distanceUnit'])}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="km">Quilômetros (KM)</option>
              <option value="mi">Milhas</option>
            </select>
          </FormField>
          <FormField label="Unidade de combustível" htmlFor="fuelUnit" error={fieldErrors.fuelUnit}>
            <select
              id="fuelUnit"
              value={formData.fuelUnit}
              onChange={(e) => updateField('fuelUnit', e.target.value as CompanySettings['fuelUnit'])}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="L">Litros (L)</option>
              <option value="gal">Galões</option>
            </select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identidade visual</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Cor principal" htmlFor="primaryColor" error={fieldErrors.primaryColor}>
            <div className="flex gap-2">
              <Input
                id="primaryColor"
                type="color"
                value={formData.primaryColor}
                onChange={(e) => updateField('primaryColor', e.target.value)}
                className="h-9 w-14 p-1"
              />
              <Input
                value={formData.primaryColor}
                onChange={(e) => updateField('primaryColor', e.target.value)}
              />
            </div>
          </FormField>
          <FormField label="Cor secundária" htmlFor="secondaryColor" error={fieldErrors.secondaryColor}>
            <div className="flex gap-2">
              <Input
                id="secondaryColor"
                type="color"
                value={formData.secondaryColor}
                onChange={(e) => updateField('secondaryColor', e.target.value)}
                className="h-9 w-14 p-1"
              />
              <Input
                value={formData.secondaryColor}
                onChange={(e) => updateField('secondaryColor', e.target.value)}
              />
            </div>
          </FormField>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar configurações
        </Button>
      </div>
    </form>
  );
}

export {CompanySettingsForm};
