import {
  Calendar,
  DollarSign,
  Percent,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {PageHeader} from '@/components/layout/page-header';
import {dashboardMock} from '@/components/dashboard/mock-data';

const kpiIcons = {
  receita: DollarSign,
  lucro: TrendingUp,
  'fluxo-caixa': Wallet,
  ebitda: TrendingUp,
  margem: Percent,
  'custo-km': TrendingDown,
  'receita-km': DollarSign,
  'lucro-km': TrendingUp,
} as const;

function DashboardHeader() {
  const {title, description} = dashboardMock.header;

  return (
    <PageHeader
      title={title}
      description={description}
      actions={
        <>
          <Button variant="outline" size="sm" disabled>
            <Calendar className="size-4" />
            Últimos 30 dias
          </Button>
          <Button size="sm" disabled>
            <Plus className="size-4" />
            Nova Ação
          </Button>
        </>
      }
    />
  );
}

export {DashboardHeader, kpiIcons};
