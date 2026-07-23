import {DataTable} from '@/components/data-display/data-table';
import {StatCard} from '@/components/data-display/stat-card';
import {TableContainer} from '@/components/data-display/table-container';
import {Section} from '@/components/layout/section';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {
  formatCurrencyBr,
  formatPercent,
} from '@/features/financial/utils/financial-format';

import type {
  OperationalDreAnalyticalRow,
  OperationalDreByRouteData,
  OperationalDreCostCenterRow,
  OperationalDreData,
  OperationalDreFilterOptions,
  OperationalDreFilters,
} from '../types';
import {OperationalDreFiltersBar} from './operational-dre-filters';
import {OperationalDreRouteCosts} from './operational-dre-route-costs';

export interface OperationalDreViewProps {
  data: OperationalDreData;
  byRoute: OperationalDreByRouteData;
  filterOptions: OperationalDreFilterOptions;
  initialFilters: OperationalDreFilters;
  error?: string | null;
}

function formatMoney(value: number): string {
  return formatCurrencyBr(value);
}

function formatRatio(value: number | null, suffix: string): string {
  if (value === null) return '—';
  return `${formatCurrencyBr(value)}${suffix}`;
}

function formatCount(value: number): string {
  return value.toLocaleString('pt-BR');
}

function formatKm(value: number): string {
  return `${value.toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
  })} km`;
}

function resultClass(value: number): string | undefined {
  return value < 0 ? 'text-destructive' : undefined;
}

/**
 * Camada de apresentação da DRE — apenas renderiza `OperationalDreData`.
 * Nenhuma regra financeira vive aqui.
 */
