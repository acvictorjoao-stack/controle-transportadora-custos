'use client';

import {Loader2, Plus, Save, Trash2} from 'lucide-react';
import * as React from 'react';

import {FormField} from '@/components/master/shared/form-field';
import {Modal} from '@/components/master/shared/modal';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {useToast} from '@/contexts/feedback/toast-context';

import {createCustomerContractAction} from '../actions';
import {
  CUSTOMER_CONTRACT_STATUSES,
  CUSTOMER_CONTRACT_TYPES,
  CUSTOMER_READJUSTMENT_INDICES,
} from '../constants/enums';
import {
  CUSTOMER_CONTRACT_STATUS_LABELS,
  CUSTOMER_CONTRACT_TYPE_LABELS,
  CUSTOMER_READJUSTMENT_INDEX_LABELS,
} from '../types';
import type {CreateCustomerContractInput} from '../validation';
import {CUSTOMER_NATIVE_SELECT_CLASS} from '../utils/form-styles';

export interface ContractFormModalProps {
  open: boolean;
  onClose: () => void;
  customerId: string;
  onSaved: () => void;
}

const EMPTY_ITEM = {
  origin: null,
  destination: null,
  freightValue: null,
  minimumValue: null,
  weightKg: null,
  volumeM3: null,
  deliveryDays: null,
  tollIncluded: false,
  grisPercent: null,
  insurancePercent: null,
  additionalValue: null,
};

function createInitialFormData(customerId: string): CreateCustomerContractInput {
  return {
    customerId,
    contractNumber: '',
    contractStatus: 'active',
    startsAt: null,
    endsAt: null,
    contractType: 'spot',
    freightTable: null,
    currency: 'BRL',
    notes: null,
    readjustmentIndex: 'none',
    readjustmentNotes: null,
    items: [{...EMPTY_ITEM}],
  };
}

function ContractFormModal({open, onClose, customerId, onSaved}: ContractFormModalProps) {
  const formKey = `${open}-${customerId}`;

  return (
    <Modal open={open} onClose={onClose} title="Novo contrato" description="Cadastre um contrato comercial" size="xl">
      <ContractFormContent
        key={formKey}
        customerId={customerId}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

function ContractFormContent({
  customerId,
  onClose,
  onSaved,
}: {
  customerId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [formData, setFormData] = React.useState<CreateCustomerContractInput>(() =>
    createInitialFormData(customerId),
  );
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const toast = useToast();

  function updateItem(index: number, field: string, value: unknown) {
    setFormData((prev) => {
      const items = [...(prev.items ?? [])];
      items[index] = {...items[index], [field]: value};
      return {...prev, items};
    });
  }

  function addItem() {
    setFormData((prev) => ({
      ...prev,
      items: [...(prev.items ?? []), {...EMPTY_ITEM}],
    }));
  }

  function removeItem(index: number) {
    setFormData((prev) => ({
      ...prev,
      items: (prev.items ?? []).filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const result = await createCustomerContractAction({...formData, customerId});
    setSubmitting(false);

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    onSaved();
    toast.success('Contrato criado com sucesso');
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Número do contrato" htmlFor="contract-number" required>
          <Input
            id="contract-number"
            value={formData.contractNumber}
            onChange={(e) => setFormData((p) => ({...p, contractNumber: e.target.value}))}
          />
        </FormField>
        <FormField label="Status" htmlFor="contract-status">
          <select
            id="contract-status"
            className={CUSTOMER_NATIVE_SELECT_CLASS}
            value={formData.contractStatus}
            onChange={(e) => setFormData((p) => ({...p, contractStatus: e.target.value as CreateCustomerContractInput['contractStatus']}))}
          >
            {CUSTOMER_CONTRACT_STATUSES.map((s) => (
              <option key={s} value={s}>{CUSTOMER_CONTRACT_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Início" htmlFor="contract-starts">
          <Input id="contract-starts" type="date" value={formData.startsAt ?? ''} onChange={(e) => setFormData((p) => ({...p, startsAt: e.target.value || null}))} />
        </FormField>
        <FormField label="Fim" htmlFor="contract-ends">
          <Input id="contract-ends" type="date" value={formData.endsAt ?? ''} onChange={(e) => setFormData((p) => ({...p, endsAt: e.target.value || null}))} />
        </FormField>
        <FormField label="Tipo" htmlFor="contract-type">
          <select
            id="contract-type"
            className={CUSTOMER_NATIVE_SELECT_CLASS}
            value={formData.contractType}
            onChange={(e) => setFormData((p) => ({...p, contractType: e.target.value as CreateCustomerContractInput['contractType']}))}
          >
            {CUSTOMER_CONTRACT_TYPES.map((t) => (
              <option key={t} value={t}>{CUSTOMER_CONTRACT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Tabela de frete" htmlFor="contract-freight-table">
          <Input id="contract-freight-table" value={formData.freightTable ?? ''} onChange={(e) => setFormData((p) => ({...p, freightTable: e.target.value || null}))} />
        </FormField>
        <FormField label="Índice de reajuste" htmlFor="contract-readjustment">
          <select
            id="contract-readjustment"
            className={CUSTOMER_NATIVE_SELECT_CLASS}
            value={formData.readjustmentIndex}
            onChange={(e) => setFormData((p) => ({...p, readjustmentIndex: e.target.value as CreateCustomerContractInput['readjustmentIndex']}))}
          >
            {CUSTOMER_READJUSTMENT_INDICES.map((i) => (
              <option key={i} value={i}>{CUSTOMER_READJUSTMENT_INDEX_LABELS[i]}</option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Observações" htmlFor="contract-notes">
        <Textarea id="contract-notes" rows={2} value={formData.notes ?? ''} onChange={(e) => setFormData((p) => ({...p, notes: e.target.value || null}))} />
      </FormField>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Itens do contrato</h4>
          <Button type="button" size="sm" variant="outline" onClick={addItem}>
            <Plus className="size-4" /> Item
          </Button>
        </div>
        {(formData.items ?? []).map((item, index) => (
          <div key={index} className="grid gap-2 rounded-lg border p-3 md:grid-cols-4">
            <Input placeholder="Origem" value={item.origin ?? ''} onChange={(e) => updateItem(index, 'origin', e.target.value || null)} />
            <Input placeholder="Destino" value={item.destination ?? ''} onChange={(e) => updateItem(index, 'destination', e.target.value || null)} />
            <Input type="number" placeholder="Valor" value={item.freightValue ?? ''} onChange={(e) => updateItem(index, 'freightValue', e.target.value ? Number(e.target.value) : null)} />
            <Input type="number" placeholder="Prazo (dias)" value={item.deliveryDays ?? ''} onChange={(e) => updateItem(index, 'deliveryDays', e.target.value ? Number(e.target.value) : null)} />
            <div className="md:col-span-4 flex justify-end">
              {(formData.items?.length ?? 0) > 1 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => removeItem(index)}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar contrato
        </Button>
      </div>
    </form>
  );
}

export {ContractFormModal};
