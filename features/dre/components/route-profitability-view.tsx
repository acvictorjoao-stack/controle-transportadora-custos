'use client';

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Section} from '@/components/layout/section';
import {ROUTES} from '@/constants/routes/paths';
import {Alert, AlertDescription} from '@/components/ui/alert';

import type {
  OperationalDreByRouteData,
  OperationalDreFilterOptions,
  OperationalDreFilters,
} from '../types';
import {OperationalDreFiltersBar} from './operational-dre-filters';
import {OperationalDreRouteCosts} from './operational-dre-route-costs';

export interface RouteProfitabilityViewProps {
  byRoute: OperationalDreByRouteData;
  filterOptions: OperationalDreFilterOptions;
  initialFilters: OperationalDreFilters;
  error?: string | null;
}

const FUTURE_SLOTS = [
  {
    title: 'Gráficos',
    description: 'Evolução de margem e custo por rota ao longo do tempo.',
  },
  {
    title: 'Comparativos',
    description: 'Comparação entre rotas, períodos e centros de custo.',
  },
  {
    title: 'Ranking',
    description: 'Ordenação por lucratividade, custo/km e volume.',
  },
  {
    title: 'Mapa',
    description: 'Visualização geográfica das rotas e desempenho.',
  },
  {
    title: 'Indicadores',
    description: 'KPIs dedicados de rentabilidade por rota.',
  },
] as const;

/**
 * Visão de Rentabilidade por Rota — reutiliza Custos por Rota da DRE
 * e reserva espaço para evoluções futuras.
 */
function RouteProfitabilityView({
  byRoute,
  filterOptions,
  initialFilters,
  error = null,
}: RouteProfitabilityViewProps) {
  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <OperationalDreFiltersBar
        options={filterOptions}
        initialFilters={initialFilters}
        basePath={ROUTES.dashboardRentabilidadeRotas}
      />

      <Section
        title="Evoluções futuras"
        description="Espaço reservado para gráficos, comparativos, ranking, mapa e indicadores."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {FUTURE_SLOTS.map((slot) => (
            <Card key={slot.title} className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{slot.title}</CardTitle>
                <CardDescription>{slot.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Em breve</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <OperationalDreRouteCosts
        data={byRoute}
        filters={initialFilters}
        basePath={ROUTES.dashboardRentabilidadeRotas}
      />
    </div>
  );
}

export {RouteProfitabilityView};
