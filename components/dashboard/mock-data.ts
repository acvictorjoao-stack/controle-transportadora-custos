import type {LucideIcon} from 'lucide-react';

export interface DashboardKpi {
  id: string;
  label: string;
  value: string;
  description: string;
  trend: {value: string; positive: boolean};
  icon: LucideIcon;
}

export interface DashboardChart {
  id: string;
  title: string;
  description: string;
}

export interface DashboardAlert {
  id: string;
  title: string;
  description: string;
  variant: 'warning' | 'destructive' | 'info';
  time: string;
}

export interface DashboardActivity {
  id: string;
  title: string;
  description: string;
  time: string;
}

export interface DashboardDueItem {
  id: string;
  title: string;
  amount: string;
  dueDate: string;
}

export interface DashboardRankingItem {
  id: string;
  name: string;
  value: string;
  subtitle: string;
}

export const dashboardMock = {
  header: {
    title: 'Dashboard Executivo',
    description:
      'Visão consolidada da performance financeira e operacional da sua frota em tempo real.',
  },

  kpis: [
    {
      id: 'receita',
      label: 'Receita',
      value: 'R$ 2.847.320',
      description: 'vs. mês anterior',
      trend: {value: '+12,4%', positive: true},
    },
    {
      id: 'lucro',
      label: 'Lucro',
      value: 'R$ 684.150',
      description: 'vs. mês anterior',
      trend: {value: '+8,7%', positive: true},
    },
    {
      id: 'fluxo-caixa',
      label: 'Fluxo de Caixa',
      value: 'R$ 412.890',
      description: 'vs. mês anterior',
      trend: {value: '+5,2%', positive: true},
    },
    {
      id: 'ebitda',
      label: 'EBITDA',
      value: 'R$ 921.440',
      description: 'vs. mês anterior',
      trend: {value: '+9,1%', positive: true},
    },
    {
      id: 'margem',
      label: 'Margem',
      value: '24,0%',
      description: 'vs. mês anterior',
      trend: {value: '+1,2 p.p.', positive: true},
    },
    {
      id: 'custo-km',
      label: 'Custo por KM',
      value: 'R$ 3,42',
      description: 'vs. mês anterior',
      trend: {value: '-3,8%', positive: true},
    },
    {
      id: 'receita-km',
      label: 'Receita por KM',
      value: 'R$ 5,18',
      description: 'vs. mês anterior',
      trend: {value: '+4,5%', positive: true},
    },
    {
      id: 'lucro-km',
      label: 'Lucro por KM',
      value: 'R$ 1,24',
      description: 'vs. mês anterior',
      trend: {value: '+6,2%', positive: true},
    },
  ] as Omit<DashboardKpi, 'icon'>[],

  charts: [
    {
      id: 'receita-despesas',
      title: 'Receita x Despesas',
      description: 'Comparativo mensal dos últimos 12 meses',
    },
    {
      id: 'custos-categoria',
      title: 'Custos por Categoria',
      description: 'Distribuição de custos operacionais',
    },
    {
      id: 'fluxo-mensal',
      title: 'Fluxo Mensal',
      description: 'Entradas e saídas consolidadas por mês',
    },
  ] as DashboardChart[],

  alerts: [
    {
      id: '1',
      title: 'Manutenção vencida',
      description: 'Veículo ABC-1D23 com revisão atrasada há 5 dias',
      variant: 'destructive',
      time: 'Há 2h',
    },
    {
      id: '2',
      title: 'Contrato próximo do vencimento',
      description: 'Contrato #4521 com Cliente Logística Sul vence em 7 dias',
      variant: 'warning',
      time: 'Há 4h',
    },
    {
      id: '3',
      title: 'Meta de receita atingida',
      description: 'Receita mensal superou a meta em 8,3%',
      variant: 'info',
      time: 'Hoje',
    },
  ] as DashboardAlert[],

  activities: [
    {
      id: '1',
      title: 'Viagem concluída',
      description: 'SP → RJ · Motorista João Silva · 432 km',
      time: 'Há 15 min',
    },
    {
      id: '2',
      title: 'Pagamento registrado',
      description: 'Conta a pagar #8821 · R$ 12.450,00',
      time: 'Há 1h',
    },
    {
      id: '3',
      title: 'Novo contrato',
      description: 'Cliente Transportes Norte · R$ 85.000/mês',
      time: 'Há 3h',
    },
    {
      id: '4',
      title: 'Abastecimento',
      description: 'Veículo DEF-4G56 · 180 litros · Posto BR-116',
      time: 'Há 5h',
    },
  ] as DashboardActivity[],

  upcomingDue: [
    {
      id: '1',
      title: 'IPVA — Frota completa',
      amount: 'R$ 48.200,00',
      dueDate: '28 Jun 2026',
    },
    {
      id: '2',
      title: 'Seguro — 12 veículos',
      amount: 'R$ 23.800,00',
      dueDate: '02 Jul 2026',
    },
    {
      id: '3',
      title: 'Folha de pagamento',
      amount: 'R$ 156.400,00',
      dueDate: '05 Jul 2026',
    },
  ] as DashboardDueItem[],

  rankings: {
    clientes: [
      {id: '1', name: 'Logística Sul S.A.', value: 'R$ 482.300', subtitle: '142 viagens'},
      {id: '2', name: 'Transportes Norte', value: 'R$ 391.800', subtitle: '118 viagens'},
      {id: '3', name: 'Distribuidora Central', value: 'R$ 287.450', subtitle: '96 viagens'},
      {id: '4', name: 'Frio Express', value: 'R$ 214.600', subtitle: '78 viagens'},
      {id: '5', name: 'Agro Cargas Ltda.', value: 'R$ 178.920', subtitle: '65 viagens'},
    ] as DashboardRankingItem[],

    veiculos: [
      {id: '1', name: 'Mercedes Actros · ABC-1D23', value: 'R$ 98.400', subtitle: '12.840 km'},
      {id: '2', name: 'Volvo FH · DEF-4G56', value: 'R$ 87.200', subtitle: '11.230 km'},
      {id: '3', name: 'Scania R450 · GHI-7J89', value: 'R$ 76.150', subtitle: '10.580 km'},
      {id: '4', name: 'DAF XF · JKL-0M12', value: 'R$ 68.900', subtitle: '9.420 km'},
      {id: '5', name: 'Iveco S-Way · MNO-3P45', value: 'R$ 61.300', subtitle: '8.760 km'},
    ] as DashboardRankingItem[],

    motoristas: [
      {id: '1', name: 'João Silva', value: 'R$ 72.800', subtitle: '48 viagens · 4,9★'},
      {id: '2', name: 'Maria Santos', value: 'R$ 68.400', subtitle: '45 viagens · 4,8★'},
      {id: '3', name: 'Carlos Oliveira', value: 'R$ 61.200', subtitle: '42 viagens · 4,7★'},
      {id: '4', name: 'Ana Costa', value: 'R$ 58.900', subtitle: '39 viagens · 4,9★'},
      {id: '5', name: 'Pedro Lima', value: 'R$ 54.300', subtitle: '36 viagens · 4,6★'},
    ] as DashboardRankingItem[],
  },
} as const;
