/**
 * Rotas centralizadas do FleetControl.
 * Nunca utilizar strings de rota espalhadas no código.
 */

export const ROUTES = {
  /** Portal de navegação (central de acesso aos módulos). */
  home: '/',
  homeAlias: '/home',

  // Dashboard e módulos analíticos
  dashboard: '/dashboard',
  dashboardExecutivo: '/dashboard/executivo',
  dashboardDre: '/dashboard/dre',
  dashboardRentabilidadeRotas: '/dashboard/rentabilidade/rotas',
  dashboardRentabilidadeClientes: '/dashboard/rentabilidade/clientes',
  dashboardRentabilidadeVeiculos: '/dashboard/rentabilidade/veiculos',
  dashboardRentabilidadeMotoristas: '/dashboard/rentabilidade/motoristas',
  dashboardInteligencia: '/dashboard/inteligencia',

  // Cadastros
  empresas: '/empresas',
  filiais: '/filiais',
  clientes: '/clientes',
  clienteDetail: (id: string) => `/clientes/${id}`,
  fornecedores: '/fornecedores',
  fornecedorDetail: (id: string) => `/fornecedores/${id}`,
  contratos: '/contratos',
  centrosDeCusto: '/centros-de-custo',
  qualidadeCadastros: '/cadastros/qualidade',

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
  despesasDePessoal: '/financeiro/despesas-de-pessoal',

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
  usuarios: '/usuarios',
  administracaoFuncionarios: '/administracao/funcionarios',
  administracaoCargos: '/administracao/cargos',

  // Auth
  login: '/login',
  registro: '/registro',
  recuperarSenha: '/recuperar-senha',
  atualizarSenha: '/atualizar-senha',
  authCallback: '/auth/callback',

  // Marketing (placeholders)
  pricing: '/pricing',
  sobre: '/sobre',

  // Tenant
  tenantRoot: (slug: string) => `/${slug}`,
  tenantDashboard: (slug: string) => `/${slug}/dashboard`,

  // Escolha de acesso (Master)
  acesso: '/acesso',
  acessoEmpresas: '/acesso/empresas',

  // Portal Master (SaaS admin)
  master: '/master',
  masterEmpresas: '/master/empresas',
  masterEmpresaDetail: (id: string) => `/master/empresas/${id}`,
  masterPlanos: '/master/planos',
  masterUsuarios: '/master/usuarios',
  masterRoles: '/master/roles',
  masterRoleDetail: (name: string) =>
    `/master/roles/${encodeURIComponent(name)}`,
  masterLogs: '/master/logs',
  masterConfiguracoes: '/master/configuracoes',
} as const;

export type RouteKey = keyof typeof ROUTES;
