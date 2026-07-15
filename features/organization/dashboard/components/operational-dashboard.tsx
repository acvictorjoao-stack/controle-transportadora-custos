import Link from 'next/link';

import {DataTable} from '@/components/data-display/data-table';
import {StatCard} from '@/components/data-display/stat-card';
import {TableContainer} from '@/components/data-display/table-container';
import {Section} from '@/components/layout/section';
import {Badge} from '@/components/ui/badge';
import {buttonVariants} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {ROUTES} from '@/constants/routes/paths';
import {cn} from '@/lib/utils';
import {
  TRIP_STATUS_INDICATORS,
  TRIP_STATUS_LABELS,
} from '@/features/trips/types';
import {getTripStatusVariant} from '@/features/trips/utils/trip-status';

import type {
  OperationalDashboardData,
  OperationalTripSummaryRow,
} from '../types/operational-dashboard';

function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatCount(value: number): string {
  return value.toLocaleString('pt-BR');
}

export interface OperationalDashboardProps {
  data: OperationalDashboardData;
}

function OperationalDashboard({data}: OperationalDashboardProps) {
  const {trips, financial, registries, fleet, drivers, recentTrips} = data;
  const resultClass =
    financial.operationalResult < 0 ? 'text-destructive' : undefined;

  const recentColumns = [
    {
      id: 'trip',
      header: 'Viagem',
      cell: (row: OperationalTripSummaryRow) => (
        <Link
          href={ROUTES.viagemDetail(row.id)}
          className="font-mono text-sm font-medium hover:underline"
        >
          {row.tripNumber}
        </Link>
      ),
    },
    {
      id: 'customer',
      header: 'Cliente',
      cell: (row: OperationalTripSummaryRow) => row.customerName,
    },
    {
      id: 'vehicle',
      header: 'Veículo',
      cell: (row: OperationalTripSummaryRow) => row.vehiclePlate,
    },
    {
      id: 'driver',
      header: 'Motorista',
      cell: (row: OperationalTripSummaryRow) => row.driverName,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: OperationalTripSummaryRow) => (
        <Badge variant={getTripStatusVariant(row.tripStatus)}>
          {TRIP_STATUS_INDICATORS[row.tripStatus]}{' '}
          {TRIP_STATUS_LABELS[row.tripStatus]}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Section>
        <div className="flex flex-wrap gap-2">
          <Link href={ROUTES.viagens} className={cn(buttonVariants({size: 'sm'}))}>
            Nova Viagem
          </Link>
          <Link
            href={ROUTES.clientes}
            className={cn(buttonVariants({size: 'sm', variant: 'outline'}))}
          >
            Novo Cliente
          </Link>
          <Link
            href={ROUTES.veiculos}
            className={cn(buttonVariants({size: 'sm', variant: 'outline'}))}
          >
            Novo Veículo
          </Link>
          <Link
            href={ROUTES.motoristas}
            className={cn(buttonVariants({size: 'sm', variant: 'outline'}))}
          >
            Novo Motorista
          </Link>
        </div>
      </Section>

      <Section title="Viagens">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard title="Programadas" value={formatCount(trips.programmed)} />
          <StatCard title="Em andamento" value={formatCount(trips.inProgress)} />
          <StatCard title="Concluídas" value={formatCount(trips.completed)} />
          <StatCard title="Canceladas" value={formatCount(trips.cancelled)} />
        </div>
      </Section>

      <Section title="Financeiro operacional">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatCard title="Total de fretes" value={formatMoney(financial.totalFreight)} />
          <StatCard
            title="Total de despesas das viagens"
            value={formatMoney(financial.totalExpenses)}
          />
          <StatCard
            title="Resultado operacional"
            value={
              <span className={resultClass}>
                {formatMoney(financial.operationalResult)}
              </span>
            }
            subtitle="Fretes − Despesas"
          />
        </div>
      </Section>

      <Section title="Cadastros">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            title="Clientes ativos"
            value={formatCount(registries.activeCustomers)}
          />
          <StatCard
            title="Veículos ativos"
            value={formatCount(registries.activeVehicles)}
          />
          <StatCard
            title="Motoristas ativos"
            value={formatCount(registries.activeDrivers)}
          />
          <StatCard
            title="Rotas ativas"
            value={formatCount(registries.activeRoutes)}
          />
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Section title="Resumo de viagens" className="xl:col-span-2">
          <TableContainer>
            <DataTable
              columns={recentColumns}
              data={recentTrips}
              getRowKey={(row) => row.id}
              emptyTitle="Nenhuma viagem cadastrada"
              emptyDescription="As últimas viagens aparecerão aqui."
            />
          </TableContainer>
        </Section>

        <div className="flex flex-col gap-6">
          <Section title="Resumo financeiro">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Médias por viagem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Frete médio</p>
                  <p className="font-financial text-xl font-semibold">
                    {formatMoney(financial.averageFreight)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Despesa média</p>
                  <p className="font-financial text-xl font-semibold">
                    {formatMoney(financial.averageExpense)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Resultado médio</p>
                  <p
                    className={`font-financial text-xl font-semibold ${
                      financial.averageResult < 0 ? 'text-destructive' : ''
                    }`}
                  >
                    {formatMoney(financial.averageResult)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Section title="Situação da frota">
            <div className="grid grid-cols-1 gap-3">
              <StatCard title="Disponíveis" value={formatCount(fleet.available)} />
              <StatCard title="Em viagem" value={formatCount(fleet.onTrip)} />
              <StatCard title="Em manutenção" value={formatCount(fleet.maintenance)} />
            </div>
          </Section>

          <Section title="Situação dos motoristas">
            <div className="grid grid-cols-1 gap-3">
              <StatCard title="Disponíveis" value={formatCount(drivers.available)} />
              <StatCard title="Em viagem" value={formatCount(drivers.onTrip)} />
              <StatCard title="Inativos" value={formatCount(drivers.inactive)} />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

export {OperationalDashboard};
