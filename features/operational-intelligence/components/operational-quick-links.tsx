'use client';

import {
  CircleDollarSign,
  MapPin,
  AlertTriangle,
  Route,
  Wallet,
  Users,
  Truck,
} from 'lucide-react';
import Link from 'next/link';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {Section} from '@/components/layout/section';
import {buildCrossNavHref} from '@/features/analytics-nav';
import type {SharedAnalyticsFilters} from '@/features/analytics-nav';

const QUICK_LINK_DEFS = [
  {
    module: 'dre' as const,
    title: 'DRE',
    description: 'Resultado operacional financeiro',
    icon: CircleDollarSign,
  },
  {
    module: 'rentabilidade-rotas' as const,
    title: 'Rotas',
    description: 'Rentabilidade por rota',
    icon: Route,
  },
  {
    module: 'rentabilidade-clientes' as const,
    title: 'Cliente',
    description: 'Rentabilidade por cliente',
    icon: Users,
  },
  {
    module: 'rentabilidade-veiculos' as const,
    title: 'Rentabilidade',
    description: 'Análise por veículo',
    icon: Truck,
  },
  {
    module: 'viagens' as const,
    title: 'Viagens',
    description: 'Operação e acompanhamento',
    icon: MapPin,
  },
  {
    module: 'ocorrencias' as const,
    title: 'Ocorrências',
    description: 'Registro nas viagens',
    icon: AlertTriangle,
  },
  {
    module: 'financeiro' as const,
    title: 'Financeiro',
    description: 'Contas e fluxo de caixa',
    icon: Wallet,
  },
] as const;

export interface OperationalQuickLinksProps {
  filters?: SharedAnalyticsFilters;
}

function OperationalQuickLinks({filters = {}}: OperationalQuickLinksProps) {
  return (
    <Section
      title="Links rápidos"
      description="Atalhos para operação e módulos correlatos com filtros preservados."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK_LINK_DEFS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={`${item.module}-${item.title}`}
              href={buildCrossNavHref(item.module, filters)}
              className="group block"
            >
              <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-accent/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </div>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}

export {OperationalQuickLinks};
