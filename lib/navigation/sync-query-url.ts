/**
 * Sincroniza estado de filtros com a URL sem competir com navegação do App Router.
 *
 * Filtros debounceiam `router.push` (~300ms). Se o usuário clicar no menu nesse
 * intervalo, o push antigo ainda apontava para a página anterior e abortava /
 * dessincronizava a soft navigation (URL mudava, conteúdo ficava preso até F5).
 *
 * Só aplica o push se o pathname atual ainda for o da URL de destino.
 */
export function scheduleQueryUrlSync(
  router: {push: (href: string) => void},
  getNextHref: () => string,
  debounceMs = 300,
): () => void {
  const timer = window.setTimeout(() => {
    const next = getNextHref();
    const q = next.indexOf('?');
    const nextPath = q === -1 ? next : next.slice(0, q);

    // Usuário já saiu desta página via Link/menu — não puxar de volta.
    if (window.location.pathname !== nextPath) return;

    const current = `${window.location.pathname}${window.location.search}`;
    if (current === next) return;

    router.push(next);
  }, debounceMs);

  return () => window.clearTimeout(timer);
}
