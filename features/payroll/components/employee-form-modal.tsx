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
import type {CostCenterSelectOption} from '@/features/cost-centers/types';
import {
  formatPhoneInput,
  normalizePhoneDigits,
} from '@/features/customers/utils/customer-format';
import {formatCpf} from '@/features/drivers/utils/driver-status';
import {financialInputClassName} from '@/features/financial/utils/form-styles';
import type {BranchSelectOption} from '@/features/organization/branches/types';
import {MSG} from '@/lib/feedback/messages';

import {createEmployeeAction, updateEmployeeAction} from '../actions';
import {EMPLOYEE_CONTRACT_TYPES} from '../constants';
import type {EmployeeListItem, Position} from '../types';
import {EMPLOYEE_CONTRACT_TYPE_LABELS, PERSONNEL_STATUS_LABELS} from '../types';
import type {CreateEmployeeInput} from '../validation';

export interface EmployeeFormModalProps {
  open: boolean;
  onClose: () => void;
  employee?: EmployeeListItem | null;
  positions: Position[];
  costCenters: CostCenterSelectOption[];
  branches: BranchSelectOption[];
  onSaved: () => void;
}

type FieldErrors = Partial<Record<keyof CreateEmployeeInput, string>>;

function EmployeeFormModal({
  open,
  onClose,
  employee,
  positions,
  costCenters,
  branches,
  onSaved,
}: EmployeeFormModalProps) {
  const isEdit = Boolean(employee);
  const formKey = `${open}-${employee?.id ?? 'new'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar funcionário' : 'Novo funcionário'}
      description={
        isEdit
          ? 'Atualize os dados do colaborador'
          : 'Cadastre um colaborador para folha de pagamento'
      }
      size="xl"
    >
      <EmployeeFormContent
        key={formKey}
        employee={employee}
        isEdit={isEdit}
        positions={positions}
        costCenters={costCenters}
        branches={branches}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

function EmployeeFormContent({
  employee,
  isEdit,
  positions,
  costCenters,
  branches,
  onClose,
  onSaved,
}: {
  employee?: EmployeeListItem | null;
  isEdit: boolean;
  positions: Position[];
  costCenters: CostCenterSelectOption[];
  branches: BranchSelectOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [formData, setFormData] = React.useState<CreateEmployeeInput>(() => ({
    name: employee?.name ?? '',
    positionId: employee?.positionId ?? '',
    costCenterId: employee?.costCenterId ?? '',
    branchId: employee?.branchId ?? null,
    cpf: employee?.cpf ?? null,
    registrationNumber: employee?.registrationNumber ?? null,
    email: employee?.email ?? null,
    phone: employee?.phone ?? null,
    contractType: (employee?.contractType as CreateEmployeeInput['contractType']) ?? null,
    hiredAt: employee?.hiredAt ?? null,
    terminatedAt: employee?.terminatedAt ?? null,
    notes: employee?.notes ?? null,
    status: employee?.status === 'inactive' ? 'inactive' : 'active',
  }));
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const toast = useToast();

  const positionOptions = React.useMemo(() => {
    const options = [...positions];

    if (isEdit && employee?.positionId) {
      const hasCurrent = options.some((position) => position.id === employee.positionId);
      if (!hasCurrent) {
        options.unshift({
          id: employee.positionId,
          companyId: employee.companyId,
          code: employee.positionCode ?? '',
          name: employee.positionName ?? employee.positionId,
          description: null,
          isSystem: false,
          status: 'inactive',
          active: false,
        });
      }
    }

    return options;
  }, [positions, isEdit, employee]);

  function updateField<K extends keyof CreateEmployeeInput>(
    field: K,
    value: CreateEmployeeInput[K],
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

    const result =
      isEdit && employee
        ? await updateEmployeeAction(employee.id, formData)
        : await createEmployeeAction(formData);

    if (!result.success) {
      setFormError(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors as FieldErrors);
      }
      setSubmitting(false);
      return;
    }

    onSaved();
    toast.success(isEdit ? MSG.updated('Funcionário') : MSG.created('Funcionário'));
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

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nome completo" htmlFor="emp-name" error={fieldErrors.name} required>
          <Input
            id="emp-name"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value.toUpperCase())}
            className="uppercase"
            required
          />
        </FormField>

        <FormField label="CPF" htmlFor="emp-cpf" error={fieldErrors.cpf}>
          <Input
            id="emp-cpf"
            value={formData.cpf ? formatCpf(formData.cpf) : ''}
            onChange={(e) => updateField('cpf', e.target.value.replace(/\D/g, '') || null)}
            inputMode="numeric"
          />
        </FormField>

        <FormField label="Matrícula" htmlFor="emp-registration" error={fieldErrors.registrationNumber}>
          <Input
            id="emp-registration"
            value={formData.registrationNumber ?? ''}
            onChange={(e) => updateField('registrationNumber', e.target.value || null)}
          />
        </FormField>

        <FormField label="E-mail" htmlFor="emp-email" error={fieldErrors.email}>
          <Input
            id="emp-email"
            type="email"
            value={formData.email ?? ''}
            onChange={(e) => updateField('email', e.target.value || null)}
          />
        </FormField>

        <FormField label="Telefone" htmlFor="emp-phone" error={fieldErrors.phone}>
          <Input
            id="emp-phone"
            value={formData.phone ? formatPhoneInput(formData.phone) : ''}
            onChange={(e) =>
              updateField('phone', normalizePhoneDigits(e.target.value) || null)
            }
          />
        </FormField>

        <FormField label="Status" htmlFor="emp-status" error={fieldErrors.status}>
          <select
            id="emp-status"
            value={formData.status}
            onChange={(e) =>
              updateField('status', e.target.value as CreateEmployeeInput['status'])
            }
            className={financialInputClassName}
          >
            <option value="active">{PERSONNEL_STATUS_LABELS.active}</option>
            <option value="inactive">{PERSONNEL_STATUS_LABELS.inactive}</option>
          </select>
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Cargo" htmlFor="emp-position" error={fieldErrors.positionId} required>
          <select
            id="emp-position"
            value={formData.positionId}
            onChange={(e) => updateField('positionId', e.target.value)}
            className={financialInputClassName}
            required
          >
            <option value="">Selecione</option>
            {positionOptions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.name}
                {!position.active ? ' (inativo)' : ''}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Centro de custo"
          htmlFor="emp-cost-center"
          error={fieldErrors.costCenterId}
          required
        >
          <select
            id="emp-cost-center"
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

        <FormField label="Filial" htmlFor="emp-branch" error={fieldErrors.branchId}>
          <select
            id="emp-branch"
            value={formData.branchId ?? ''}
            onChange={(e) => updateField('branchId', e.target.value || null)}
            className={financialInputClassName}
          >
            <option value="">Não informada</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.code ? `${branch.code} — ${branch.name}` : branch.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Tipo de contrato" htmlFor="emp-contract" error={fieldErrors.contractType}>
          <select
            id="emp-contract"
            value={formData.contractType ?? ''}
            onChange={(e) =>
              updateField(
                'contractType',
                (e.target.value || null) as CreateEmployeeInput['contractType'],
              )
            }
            className={financialInputClassName}
          >
            <option value="">Não informado</option>
            {EMPLOYEE_CONTRACT_TYPES.map((type) => (
              <option key={type} value={type}>
                {EMPLOYEE_CONTRACT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Data de admissão" htmlFor="emp-hired" error={fieldErrors.hiredAt}>
          <Input
            id="emp-hired"
            type="date"
            value={formData.hiredAt ?? ''}
            onChange={(e) => updateField('hiredAt', e.target.value || null)}
          />
        </FormField>

        <FormField label="Data de desligamento" htmlFor="emp-terminated" error={fieldErrors.terminatedAt}>
          <Input
            id="emp-terminated"
            type="date"
            value={formData.terminatedAt ?? ''}
            onChange={(e) => updateField('terminatedAt', e.target.value || null)}
          />
        </FormField>
      </div>

      <FormField label="Observações" htmlFor="emp-notes" error={fieldErrors.notes}>
        <Textarea
          id="emp-notes"
          value={formData.notes ?? ''}
          onChange={(e) => updateField('notes', e.target.value.toUpperCase() || null)}
          className="uppercase"
          rows={3}
        />
      </FormField>

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

export {EmployeeFormModal};
