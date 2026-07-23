import {
  Building2,
  Car,
  CircleDollarSign,
  CreditCard,
  FileText,
  Fuel,
  GitBranch,
  LayoutDashboard,
  LineChart,
  MapPin,
  PieChart,
  Receipt,
  Route,
  Settings,
  Shield,
  Truck,
  UserCog,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';

import {ROUTES} from '@/constants/routes/paths';
import type {NavGroup} from '@/types/global/navigation';

/**
 * Configuração centralizada de navegação do FleetControl (RC 27 — accordion).
 */
export const navigationGroups: NavGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    defaultOpen: true,
    permission: 'dashboard:read',
    items: [
      {
        id: 'visao-geral',
        title: 'Visão Geral',
        description: 'Visão operacional da frota',
        href: `${ROUTES.dashboard}#visao-geral`,
        icon: LayoutDashboard,
        permission: 'dashboard:read',
      },
      {
        id: 'dashboard-dre',
        title: 'DRE',
        description: 'DRE operacional',
        href: `${ROUTES.dashboard}#dre`,
        icon: CircleDollarSign,
        permission: 'dashboard:read',
      },
      {
        id: 'inteligencia-operacional',
        title: 'Inteligência Operacional',
        description: 'Insights operacionais',
        href: ROUTES.dashboard,
        icon: LineChart,
        permission: 'dashboard:read',
        disabled: true,
        badge: 'Em breve',
      },
    ],
  },
  {
    id: 'cadastros',
    label: 'Cadastros',
    icon: Building2,
    permission: 'cadastros:read',
    items: [
      {
        id: 'empresas',
        title: 'Empresas',
        description: 'Gestão de empresas',
        href: ROUTES.empresas,
        icon: Building2,
        permission: 'companies:read',
      },
      {
        id: 'filiais',
        title: 'Filiais',
        description: 'Unidades e filiais',
        href: ROUTES.filiais,
        icon: GitBranch,
        permission: 'branches:read',
      },
      {
        id: 'clientes',
        title: 'Clientes',
        description: 'Base de clientes',
        href: ROUTES.clientes,
        icon: Users,
        permission: 'customers:read',
      },
      {
        id: 'fornecedores',
        title: 'Fornecedores',
        description: 'Base de fornecedores',
        href: ROUTES.fornecedores,
        icon: Building2,
        permission: 'suppliers:read',
      },
      {
        id: 'contratos',
        title: 'Contratos',
        description: 'Contratos e acordos',
        href: ROUTES.contratos,
        icon: FileText,
        permission: 'contratos:read',
        badge: 'Em breve',
      },
      {
        id: 'centros-de-custo',
        title: 'Centros de Custo',
        description: 'Áreas para análise financeira',
        href: ROUTES.centrosDeCusto,
        icon: PieChart,
        permission: 'financeiro:read',
      },
    ],
  },
  {
    id: 'operacoes',
    label: 'Operações',
    icon: Truck,
    permission: 'operacoes:read',
    items: [
      {
        id: 'veiculos',
        title: 'Veículos',
        description: 'Frota de veículos',
        href: ROUTES.veiculos,
        icon: Truck,
        permission: 'vehicles:read',
      },
      {
        id: 'motoristas',
        title: 'Motoristas',
        description: 'Equipe de motoristas',
        href: ROUTES.motoristas,
        icon: Car,
        permission: 'drivers:read',
      },
      {
        id: 'rotas',
        title: 'Rotas',
        description: 'Rotas operacionais',
        href: ROUTES.rotas,
        icon: Route,
        permission: 'routes:read',
      },
      {
        id: 'viagens',
        title: 'Viagens',
        description: 'Rotas e viagens',
        href: ROUTES.viagens,
        icon: MapPin,
        permission: 'trips:read',
      },
      {
        id: 'abastecimentos',
        title: 'Abastecimentos',
        description: 'Registro de abastecimentos',
        href: ROUTES.abastecimentos,
        icon: Fuel,
        permission: 'fuel:read',
      },
      {
        id: 'manutencoes',
        title: 'Manutenções',
        description: 'Gestão de manutenções',
        href: ROUTES.manutencoes,
        icon: Wrench,
        permission: 'maintenance:read',
      },
      {
        id: 'pneus',
        title: 'Pneus',
        description: 'Controle de pneus',
        href: ROUTES.pneus,
        icon: Wrench,
        permission: 'tires:read',
      },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: Wallet,
    permission: 'financeiro:read',
    items: [
      {
        id: 'contas-a-pagar',
        title: 'Contas a Pagar',
        description: 'Obrigações financeiras',
        href: ROUTES.contasAPagar,
        icon: CreditCard,
        permission: 'financeiro_pagar:read',
      },
      {
        id: 'contas-a-receber',
        title: 'Contas a Receber',
        description: 'Recebíveis',
        href: ROUTES.contasAReceber,
        icon: Receipt,
        permission: 'financeiro_receber:read',
      },
      {
        id: 'fluxo-de-caixa',
        title: 'Fluxo de Caixa',
        description: 'Entradas e saídas',
        href: ROUTES.fluxoDeCaixa,
        icon: Wallet,
        permission: 'financeiro_fluxo:read',
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: LineChart,
    permission: 'analise:read',
    items: [
      {
        id: 'analytics-dre',
        title: 'DRE',
        description: 'DRE operacional',
        href: `${ROUTES.dashboard}#dre`,
        icon: CircleDollarSign,
        permission: 'dashboard:read',
      },
      {
        id: 'rentabilidade-rota',
        title: 'Rentabilidade por Rota',
        description: 'Análise de rentabilidade por rota',
        href: `${ROUTES.dashboard}#dre`,
        icon: Route,
        permission: 'dashboard:read',
      },
      {
        id: 'rentabilidade-cliente',
        title: 'Rentabilidade por Cliente',
        description: 'Análise de rentabilidade por cliente',
        href: ROUTES.dashboard,
        icon: Users,
        permission: 'dashboard:read',
        disabled: true,
        badge: 'Em breve',
      },
      {
        id: 'rentabilidade-veiculo',
        title: 'Rentabilidade por Veículo',
        description: 'Análise de rentabilidade por veículo',
        href: ROUTES.dashboard,
        icon: Truck,
        permission: 'dashboard:read',
        disabled: true,
        badge: 'Em breve',
      },
      {
        id: 'rentabilidade-motorista',
        title: 'Rentabilidade por Motorista',
        description: 'Análise de rentabilidade por motorista',
        href: ROUTES.dashboard,
        icon: Car,
        permission: 'dashboard:read',
        disabled: true,
        badge: 'Em breve',
      },
    ],
  },
  {
    id: 'administracao',
    label: 'Administração',
    icon: Settings,
    items: [
      {
        id: 'usuarios',
        title: 'Usuários',
        description: 'Gestão de usuários',
        href: ROUTES.configuracoes,
        icon: Users,
        permission: 'configuracoes:read',
        disabled: true,
        badge: 'Em breve',
      },
      {
        id: 'perfis',
        title: 'Perfis',
        description: 'Perfis e permissões',
        href: ROUTES.configuracoes,
        icon: Shield,
        permission: 'configuracoes:read',
        disabled: true,
        badge: 'Em breve',
      },
      {
        id: 'configuracoes',
        title: 'Configurações',
        description: 'Preferências do sistema',
        href: ROUTES.configuracoes,
        icon: UserCog,
        permission: 'configuracoes:read',
      },
    ],
  },
];

/** Mapa flat de todos os itens para breadcrumb e busca */
export function flattenNavItems(groups: NavGroup[]) {
  const items: NavGroup['items'] = [];

  for (const group of groups) {
    for (const item of group.items) {
      items.push(item);
      if (item.children) {
        items.push(...item.children);
      }
    }
  }

  return items;
}
