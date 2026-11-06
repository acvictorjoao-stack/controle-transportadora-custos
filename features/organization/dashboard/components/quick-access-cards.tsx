import {
  CircleDollarSign,
  Route,
  Wallet,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {Section} from '@/components/layout/section';
import {ROUTES} from '@/constants/routes/paths';

const QUICK_LINKS = [
  {
    href: ROUTES.dashboardDre,
    title: 'DRE',
    description: 'Análise financeira detalhada',
    icon: CircleDollarSign,
  },
  {
    href: ROUTES.dashboardRentabilidadeRotas,
    title: 'Rentabilidade por Rota',
    description: 'Inteligência operacional por rota',
    icon: Route,
  },
  {
    href: ROUTES.fluxoDeCaixa,
    title: 'Fluxo de Caixa',
    description: 'Entradas, saídas e saldo',
    icon: Wallet,
  },
  {
    href: ROUTES.viagens,
    title: 'Viagens',
    description: 'Operação e acompanhamento',
    icon: MapPin,
  },
] as const;

export interface QuickAccessCardsProps {
  className?: string;
}

function QuickAccessCards({className}: QuickAccessCardsProps) {
  return (
    <Section
      title="Links Rápidos"
      description="Acesso direto aos módulos de decisão."
      className={className}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group block">
              <Card className="h-full py-5 transition-colors group-hover:border-primary/40">
                <CardHeader className="px-5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <CardTitle className="text-sm">{item.title}</CardTitle>
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

export {QuickAccessCards};
