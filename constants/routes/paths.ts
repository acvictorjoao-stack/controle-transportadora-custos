/**
 * Rotas centralizadas do FleetControl.
 * Nunca utilizar strings de rota espalhadas no código.
 */

export const ROUTES = {
  home: '/',

  // Dashboard (home oficial)
  dashboard: '/',

  // Cadastros
  empresas: '/empresas',
  filiais: '/filiais',
  clientes: '/clientes',
  clienteDetail: (id: string) => `/clientes/${id}`,
  contratos: '/contratos',

  // Operações
  veiculos: '/veiculos',
  veiculoDetail: (id: string) => `/veiculos/${id}`,
  motoristas: '/motoristas',
  motoristaDetail: (id: string) => `/motoristas/${id}`,
  rotas: '/rotas',
  rotaDetail: (id: string) => `/rotas/${id}`,
  viagens: '/viagens',
  viagemDetail: (id: string) => `/viagens/${id}`,
  abastecimentos: '/abastecimentos',
  abastecimentoDetail: (id: string) => `/abastecimentos/${id}`,
  abastecimentosDashboard: '/abastecimentos/dashboard',

  // Financeiro
  financeiro: '/financeiro',
  financeiroDetail: (id: string) => `/financeiro/${id}`,
  financeiroDashboard: '/financeiro/dashboard',
  fluxoDeCaixa: '/financeiro/fluxo-de-caixa',
  contasAPagar: '/financeiro/contas-a-pagar',
  contasAPagarDetail: (id: string) => `/financeiro/contas-a-pagar/${id}`,
  contasAReceber: '/financeiro/contas-a-receber',
  contasAReceberDetail: (id: string) => `/financeiro/contas-a-receber/${id}`,

  // Manutenção
  manutencoes: '/manutencoes',
  manutencaoDetail: (id: string) => `/manutencoes/${id}`,
  manutencao: '/manutencao',
  pneus: '/pneus',
  pneuDetail: (id: string) => `/pneus/${id}`,

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

  // Portal Master (SaaS admin)
  master: '/master',
  masterEmpresas: '/master/empresas',
  masterEmpresaDetail: (id: string) => `/master/empresas/${id}`,
  masterPlanos: '/master/planos',
  masterUsuarios: '/master/usuarios',
  masterLogs: '/master/logs',
  masterConfiguracoes: '/master/configuracoes',
} as const;

export type RouteKey = keyof typeof ROUTES;
