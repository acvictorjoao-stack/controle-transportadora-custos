'use client';

import {ArrowLeft, Ban, CheckCircle2, ExternalLink, Pencil} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import * as React from 'react';

import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {PageTemplate} from '@/components/layout/page-template';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {useConfirm} from '@/contexts/feedback/confirm-context';
import {useToast} from '@/contexts/feedback/toast-context';
import {ROUTES} from '@/constants/routes/paths';
import {
  ACCOUNTS_PAYABLE_HISTORY_ACTION_LABELS,
  ACCOUNTS_PAYABLE_STATUS_LABELS,
} from '@/features/financial/types/financial-entry';
import {
  formatCurrencyBr,
  formatDateBr,
  formatDateTimeBr,
} from '@/features/financial/utils/financial-format';
import type {FinancialEntryStatus} from '@/features/financial/types';

import {cancelAccountsPayableAction} from '../actions';
import type {
  AccountsPayableCategory,
  AccountsPayableCostCenter,
  AccountsPayableDetailData,
  AccountsPayableEntry,
  AccountsPayableHistory,
} from '../types';
import {
  formatAccountsPayableOrigin,
  getAccountsPayableOriginHref,
  isManualAccountsPayableEntry,
} from '../utils/origin';
import {AccountsPayableFormModal} from './accounts-payable-form-modal';
import {AccountsPayablePayModal} from './accounts-payable-pay-modal';

export interface AccountsPayableDetailViewProps {
  data: AccountsPayableDetailData;
  categories: AccountsPayableCategory[];
  costCenters: AccountsPayableCostCenter[];
}

const TABS = [
  {id: 'dados', label: 'Dados Gerais'},
  {id: 'financeiro', label: 'Financeiro'},
  {id: 'historico', label: 'Histórico'},
] as const;

type TabId = (typeof TABS)[number]['id'];

function statusBadgeVariant(
  status: FinancialEntryStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
      return 'default';
    case 'pending':
    case 'overdue':
      return 'secondary';
    case 'cancelled':
      return 'outline';
    default:
      return 'outline';
  }
}

function statusLabel(status: FinancialEntryStatus): string {
  if (status === 'pending' || status === 'overdue') {
    return ACCOUNTS_PAYABLE_STATUS_LABELS.pending;
  }
  if (status === 'paid' || status === 'cancelled') {
    return ACCOUNTS_PAYABLE_STATUS_LABELS[status];
  }
  return status;
}

function isOpenStatus(status: FinancialEntryStatus): boolean {
  return status === 'pending' || status === 'overdue';
}

function AccountsPayableDetailView({
  data,
  categories,
  costCenters,
}: AccountsPayableDetailViewProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [activeTab, setActiveTab] = React.useState<TabId>('dados');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [payModalOpen, setPayModalOpen] = React.useState(false);
  const {entry, history} = data;

  function handleRefresh() {
    router.refresh();
  }

  async function handleCancel(current: AccountsPayableEntry) {
    const confirmed = await confirm({
      title: 'Cancelar conta',
      description: 'Cancelar esta conta a pagar?',
      confirmLabel: 'Cancelar conta',
      variant: 'destructive',
    });
    if (!confirmed) return;

    const result = await cancelAccountsPayableAction(current.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Conta cancelada com sucesso');
    handleRefresh();
  }

  const generalRows = [
    ['Fornecedor', entry.supplier ?? '—'],
    ['Categoria', entry.categoryName ?? '—'],
    ['Origem', formatAccountsPayableOrigin(entry)],
    ['Centro de custo', entry.costCenterName ?? '—'],
    ['Documento', entry.referenceNumber ?? '—'],
    ['Descrição', entry.description ?? '—'],
    ['Observações', entry.notes ?? '—'],
  ];

  const originHref = getAccountsPayableOriginHref(entry);
  const canEdit = isManualAccountsPayableEntry(entry);

  const financialRows = [
    ['Valor', formatCurrencyBr(entry.amount, entry.currency)],
    ['Data de emissão', formatDateBr(entry.entryDate)],
    ['Data de vencimento', formatDateBr(entry.dueDate)],
    ['Status', statusLabel(entry.entryStatus)],
    ...(entry.paidAt ? [['Data do pagamento', formatDateBr(entry.paidAt)] as const] : []),
    ...(entry.paidAmount != null
      ? [['Valor pago', formatCurrencyBr(entry.paidAmount, entry.currency)] as const]
      : []),
  ];

  const historyColumns = [
    {
      id: 'createdAt',
      header: 'Data',
      cell: (row: AccountsPayableHistory) => formatDateTimeBr(row.createdAt),
    },
    {
      id: 'action',
      header: 'Ação',
      cell: (row: AccountsPayableHistory) =>
        ACCOUNTS_PAYABLE_HISTORY_ACTION_LABELS[row.action] ?? row.action,
    },
    {
      id: 'changes',
      header: 'Detalhes',
      cell: (row: AccountsPayableHistory) => {
        const keys = Object.keys(row.changes ?? {});
        if (!keys.length) return '—';
        return keys.join(', ');
      },
    },
  ];

  return (
    <PageTemplate
      title={entry.description ?? entry.supplier ?? 'Conta a pagar'}
      description={[entry.supplier, entry.categoryName].filter(Boolean).join(' · ') || 'Conta a pagar'}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href={ROUTES.contasAPagar}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium shadow-xs hover:bg-accent"
          >
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
          {isOpenStatus(entry.entryStatus) && (
            <>
              {canEdit && (
                <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
                  <Pencil className="size-4" />
                  Editar
                </Button>
              )}
              {originHref && (
                <Link
                  href={originHref}
                  className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium shadow-xs hover:bg-accent"
                >
                  <ExternalLink className="size-4" />
                  Abrir origem
                </Link>
              )}
              <Button size="sm" onClick={() => setPayModalOpen(true)}>
                <CheckCircle2 className="size-4" />
                Marcar como pago
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleCancel(entry)}>
                <Ban className="size-4" />
                Cancelar
              </Button>
            </>
          )}
          {!isOpenStatus(entry.entryStatus) && originHref && (
            <Link
              href={originHref}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium shadow-xs hover:bg-accent"
            >
              <ExternalLink className="size-4" />
              Abrir origem
            </Link>
          )}
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={statusBadgeVariant(entry.entryStatus)}>
          {statusLabel(entry.entryStatus)}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {formatCurrencyBr(entry.amount, entry.currency)}
        </span>
      </div>

      <div className="mb-4 flex gap-2 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dados' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados Gerais</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              {generalRows.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      {activeTab === 'financeiro' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              {financialRows.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      {activeTab === 'historico' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <TableContainer>
              <DataTable
                columns={historyColumns}
                data={history}
                getRowKey={(row) => row.id}
                emptyTitle="Nenhum histórico"
                emptyDescription="As alterações desta conta aparecerão aqui."
              />
            </TableContainer>
          </CardContent>
        </Card>
      )}

      <AccountsPayableFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        entry={entry}
        categories={categories}
        costCenters={costCenters}
        onSaved={handleRefresh}
      />

      <AccountsPayablePayModal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        entry={entry}
        onPaid={handleRefresh}
      />
    </PageTemplate>
  );
}

export {AccountsPayableDetailView};
