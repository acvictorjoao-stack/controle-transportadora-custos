'use client';

import * as React from 'react';
import Link from 'next/link';

import {DataTable} from '@/components/data-display/data-table';
import {StatCard} from '@/components/data-display/stat-card';
import {TableContainer} from '@/components/data-display/table-container';
import {PageTemplate} from '@/components/layout/page-template';
import {Section} from '@/components/layout/section';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {ROUTES} from '@/constants/routes/paths';
import {formatCurrencyBr, formatDateBr, formatPercent} from '@/features/financial/utils/financial-format';

import type {
  TripProfitabilityRow,
  TripProfitabilitySort,
  TripProfitabilitySummary,
} from '../services/operational-dre-trip-profitability';
import {sortTripProfitabilityRows} from '../services/operational-dre-trip-profitability';
import type {OperationalDreCosts, OperationalDreFilterOptions, OperationalDreFilters} from '../types';
import {PROFITABILITY_GLOSSARY} from '../utils/profitability-glossary';
import {OperationalDreFiltersBar} from './operational-dre-filters';

export interface TripProfitabilityPageViewProps {
  rows: TripProfitabilityRow[];
  summary: TripProfitabilitySummary;
  /** Custos da DRE do recorte: atribuídos × não atribuíveis. */
  costs: Pick<OperationalDreCosts, 'totalOperatingCosts' | 'allocatedOperatingCosts' | 'unattributableOperatingCosts'>;
  filterOptions: OperationalDreFilterOptions;
  initialFilters: OperationalDreFilters;
  error?: string | null;
}

const SORT_OPTIONS: Array<{value: TripProfitabilitySort; label: string}> = [
  {value: 'result_desc', label: 'Maior resultado com rateio'},
  {value: 'result_asc', label: 'Menor resultado com rateio'},
  {value: 'margin_desc', label: 'Maior margem'},
  {value: 'margin_asc', label: 'Menor margem'},
  {value: 'date_desc', label: 'Mais recentes'},
];

const KM_SOURCE_LABELS = {odometer: 'Odômetro', planned: 'Planejado', none: 'Sem KM'} as const;

function money(value: number | null): string {
  return value === null ? '—' : formatCurrencyBr(value);
}

function perKm(value: number | null): string {
  return value === null ? '—' : `${formatCurrencyBr(value)}/km`;
}

function percent(value: number | null): string {
  return value === null ? '—' : formatPercent(value);
}

function HeaderHint({term}: {term: keyof typeof PROFITABILITY_GLOSSARY}) {
  const definition = PROFITABILITY_GLOSSARY[term];
  return (
    <span title={definition.description} className="cursor-help underline decoration-dotted underline-offset-2">
      {definition.label}
    </span>
  );
}

