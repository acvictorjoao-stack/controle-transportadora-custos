import type {ShellTenant, ShellUser} from '@/types/global/navigation';

/** Dados placeholder do shell — substituídos por contexto real no futuro */
export const SHELL_PLACEHOLDER = {
  version: '0.1.0',
  tenant: {
    id: 'tenant-placeholder',
    name: 'Acme Transportes',
    slug: 'acme-transportes',
    plan: 'Enterprise',
  } satisfies ShellTenant,
  user: {
    name: 'Usuário Demo',
    email: 'usuario@fleetcontrol.app',
  } satisfies ShellUser,
} as const;
