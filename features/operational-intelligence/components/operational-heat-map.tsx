'use client';

import * as React from 'react';

import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {Section} from '@/components/layout/section';
import {buttonVariants} from '@/components/ui/button';
import {cn} from '@/lib/utils';

import type {BranchOperationalRow} from '../types';
import {formatOperationalStatus} from '../utils/compose';

export interface OperationalHeatMapProps {
  rows: BranchOperationalRow[];
}

function formatPercent(value: number | null): string {
  if (value == null) return '—';
  return `${value.toLocaleString('pt-BR', {maximumFractionDigits: 1})}%`;
}

function OperationalHeatMap({rows}: OperationalHeatMapProps) {
  const [sortWorstFirst, setSortWorstFirst] = React.useState(true);

  const data = React.useMemo(() => {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const aSla = a.slaPercent ?? -1;
      const bSla = b.slaPercent ?? -1;
      return sortWorstFirst ? aSla - bSla : bSla - aSla;
    });
    return sorted;
  }, [rows, sortWorstFirst]);

  return (
    <Section
      title="Mapa Operacional"
      description="Filiais com viagens ativas, atrasos, concluídas e SLA."
    >
      <div className="flex justify-end">
        <button
          type="button"
          className={cn(buttonVariants({variant: 'outline', size: 'sm'}))}
          onClick={() => setSortWorstFirst((prev) => !prev)}
        >
          {sortWorstFirst ? 'Ordenar: pior desempenho' : 'Ordenar: melhor desempenho'}
        </button>
      </div>
      <TableContainer>
        <DataTable
          columns={[
            {
              id: 'branch',
              header: 'Filial',
              cell: (row: BranchOperationalRow) => row.name,
            },
            {
              id: 'active',
              header: 'Viagens Ativas',
              cell: (row: BranchOperationalRow) => row.activeTrips,
            },
            {
              id: 'delayed',
              header: 'Em Atraso',
              cell: (row: BranchOperationalRow) => (
                <span className={row.delayedTrips > 0 ? 'text-destructive' : undefined}>
                  {row.delayedTrips}
                </span>
              ),
            },
            {
              id: 'completed',
              header: 'Concluídas',
              cell: (row: BranchOperationalRow) => row.completedTrips,
            },
            {
              id: 'sla',
              header: '% SLA',
              cell: (row: BranchOperationalRow) => formatPercent(row.slaPercent),
            },
            {
              id: 'status',
              header: 'Status',
              cell: (row: BranchOperationalRow) =>
                formatOperationalStatus(row.status),
            },
          ]}
          data={data}
          getRowKey={(row) => row.id}
          emptyTitle="Sem filiais no recorte"
          emptyDescription="Viagens com filial aparecerão no mapa operacional."
        />
      </TableContainer>
    </Section>
  );
}

export {OperationalHeatMap};
