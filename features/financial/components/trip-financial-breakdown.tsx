'use client';

import {ChevronDown, ChevronRight} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import {Skeleton} from '@/components/ui/skeleton';
import {buttonVariants} from '@/components/ui/button';
import {loadTripFinancialBreakdownAction} from '@/features/financial/actions';
import {
  formatCurrencyBr,
  formatDateBr,
  formatPercent,
} from '@/features/financial/utils/financial-format';
import {cn} from '@/lib/utils';

import type {
  TripFinancialBreakdownData,
  TripFinancialBreakdownCategory,
  TripFinancialCostCategory,
} from '../types/trip-financial-breakdown';

export interface TripFinancialBreakdownProps {
  data: TripFinancialBreakdownData;
  /** Inicia o painel aberto. */
  defaultOpen?: boolean;
  className?: string;
  title?: string;
}

export interface TripFinancialBreakdownLazyProps {
  tripId: string;
  tripLabel?: string;
  className?: string;
  title?: string;
}

function resultClass(value: number): string | undefined {
  return value < 0 ? 'text-destructive' : undefined;
}

function SummaryLine({
  label,
  value,
  emphasize = false,
  muted = false,
}: {
  label: string;
  value: React.ReactNode;
  emphasize?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span
        className={cn(
          muted ? 'text-muted-foreground' : '',
          emphasize ? 'font-medium' : '',
        )}
      >
        {label}
      </span>
      <span className={cn('font-financial', emphasize ? 'font-semibold' : '')}>
        {value}
      </span>
    </div>
  );
}

function CategoryBlock({
  category,
  expanded,
  onToggle,
}: {
  category: TripFinancialBreakdownCategory;
  expanded: boolean;
  onToggle: () => void;
}) {
  const canExpand = category.entries.length > 0 || category.total > 0;

  return (
    <div className="rounded-lg border border-border bg-background">
      <button
        type="button"
        onClick={onToggle}
        disabled={!canExpand}
        className={cn(
          'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
          canExpand ? 'hover:bg-muted/40' : 'opacity-70',
        )}
        aria-expanded={expanded}
      >
        <span className="inline-flex size-6 shrink-0 items-center justify-center text-muted-foreground">
          {expanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </span>
        <span className="text-base leading-none" aria-hidden>
          {category.icon}
        </span>
        <span className="min-w-0 flex-1 font-medium">{category.label}</span>
        <span className="font-financial text-sm">{formatCurrencyBr(category.total)}</span>
        <span className="w-14 text-right text-xs text-muted-foreground">
          {category.percentOfCost === null
            ? '—'
            : formatPercent(category.percentOfCost)}
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-border px-3 py-2">
          {category.entries.length === 0 ? (
            <p className="px-1 py-2 text-sm text-muted-foreground">
              Sem lançamentos nesta categoria.
            </p>
          ) : (
            <ul className="space-y-2">
              {category.entries.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-md bg-muted/30 px-3 py-2.5 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">
                        {entry.description?.trim() || entry.categoryLabel}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[
                          formatDateBr(entry.date),
                          entry.supplier,
                          entry.document ? `Doc. ${entry.document}` : null,
                          entry.categoryLabel,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="font-financial font-medium">
                        {formatCurrencyBr(entry.amount)}
                      </span>
                      {entry.originHref ? (
                        <Link
                          href={entry.originHref}
                          className={cn(
                            buttonVariants({variant: 'outline', size: 'sm'}),
                          )}
                        >
                          {entry.originLabel}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Painel presentacional do drill-down financeiro da viagem.
 * Desacoplado da DRE — recebe dados já carregados (servidor ou lazy wrapper).
 */
function TripFinancialBreakdown({
  data,
  defaultOpen = true,
  className,
  title = 'Detalhamento Financeiro',
}: TripFinancialBreakdownProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [expandedCategories, setExpandedCategories] = React.useState<
    Set<TripFinancialCostCategory>
  >(() => new Set());

  const toggleCategory = (category: TripFinancialCostCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <div
      className={cn('rounded-lg border border-border bg-card/60', className)}
      data-slot="trip-financial-breakdown"
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium hover:bg-muted/30"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
        {title}
      </button>

      {open ? (
        <div className="space-y-3 border-t border-border px-3 py-3">
          <div className="space-y-1.5 rounded-lg border border-border bg-background px-3 py-3">
            <SummaryLine
              label="Receita"
              value={formatCurrencyBr(data.revenue)}
              emphasize
            />
            <p className="pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Custos
            </p>
            {data.categories.map((category) => (
              <SummaryLine
                key={`summary-${category.category}`}
                label={`${category.icon} ${category.label}`}
                value={formatCurrencyBr(category.total)}
                muted
              />
            ))}
            <div className="my-2 border-t border-dashed border-border" />
            <SummaryLine
              label="Total"
              value={formatCurrencyBr(data.totalCost)}
              emphasize
            />
            <SummaryLine
              label="Lucro"
              value={
                <span className={resultClass(data.profit)}>
                  {formatCurrencyBr(data.profit)}
                </span>
              }
              emphasize
            />
            <SummaryLine
              label="Margem"
              value={data.margin === null ? '—' : formatPercent(data.margin)}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Lançamentos por categoria
            </p>
            {data.categories.map((category) => (
              <CategoryBlock
                key={category.category}
                category={category}
                expanded={expandedCategories.has(category.category)}
                onToggle={() => toggleCategory(category.category)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Wrapper lazy: carrega `getTripFinancialBreakdown` só quando montado
 * (ex.: ao expandir a viagem na DRE).
 */
function TripFinancialBreakdownLazy({
  tripId,
  tripLabel,
  className,
  title,
}: TripFinancialBreakdownLazyProps) {
  const [data, setData] = React.useState<TripFinancialBreakdownData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    void loadTripFinancialBreakdownAction({tripId}).then((result) => {
      if (cancelled) return;
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }
      setData(result.data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  if (loading) {
    return (
      <div className={cn('space-y-2 rounded-lg border border-border p-3', className)}>
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className={cn('text-sm text-destructive', className)}>
        {error ?? 'Não foi possível carregar o detalhamento financeiro.'}
      </p>
    );
  }

  return (
    <TripFinancialBreakdown
      data={data}
      className={className}
      title={
        title ??
        (tripLabel
          ? `Detalhamento Financeiro — ${tripLabel}`
          : 'Detalhamento Financeiro')
      }
    />
  );
}

export {TripFinancialBreakdown, TripFinancialBreakdownLazy};
