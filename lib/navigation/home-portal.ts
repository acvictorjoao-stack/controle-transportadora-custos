import {ROUTES} from '@/constants/routes/paths';

/** Rotas do portal Home — sem Sidebar (RC 28.0.7). */
export function isHomePortalPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === ROUTES.home || pathname === ROUTES.homeAlias;
}
