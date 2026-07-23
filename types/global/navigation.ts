import type {LucideIcon} from 'lucide-react';

/** Identificador de permissão — preparado para RBAC futuro */
export type Permission = string;

export interface NavItem {
  id: string;
  title: string;
  description?: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
  disabled?: boolean;
  /** Badge textual (ex.: "Em breve") ou contagem numérica futura */
  badge?: string | number;
  children?: NavItem[];
}

export interface NavGroup {
  id: string;
  label: string;
  icon?: LucideIcon;
  items: NavItem[];
  permission?: Permission;
  /** Aberto por padrão quando não há estado em localStorage */
  defaultOpen?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface ShellUser {
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface ShellTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  logoUrl: string | null;
}
