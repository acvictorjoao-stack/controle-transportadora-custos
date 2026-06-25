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
  badge?: string;
  children?: NavItem[];
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
  permission?: Permission;
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
}
