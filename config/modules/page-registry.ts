import {ROUTES} from '@/constants/routes/paths';

export type ModulePageId =
  | 'dashboard'
  | 'empresas'
  | 'filiais'
  | 'clientes'
  | 'contratos'
  | 'veiculos'
  | 'motoristas'
  | 'viagens'
  | 'financeiro'
  | 'fluxo-de-caixa'
  | 'contas-a-pagar'
  | 'contas-a-receber'
  | 'manutencao'
  | 'pneus'
  | 'abastecimentos'
  | 'relatorios'
  | 'bi'
  | 'ia'
  | 'configuracoes';

export interface ModulePageMeta {
  id: ModulePageId;
  title: string;
  description: string;
  href: string;
}

/**
 * Metadados centralizados das páginas internas do FleetControl.
 * Sincronizado com ROUTES e config/navigation/modules.ts.
 */
export const modulePageRegistry: Record<ModulePageId, ModulePageMeta> = {
  dashboard: {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Visão geral da operação e indicadores principais.',
    href: ROUTES.dashboard,
  },
  empresas: {
    id: 'empresas',
    title: 'Empresas',
    description: 'Gestão de empresas e dados cadastrais da operação.',
    href: ROUTES.empresas,
  },
  filiais: {
    id: 'filiais',
    title: 'Filiais',
    description: 'Unidades, filiais e estrutura organizacional.',
    href: ROUTES.filiais,
  },
  clientes: {
    id: 'clientes',
    title: 'Clientes',
    description: 'Base de clientes e relacionamento comercial.',
    href: ROUTES.clientes,
  },
  contratos: {
    id: 'contratos',
    title: 'Contratos',
    description: 'Contratos, acordos e condições comerciais.',
    href: ROUTES.contratos,
  },
  veiculos: {
    id: 'veiculos',
    title: 'Veículos',
    description: 'Frota de veículos e controle patrimonial.',
    href: ROUTES.veiculos,
  },
  motoristas: {
    id: 'motoristas',
    title: 'Motoristas',
    description: 'Equipe de motoristas e gestão operacional.',
    href: ROUTES.motoristas,
  },
  viagens: {
    id: 'viagens',
    title: 'Viagens',
    description: 'Rotas, viagens e acompanhamento operacional.',
    href: ROUTES.viagens,
  },
  financeiro: {
    id: 'financeiro',
    title: 'Financeiro',
    description: 'Gestão financeira consolidada da operação.',
    href: ROUTES.financeiro,
  },
  'fluxo-de-caixa': {
    id: 'fluxo-de-caixa',
    title: 'Fluxo de Caixa',
    description: 'Entradas, saídas e projeção de caixa.',
    href: ROUTES.fluxoDeCaixa,
  },
  'contas-a-pagar': {
    id: 'contas-a-pagar',
    title: 'Contas a Pagar',
    description: 'Obrigações financeiras e pagamentos programados.',
    href: ROUTES.contasAPagar,
  },
  'contas-a-receber': {
    id: 'contas-a-receber',
    title: 'Contas a Receber',
    description: 'Recebíveis, faturamento e cobrança.',
    href: ROUTES.contasAReceber,
  },
  manutencao: {
    id: 'manutencao',
    title: 'Manutenções',
    description: 'Gestão de manutenções preventivas e corretivas.',
    href: ROUTES.manutencao,
  },
  pneus: {
    id: 'pneus',
    title: 'Pneus',
    description: 'Controle de pneus, vida útil e substituições.',
    href: ROUTES.pneus,
  },
  abastecimentos: {
    id: 'abastecimentos',
    title: 'Abastecimentos',
    description: 'Registro e análise de abastecimentos da frota.',
    href: ROUTES.abastecimentos,
  },
  relatorios: {
    id: 'relatorios',
    title: 'Relatórios',
    description: 'Relatórios operacionais e exportações.',
    href: ROUTES.relatorios,
  },
  bi: {
    id: 'bi',
    title: 'Business Intelligence',
    description: 'Painéis analíticos e indicadores estratégicos.',
    href: ROUTES.bi,
  },
  ia: {
    id: 'ia',
    title: 'Inteligência Artificial',
    description: 'Assistente inteligente e insights automatizados.',
    href: ROUTES.ia,
  },
  configuracoes: {
    id: 'configuracoes',
    title: 'Configurações',
    description: 'Preferências e parâmetros do sistema.',
    href: ROUTES.configuracoes,
  },
};

export function getModulePageMeta(id: ModulePageId): ModulePageMeta {
  return modulePageRegistry[id];
}