function TripProfitabilityPageView({
  rows,
  summary,
  costs,
  filterOptions,
  initialFilters,
  error = null,
}: TripProfitabilityPageViewProps) {
  const [sort, setSort] = React.useState<TripProfitabilitySort>('result_desc');
  const sorted = React.useMemo(() => sortTripProfitabilityRows(rows, sort), [rows, sort]);
  const kmIssues = summary.kmQuality.planned + summary.kmQuality.none;

  return (
    <PageTemplate
      title="Rentabilidade por Viagem"
      description="Quanto cada viagem gera: resultado direto (só custos da viagem) e com rateio (inclui a parte do veículo por KM). O rateio usa os custos do veículo lançados no período escolhido, divididos pelas viagens dele no mesmo período: mudar o período muda o rateio."
      // Como nas outras telas de rentabilidade: /dashboard/rentabilidade não existe (o breadcrumb automático geraria 404).
      breadcrumbItems={[{label: 'Dashboard', href: ROUTES.dashboard}, {label: 'Rentabilidade por Viagem'}]}
    >
      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mb-6">
        <OperationalDreFiltersBar
          options={filterOptions}
          initialFilters={initialFilters}
          basePath={ROUTES.dashboardRentabilidadeViagens}
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Viagens concluídas" value={summary.tripCount} subtitle={`${summary.totalKm.toLocaleString('pt-BR')} km`} />
        <StatCard title="Receita" value={money(summary.revenue)} subtitle={PROFITABILITY_GLOSSARY.revenue.description} />
        <StatCard
          title="Resultado direto"
          value={money(summary.directResult)}
          subtitle={`Custos da própria viagem: ${money(summary.directCost)}`}
        />
        <StatCard
          title="Resultado com rateio"
          value={money(summary.allocatedResult)}
          subtitle={`Custos atribuídos às viagens: ${money(summary.allocatedCost)}`}
        />
        <StatCard title="Margem com rateio" value={percent(summary.allocatedMarginPercent)} />
        <StatCard title="Lucro/KM" value={perKm(summary.profitPerKm)} subtitle="Resultado com rateio ÷ KM operacional" />
      </div>

      <Section
        title="Qualidade dos dados"
        description="O que sustenta (ou distorce) os números desta tela."
        className="mb-6"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="KM por odômetro"
            value={`${summary.kmQuality.odometer} de ${summary.tripCount}`}
            subtitle={
              kmIssues > 0
                ? `${summary.kmQuality.planned} com KM planejado e ${summary.kmQuality.none} sem KM: custo/KM e rateio menos confiáveis.`
                : 'Todas as viagens com leitura de odômetro.'
            }
          />
          <StatCard
            title="Não atribuíveis no período"
            value={money(costs.unattributableOperatingCosts)}
            subtitle={`De ${money(costs.totalOperatingCosts)} de custos da DRE. ${PROFITABILITY_GLOSSARY.unattributableCosts.description}`}
          />
          <StatCard
            title="Resultado da DRE no período"
            value={summary.allocatedResult === null ? '—' : money(summary.revenue - costs.totalOperatingCosts)}
            subtitle="Receita − todos os custos (inclui os não atribuíveis). A soma das viagens não chega a este valor."
          />
        </div>
      </Section>

      <Section
        title="Ranking de viagens"
        description="Cada linha leva à viagem. Passe o mouse nos títulos das colunas para ver a definição."
      >
        <label className="flex items-center gap-2 self-end text-sm text-muted-foreground">
          Ordenar por
          <select
            aria-label="Ordenar viagens"
            className="h-8 rounded-md border border-input bg-card px-2 text-sm text-foreground"
            value={sort}
            onChange={(event) => setSort(event.target.value as TripProfitabilitySort)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <TableContainer>
          <DataTable
            columns={[
              {
                id: 'trip',
                header: 'Viagem',
                cell: (row: TripProfitabilityRow) => (
                  <div className="flex flex-col">
                    <Link href={ROUTES.viagemDetail(row.id)} className="font-medium hover:underline">
                      {row.tripNumber}
                    </Link>
                    <span className="text-xs text-muted-foreground">{formatDateBr(row.completedAt)}</span>
                  </div>
                ),
              },
              {
                id: 'context',
                header: 'Veículo · rota · cliente',
                cell: (row: TripProfitabilityRow) => (
                  <div className="flex flex-col text-xs">
                    <span>{row.vehicleLabel ?? 'Sem veículo'}</span>
                    <span className="text-muted-foreground">{row.routeLabel ?? 'Sem rota'}</span>
                    <span className="text-muted-foreground">{row.customerLabel ?? 'Sem cliente'}</span>
                  </div>
                ),
              },
              {
                id: 'km',
                header: <HeaderHint term="operationalKm" />,
                className: 'text-right',
                headerClassName: 'text-right',
                cell: (row: TripProfitabilityRow) => (
                  <div className="flex flex-col items-end gap-1">
                    <span>{row.distanceKm.toLocaleString('pt-BR')}</span>
                    {row.distanceSource !== 'odometer' ? (
                      <Badge variant={row.distanceSource === 'none' ? 'destructive' : 'warning'}>
                        {KM_SOURCE_LABELS[row.distanceSource]}
                      </Badge>
                    ) : null}
                  </div>
                ),
              },
              {
                id: 'revenue',
                header: <HeaderHint term="revenue" />,
                className: 'text-right',
                headerClassName: 'text-right',
                cell: (row: TripProfitabilityRow) => money(row.revenue),
              },
              {
                id: 'direct',
                header: <HeaderHint term="directResult" />,
                className: 'text-right',
                headerClassName: 'text-right',
                cell: (row: TripProfitabilityRow) => (
                  <div className="flex flex-col items-end">
                    <span>{money(row.directResult)}</span>
                    <span className="text-xs text-muted-foreground">custos {money(row.directCost)}</span>
                  </div>
                ),
              },
              {
                id: 'allocated',
                header: <HeaderHint term="allocatedResult" />,
                className: 'text-right',
                headerClassName: 'text-right',
                cell: (row: TripProfitabilityRow) => (
                  <div className="flex flex-col items-end">
                    <span className="font-medium">{money(row.allocatedResult)}</span>
                    <span className="text-xs text-muted-foreground">
                      {row.vehicleShare >= 0.005 ? `+ ${money(row.vehicleShare)} do veículo` : 'sem rateio'}
                    </span>
                  </div>
                ),
              },
              {
                id: 'margin',
                header: <HeaderHint term="marginPercent" />,
                className: 'text-right',
                headerClassName: 'text-right',
                cell: (row: TripProfitabilityRow) => percent(row.allocatedMarginPercent),
              },
              {
                id: 'perKm',
                header: <HeaderHint term="profitPerKm" />,
                className: 'text-right',
                headerClassName: 'text-right',
                cell: (row: TripProfitabilityRow) => (
                  <div className="flex flex-col items-end">
                    <span>{perKm(row.profitPerKm)}</span>
                    <span className="text-xs text-muted-foreground">custo {perKm(row.costPerKm)}</span>
                  </div>
                ),
              },
            ]}
            data={sorted}
            getRowKey={(row) => row.id}
            emptyTitle="Nenhuma viagem concluída no período"
            emptyDescription="Ajuste o período ou os filtros."
          />
        </TableContainer>
      </Section>
    </PageTemplate>
  );
}

export {TripProfitabilityPageView};
