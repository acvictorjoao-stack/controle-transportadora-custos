import type {LucideIcon} from 'lucide-react';

import type {Permission} from '@/types/global/navigation';

export interface HomeModuleCard {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
}

export interface HomeShortcutItem {
  id: string;
  title: string;
  href: string;
}

export interface HomePendingItem {
  id: string;
  title: string;
  count: number;
  href: string;
  actionLabel: string;
}

export interface HomePendingSnapshot {
  routesWithoutLeadTime: number;
  cnhExpiring: number;
  maintenanceOverdue: number;
}
