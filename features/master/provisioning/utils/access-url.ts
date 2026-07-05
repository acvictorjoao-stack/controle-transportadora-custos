function getAppUrlBase(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') ?? '';
}

function getAppHostname(): string {
  const base = getAppUrlBase();
  if (!base) return '';

  try {
    return new URL(base).hostname;
  } catch {
    return '';
  }
}

export function buildCompanyAccessUrl(slug: string): string {
  const normalized = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  const base = getAppUrlBase();
  const segment = normalized || 'empresa';

  return base ? `${base}/${segment}` : `/${segment}`;
}

export function buildAccessLinks(slug: string) {
  const normalized = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  const segment = normalized || 'empresa';
  const base = getAppUrlBase();
  const hostname = getAppHostname();

  return {
    path: base ? `${base}/${segment}` : `/${segment}`,
    subdomain: hostname ? `https://${segment}.${hostname}` : '',
  };
}
