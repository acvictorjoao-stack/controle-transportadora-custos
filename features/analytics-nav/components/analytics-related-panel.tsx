'use client';

import {
  Building2,
  CircleDollarSign,
  MapPin,
  Route,
  Truck,
  UserRound,
  Users,
  Wallet,
  AlertTriangle,
  Brain,
} from 'lucide-react';
import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {cn} from '@/lib/utils';

import type {AnalyticsModuleId, SharedAnalyticsFilters} from '../types';
import {buildCrossNavHref} from '../utils/shared-filters';

const RELATED_ITEMS: Array<{
  id: AnalyticsModuleId;
  label: string;
  description: string;
  icon: typeof Users;
}> = [
  {
    id: 'rentabilidade-clientes',
    label: 'Cliente',
    description: 'Rentabilidade por cliente',
    icon: Users,
  },
  {
    id: 'rentabilidade-rotas',
    label: 'Rotas',
    description: 'Rentabilidade por rota',
    icon: Route,
  },
  {
    id: 'rentabilidade-veiculos',
    label: 'Veículos',
    description: 'Rentabilidade por veículo',
    icon: Truck,
  },
  {
    id: 'rentabilidade-motoristas',
    label: 'Motoristas',
    description: 'Rentabilidade por motorista',
    icon: UserRound,
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    description: 'Contas e fluxo de caixa',
    icon: Wallet,
  },
  {
    id: 'ocorrencias',
    label: 'Ocorrências',
    description: 'Registros nas viagens',
    icon: AlertTriangle,
  },
  {
    id: 'inteligencia',
    label: 'Inteligência',
    description: 'Saúde operacional',
    icon: Brain,
  },
  {
    id: 'dre',
    label: 'DRE',
    description: 'Resultado operacional',
    icon: CircleDollarSign,
  },
  {
    id: 'viagens',
    label: 'Viagens',
    description: 'Operação e acompanhamento',
    icon: MapPin,
  },
];

export interface AnalyticsRelatedPanelProps {
  filters: SharedAnalyticsFilters;
  currentModule?: AnalyticsModuleId;
  className?: string;
  compact?: boolean;
}

function AnalyticsRelatedPanel({
  filters,
  currentModule,
  className,
  compact = false,
}: AnalyticsRelatedPanelProps) {
  const items = RELATED_ITEMS.filter((item) => item.id !== currentModule);

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className={compact ? 'pb-2' : undefined}>
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Relacionados</CardTitle>
        </div>
        <CardDescription>
          Abre a análise correspondente com os filtros atuais.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={buildCrossNavHref(item.id, filters)}
              className="flex items-start gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent/50"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block font-medium">{item.label}</span>
                {!compact ? (
                  <span className="block text-xs text-muted-foreground">
                    {item.description}
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

export {AnalyticsRelatedPanel};
