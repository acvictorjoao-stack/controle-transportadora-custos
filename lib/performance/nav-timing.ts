/**
 * Instrumentação leve de navegação (RC 28.2.0) — apenas em desenvolvimento.
 */

export function markNavClick(href: string) {
  if (process.env.NODE_ENV !== 'development') return;
  if (typeof performance === 'undefined') return;
  try {
    performance.mark(`nav-click:${href}`);
  } catch {
    // ignore
  }
}

export function markNavReady(href: string) {
  if (process.env.NODE_ENV !== 'development') return;
  if (typeof performance === 'undefined') return;
  try {
    const start = `nav-click:${href}`;
    const end = `nav-ready:${href}`;
    performance.mark(end);
    performance.measure(`nav:${href}`, start, end);
    const entries = performance.getEntriesByName(`nav:${href}`);
    const last = entries[entries.length - 1];
    if (last) {
      console.info(`[perf] navegação ${href}: ${Math.round(last.duration)}ms`);
    }
  } catch {
    // ignore
  }
}

export async function timeServerQuery<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (process.env.NODE_ENV !== 'development') {
    return fn();
  }
  const started = Date.now();
  try {
    return await fn();
  } finally {
    console.info(`[perf] query ${label}: ${Date.now() - started}ms`);
  }
}
