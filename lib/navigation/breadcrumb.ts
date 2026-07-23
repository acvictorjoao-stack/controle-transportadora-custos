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
  manutencoes: 'Manutenções',
  pneus: 'Pneus',
  abastecimentos: 'Abastecimentos',
  'centros-de-custo': 'Centros de Custo',
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
 * Separa path e hash de um href de navegação (ex.: `/#dre` → path `/`, hash `dre`).
 */
export function splitNavHref(href: string): {path: string; hash: string | null} {
  const hashIndex = href.indexOf('#');
  if (hashIndex === -1) {
    return {path: href || '/', hash: null};
  }

  const path = href.slice(0, hashIndex) || '/';
  const hash = href.slice(hashIndex + 1) || null;
  return {path, hash};
}

/**
 * Verifica se um href está ativo com base no pathname e hash atuais.
 * Itens com hash (ex.: `/#dre`) só ficam ativos quando o hash coincide.
 * Itens sem hash na home (`/` ou `/#visao-geral`) ficam ativos sem hash ou com `#visao-geral`.
 */
export function isNavItemActive(
  pathname: string,
  href: string,
  currentHash = '',
): boolean {
  const {path, hash: hrefHash} = splitNavHref(href);
  const normalizedHash = currentHash.replace(/^#/, '');

  if (hrefHash) {
    if (hrefHash === 'visao-geral') {
      return (
        pathname === path &&
        (normalizedHash === '' || normalizedHash === 'visao-geral')
      );
    }
    return pathname === path && normalizedHash === hrefHash;
  }

  if (path === '/') {
    return (
      pathname === '/' &&
      (normalizedHash === '' || normalizedHash === 'visao-geral')
    );
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}

/** Indica se algum item do grupo (ou filho) está ativo na rota atual. */
export function isNavGroupActive(
  pathname: string,
  items: {href: string; children?: {href: string}[]}[],
  currentHash = '',
): boolean {
  return items.some((item) => {
    if (isNavItemActive(pathname, item.href, currentHash)) return true;
    return (
      item.children?.some((child) =>
        isNavItemActive(pathname, child.href, currentHash),
      ) ?? false
    );
  });
}
