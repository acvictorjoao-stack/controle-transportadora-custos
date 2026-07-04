import {
  Building2,
  CreditCard,
  LayoutDashboard,
  ScrollText,
  Settings,
  Users,
} from 'lucide-react';

import {ROUTES} from '@/constants/routes/paths';
import type {NavGroup} from '@/types/global/navigation';

/**
 * Navegação exclusiva do Portal Master (administração SaaS).
 * Separada da sidebar das transportadoras.
 */
export const masterNavigationGroups: NavGroup[] = [
  {
    id: 'master-principal',
    label: 'Portal Master',
    items: [
      {
        id: 'master-dashboard',
        title: 'Dashboard',
        description: 'Visão geral da plataforma',
        href: ROUTES.master,
        icon: LayoutDashboard,
        permission: 'master:dashboard:read',
      },
      {
        id: 'master-empresas',
        title: 'Empresas',
        description: 'Gestão de empresas clientes',
        href: ROUTES.masterEmpresas,
        icon: Building2,
        permission: 'master:empresas:read',
      },
      {
        id: 'master-planos',
        title: 'Planos',
        description: 'Planos de assinatura',
        href: ROUTES.masterPlanos,
        icon: CreditCard,
        permission: 'master:planos:read',
      },
      {
        id: 'master-usuarios',
        title: 'Usuários',
        description: 'Usuários da plataforma',
        href: ROUTES.masterUsuarios,
        icon: Users,
        permission: 'master:usuarios:read',
      },
      {
        id: 'master-logs',
        title: 'Logs',
        description: 'Auditoria e eventos',
        href: ROUTES.masterLogs,
        icon: ScrollText,
        permission: 'master:logs:read',
      },
      {
        id: 'master-configuracoes',
        title: 'Configurações',
        description: 'Configurações da plataforma',
        href: ROUTES.masterConfiguracoes,
        icon: Settings,
        permission: 'master:configuracoes:read',
      },
    ],
  },
];

export function flattenMasterNavItems(groups: NavGroup[] = masterNavigationGroups) {
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
