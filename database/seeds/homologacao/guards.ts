import type {SupabaseClient} from '@supabase/supabase-js';

import {FALLBACK_PLANS} from '@/features/master/plans/constants';
import {getPlanCatalog} from '@/features/master/plans/queries/plans';
import {readPlanSlugFromSettings} from '@/features/master/companies/utils/format';
import {PAYROLL_CATEGORY_SLUG} from '@/features/payroll/constants';

import {
  HML_BRANCHES,
  HML_COST_CENTERS,
  HML_POSITIONS,
  HML_VEHICLES,
} from './catalog';
import {
  HML_AUTHORIZED_COMPANY_ID,
  HML_COMPANY_SLUG,
  HML_EMPTY_MODULE_TABLES,
  HML_REQUIRED_PLAN_SLUG,
} from './constants';
import {assertHmlProjectRefFromEnv} from './env';
import type {HmlModuleCount, HmlSeedContext} from './types';

type HmlCompanyCandidate = {
  id: string;
  slug: string;
  status: string | null;
  provision_status: string | null;
  settings: unknown;
};

type HmlMembershipCandidate = {
  company_id: string;
  profile_id: string;
  role_id: string;
  default_branch_id: string | null;
};

function isHmlCompanyCandidate(row: unknown): row is HmlCompanyCandidate {
  if (!row || typeof row !== 'object') return false;
  const value = row as Record<string, unknown>;
  return typeof value.id === 'string' && typeof value.slug === 'string';
}

function isHmlMembershipCandidate(row: unknown): row is HmlMembershipCandidate {
  if (!row || typeof row !== 'object') return false;
  const value = row as Record<string, unknown>;
  return (
    typeof value.company_id === 'string' &&
    typeof value.profile_id === 'string' &&
    typeof value.role_id === 'string'
  );
}

async function countActive(
  supabase: SupabaseClient,
  table: string,
  companyId: string,
): Promise<number> {
  const {count, error} = await supabase
    .from(table)
    .select('id', {count: 'exact', head: true})
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(`Falha ao contar ${table}: ${error.message}`);
  }

  return count ?? 0;
}

/**
 * Seleciona exatamente uma empresa pelo slug-alvo.
 * Sem fallback para outra empresa.
 */
export function assertUniqueHmlTargetCompany(
  rows: HmlCompanyCandidate[],
): HmlCompanyCandidate {
  if (rows.length === 0) {
    throw new Error(
      `Abortado: empresa "${HML_COMPANY_SLUG}" não encontrada (slug ausente ou inativa).`,
    );
  }
  if (rows.length > 1) {
    throw new Error(
      `Abortado: múltiplas empresas com slug "${HML_COMPANY_SLUG}" — resolução ambígua.`,
    );
  }
  return rows[0]!;
}

/**
 * Seleciona exatamente um vínculo ativo do perfil na empresa-alvo.
 * Outras memberships do usuário são ignoradas (não há fallback).
 */
export function assertUniqueHmlMembership(
  rows: HmlMembershipCandidate[],
): HmlMembershipCandidate {
  if (rows.length === 0) {
    throw new Error(
      `Abortado: sem vínculo ativo em company_members para "${HML_COMPANY_SLUG}".`,
    );
  }
  if (rows.length > 1) {
    throw new Error(
      `Abortado: múltiplos vínculos ativos do usuário em "${HML_COMPANY_SLUG}".`,
    );
  }
  return rows[0]!;
}

/**
 * Fail-closed: exige Super Admin na empresa-alvo via RPC `is_company_super_admin`.
 * Usado pelo seed HML. Aceita Portal Master acting (comportamento da RPC 090).
 * Operações destrutivas (recovery / reset / hard-delete) NÃO devem usar esta
 * função — ver `assertHmlDestructiveMembershipSuperAdmin`.
 */
export async function assertHmlCompanySuperAdmin(
  supabase: SupabaseClient,
  companyId: string,
): Promise<void> {
  const {data: isSuperAdmin, error: superAdminError} = await supabase.rpc(
    'is_company_super_admin',
    {p_company_id: companyId},
  );

  if (superAdminError) {
    throw new Error(
      `Falha ao validar permissão Super Admin: ${superAdminError.message}`,
    );
  }
  if (!isSuperAdmin) {
    throw new Error(
      `Abortado: o usuário autenticado não é Super Admin de "${HML_COMPANY_SLUG}".`,
    );
  }
}

type HmlRoleEmbed = {
  company_id?: string | null;
  name?: string | null;
  is_system?: boolean | null;
  status?: string | null;
  deleted_at?: string | null;
};

