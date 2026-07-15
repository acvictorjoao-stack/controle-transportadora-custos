import {flattenNavItems, navigationGroups} from '@/config/navigation';
import {siteConfig} from '@/config/site/index';
import type {BreadcrumbItem} from '@/types/global/navigation';

const navItems = flattenNavItems(navigationGroups);

/** Segmentos de rota com labels customizados */
const segmentLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  empresas: 'Empresas',
  filiais: 'Filiais',
  clientes: 'Clientes',
  contratos: 'Contratos',
  veiculos: 'Veículos',
  motoristas: 'Motoristas',
  rotas: 'Rotas',
  viagens: 'Viagens',
  financeiro: 'Financeiro',
  'fluxo-de-caixa': 'Fluxo de Caixa',
  'contas-a-pagar': 'Contas a Pagar',
  'contas-a-receber': 'Contas a Receber',
  manutencao: 'Manutenções',
  pneus: 'Pneus',
  abastecimentos: 'Abastecimentos',
  relatorios: 'Relatórios',
  bi: 'Business Intelligence',
  ia: 'Inteligência Artificial',
  configuracoes: 'Configurações',
  master: 'Portal Master',
  planos: 'Planos',
  usuarios: 'Usuários',
  logs: 'Logs',
  login: 'Login',
  registro: 'Registro',
  pricing: 'Preços',
  sobre: 'Sobre',
};

function formatSegment(segment: string): string {
  if (segmentLabels[segment]) return segmentLabels[segment];

  const navMatch = navItems.find(
    (item) => item.href === `/${segment}` || item.href.endsWith(`/${segment}`),
  );
  if (navMatch) return navMatch.title;

  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Gera breadcrumbs automaticamente a partir do pathname.
 * Suporta rotas dinâmicas (ex: /[tenant]/dashboard).
 */
export function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return [{label: siteConfig.name, href: '/'}];
  }

  const crumbs: BreadcrumbItem[] = [
    {label: siteConfig.name, href: '/'},
  ];

  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    const isDynamic =
      segment.startsWith('[') ||
      /^[a-f0-9-]{36}$/i.test(segment) ||
      (i === 0 && !segmentLabels[segment] && !navItems.some((n) => n.href === currentPath));

    const label = isDynamic
      ? segment.charAt(0).toUpperCase() + segment.slice(1)
      : formatSegment(segment);

    const isLast = i === segments.length - 1;

    crumbs.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  }

  return crumbs;
}

/**
 * Verifica se um href está ativo com base no pathname atual.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
