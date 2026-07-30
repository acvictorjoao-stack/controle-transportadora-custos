import type {LucideIcon} from 'lucide-react';

import type {Permission} from '@/types/global/navigation';

export type HomeModuleAccent =
  | 'primary'
  | 'info'
  | 'cyan'
  | 'success'
  | 'warning'
  | 'rose'
  | 'slate';

export interface HomeModuleCard {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accent: HomeModuleAccent;
  permission?: Permission;
}