function roleEmbedsMatchCompanySuperAdmin(
  roles: unknown,
  companyId: string,
): boolean {
  const list: HmlRoleEmbed[] = Array.isArray(roles)
    ? (roles as HmlRoleEmbed[])
    : roles && typeof roles === 'object'
      ? [roles as HmlRoleEmbed]
      : [];

  return list.some(
    (role) =>
      role.company_id === companyId &&
      role.name === 'Super Admin' &&
      role.is_system === true &&
      role.status === 'active' &&
      role.deleted_at == null,
  );
}

/**
 * Autorização destrutiva HML — paridade com migrations 102/103.
 * Recusa Portal Master acting (`is_portal_owner_acting_for`) e exige membership
 * Super Admin com `r.company_id = cm.company_id`. Não usa `is_company_super_admin`
 * (essa RPC inclui acting). Fail-closed se o contexto não puder ser determinado.
 */
export async function assertHmlDestructiveMembershipSuperAdmin(
  supabase: SupabaseClient,
  companyId: string,
  profileId: string,
): Promise<void> {
  if (!companyId.trim() || !profileId.trim()) {
    throw new Error(
      'Abortado: contexto de autorização HML incompleto (companyId/profileId).',
    );
  }

  const {data: isActing, error: actingError} = await supabase.rpc(
    'is_portal_owner_acting_for',
    {p_company_id: companyId},
  );

  if (actingError) {
    throw new Error(
      `Falha ao validar contexto Portal Master: ${actingError.message}`,
    );
  }
  if (isActing === true) {
    throw new Error(
      `Abortado: Portal Master acting não autorizado para operações destrutivas HML em "${HML_COMPANY_SLUG}". Exige membership Super Admin.`,
    );
  }
  if (isActing !== false) {
    throw new Error(
      'Abortado: contexto Portal Master indeterminado; autorização fail-closed.',
    );
  }

  const {data: rows, error: membershipError} = await supabase
    .from('company_members')
    .select(
      'company_id, profile_id, status, deleted_at, roles!inner(company_id, name, is_system, status, deleted_at)',
    )
    .eq('company_id', companyId)
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .eq('roles.name', 'Super Admin')
    .eq('roles.is_system', true)
    .eq('roles.status', 'active')
    .is('roles.deleted_at', null);

  if (membershipError) {
    throw new Error(
      `Falha ao validar membership Super Admin: ${membershipError.message}`,
    );
  }

  const matched = (rows ?? []).some((row) =>
    roleEmbedsMatchCompanySuperAdmin(
      (row as {roles?: unknown}).roles,
      companyId,
    ),
  );

  if (!matched) {
    throw new Error(
      `Abortado: o usuário autenticado não possui membership Super Admin de "${HML_COMPANY_SLUG}" (Portal Master acting não conta).`,
    );
  }
}

