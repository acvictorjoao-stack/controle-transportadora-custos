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

import type {HomeModuleAccent, HomeModuleCard} from '../types';

/** Classes de acento institucional por módulo (barra + ícone). */
export const HOME_MODULE_ACCENT_STYLES: Record<
  HomeModuleAccent,
  {bar: string; iconWrap: string; icon: string; cta: string}
> = {
  primary: {
    bar: 'bg-primary',
    iconWrap: 'bg-primary/10',
    icon: 'text-primary',
    cta: 'text-primary group-hover:bg-primary group-hover:text-primary-foreground',
  },
  info: {
    bar: 'bg-info',
    iconWrap: 'bg-info/10',
    icon: 'text-info',
    cta: 'text-info group-hover:bg-info group-hover:text-info-foreground',
  },
  cyan: {
    bar: 'bg-chart-2',
    iconWrap: 'bg-chart-2/10',
    icon: 'text-chart-2',
    cta: 'text-chart-2 group-hover:bg-chart-2 group-hover:text-white',
  },
  success: {
    bar: 'bg-success',
    iconWrap: 'bg-success/10',
    icon: 'text-success',
    cta: 'text-success group-hover:bg-success group-hover:text-success-foreground',
  },
  warning: {
    bar: 'bg-warning',
    iconWrap: 'bg-warning/10',
    icon: 'text-warning',
    cta: 'text-warning group-hover:bg-warning group-hover:text-warning-foreground',
  },
  rose: {
    bar: 'bg-chart-5',
    iconWrap: 'bg-chart-5/10',
    icon: 'text-chart-5',
    cta: 'text-chart-5 group-hover:bg-chart-5 group-hover:text-white',
  },
  slate: {
    bar: 'bg-foreground/70',
    iconWrap: 'bg-muted',
    icon: 'text-foreground',
    cta: 'text-foreground group-hover:bg-foreground group-hover:text-background',
  },
};

/**
 * Cards do portal — cada um abre o primeiro módulo do grupo.
 */
export const homePortalModules: HomeModuleCard[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'KPIs, DRE, Rentabilidade e Inteligência Operacional',
    href: ROUTES.dashboard,
    icon: LayoutDashboard,
    accent: 'primary',
    permission: 'dashboard:read',
  },
  {
    id: 'cadastros',
    title: 'Cadastros',
    description: 'Empresas, Filiais, Clientes, Rotas e Fornecedores',
    href: ROUTES.empresas,
    icon: Building2,
    accent: 'info',
    permission: 'cadastros:read',
  },
  {
    id: 'operacao',
    title: 'Operação',
    description: 'Viagens, Entregas, Ocorrências e Monitoramento',
    href: ROUTES.viagens,
    icon: MapPin,
    accent: 'cyan',
    permission: 'operacoes:read',
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    description: 'Receitas, Despesas, Custos e DRE',
    href: ROUTES.contasAReceber,
    icon: Wallet,
    accent: 'success',
    permission: 'financeiro:read',
  },
  {
    id: 'frota',
    title: 'Frota',
    description: 'Veículos, Motoristas e Documentações',
    href: ROUTES.veiculos,
    icon: Truck,
    accent: 'warning',
    permission: 'vehicles:read',
  },
  {
    id: 'manutencao',
    title: 'Manutenção',
    description: 'Ordens de Serviço, Preventivas e Custos',
    href: ROUTES.manutencoes,
    icon: Wrench,
    accent: 'rose',
    permission: 'maintenance:read',
  },
  {
    id: 'configuracoes',
    title: 'Configurações',
    description: 'Usuários, Permissões e Preferências',
    href: ROUTES.configuracoes,
    icon: Settings,
    accent: 'slate',
    permission: 'configuracoes:read',
  },
];
