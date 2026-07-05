export {fontVariables, inter, jetbrainsMono} from './fonts';

function resolveAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return url ? url.replace(/\/$/, '') : '';
}

export const siteConfig = {
  name: 'FleetControl',
  description:
    'Plataforma moderna de gestão de frotas para empresas que exigem precisão operacional e financeira.',
  tagline: 'Controle total da sua frota',
  keywords: [
    'gestão de frotas',
    'transportadoras',
    'logística',
    'controle operacional',
    'custos de frota',
    'FleetControl',
  ],
  get url() {
    return resolveAppUrl();
  },
  links: {
    docs: '/docs',
  },
} as const;
