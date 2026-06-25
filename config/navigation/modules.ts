import {
  BarChart3,
  Brain,
  Building2,
  Car,
  CreditCard,
  FileText,
  Fuel,
  GitBranch,
  LayoutDashboard,
  MapPin,
  Receipt,
  Settings,
  Truck,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';

import {ROUTES} from '@/constants/routes/paths';
import type {NavGroup} from '@/types/global/navigation';

/**
 * Configuração centralizada de navegação do FleetControl.
 * Ícones, rotas, permissões, grupos, títulos e descrições.
 */
export const navigationGroups: NavGroup[] = [
  {
    id: 'principal',
    label: 'Principal',
    items: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        description: 'Visão geral da operação',
        href: ROUTES.dashboard,
        icon: LayoutDashboard,
        permission: 'dashboard:read',
      },
    ],
  },
  {
    id: 'cadastros',
    label: 'Cadastros',
    permission: 'cadastros:read',
    items: [
      {
        id: 'empresas',
        title: 'Empresas',
        description: 'Gestão de empresas',
        href: ROUTES.empresas,
        icon: Building2,
        permission: 'empresas:read',
      },
      {
        id: 'filiais',
        title: 'Filiais',
        description: 'Unidades e filiais',
        href: ROUTES.filiais,
        icon: GitBranch,
        permission: 'filiais:read',
      },
      {
        id: 'clientes',
        title: 'Clientes',
        description: 'Base de clientes',
        href: ROUTES.clientes,
        icon: Users,
        permission: 'clientes:read',
      },
      {
        id: 'contratos',
        title: 'Contratos',
        description: 'Contratos e acordos',
        href: ROUTES.contratos,
        icon: FileText,
        permission: 'contratos:read',
      },
    ],
  },
  {
    id: 'operacoes',
    label: 'Operações',
    permission: 'operacoes:read',
    items: [
      {
        id: 'veiculos',
        title: 'Veículos',
        description: 'Frota de veículos',
        href: ROUTES.veiculos,
        icon: Truck,
        permission: 'veiculos:read',
      },
      {
        id: 'motoristas',
        title: 'Motoristas',
        description: 'Equipe de motoristas',
        href: ROUTES.motoristas,
        icon: Car,
        permission: 'motoristas:read',
      },
      {
        id: 'viagens',
        title: 'Viagens',
        description: 'Rotas e viagens',
        href: ROUTES.viagens,
        icon: MapPin,
        permission: 'viagens:read',
      },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    permission: 'financeiro:read',
    items: [
      {
        id: 'financeiro',
        title: 'Financeiro',
        description: 'Gestão financeira',
        href: ROUTES.financeiro,
        icon: Wallet,
        permission: 'financeiro:read',
        children: [
          {
            id: 'fluxo-de-caixa',
            title: 'Fluxo de Caixa',
            description: 'Entradas e saídas',
            href: ROUTES.fluxoDeCaixa,
            icon: Wallet,
            permission: 'financeiro.fluxo:read',
          },
          {
            id: 'contas-a-pagar',
            title: 'Contas a Pagar',
            description: 'Obrigações financeiras',
            href: ROUTES.contasAPagar,
            icon: CreditCard,
            permission: 'financeiro.pagar:read',
          },
          {
            id: 'contas-a-receber',
            title: 'Contas a Receber',
            description: 'Recebíveis',
            href: ROUTES.contasAReceber,
            icon: Receipt,
            permission: 'financeiro.receber:read',
          },
        ],
      },
    ],
  },
  {
    id: 'manutencao',
    label: 'Manutenção',
    permission: 'manutencao:read',
    items: [
      {
        id: 'manutencao',
        title: 'Manutenções',
        description: 'Gestão de manutenções',
        href: ROUTES.manutencao,
        icon: Wrench,
        permission: 'manutencao:read',
        children: [
          {
            id: 'pneus',
            title: 'Pneus',
            description: 'Controle de pneus',
            href: ROUTES.pneus,
            icon: Wrench,
            permission: 'manutencao.pneus:read',
          },
          {
            id: 'abastecimentos',
            title: 'Abastecimentos',
            description: 'Registro de abastecimentos',
            href: ROUTES.abastecimentos,
            icon: Fuel,
            permission: 'manutencao.abastecimentos:read',
          },
        ],
      },
    ],
  },
  {
    id: 'analise',
    label: 'Análise',
    permission: 'analise:read',
    items: [
      {
        id: 'relatorios',
        title: 'Relatórios',
        description: 'Relatórios operacionais',
        href: ROUTES.relatorios,
        icon: FileText,
        permission: 'relatorios:read',
      },
      {
        id: 'bi',
        title: 'Business Intelligence',
        description: 'Painéis analíticos e indicadores estratégicos',
        href: ROUTES.bi,
        icon: BarChart3,
        permission: 'bi:read',
      },
      {
        id: 'ia',
        title: 'Inteligência Artificial',
        description: 'Assistente inteligente e insights automatizados',
        href: ROUTES.ia,
        icon: Brain,
        permission: 'ia:read',
      },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    items: [
      {
        id: 'configuracoes',
        title: 'Configurações',
        description: 'Preferências do sistema',
        href: ROUTES.configuracoes,
        icon: Settings,
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