export async function resolveHmlSeedContext(
  supabase: SupabaseClient,
  profileId: string,
): Promise<HmlSeedContext> {
  const {data: companyRows, error: companyError} = await supabase
    .from('companies')
    .select('id, slug, status, provision_status, settings')
    .eq('slug', HML_COMPANY_SLUG)
    .is('deleted_at', null);

  if (companyError) {
    throw new Error(`Falha ao localizar empresa-alvo: ${companyError.message}`);
  }

  const company = assertUniqueHmlTargetCompany(
    (companyRows ?? []).filter(isHmlCompanyCandidate),
  );
  const companyId = company.id;

  if (companyId !== HML_AUTHORIZED_COMPANY_ID) {
    throw new Error(
      `Abortado: company_id resolvido diverge do UUID autorizado para "${HML_COMPANY_SLUG}".`,
    );
  }

  const {data: membershipRows, error: membershipError} = await supabase
    .from('company_members')
    .select('company_id, profile_id, role_id, default_branch_id')
    .eq('profile_id', profileId)
    .eq('company_id', companyId)
    .eq('status', 'active')
    .is('deleted_at', null);

  if (membershipError) {
    throw new Error(`Falha ao resolver vínculo: ${membershipError.message}`);
  }

  assertUniqueHmlMembership((membershipRows ?? []).filter(isHmlMembershipCandidate));

  await assertHmlCompanySuperAdmin(supabase, companyId);

  const slug = String(company.slug ?? '');
  if (slug !== HML_COMPANY_SLUG) {
    throw new Error(
      `Abortado: empresa resolvida é "${slug}", esperado "${HML_COMPANY_SLUG}".`,
    );
  }

  if (company.status !== 'active') {
    throw new Error(`Abortado: empresa ${HML_COMPANY_SLUG} não está active.`);
  }

  if (company.provision_status !== 'completed') {
    throw new Error(
      `Abortado: provision_status="${company.provision_status}", esperado "completed".`,
    );
  }

  const settings =
    company.settings && typeof company.settings === 'object'
      ? (company.settings as Record<string, unknown>)
      : {};
  const planSlug = readPlanSlugFromSettings(settings, '');
  if (!planSlug) {
    throw new Error('Abortado: plan_slug ausente em companies.settings.');
  }
  if (planSlug !== HML_REQUIRED_PLAN_SLUG) {
    throw new Error(
      `Abortado: plano="${planSlug}", exigido "${HML_REQUIRED_PLAN_SLUG}" para este volume.`,
    );
  }

  const catalog = await getPlanCatalog(supabase);
  const plan =
    catalog.find((item) => item.slug === planSlug) ??
    FALLBACK_PLANS.find((item) => item.slug === planSlug);

  if (!plan) {
    throw new Error(`Abortado: plano "${planSlug}" não encontrado no catálogo.`);
  }

  if (HML_VEHICLES.length > plan.maxVehicles) {
    throw new Error(
      `Abortado: catálogo pede ${HML_VEHICLES.length} veículos; limite do plano é ${plan.maxVehicles}.`,
    );
  }

  const futureBranchCount = 1 + HML_BRANCHES.length;
  if (futureBranchCount > plan.maxBranches) {
    throw new Error(
      `Abortado: ${futureBranchCount} filiais excedem o limite ${plan.maxBranches}.`,
    );
  }

  const {data: hqBranch, error: hqError} = await supabase
    .from('branches')
    .select('id')
    .eq('company_id', companyId)
    .eq('is_headquarters', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (hqError) {
    throw new Error(`Falha ao localizar HQ: ${hqError.message}`);
  }
  if (!hqBranch?.id) {
    throw new Error('Abortado: filial HQ não encontrada.');
  }

  return {
    companyId,
    profileId,
    companySlug: slug,
    planSlug,
    hqBranchId: hqBranch.id as string,
    maxVehicles: plan.maxVehicles,
    maxUsers: plan.maxUsers,
    maxBranches: plan.maxBranches,
  };
}

export async function assertCompanyEmptyForHomologacao(
  supabase: SupabaseClient,
  companyId: string,
): Promise<HmlModuleCount[]> {
  const results: HmlModuleCount[] = [];

  const branchCount = await countActive(supabase, 'branches', companyId);
  results.push({table: 'branches', count: branchCount, allowed: 1});
  if (branchCount !== 1) {
    throw new Error(
      `Abortado: esperado exatamente 1 filial (HQ), encontrados ${branchCount}.`,
    );
  }

  for (const table of HML_EMPTY_MODULE_TABLES) {
    const count = await countActive(supabase, table, companyId);
    results.push({table, count, allowed: 0});
    if (count > 0) {
      throw new Error(
        `Abortado: tabela ${table} já possui ${count} registro(s) em ${HML_COMPANY_SLUG}. ` +
          'Não sobrescrevo dados existentes.',
      );
    }
  }

  // Centros/cargos customizados HML não podem existir; os de sistema são OK.
  const {data: customCenters, error: centersError} = await supabase
    .from('cost_centers')
    .select('id, code')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .in(
      'code',
      HML_COST_CENTERS.map((c) => c.code),
    );

  if (centersError) {
    throw new Error(`Falha ao checar centros HML: ${centersError.message}`);
  }
  if ((customCenters ?? []).length > 0) {
    throw new Error('Abortado: centros de custo HML já existem.');
  }

  const {data: customPositions, error: positionsError} = await supabase
    .from('positions')
    .select('id, code')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .in(
      'code',
      HML_POSITIONS.map((p) => p.code),
    );

  if (positionsError) {
    throw new Error(`Falha ao checar cargos HML: ${positionsError.message}`);
  }
  if ((customPositions ?? []).length > 0) {
    throw new Error('Abortado: cargos HML já existem.');
  }

  const {data: existingBranches, error: branchCodesError} = await supabase
    .from('branches')
    .select('id, code')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .in(
      'code',
      HML_BRANCHES.map((b) => b.code),
    );

  if (branchCodesError) {
    throw new Error(`Falha ao checar códigos de filial HML: ${branchCodesError.message}`);
  }
  if ((existingBranches ?? []).length > 0) {
    throw new Error('Abortado: filiais HML-IMP/HML-THE já existem.');
  }

  // Membros: Super Admin é esperado; não abortamos por quantidade, mas
  // garantimos que o seed não cria usuários.
  const memberCount = await countActive(supabase, 'company_members', companyId);
  results.push({table: 'company_members', count: memberCount, allowed: Number.POSITIVE_INFINITY});
  if (memberCount < 1) {
    throw new Error('Abortado: empresa sem membros ativos.');
  }

  // Volume de veículos/filiais já validado em resolveHmlSeedContext (plano do catálogo).
  return results;
}

/** Categorias de sistema exigidas pelas integrações e pelo financeiro HML. */
export const HML_REQUIRED_CATEGORY_SLUGS = [
  'outros',
  'receitas',
  'impostos',
  'combustivel',
  'manutencao',
  'pneus',
  PAYROLL_CATEGORY_SLUG,
] as const;

/** Centros de custo de sistema usados por funcionários / AP / AR / folha. */
export const HML_REQUIRED_COST_CENTER_CODES = ['OPERACIONAL', 'ADMINISTRATIVO'] as const;

/**
 * Confirma (somente leitura) categorias e centros de sistema necessários
 * antes de qualquer escrita da carga.
 */
export async function assertSystemFinancialPrerequisites(
  supabase: SupabaseClient,
  companyId: string,
): Promise<void> {
  const {data: categories, error: categoriesError} = await supabase
    .from('financial_categories')
    .select('slug')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .in('slug', [...HML_REQUIRED_CATEGORY_SLUGS]);

  if (categoriesError) {
    throw new Error(
      `Falha ao validar categorias financeiras de sistema: ${categoriesError.message}`,
    );
  }

  const foundSlugs = new Set(
    (categories ?? [])
      .map((row) => row.slug as string | null | undefined)
      .filter((slug): slug is string => Boolean(slug)),
  );
  const missingCategories = HML_REQUIRED_CATEGORY_SLUGS.filter(
    (slug) => !foundSlugs.has(slug),
  );
  if (missingCategories.length > 0) {
    throw new Error(
      `Abortado: categorias financeiras ausentes em ${HML_COMPANY_SLUG}: ${missingCategories.join(', ')}.`,
    );
  }

  const {data: centers, error: centersError} = await supabase
    .from('cost_centers')
    .select('code')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .in('code', [...HML_REQUIRED_COST_CENTER_CODES]);

  if (centersError) {
    throw new Error(
      `Falha ao validar centros de custo de sistema: ${centersError.message}`,
    );
  }

  const foundCodes = new Set(
    (centers ?? [])
      .map((row) => String(row.code ?? '').toUpperCase())
      .filter(Boolean),
  );
  const missingCenters = HML_REQUIRED_COST_CENTER_CODES.filter(
    (code) => !foundCodes.has(code),
  );
  if (missingCenters.length > 0) {
    throw new Error(
      `Abortado: centros de custo de sistema ausentes em ${HML_COMPANY_SLUG}: ${missingCenters.join(', ')}.`,
    );
  }
}

export async function runLiveGuards(
  supabase: SupabaseClient,
  profileId: string,
): Promise<{context: HmlSeedContext; moduleCounts: HmlModuleCount[]}> {
  // Defesa em profundidade: project-ref antes de qualquer leitura/escrita de negócio.
  // requireHmlAuthEnv já valida no cliente; aqui revalida o ambiente atual.
  assertHmlProjectRefFromEnv();

  const context = await resolveHmlSeedContext(supabase, profileId);
  // resolveHmlSeedContext já exige: slug primeira-empresa, professional, Super Admin.
  const moduleCounts = await assertCompanyEmptyForHomologacao(supabase, context.companyId);
  await assertSystemFinancialPrerequisites(supabase, context.companyId);
  return {context, moduleCounts};
}

/** Garante que nenhuma fase escreva fora de `primeira-empresa` (slug + UUID). */
export function assertHmlWriteContext(context: HmlSeedContext): void {
  if (!context.companyId.trim()) {
    throw new Error('Abortado: companyId ausente no contexto HML.');
  }
  if (context.companyId !== HML_AUTHORIZED_COMPANY_ID) {
    throw new Error(
      `Abortado: contexto companyId diverge do UUID autorizado para "${HML_COMPANY_SLUG}".`,
    );
  }
  if (context.companySlug !== HML_COMPANY_SLUG) {
    throw new Error(
      `Abortado: contexto companySlug="${context.companySlug}", esperado "${HML_COMPANY_SLUG}".`,
    );
  }
  if (!context.profileId.trim()) {
    throw new Error('Abortado: profileId ausente no contexto HML.');
  }
  if (!context.hqBranchId.trim()) {
    throw new Error('Abortado: hqBranchId ausente no contexto HML.');
  }
}
