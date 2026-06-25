export {fontVariables, inter, jetbrainsMono} from './fonts';

export const siteConfig = {
  name: 'FleetControl',
  description:
    'Plataforma moderna de gestão de frotas para empresas que exigem precisão operacional e financeira.',
  tagline: 'Controle total da sua frota',
  url: 'https://fleetcontrol.app',
  ogImage: '/og.png',
  links: {
    github: 'https://github.com/fleetcontrol',
    docs: '/docs',
  },
} as const;
