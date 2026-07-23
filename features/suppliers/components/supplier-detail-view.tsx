'use client';

import {ArrowLeft, Pencil, Power} from 'lucide-react';
import {useRouter} from 'next/navigation';
import * as React from 'react';

import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {PageTemplate} from '@/components/layout/page-template';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {useToast} from '@/contexts/feedback/toast-context';
import {ROUTES} from '@/constants/routes/paths';
import {MSG} from '@/lib/feedback/messages';

import {updateSupplierActiveAction} from '../actions';
import type {SupplierDetailData, SupplierFinancialSnippet} from '../types';
import {
  formatCurrency,
  formatDateBr,
  formatDocument,
  formatPhone,
  formatZipCode,
} from '../utils/supplier-format';
import {SupplierCategoriesBadges} from './supplier-badge';
import {SupplierFormModal} from './supplier-form-modal';
import {SupplierSummaryCard} from './supplier-summary-card';

export interface SupplierDetailViewProps {
  data: SupplierDetailData;
}

const TABS = [
  {id: 'resumo', label: 'Resumo'},
  {id: 'financeiro', label: 'Resumo Financeiro'},
  {id: 'dados', label: 'Dados Gerais'},
  {id: 'historico', label: 'Histórico'},
] as const;

type TabId = (typeof TABS)[number]['id'];

function SupplierDetailView({data}: SupplierDetailViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = React.useState<TabId>('resumo');
  const [editOpen, setEditOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const {supplier, stats, recentFinancial} = data;

  async function handleToggleActive() {
    setLoading(true);
    const result = await updateSupplierActiveAction(supplier.id, {
      active: !supplier.active,
    });
    if (!result.success) {
      toast.error(result.error ?? MSG.operationFailed);
    } else {
      toast.success(
        supplier.active
          ? MSG.deactivated('Fornecedor')
          : MSG.activated('Fornecedor'),
      );
      router.refresh();
    }
    setLoading(false);
  }

  const historyColumns = [
    {
      id: 'date',
      header: 'Data',
      cell: (row: SupplierFinancialSnippet) => formatDateBr(row.entryDate),
    },
    {
      id: 'description',
      header: 'Descrição',
      cell: (row: SupplierFinancialSnippet) => row.description ?? '—',
    },
    {
      id: 'module',
      header: 'Origem',
      cell: (row: SupplierFinancialSnippet) => row.sourceModule ?? '—',
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: SupplierFinancialSnippet) => row.entryStatus,
    },
    {
      id: 'amount',
      header: 'Valor',
      cell: (row: SupplierFinancialSnippet) => formatCurrency(row.amount),
    },
  ];

  return (
    <PageTemplate
      title={supplier.displayName}
      description={[formatDocument(supplier.document, supplier.documentType), supplier.city]
        .filter((v) => v && v !== '—')
        .join(' · ') || 'Ficha do fornecedor'}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.push(ROUTES.fornecedores)}>
            <ArrowLeft className="size-4" />
            Voltar
          </Button>
          <Button variant="outline" onClick={handleToggleActive} disabled={loading}>
            <Power className="size-4" />
            {supplier.active ? 'Inativar' : 'Ativar'}
          </Button>
          <Button onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Editar
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={supplier.active ? 'success' : 'warning'}>
          {supplier.active ? 'Ativo' : 'Inativo'}
        </Badge>
        <SupplierCategoriesBadges categories={supplier.categories} max={6} />
      </div>

      <div className="mb-6 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={
              activeTab === tab.id
                ? 'border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary'
                : 'px-3 py-2 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'resumo' && (
        <div className="space-y-4">
          <SupplierSummaryCard stats={stats} variant="compact" />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Indicadores rápidos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
              <div>
                <p className="text-muted-foreground">Última compra</p>
                <p className="font-medium">{formatDateBr(stats.lastPurchaseAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Último abastecimento</p>
                <p className="font-medium">{formatDateBr(stats.lastFuelAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Última manutenção</p>
                <p className="font-medium">{formatDateBr(stats.lastMaintenanceAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'financeiro' && (
        <div className="space-y-4">
          <SupplierSummaryCard stats={stats} variant="full" />
        </div>
      )}

      {activeTab === 'dados' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados cadastrais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <Field label="Razão social" value={supplier.corporateName} />
            <Field label="Nome fantasia" value={supplier.tradeName ?? '—'} />
            <Field
              label="Documento"
              value={formatDocument(supplier.document, supplier.documentType)}
            />
            <Field label="Contato" value={supplier.contactName ?? '—'} />
            <Field label="Telefone" value={formatPhone(supplier.phone)} />
            <Field label="E-mail" value={supplier.email ?? '—'} />
            <Field label="CEP" value={formatZipCode(supplier.zipCode)} />
            <Field
              label="Endereço"
              value={
                [supplier.address, supplier.number, supplier.district]
                  .filter(Boolean)
                  .join(', ') || '—'
              }
            />
            <Field
              label="Cidade / UF"
              value={[supplier.city, supplier.state].filter(Boolean).join('/') || '—'}
            />
            <Field label="Observações" value={supplier.notes ?? '—'} />
          </CardContent>
        </Card>
      )}

      {activeTab === 'historico' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Lançamentos financeiros vinculados (reutiliza o módulo Financeiro).
          </p>
          <TableContainer>
            <DataTable
              columns={historyColumns}
              data={recentFinancial}
              getRowKey={(row) => row.id}
              emptyTitle="Nenhum lançamento vinculado"
              emptyDescription="Lançamentos financeiros deste fornecedor aparecerão aqui."
            />
          </TableContainer>
        </div>
      )}

      <SupplierFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        supplier={supplier}
        onSaved={() => router.refresh()}
      />
    </PageTemplate>
  );
}

function Field({label, value}: {label: string; value: string}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5">{value}</p>
    </div>
  );
}

export {SupplierDetailView};
