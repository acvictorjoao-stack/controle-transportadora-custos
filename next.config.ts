import type {NextConfig} from 'next';

import {resolveDeploymentEnvironment} from './supabase/utils/deployment-guard';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    // Ambiente do deployment gravado no build (servidor, middleware e navegador):
    // a trava de supabase/utils/deployment-guard.ts impede que Previews usem o
    // banco de produção. Fora da Vercel vale 'local'.
    FLEETCONTROL_DEPLOYMENT_ENV: resolveDeploymentEnvironment(process.env),
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    // PPR (`ppr: 'incremental'`) exige Next.js canary nesta linha (15.4.x).
    // Rotas piloto já usam Suspense/streaming e ficam prontas para opt-in quando
    // a versão estável/canary do projeto habilitar PPR.
    // dynamic: 0 = padrão do Next 15 (sempre refetch do segmento de página na
    // soft navigation). Evita conteúdo preso no Client Router Cache.
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
  },
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
