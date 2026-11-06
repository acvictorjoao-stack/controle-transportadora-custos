'use client';

import {ArrowLeft, Ban, CheckCircle2, Pencil, Scale, Undo2} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import * as React from 'react';

import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {PageTemplate} from '@/components/layout/page-template';
import {Badge} from '@/components/ui/badge';
import {Button, buttonVariants} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {useConfirm} from '@/contexts/feedback/confirm-context';
import {useToast} from '@/contexts/feedback/toast-context';
import {ROUTES} from '@/constants/routes/paths';
import {
  ACCOUNTS_RECEIVABLE_HISTORY_ACTION_LABELS,
  ACCOUNTS_RECEIVABLE_STATUS_LABELS,
} from '@/features/financial/types/financial-entry';
import {
  formatCurrencyBr,
  formatDateBr,
  formatDateTimeBr,
} from '@/features/financial/utils/financial-format';
import type {FinancialEntryStatus} from '@/features/financial/types';

import {cancelAccountsReceivableAction} from '../actions';
import type {
  AccountsReceivableCategory,
  AccountsReceivableCostCenter,
  AccountsReceivableDetailData,
  AccountsReceivableEntry,
  AccountsReceivableHistory,
} from '../types';
import {
  RECEIVABLE_MOVEMENT_KIND_LABELS,
  RECEIVABLE_PAYMENT_METHOD_LABELS,
} from '../constants';
import type {ReceivableMovement} from '../types';
import {
  getReceivableBalance,
  getReceivableEffectiveAmount,
  isPartiallyReceived,
} from '@/features/financial/utils/receivable-balance';
import {AccountsReceivableAdjustModal} from './accounts-receivable-adjust-modal';
import {AccountsReceivableFormModal} from './accounts-receivable-form-modal';
import {AccountsReceivableReverseModal} from './accounts-receivable-reverse-modal';
import {AccountsReceivableReceiveModal} from './accounts-receivable-receive-modal';
import {TabsNav} from '@/components/ui/tabs-nav';

export interface AccountsReceivableDetailViewProps {
  data: AccountsReceivableDetailData;
  categories: AccountsReceivableCategory[];
  costCenters: AccountsReceivableCostCenter[];
}

const TABS = [
  {id: 'dados', label: 'Dados Gerais'},
  {id: 'financeiro', label: 'Financeiro'},
  {id: 'recebimentos', label: 'Recebimentos'},
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
    return ACCOUNTS_RECEIVABLE_STATUS_LABELS.pending;
  }
  if (status === 'paid' || status === 'cancelled') {
    return ACCOUNTS_RECEIVABLE_STATUS_LABELS[status];
  }
  return status;
}

function isOpenStatus(status: FinancialEntryStatus): boolean {
  return status === 'pending' || status === 'overdue';
}

