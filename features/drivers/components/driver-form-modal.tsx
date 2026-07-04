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

import {createDriverAction, updateDriverAction} from '../actions';
import {DRIVER_CONTRACT_TYPES, DRIVER_LICENSE_CATEGORIES} from '../constants/enums';
import type {Driver, DriverContractType, DriverLicenseCategory, DriverOperationalStatus} from '../types';
import {
  DRIVER_CONTRACT_TYPE_LABELS,
  DRIVER_LICENSE_CATEGORY_LABELS,
  DRIVER_OPERATIONAL_STATUS_LABELS,
} from '../types';
import type {CreateDriverInput} from '../validation';
import {formatCpf} from '../utils/driver-status';
import {DRIVER_NATIVE_SELECT_CLASS} from '../utils/form-styles';

export interface DriverFormModalProps {
  open: boolean;
  onClose: () => void;
  driver?: Driver | null;
  branches: BranchSelectOption[];
  onSaved: (driver: Driver) => void;
}

type FieldErrors = Partial<Record<keyof CreateDriverInput, string>>;

function DriverFormModal({
  open,
  onClose,
  driver,
  branches,
  onSaved,
}: DriverFormModalProps) {
  const isEdit = Boolean(driver);
  const formKey = `${open}-${driver?.id ?? 'new'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar motorista' : 'Novo motorista'}
      description={
        isEdit ? 'Atualize os dados do motorista' : 'Cadastre um novo motorista na frota'
      }
      size="xl"
    >
      <DriverFormContent
        key={formKey}
        driver={driver}
        isEdit={isEdit}
        branches={branches}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

function DriverFormContent({
  driver,
  isEdit,
  branches,
  onClose,
  onSaved,
}: {
  driver?: Driver | null;
  isEdit: boolean;
  branches: BranchSelectOption[];
  onClose: () => void;
  onSaved: (driver: Driver) => void;
}) {
  const [formData, setFormData] = React.useState<CreateDriverInput>(() => ({
    name: driver?.name ?? '',
    cpf: driver?.cpf ?? '',
    rg: driver?.rg ?? null,
    cnhNumber: driver?.cnhNumber ?? '',
    licenseCategory: driver?.licenseCategory ?? 'B',
    licenseIssuedAt: driver?.licenseIssuedAt ?? null,
    licenseExpiresAt: driver?.licenseExpiresAt ?? null,
    ear: driver?.ear ?? false,
    birthDate: driver?.birthDate ?? null,
    phone: driver?.phone ?? null,
    whatsapp: driver?.whatsapp ?? null,
    email: driver?.email ?? null,
    address: driver?.address ?? null,
    zipCode: driver?.zipCode ?? null,
    city: driver?.city ?? null,
    state: driver?.state ?? null,
    notes: driver?.notes ?? null,
    operationalStatus: driver?.operationalStatus ?? 'active',
    hiredAt: driver?.hiredAt ?? null,
    terminatedAt: driver?.terminatedAt ?? null,
    contractType: driver?.contractType ?? null,
    emergencyContact: driver?.emergencyContact ?? null,
    branchId: driver?.branchId ?? null,
  }));
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const toast = useToast();

  function updateField<K extends keyof CreateDriverInput>(
    field: K,
    value: CreateDriverInput[K],
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

    const result = isEdit
      ? await updateDriverAction(driver!.id, formData)
      : await createDriverAction(formData);

    if (!result.success) {
      setFormError(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors as FieldErrors);
      }
      setSubmitting(false);
      return;
    }

    onSaved(result.data);
    toast.success(isEdit ? 'Motorista atualizado com sucesso' : 'Motorista criado com sucesso');
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
        <FormField label="Nome" htmlFor="driver-name" error={fieldErrors.name} required>
          <Input
            id="driver-name"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
          />
        </FormField>
        <FormField label="CPF" htmlFor="driver-cpf" error={fieldErrors.cpf} required>
          <Input
            id="driver-cpf"
            value={formatCpf(formData.cpf)}
            onChange={(e) => updateField('cpf', e.target.value)}
            maxLength={14}
          />
        </FormField>
        <FormField label="RG" htmlFor="driver-rg" error={fieldErrors.rg}>
          <Input
            id="driver-rg"
            value={formData.rg ?? ''}
            onChange={(e) => updateField('rg', e.target.value || null)}
          />
        </FormField>
        <FormField label="CNH" htmlFor="driver-cnh" error={fieldErrors.cnhNumber} required>
          <Input
            id="driver-cnh"
            value={formData.cnhNumber}
            onChange={(e) => updateField('cnhNumber', e.target.value)}
          />
        </FormField>
        <FormField label="Categoria CNH" htmlFor="driver-license-category" error={fieldErrors.licenseCategory} required>
          <select
            id="driver-license-category"
            value={formData.licenseCategory}
            onChange={(e) =>
              updateField('licenseCategory', e.target.value as DriverLicenseCategory)
            }
            className={DRIVER_NATIVE_SELECT_CLASS}
          >
            {DRIVER_LICENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {DRIVER_LICENSE_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Situação" htmlFor="driver-operational-status" error={fieldErrors.operationalStatus}>
          <select
            id="driver-operational-status"
            value={formData.operationalStatus}
            onChange={(e) =>
              updateField('operationalStatus', e.target.value as DriverOperationalStatus)
            }
            className={DRIVER_NATIVE_SELECT_CLASS}
          >
            {(Object.keys(DRIVER_OPERATIONAL_STATUS_LABELS) as DriverOperationalStatus[]).map(
              (status) => (
                <option key={status} value={status}>
                  {DRIVER_OPERATIONAL_STATUS_LABELS[status]}
                </option>
              ),
            )}
          </select>
        </FormField>
        <FormField label="Emissão CNH" htmlFor="driver-license-issued" error={fieldErrors.licenseIssuedAt}>
          <Input
            id="driver-license-issued"
            type="date"
            value={formData.licenseIssuedAt ?? ''}
            onChange={(e) => updateField('licenseIssuedAt', e.target.value || null)}
          />
        </FormField>
        <FormField label="Validade CNH" htmlFor="driver-license-expires" error={fieldErrors.licenseExpiresAt}>
          <Input
            id="driver-license-expires"
            type="date"
            value={formData.licenseExpiresAt ?? ''}
            onChange={(e) => updateField('licenseExpiresAt', e.target.value || null)}
          />
        </FormField>
        <FormField label="EAR" htmlFor="driver-ear" error={fieldErrors.ear}>
          <label className="flex items-center gap-2 text-sm">
            <input
              id="driver-ear"
              type="checkbox"
              checked={formData.ear}
              onChange={(e) => updateField('ear', e.target.checked)}
            />
            Possui EAR
          </label>
        </FormField>
        <FormField label="Data de nascimento" htmlFor="driver-birth-date" error={fieldErrors.birthDate}>
          <Input
            id="driver-birth-date"
            type="date"
            value={formData.birthDate ?? ''}
            onChange={(e) => updateField('birthDate', e.target.value || null)}
          />
        </FormField>
        <FormField label="Telefone" htmlFor="driver-phone" error={fieldErrors.phone}>
          <Input
            id="driver-phone"
            value={formData.phone ?? ''}
            onChange={(e) => updateField('phone', e.target.value || null)}
          />
        </FormField>
        <FormField label="WhatsApp" htmlFor="driver-whatsapp" error={fieldErrors.whatsapp}>
          <Input
            id="driver-whatsapp"
            value={formData.whatsapp ?? ''}
            onChange={(e) => updateField('whatsapp', e.target.value || null)}
          />
        </FormField>
        <FormField label="E-mail" htmlFor="driver-email" error={fieldErrors.email}>
          <Input
            id="driver-email"
            type="email"
            value={formData.email ?? ''}
            onChange={(e) => updateField('email', e.target.value || null)}
          />
        </FormField>
        <FormField label="Filial" htmlFor="driver-branch" error={fieldErrors.branchId}>
          <select
            id="driver-branch"
            value={formData.branchId ?? ''}
            onChange={(e) => updateField('branchId', e.target.value || null)}
            className={DRIVER_NATIVE_SELECT_CLASS}
          >
            <option value="">Sem filial</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Admissão" htmlFor="driver-hired-at" error={fieldErrors.hiredAt}>
          <Input
            id="driver-hired-at"
            type="date"
            value={formData.hiredAt ?? ''}
            onChange={(e) => updateField('hiredAt', e.target.value || null)}
          />
        </FormField>
        <FormField label="Desligamento" htmlFor="driver-terminated-at" error={fieldErrors.terminatedAt}>
          <Input
            id="driver-terminated-at"
            type="date"
            value={formData.terminatedAt ?? ''}
            onChange={(e) => updateField('terminatedAt', e.target.value || null)}
          />
        </FormField>
        <FormField label="Tipo de contratação" htmlFor="driver-contract-type" error={fieldErrors.contractType}>
          <select
            id="driver-contract-type"
            value={formData.contractType ?? ''}
            onChange={(e) =>
              updateField(
                'contractType',
                (e.target.value || null) as DriverContractType | null,
              )
            }
            className={DRIVER_NATIVE_SELECT_CLASS}
          >
            <option value="">Não informado</option>
            {DRIVER_CONTRACT_TYPES.map((type) => (
              <option key={type} value={type}>
                {DRIVER_CONTRACT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Contato de emergência" htmlFor="driver-emergency-contact" error={fieldErrors.emergencyContact}>
          <Input
            id="driver-emergency-contact"
            value={formData.emergencyContact ?? ''}
            onChange={(e) => updateField('emergencyContact', e.target.value || null)}
          />
        </FormField>
        <FormField label="CEP" htmlFor="driver-zip-code" error={fieldErrors.zipCode}>
          <Input
            id="driver-zip-code"
            value={formData.zipCode ?? ''}
            onChange={(e) => updateField('zipCode', e.target.value || null)}
          />
        </FormField>
        <FormField label="Cidade" htmlFor="driver-city" error={fieldErrors.city}>
          <Input
            id="driver-city"
            value={formData.city ?? ''}
            onChange={(e) => updateField('city', e.target.value || null)}
          />
        </FormField>
        <FormField label="Estado" htmlFor="driver-state" error={fieldErrors.state}>
          <Input
            id="driver-state"
            value={formData.state ?? ''}
            onChange={(e) => updateField('state', e.target.value || null)}
            maxLength={2}
          />
        </FormField>
      </div>

      <FormField label="Endereço" htmlFor="driver-address" error={fieldErrors.address}>
        <Input
          id="driver-address"
          value={formData.address ?? ''}
          onChange={(e) => updateField('address', e.target.value || null)}
        />
      </FormField>

      <FormField label="Observações" htmlFor="driver-notes" error={fieldErrors.notes}>
        <Textarea
          id="driver-notes"
          value={formData.notes ?? ''}
          onChange={(e) => updateField('notes', e.target.value || null)}
          rows={3}
        />
      </FormField>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isEdit ? 'Salvar' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  );
}

export {DriverFormModal};
