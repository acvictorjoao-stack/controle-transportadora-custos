const ACCESS_URL_BASE =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://fleetcontrol.com';

export function buildCompanyAccessUrl(slug: string): string {
  const normalized = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  return `${ACCESS_URL_BASE}/${normalized || 'empresa'}`;
}

export function buildAccessLinks(slug: string) {
  const normalized = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  const segment = normalized || 'empresa';
  return {
    path: `${ACCESS_URL_BASE}/${segment}`,
    subdomain: `https://${segment}.fleetcontrol.com`,
  };
}
