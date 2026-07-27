import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {Section} from '@/components/layout/section';
import {ROUTES} from '@/constants/routes/paths';
import {
  Car,
  CircleDollarSign,
  LineChart,
  Route,
  Truck,
  Users,
} from 'lucide-react';
import Link from 'next/link';

const ANALYTICAL_LINKS = [
  {
    href: ROUTES.dashboardDre,
    title: 'DRE',
    description: 'Demonstrativo de receitas, custos e resultado operacional.',
    icon: CircleDollarSign,
  },
  {
    href: ROUTES.dashboardRentabilidadeRotas,
    title: 'Rentabilidade por Rota',
    description: 'Custos e margem consolidados por rota.',
    icon: Route,
  },
  {
    href: ROUTES.dashboardRentabilidadeClientes,
    title: 'Rentabilidade por Cliente',
    description: 'Análise de rentabilidade por cliente.',
    icon: Users,
    soon: true,
  },
  {
    href: ROUTES.dashboardRentabilidadeVeiculos,
    title: 'Rentabilidade por Veículo',
    description: 'Análise de rentabilidade por veículo.',
    icon: Truck,
    soon: true,
  },
  {
    href: ROUTES.dashboardRentabilidadeMotoristas,
    title: 'Rentabilidade por Motorista',
    description: 'Análise de rentabilidade por motorista.',
    icon: Car,
    soon: true,
  },
  {
    href: ROUTES.dashboardInteligencia,
    title: 'Inteligência Operacional',
    description: 'Insights e recomendações da operação.',
    icon: LineChart,
    soon: true,
  },
] as const;

/**
 * Atalhos para os módulos analíticos do Dashboard.
 */
function DashboardAnalyticalLinks() {
  return (
    <Section
      title="Módulos analíticos"
      description="Acesse DRE, rentabilidade e inteligência operacional."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ANALYTICAL_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group block">
              <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-accent/30">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" />
                      <CardTitle className="text-base">{item.title}</CardTitle>
                    </div>
                    {'soon' in item && item.soon ? (
                      <Badge variant="secondary">Em breve</Badge>
                    ) : null}
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

/**
 * Área reservada para alertas operacionais (expansão futura).
 */
function DashboardAlertsPanel() {
  return (
    <Section title="Alertas" description="Sinais rápidos da operação.">
      <Alert>
        <AlertTitle>Sem alertas no momento</AlertTitle>
        <AlertDescription>
          Alertas operacionais e financeiros aparecerão aqui quando disponíveis.
        </AlertDescription>
      </Alert>
    </Section>
  );
}

export {DashboardAnalyticalLinks, DashboardAlertsPanel};
