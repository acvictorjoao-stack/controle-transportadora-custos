'use client';

import * as React from 'react';

import {Modal} from '@/components/master/shared/modal';
import {ProvisionSuccess} from '@/features/master/provisioning/components';
import type {ProvisionCompanyResult} from '@/features/master/provisioning/types';
import type {PlanCatalogItem} from '@/features/master/plans';

import {NovaEmpresaForm} from './nova-empresa-form';

export interface NovaEmpresaModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  plans: PlanCatalogItem[];
}

function NovaEmpresaModal({open, onClose, onCreated, plans}: NovaEmpresaModalProps) {
  const [result, setResult] = React.useState<ProvisionCompanyResult | null>(null);

  function handleClose() {
    setResult(null);
    onClose();
  }

  function handleFinish() {
    setResult(null);
    onCreated?.();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={result ? 'Provisionamento concluído' : 'Nova Empresa'}
      description={
        result
          ? 'Guarde as credenciais do administrador antes de fechar'
          : 'Cadastre uma nova empresa cliente e provisione a estrutura automaticamente'
      }
      size="xl"
    >
      {result ? (
        <ProvisionSuccess result={result} onFinish={handleFinish} />
      ) : (
        <NovaEmpresaForm plans={plans} onCancel={handleClose} onProvisioned={setResult} />
      )}
    </Modal>
  );
}

export {NovaEmpresaModal};
