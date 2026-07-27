import {
  Building2,
  LayoutDashboard,
  Settings,
  Truck,
  Wallet,
  Wrench,
  MapPin,
} from 'lucide-react';

import {ROUTES} from '@/constants/routes/paths';

import type {HomeModuleCard, HomeShortcutItem} from '../types';

/**
 * Cards do portal — grupos de acesso rápido (RC 28.0.4).
 * Cada card abre o primeiro módulo do grupo.
 */
export const homePortalModules: HomeModuleCard[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'KPIs, DRE, Rentabilidade e Inteligência Operacional',
    href: ROUTES.dashboard,
    icon: LayoutDashboard,
    permission: 'dashboard:read',
  },
  {
    id: 'cadastros',
    title: 'Cadastros',
    description: 'Empresas, Filiais, Clientes, Rotas e Fornecedores',
    href: ROUTES.empresas,
    icon: Building2,
    permission: 'cadastros:read',
  },
  {
    id: 'operacao',
    title: 'Operação',
    description: 'Viagens, Entregas, Ocorrências e Monitoramento',
    href: ROUTES.viagens,
    icon: MapPin,
    permission: 'operacoes:read',
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    description: 'Receitas, Despesas, Custos e DRE',
    href: ROUTES.contasAPagar,
    icon: Wallet,
    permission: 'financeiro:read',
  },
  {
    id: 'frota',
    title: 'Frota',
    description: 'Veículos, Motoristas e Documentações',
    href: ROUTES.veiculos,
    icon: Truck,
    permission: 'vehicles:read',
  },
  {
    id: 'manutencao',
    title: 'Manutenção',
    description: 'Ordens de Serviço, Preventivas e Custos',
    href: ROUTES.manutencoes,
    icon: Wrench,
    permission: 'maintenance:read',
  },
  {
    id: 'configuracoes',
    title: 'Configurações',
    description: 'Usuários, Permissões e Preferências',
    href: ROUTES.configuracoes,
    icon: Settings,
    permission: 'configuracoes:read',
  },
];

/** Favoritos padrão por usuário (configuráveis via localStorage). */
export const DEFAULT_HOME_FAVORITES: HomeShortcutItem[] = [
  {
    id: 'inteligencia-operacional',
    title: 'Inteligência Operacional',
    href: ROUTES.dashboardInteligencia,
  },
  {
    id: 'dre',
    title: 'DRE',
    href: ROUTES.dashboardDre,
  },
  {
    id: 'viagens',
    title: 'Viagens',
    href: ROUTES.viagens,
  },
  {
    id: 'clientes',
    title: 'Clientes',
    href: ROUTES.clientes,
  },
];

/** Recentes padrão até o usuário navegar pelo sistema. */
export const DEFAULT_HOME_RECENTS: HomeShortcutItem[] = [
  {
    id: 'viagens',
    title: 'Viagens',
    href: ROUTES.viagens,
  },
  {
    id: 'dashboard',
    title: 'Dashboard Executivo',
    href: ROUTES.dashboard,
  },
  {
    id: 'clientes',
    title: 'Clientes',
    href: ROUTES.clientes,
  },
  {
    id: 'fornecedores',
    title: 'Fornecedores',
    href: ROUTES.fornecedores,
  },
];
