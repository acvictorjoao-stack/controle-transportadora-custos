/**
 * Rotas centralizadas do FleetControl.
 * Nunca utilizar strings de rota espalhadas no código.
 */

export const ROUTES = {
  home: '/',

  // Dashboard
  dashboard: '/dashboard',

  // Cadastros
  empresas: '/empresas',
  filiais: '/filiais',
  clientes: '/clientes',
  contratos: '/contratos',

  // Operações
  veiculos: '/veiculos',
  motoristas: '/motoristas',
  viagens: '/viagens',

  // Financeiro
  financeiro: '/financeiro',
  fluxoDeCaixa: '/financeiro/fluxo-de-caixa',
  contasAPagar: '/financeiro/contas-a-pagar',
  contasAReceber: '/financeiro/contas-a-receber',

  // Manutenção
  manutencao: '/manutencao',
  pneus: '/manutencao/pneus',
  abastecimentos: '/manutencao/abastecimentos',

  // Análise
  relatorios: '/relatorios',
  bi: '/bi',
  ia: '/ia',

  // Sistema
  configuracoes: '/configuracoes',

  // Auth (placeholders)
  login: '/login',
  registro: '/registro',
  recuperarSenha: '/recuperar-senha',

  // Marketing (placeholders)
  pricing: '/pricing',
  sobre: '/sobre',

  // Tenant
  tenantRoot: (slug: string) => `/${slug}`,
  tenantDashboard: (slug: string) => `/${slug}/dashboard`,
} as const;

export type RouteKey = keyof typeof ROUTES;