function OperationalDreView({
  data,
  byRoute,
  filterOptions,
  initialFilters,
  error = null,
}: OperationalDreViewProps) {
  const {revenues, costs, result, indicators, analyticalTable, costCenterBreakdown} =
    data;

  const displayCenters = [
    'OPERACIONAL',
    'ADMINISTRATIVO',
    'COMERCIAL',
    'RH',
    'TI',
  ].map((code) => {
    const row = costCenterBreakdown.ranking.find((item) => item.code === code);
    return {
      code,
      name: row?.name ?? code,
      value: row?.value ?? costCenterBreakdown.byCode[code] ?? 0,
      percent: row?.percent ?? null,
    };
  });

  const analyticalColumns = [
    {
      id: 'category',
      header: 'Categoria',
      cell: (row: OperationalDreAnalyticalRow) => row.label,
    },
    {
      id: 'value',
      header: 'Valor',
      cell: (row: OperationalDreAnalyticalRow) => (
        <span className={resultClass(row.value)}>{formatMoney(row.value)}</span>
      ),
    },
    {
      id: 'percent',
      header: '% Receita',
      cell: (row: OperationalDreAnalyticalRow) =>
        row.percentOfRevenue === null ? '—' : formatPercent(row.percentOfRevenue),
    },
  ];

  return (
    <Section
      title="DRE Operacional"
      description="Consolidação de receitas e custos da operação no período filtrado."
    >
      <div className="flex flex-col gap-6">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <OperationalDreFiltersBar
          options={filterOptions}
          initialFilters={initialFilters}
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Receitas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Receita de Fretes</p>
                <p className="font-financial text-lg font-semibold">
                  {formatMoney(revenues.freightRevenue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Receita Total</p>
                <p className="font-financial text-xl font-semibold">
                  {formatMoney(revenues.totalRevenue)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Custos Operacionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <CostLine label="Combustível" value={costs.fuel} />
              <CostLine label="Manutenções" value={costs.maintenance} />
              <CostLine label="Pneus" value={costs.tires} />
              <CostLine label="Financeiro" value={costs.financial} />
              <CostLine label="Contas Operacionais" value={costs.accountsPayable} />
              <CostLine label="Outros Custos" value={costs.other} />
              <div className="border-t pt-2">
                <CostLine
                  label="Total de Custos"
                  value={costs.totalOperatingCosts}
                  emphasize
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Resultado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Lucro Operacional</p>
                <p
                  className={`font-financial text-xl font-semibold ${
                    resultClass(result.operatingProfit) ?? ''
                  }`}
                >
                  {formatMoney(result.operatingProfit)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Margem Operacional</p>
                <p
                  className={`font-financial text-lg font-semibold ${
                    resultClass(result.operatingMarginPercent) ?? ''
                  }`}
                >
                  {formatPercent(result.operatingMarginPercent)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Indicadores
          </h3>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
            <StatCard
              title="Receita/km"
              value={formatRatio(indicators.revenuePerKm, '/km')}
            />
            <StatCard
              title="Custo/km"
              value={formatRatio(indicators.costPerKm, '/km')}
            />
            <StatCard
              title="Lucro/km"
              value={
                <span className={resultClass(indicators.profitPerKm ?? 0)}>
                  {formatRatio(indicators.profitPerKm, '/km')}
                </span>
              }
            />
            <StatCard
              title="Receita/Viagem"
              value={formatRatio(indicators.revenuePerTrip, '')}
            />
            <StatCard
              title="Custo/Viagem"
              value={formatRatio(indicators.costPerTrip, '')}
            />
            <StatCard
              title="Lucro/Viagem"
              value={
                <span className={resultClass(indicators.profitPerTrip ?? 0)}>
                  {formatRatio(indicators.profitPerTrip, '')}
                </span>
              }
            />
            <StatCard
              title="Viagens"
              value={formatCount(indicators.tripCount)}
            />
            <StatCard title="KM Rodados" value={formatKm(indicators.totalKm)} />
            <StatCard
              title="Clientes Atendidos"
              value={formatCount(indicators.customersServed)}
            />
            <StatCard
              title="Rotas Utilizadas"
              value={formatCount(indicators.routesUsed)}
            />
            <StatCard
              title="Veículos Utilizados"
              value={formatCount(indicators.vehiclesUsed)}
            />
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Custos por Centro
          </h3>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {displayCenters.map((center) => (
              <StatCard
                key={center.code}
                title={center.name}
                value={
                  <span className="flex flex-col gap-0.5">
                    <span>{formatMoney(center.value)}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {center.percent === null
                        ? '—'
                        : formatPercent(center.percent)}
                    </span>
                  </span>
                }
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Ranking — Centros de Custo
          </h3>
          <TableContainer>
            <DataTable
              columns={[
                {
                  id: 'center',
                  header: 'Centro',
                  cell: (row: OperationalDreCostCenterRow) =>
                    `${row.code} — ${row.name}`,
                },
                {
                  id: 'value',
                  header: 'Valor',
                  cell: (row: OperationalDreCostCenterRow) => formatMoney(row.value),
                },
                {
                  id: 'percent',
                  header: '%',
                  cell: (row: OperationalDreCostCenterRow) =>
                    row.percent === null ? '—' : formatPercent(row.percent),
                },
                {
                  id: 'share',
                  header: 'Participação',
                  cell: (row: OperationalDreCostCenterRow) => (
                    <div className="flex min-w-[8rem] items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
                        <div
                          className="h-full bg-primary/80"
                          style={{
                            width: `${Math.min(100, Math.max(0, row.percent ?? 0))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ),
                },
              ]}
              data={costCenterBreakdown.ranking}
              getRowKey={(row) => row.costCenterId ?? row.code}
              emptyTitle="Sem custos por centro"
              emptyDescription="Lançamentos com centro de custo aparecerão aqui."
            />
          </TableContainer>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Tabela Analítica
          </h3>
          <TableContainer>
            <DataTable
              columns={analyticalColumns}
              data={analyticalTable}
              getRowKey={(row) => row.category}
              emptyTitle="Sem dados para o período"
              emptyDescription="Ajuste os filtros para visualizar a DRE."
            />
          </TableContainer>
        </div>

        <OperationalDreRouteCosts data={byRoute} filters={initialFilters} />
      </div>
    </Section>
  );
}

function CostLine({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={emphasize ? 'font-medium' : 'text-muted-foreground'}>
        {label}
      </span>
      <span
        className={`font-financial ${emphasize ? 'font-semibold' : ''} ${
          resultClass(value) ?? ''
        }`}
      >
        {formatMoney(value)}
      </span>
    </div>
  );
}

export {OperationalDreView};
