'use client';

import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

import type {SupplierStats} from '../types';
import {formatCurrency, formatDateBr} from '../utils/supplier-format';

export interface SupplierSummaryCardProps {
  stats: SupplierStats;
  variant?: 'full' | 'compact';
}

function StatItem({label, value}: {label: string; value: string}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function SupplierSummaryCard({stats, variant = 'full'}: SupplierSummaryCardProps) {
  const items =
    variant === 'compact'
      ? [
          {label: 'Total gasto', value: formatCurrency(stats.totalSpent)},
          {label: 'Serviços', value: String(stats.serviceCount)},
          {label: 'Em aberto', value: formatCurrency(stats.openPayables)},
          {label: 'Pagas', value: formatCurrency(stats.paidPayables)},
        ]
      : [
          {label: 'Total gasto', value: formatCurrency(stats.totalSpent)},
          {label: 'Receita', value: formatCurrency(stats.totalRevenue)},
          {label: 'Qtd. serviços', value: String(stats.serviceCount)},
          {label: 'Ordens', value: String(stats.orderCount)},
          {label: 'Média por ordem', value: formatCurrency(stats.averageOrderAmount)},
          {label: 'Contas em aberto', value: formatCurrency(stats.openPayables)},
          {label: 'Contas pagas', value: formatCurrency(stats.paidPayables)},
          {label: 'Parcelas em aberto', value: String(stats.openInstallments)},
          {label: 'Parcelas pagas', value: String(stats.paidInstallments)},
          {label: 'Última compra', value: formatDateBr(stats.lastPurchaseAt)},
          {label: 'Último abastecimento', value: formatDateBr(stats.lastFuelAt)},
          {label: 'Última manutenção', value: formatDateBr(stats.lastMaintenanceAt)},
        ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {variant === 'compact' ? 'Resumo' : 'Resumo Financeiro'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <StatItem key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export {SupplierSummaryCard};