function AccountsReceivableDetailView({
  data,
  categories,
  costCenters,
}: AccountsReceivableDetailViewProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [activeTab, setActiveTab] = React.useState<TabId>('dados');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = React.useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = React.useState(false);
  const [reversingMovement, setReversingMovement] = React.useState<ReceivableMovement | null>(null);
  const {entry, history, movements} = data;
  const reversedIds = new Set(
    movements.map((movement) => movement.reversesMovementId).filter(Boolean),
  );
  const canCancel = !entry.tripChargeKey && !isPartiallyReceived(entry);
  const canAdjust = isOpenStatus(entry.entryStatus) || entry.entryStatus === 'paid';

  function handleRefresh() {
    router.refresh();
  }

  async function handleCancel(current: AccountsReceivableEntry) {
    const confirmed = await confirm({
      title: 'Cancelar conta',
      description: 'Cancelar esta conta a receber?',
      confirmLabel: 'Cancelar conta',
      variant: 'destructive',
    });
    if (!confirmed) return;

    const result = await cancelAccountsReceivableAction(current.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Conta cancelada com sucesso');
    handleRefresh();
  }

  const generalRows = [
    ['Cliente', entry.client ?? '—'],
    ['Categoria', entry.categoryName ?? '—'],
    ['Centro de custo', entry.costCenterName ?? '—'],
    ['Descrição', entry.description ?? '—'],
    ['Observações', entry.notes ?? '—'],
  ];

  const financialRows = [
    ['Valor original', formatCurrencyBr(entry.amount, entry.currency)],
    ['Ajustes', entry.adjustmentTotal !== 0
      ? formatCurrencyBr(entry.adjustmentTotal, entry.currency)
      : '—'],
    ['Valor atual', formatCurrencyBr(getReceivableEffectiveAmount(entry), entry.currency)],
    ['Valor recebido', entry.paidAmount != null
      ? formatCurrencyBr(entry.paidAmount, entry.currency)
      : '—'],
    ['Saldo em aberto', isOpenStatus(entry.entryStatus)
      ? formatCurrencyBr(getReceivableBalance(entry), entry.currency)
      : '—'],
    ['Data de emissão', formatDateBr(entry.entryDate)],
    ['Data de vencimento', formatDateBr(entry.dueDate)],
    ['Data do recebimento', entry.paidAt ? formatDateBr(entry.paidAt) : '—'],
    ['Status', isPartiallyReceived(entry) ? 'Parcial' : statusLabel(entry.entryStatus)],
  ];

  const historyColumns = [
    {
      id: 'createdAt',
      header: 'Data',
      cell: (row: AccountsReceivableHistory) => formatDateTimeBr(row.createdAt),
    },
    {
      id: 'action',
      header: 'Ação',
      cell: (row: AccountsReceivableHistory) =>
        ACCOUNTS_RECEIVABLE_HISTORY_ACTION_LABELS[row.action] ?? row.action,
    },
    {
      id: 'changes',
      header: 'Detalhes',
      cell: (row: AccountsReceivableHistory) => {
        const keys = Object.keys(row.changes ?? {});
        if (!keys.length) return '—';
        return keys.join(', ');
      },
    },
  ];

  const movementColumns = [
    {
      id: 'date',
      header: 'Data',
      cell: (row: ReceivableMovement) => formatDateBr(row.movementDate),
    },
    {
      id: 'kind',
      header: 'Tipo',
      cell: (row: ReceivableMovement) => RECEIVABLE_MOVEMENT_KIND_LABELS[row.kind],
    },
    {
      id: 'amount',
      header: 'Valor',
      className: 'font-financial',
      cell: (row: ReceivableMovement) => (
        <span className={row.kind === 'receipt_reversal' ? 'text-destructive' : undefined}>
          {formatCurrencyBr(row.kind === 'receipt_reversal' ? -row.amount : row.amount, entry.currency)}
        </span>
      ),
    },
    {
      id: 'method',
      header: 'Forma',
      cell: (row: ReceivableMovement) =>
        row.paymentMethod ? RECEIVABLE_PAYMENT_METHOD_LABELS[row.paymentMethod] : '—',
    },
    {
      id: 'details',
      header: 'Observação',
      cell: (row: ReceivableMovement) => row.reason ?? row.notes ?? '—',
    },
    {
      id: 'user',
      header: 'Responsável',
      cell: (row: ReceivableMovement) => row.createdByName ?? '—',
    },
    {
      id: 'actions',
      header: '',
      className: 'w-28',
      cell: (row: ReceivableMovement) =>
        row.kind === 'receipt' && !reversedIds.has(row.id) ? (
          <Button size="sm" variant="ghost" onClick={() => setReversingMovement(row)}>
            <Undo2 className="size-4" />
            Estornar
          </Button>
        ) : null,
    },
  ];

  return (
    <PageTemplate
      title={entry.description ?? entry.client ?? 'Conta a receber'}
      description={[entry.client, entry.categoryName].filter(Boolean).join(' · ') || 'Conta a receber'}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href={ROUTES.contasAReceber}
            className={buttonVariants({variant: 'outline', size: 'sm'})}
          >
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
          {isOpenStatus(entry.entryStatus) && (
            <>
              <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
                <Pencil className="size-4" />
                Editar
              </Button>
              <Button size="sm" onClick={() => setReceiveModalOpen(true)}>
                <CheckCircle2 className="size-4" />
                Registrar recebimento
              </Button>
              {canCancel && (
                <Button size="sm" variant="destructive" onClick={() => handleCancel(entry)}>
                  <Ban className="size-4" />
                  Cancelar
                </Button>
              )}
            </>
          )}
          {canAdjust && (
            <Button size="sm" variant="outline" onClick={() => setAdjustModalOpen(true)}>
              <Scale className="size-4" />
              Ajustar valor
            </Button>
          )}
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={statusBadgeVariant(entry.entryStatus)}>
          {isPartiallyReceived(entry) ? 'Parcial' : statusLabel(entry.entryStatus)}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {formatCurrencyBr(getReceivableEffectiveAmount(entry), entry.currency)}
        </span>
        {entry.tripChargeKey && entry.tripId ? (
          <Link
            href={ROUTES.viagemDetail(entry.tripId)}
            className="text-sm font-medium text-primary hover:underline"
          >
            Viagem {entry.tripNumber ?? ''}
          </Link>
        ) : null}
      </div>

      <TabsNav items={TABS} value={activeTab} onChange={setActiveTab} className="mb-4" />

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

      {activeTab === 'recebimentos' && (
        <TableContainer>
          <DataTable
            columns={movementColumns}
            data={movements}
            getRowKey={(row) => row.id}
            emptyTitle="Nenhum recebimento"
            emptyDescription="Os recebimentos, estornos e ajustes aparecerão aqui."
          />
        </TableContainer>
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

      <AccountsReceivableFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        entry={entry}
        categories={categories}
        costCenters={costCenters}
        onSaved={handleRefresh}
      />

      <AccountsReceivableAdjustModal
        open={adjustModalOpen}
        entry={entry}
        onClose={() => setAdjustModalOpen(false)}
        onAdjusted={handleRefresh}
      />

      <AccountsReceivableReverseModal
        entryId={entry.id}
        movement={reversingMovement}
        onClose={() => setReversingMovement(null)}
        onReversed={handleRefresh}
      />

      <AccountsReceivableReceiveModal
        open={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        entry={entry}
        onReceived={handleRefresh}
      />
    </PageTemplate>
  );
}

export {AccountsReceivableDetailView};
